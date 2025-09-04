import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';

const pinecone = getPineconeClient();
const index = pinecone.index(PINECONE_INDEX_NAME);

// Update team member status (suspend/activate) or remove member
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; memberId: string }> }
): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { teamId, memberId } = await params;
    const body = await request.json();
    const { action } = body; // action: 'suspend' | 'activate' | 'remove'

    if (!action || !['suspend', 'activate', 'remove'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be suspend, activate, or remove' },
        { status: 400 }
      );
    }

    // Check if user has permission to manage team members (must be owner or admin)
    const userMembershipResponse = await index.namespace('team_members').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        teamId: { $eq: teamId },
        userId: { $eq: userId }
      },
      topK: 1,
      includeMetadata: true
    });

    const userMembership = userMembershipResponse.matches?.[0]?.metadata;
    if (!userMembership || !['owner', 'admin'].includes(String(userMembership.role))) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to manage team members' },
        { status: 403 }
      );
    }

    // Get the member to be modified
    const memberResponse = await index.namespace('team_members').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        id: { $eq: memberId },
        teamId: { $eq: teamId }
      },
      topK: 1,
      includeMetadata: true
    });

    const memberToModify = memberResponse.matches?.[0]?.metadata;
    if (!memberToModify) {
      return NextResponse.json(
        { success: false, error: 'Team member not found' },
        { status: 404 }
      );
    }

    // Prevent owners from being removed or suspended
    if (String(memberToModify.role) === 'owner') {
      return NextResponse.json(
        { success: false, error: 'Cannot modify team owner' },
        { status: 403 }
      );
    }

    // Prevent users from removing themselves
    if (String(memberToModify.userId) === userId) {
      return NextResponse.json(
        { success: false, error: 'Cannot modify your own membership' },
        { status: 403 }
      );
    }

    if (action === 'remove') {
      // Remove the member from the team
      await index.namespace('team_members').deleteOne(memberId);
      
      // Remove their access to team projects
      await removeMemberFromTeamProjects(teamId, String(memberToModify.userId), String(memberToModify.email));
      
      return NextResponse.json({
        success: true,
        message: 'Team member removed successfully'
      });
    } else {
      // Suspend or activate the member
      const targetStatus = action === 'suspend' ? 'inactive' : 'active';
      
      await index.namespace('team_members').upsert([{
        id: memberId,
        values: new Array(1024).fill(0.1),
        metadata: {
          ...memberToModify,
          status: targetStatus,
          updatedAt: new Date().toISOString()
        }
      }]);

      // If suspending, also remove access to team projects
      if (targetStatus === 'inactive') {
        await removeMemberFromTeamProjects(teamId, String(memberToModify.userId), String(memberToModify.email));
      }

      return NextResponse.json({
        success: true,
        message: `Team member ${targetStatus === 'inactive' ? 'suspended' : 'activated'} successfully`
      });
    }

  } catch (error) {
    console.error('Error managing team member:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to manage team member' },
      { status: 500 }
    );
  }
}

// Helper function to remove member access from team projects
async function removeMemberFromTeamProjects(teamId: string, memberUserId: string, memberEmail: string) {
  try {
    // Get all team projects
    const teamProjectsResponse = await index.namespace('team_projects').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        teamId: { $eq: teamId }
      },
      topK: 100,
      includeMetadata: true
    });

    // For each team project, remove the member's access
    for (const project of teamProjectsResponse.matches || []) {
      const projectId = String(project.metadata?.projectId);
      if (projectId && projectId !== 'undefined') {
        // Remove from project's sharedWith array
        const projectResponse = await index.namespace('projects').query({
          vector: new Array(1024).fill(0.1),
          filter: {
            id: { $eq: projectId }
          },
          topK: 1,
          includeMetadata: true
        });

        const projectRecord = projectResponse.matches?.[0];
        if (projectRecord?.metadata?.projectData) {
          try {
            const projectData = JSON.parse(String(projectRecord.metadata.projectData));
            if (projectData.sharedWith && Array.isArray(projectData.sharedWith)) {
              // Remove the member's email from sharedWith
              const updatedSharedWith = projectData.sharedWith.filter((email: string) => email !== memberEmail);
              
              // Update the project
              await index.namespace('projects').upsert([{
                id: projectId,
                values: new Array(1024).fill(0.1),
                metadata: {
                  ...projectRecord.metadata,
                  projectData: JSON.stringify({
                    ...projectData,
                    sharedWith: updatedSharedWith
                  })
                }
              }]);
            }
          } catch (parseError) {
            console.error('Error parsing project data:', parseError);
          }
        }
      }
    }

    // Remove from project_sharing records
    const projectIds = (teamProjectsResponse.matches || [])
      .map(p => p.metadata?.projectId)
      .filter(Boolean)
      .map(String);
      
    const sharingResponse = await index.namespace('project_sharing').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        projectId: { $in: projectIds },
        sharedWithEmail: { $eq: memberEmail }
      },
      topK: 100,
      includeMetadata: true
    });

    // Delete all sharing records for this member
    for (const sharing of sharingResponse.matches || []) {
      await index.namespace('project_sharing').deleteOne(sharing.id);
    }

  } catch (error) {
    console.error('Error removing member from team projects:', error);
  }
}
