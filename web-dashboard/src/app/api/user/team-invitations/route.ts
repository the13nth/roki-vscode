import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userEmail = user.emailAddresses?.[0]?.emailAddress || '';
    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'User email not found' },
        { status: 400 }
      );
    }

    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);

    // Get pending team invitations for the current user's email
    const invitationsResponse = await index.namespace('team_invitations').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        email: { $eq: userEmail },
        status: { $eq: 'pending' }
      },
      topK: 100,
      includeMetadata: true
    });

    // Get team details for each invitation
    const userTeamInvitations = [];
    
    for (const match of invitationsResponse.matches || []) {
      const invitation = match.metadata;
      if (invitation) {
        // Get team details
        const teamResponse = await index.namespace('teams').query({
          vector: new Array(1024).fill(0.1),
          filter: {
            teamId: { $eq: invitation.teamId }
          },
          topK: 1,
          includeMetadata: true
        });

        const team = teamResponse.matches?.[0]?.metadata;
        if (team) {
          // Get inviter's info
          let inviterName = 'Unknown User';
          try {
            // Try to get inviter info from Clerk (this would need proper implementation)
            // For now, we'll use a fallback
            if (invitation.invitedBy === userId) {
              inviterName = user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : user.username || 'You';
            }
          } catch (error) {
            console.error('Error getting inviter info:', error);
          }

          userTeamInvitations.push({
            id: invitation.id || match.id,
            teamId: invitation.teamId,
            teamName: team.name || 'Unknown Team',
            teamDescription: team.description || '',
            email: invitation.email,
            role: invitation.role,
            invitedAt: invitation.invitedAt,
            invitedBy: invitation.invitedBy,
            invitedByName: inviterName,
            expiresAt: invitation.expiresAt,
            status: invitation.status
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      invitations: userTeamInvitations
    });

  } catch (error) {
    console.error('Error fetching team invitations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch team invitations' },
      { status: 500 }
    );
  }
}
