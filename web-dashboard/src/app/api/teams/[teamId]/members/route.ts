import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';

const pinecone = getPineconeClient();
const index = pinecone.index(PINECONE_INDEX_NAME);

// Get team members
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

    if (!userMembershipResponse.matches || userMembershipResponse.matches.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Access denied. You are not a member of this team.' },
        { status: 403 }
      );
    }

    // Get all team members
    const response = await index.namespace('team_members').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        teamId: { $eq: teamId }
      },
      topK: 100,
      includeMetadata: true
    });

    const members = response.matches?.map(match => ({
      id: match.metadata?.id || match.id,
      teamId: match.metadata?.teamId || '',
      userId: match.metadata?.userId || '',
      email: match.metadata?.email || '',
      role: match.metadata?.role || 'viewer',
      joinedAt: match.metadata?.joinedAt || '',
      invitedAt: match.metadata?.invitedAt || '',
      status: match.metadata?.status || 'pending',
      invitedBy: match.metadata?.invitedBy || ''
    })) || [];

    return NextResponse.json({
      success: true,
      members
    });

  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}
