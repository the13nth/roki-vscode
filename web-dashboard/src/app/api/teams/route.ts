import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';
import { Team, TeamMember, TeamRole } from '@/types/shared';

const pinecone = getPineconeClient();
const index = pinecone.index(PINECONE_INDEX_NAME);

// Create a new team
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user details to get email
    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress || '';

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Team name is required' },
        { status: 400 }
      );
    }

    const teamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const team: Team = {
      id: teamId,
      name,
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
      ownerId: userId,
      isActive: true
    };

    // Store team in Pinecone
    await index.namespace('teams').upsert([{
      id: teamId,
      values: new Array(1024).fill(0.1), // Placeholder vector
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
      userId,
      email: userEmail,
      role: 'owner',
      joinedAt: now,
      invitedAt: now,
      status: 'active',
      invitedBy: userId
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

    return NextResponse.json({
      success: true,
      team,
      message: 'Team created successfully'
    });

  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create team' },
      { status: 500 }
    );
  }
}

// Get user's teams
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get teams where user is a member
    const response = await index.namespace('team_members').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        userId: { $eq: userId }
      },
      topK: 100,
      includeMetadata: true
    });

    const teamIds = response.matches?.map(match => match.metadata?.teamId) || [];
    
    if (teamIds.length === 0) {
      return NextResponse.json({
        success: true,
        teams: []
      });
    }

    // Get team details
    const teamsResponse = await index.namespace('teams').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        id: { $in: teamIds }
      },
      topK: 100,
      includeMetadata: true
    });

    const teams = teamsResponse.matches?.map(match => ({
      id: match.metadata?.id || match.id,
      name: match.metadata?.name || 'Untitled Team',
      description: match.metadata?.description || '',
      createdAt: match.metadata?.createdAt || '',
      updatedAt: match.metadata?.updatedAt || '',
      ownerId: match.metadata?.ownerId || '',
      isActive: match.metadata?.isActive || false
    })) || [];

    return NextResponse.json({
      success: true,
      teams
    });

  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}
