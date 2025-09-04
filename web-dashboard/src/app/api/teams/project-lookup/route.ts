import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';

const pinecone = getPineconeClient();
const index = pinecone.index(PINECONE_INDEX_NAME);

// Look up which team a project belongs to
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { projectId } = await request.json();
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Check if project is part of a team by looking in team_projects
    const teamProjectsResponse = await index.namespace('team_projects').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        projectId: { $eq: projectId }
      },
      topK: 1,
      includeMetadata: true
    });

    if (!teamProjectsResponse.matches?.length) {
      return NextResponse.json({
        success: true,
        team: null
      });
    }

    const teamProject = teamProjectsResponse.matches[0].metadata;
    if (!teamProject) {
      return NextResponse.json({
        success: true,
        team: null
      });
    }

    // Get team details
    const teamResponse = await index.namespace('teams').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        teamId: { $eq: teamProject.teamId }
      },
      topK: 1,
      includeMetadata: true
    });

    const team = teamResponse.matches?.[0]?.metadata;
    if (!team) {
      return NextResponse.json({
        success: true,
        team: null
      });
    }

    return NextResponse.json({
      success: true,
      team: {
        id: team.teamId,
        name: team.name,
        description: team.description,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
        ownerId: team.ownerId,
        isActive: team.isActive
      }
    });

  } catch (error) {
    console.error('Error looking up project team:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
