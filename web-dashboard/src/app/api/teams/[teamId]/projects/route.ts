import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME, PINECONE_NAMESPACE_PROJECTS } from '@/lib/pinecone';
import { TeamProject, TeamRole } from '@/types/shared';

const pinecone = getPineconeClient();
const index = pinecone.index(PINECONE_INDEX_NAME);

// Add a project to a team
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { teamId } = await params;
    const { projectId, projectRole } = await request.json();

    if (!projectId || !projectRole) {
      return NextResponse.json(
        { success: false, error: 'Project ID and role are required' },
        { status: 400 }
      );
    }

    // Check if user is a member of this team with owner or admin role
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
        { success: false, error: 'Insufficient permissions to add projects to team' },
        { status: 403 }
      );
    }

    // Check if project exists and user owns it
    const projectResponse = await index.namespace(PINECONE_NAMESPACE_PROJECTS).query({
      vector: new Array(1024).fill(0.1),
      filter: {
        projectId: { $eq: projectId },
        type: { $eq: 'user-project' }
      },
      topK: 1,
      includeMetadata: true
    });

    const project = projectResponse.matches?.[0]?.metadata;
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'You can only add projects you own to teams' },
        { status: 403 }
      );
    }

    // Check if project is already in this team
    const existingTeamProjectResponse = await index.namespace('team_projects').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        teamId: { $eq: teamId },
        projectId: { $eq: projectId }
      },
      topK: 1,
      includeMetadata: true
    });

    if (existingTeamProjectResponse.matches?.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Project is already in this team' },
        { status: 400 }
      );
    }

    // Create team project association
    const teamProject: TeamProject = {
      id: `${teamId}_${projectId}`,
      teamId,
      projectId,
      addedAt: new Date(),
      addedBy: userId,
      projectRole: projectRole as TeamRole
    };

    await index.namespace('team_projects').upsert([{
      id: teamProject.id,
      values: new Array(1024).fill(0.1),
      metadata: teamProject as Record<string, any>
    }]);

    // Update project with teamId
    await index.namespace(PINECONE_NAMESPACE_PROJECTS).upsert([{
      id: projectId,
      values: new Array(1024).fill(0.1),
      metadata: {
        ...project,
        teamId
      }
    }]);

    return NextResponse.json({
      success: true,
      data: teamProject
    });

  } catch (error) {
    console.error('Error adding project to team:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get all projects in a team
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { teamId } = await params;

    // Check if user is a member of this team
    const userMembershipResponse = await index.namespace('team_members').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        teamId: { $eq: teamId },
        userId: { $eq: userId }
      },
      topK: 1,
      includeMetadata: true
    });

    if (!userMembershipResponse.matches?.length) {
      return NextResponse.json(
        { success: false, error: 'You are not a member of this team' },
        { status: 403 }
      );
    }

    // Get all team projects
    const teamProjectsResponse = await index.namespace('team_projects').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        teamId: { $eq: teamId }
      },
      topK: 100,
      includeMetadata: true
    });

    const teamProjects = teamProjectsResponse.matches || [];

    // Get project details for each team project
    const projects = [];
    for (const teamProject of teamProjects) {
      if (!teamProject.metadata) continue;
      
      const projectResponse = await index.namespace(PINECONE_NAMESPACE_PROJECTS).query({
        vector: new Array(1024).fill(0.1),
        filter: {
          projectId: { $eq: teamProject.metadata.projectId }
        },
        topK: 1,
        includeMetadata: true
      });

      if (projectResponse.matches?.[0]?.metadata) {
        projects.push({
          ...projectResponse.matches[0].metadata,
          teamRole: teamProject.metadata.projectRole,
          addedAt: teamProject.metadata.addedAt
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: projects
    });

  } catch (error) {
    console.error('Error getting team projects:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
