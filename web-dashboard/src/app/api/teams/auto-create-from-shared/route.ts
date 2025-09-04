import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';
import { Team, TeamMember, TeamRole } from '@/types/shared';

const pinecone = getPineconeClient();
const index = pinecone.index(PINECONE_INDEX_NAME);

// Auto-create teams from shared projects or connect existing shared projects to teams
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress || '';

    // Get all projects that are shared with the current user
    const sharedProjectsResponse = await index.namespace('projects').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        sharedWith: { $in: [userEmail] }
      },
      topK: 100,
      includeMetadata: true
    });

    console.log(`Found ${sharedProjectsResponse.matches?.length || 0} projects in projects namespace with sharedWith: ${userEmail}`);

    // Also check project_sharing namespace for accepted invitations
    const acceptedSharingResponse = await index.namespace('project_sharing').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        sharedWithEmail: { $eq: userEmail },
        status: { $eq: 'accepted' }
      },
      topK: 100,
      includeMetadata: true
    });

    console.log(`Found ${acceptedSharingResponse.matches?.length || 0} accepted project sharing records for email: ${userEmail}`);

    // Combine both sources of shared projects
    const sharedProjectIds = new Set<string>();
    
    // Add projects from projects namespace
    if (sharedProjectsResponse.matches) {
      for (const match of sharedProjectsResponse.matches) {
        if (match.metadata?.projectId) {
          sharedProjectIds.add(String(match.metadata.projectId));
        }
      }
    }
    
    // Add projects from project_sharing namespace
    if (acceptedSharingResponse.matches) {
      for (const match of acceptedSharingResponse.matches) {
        if (match.metadata?.projectId) {
          sharedProjectIds.add(String(match.metadata.projectId));
        }
      }
    }

    if (sharedProjectIds.size === 0) {
      console.log('No shared projects found to create teams from');
      return NextResponse.json({
        success: true,
        message: 'No shared projects found',
        teamsCreated: 0
      });
    }

    console.log(`Processing ${sharedProjectIds.size} shared projects:`, Array.from(sharedProjectIds));

    let teamsCreated = 0;
    const createdTeams: Team[] = [];

    // Process each shared project
    for (const projectId of sharedProjectIds) {
      // Get project details
      const projectResponse = await index.namespace('projects').query({
        vector: new Array(1024).fill(0.1),
        filter: {
          projectId: { $eq: projectId }
        },
        topK: 1,
        includeMetadata: true
      });

      const project = projectResponse.matches?.[0]?.metadata;
      if (!project) continue;

      const projectName = String(project.name || 'Untitled Project');
      const projectOwnerId = String(project.userId);

      // Check if this project is already part of a team
      const existingTeamProjectResponse = await index.namespace('team_projects').query({
        vector: new Array(1024).fill(0.1),
        filter: {
          projectId: { $eq: projectId }
        },
        topK: 1,
        includeMetadata: true
      });

      if (existingTeamProjectResponse.matches?.length > 0) {
        // Project is already part of a team, skip
        continue;
      }

      // Check if there's already a team for this project owner
      let teamId: string;
      let team: Team | null = null;

      const existingTeamResponse = await index.namespace('teams').query({
        vector: new Array(1024).fill(0.1),
        filter: {
          ownerId: { $eq: projectOwnerId }
        },
        topK: 1,
        includeMetadata: true
      });

      if (existingTeamResponse.matches?.length > 0) {
        // Use existing team
        const existingTeam = existingTeamResponse.matches[0].metadata;
        if (!existingTeam) continue;
        
        teamId = String(existingTeam.teamId || existingTeam.id);
        team = {
          id: teamId,
          name: String(existingTeam.name || 'Team'),
          description: String(existingTeam.description || ''),
          createdAt: new Date(String(existingTeam.createdAt)),
          updatedAt: new Date(String(existingTeam.updatedAt)),
          ownerId: String(existingTeam.ownerId),
          isActive: Boolean(existingTeam.isActive)
        };
      } else {
        // Create new team for this project owner
        teamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date();

        team = {
          id: teamId,
          name: `${projectName} Team`,
          description: `Team for ${projectName} project`,
          createdAt: now,
          updatedAt: now,
          ownerId: projectOwnerId,
          isActive: true
        };

        // Store team in Pinecone
        await index.namespace('teams').upsert([{
          id: teamId,
          values: new Array(1024).fill(0.1),
          metadata: {
            ...team,
            createdAt: team.createdAt.toISOString(),
            updatedAt: team.updatedAt.toISOString()
          }
        }]);

        // Create team member record for the owner
        const ownerMember: TeamMember = {
          id: `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          teamId,
          userId: projectOwnerId,
          email: '', // Will need to be filled from user data
          role: 'owner',
          joinedAt: now,
          invitedAt: now,
          status: 'active',
          invitedBy: projectOwnerId
        };

        await index.namespace('team_members').upsert([{
          id: ownerMember.id,
          values: new Array(1024).fill(0.1),
          metadata: {
            ...ownerMember,
            joinedAt: ownerMember.joinedAt.toISOString(),
            invitedAt: ownerMember.invitedAt.toISOString()
          }
        }]);

        teamsCreated++;
        createdTeams.push(team);
      }

      // Add the shared project to the team
      const teamProject = {
        id: `${teamId}_${projectId}`,
        teamId,
        projectId,
        addedAt: new Date(),
        addedBy: projectOwnerId,
        projectRole: 'viewer' as TeamRole
      };

      await index.namespace('team_projects').upsert([{
        id: teamProject.id,
        values: new Array(1024).fill(0.1),
        metadata: {
          ...teamProject,
          addedAt: teamProject.addedAt.toISOString()
        }
      }]);

      // Add current user as team member if not already added
      const currentUserMembershipResponse = await index.namespace('team_members').query({
        vector: new Array(1024).fill(0.1),
        filter: {
          teamId: { $eq: teamId },
          userId: { $eq: userId }
        },
        topK: 1,
        includeMetadata: true
      });

      if (!currentUserMembershipResponse.matches?.length) {
        // Get the user's role from project sharing
        const sharingResponse = await index.namespace('project_sharing').query({
          vector: new Array(1024).fill(0.1),
          filter: {
            projectId: { $eq: projectId },
            sharedWithEmail: { $eq: userEmail },
            status: { $eq: 'accepted' }
          },
          topK: 1,
          includeMetadata: true
        });

        const userRole = sharingResponse.matches?.[0]?.metadata?.role || 'viewer';

        const currentUserMember: TeamMember = {
          id: `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          teamId,
          userId,
          email: userEmail,
          role: userRole as TeamRole,
          joinedAt: new Date(),
          invitedAt: new Date(),
          status: 'active',
          invitedBy: projectOwnerId
        };

        await index.namespace('team_members').upsert([{
          id: currentUserMember.id,
          values: new Array(1024).fill(0.1),
          metadata: {
            ...currentUserMember,
            joinedAt: currentUserMember.joinedAt.toISOString(),
            invitedAt: currentUserMember.invitedAt.toISOString()
          }
        }]);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed shared projects`,
      teamsCreated,
      createdTeams
    });

  } catch (error) {
    console.error('Error auto-creating teams from shared projects:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to auto-create teams' },
      { status: 500 }
    );
  }
}
