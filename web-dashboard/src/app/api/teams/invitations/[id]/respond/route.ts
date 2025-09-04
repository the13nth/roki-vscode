import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';
import { TeamMember, TeamRole } from '@/types/shared';

const pinecone = getPineconeClient();
const index = pinecone.index(PINECONE_INDEX_NAME);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    const { id: invitationId } = await params;
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

    const body = await request.json();
    const { action } = body; // 'accept' or 'decline'

    if (!['accept', 'decline'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be accept or decline' },
        { status: 400 }
      );
    }

    // Get the team invitation
    const invitationResponse = await index.namespace('team_invitations').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        id: { $eq: invitationId }
      },
      topK: 1,
      includeMetadata: true
    });

    const invitation = invitationResponse.matches?.[0]?.metadata;
    if (!invitation) {
      return NextResponse.json(
        { success: false, error: 'Team invitation not found' },
        { status: 404 }
      );
    }

    // Verify the invitation is for the current user
    if (String(invitation.email) !== userEmail) {
      return NextResponse.json(
        { success: false, error: 'This invitation is not for you' },
        { status: 403 }
      );
    }

    // Check if invitation is still pending
    if (String(invitation.status) !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Invitation has already been responded to' },
        { status: 400 }
      );
    }

    // Check if invitation has expired
    if (invitation.expiresAt) {
      const expiresAt = typeof invitation.expiresAt === 'string' ? invitation.expiresAt : String(invitation.expiresAt);
      if (new Date(expiresAt) < new Date()) {
        return NextResponse.json(
          { success: false, error: 'Invitation has expired' },
          { status: 400 }
        );
      }
    }

    // Update invitation status with timeout and retry logic
    const newStatus = action === 'accept' ? 'accepted' : 'declined';
    
    const updateInvitationWithTimeout = async () => {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Pinecone operation timed out')), 30000); // 30 second timeout
      });

      const upsertPromise = index.namespace('team_invitations').upsert([{
        id: invitationId,
        values: new Array(1024).fill(0.1),
        metadata: {
          ...invitation,
          status: newStatus,
          respondedAt: new Date().toISOString()
        }
      }]);

      return Promise.race([upsertPromise, timeoutPromise]);
    };

    // Retry logic for updating invitation
    let retryCount = 0;
    const maxRetries = 3;
    let lastError: Error | undefined;

    while (retryCount < maxRetries) {
      try {
        await updateInvitationWithTimeout();
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error as Error;
        retryCount++;
        console.warn(`Pinecone invitation update attempt ${retryCount} failed:`, error);
        
        if (retryCount < maxRetries) {
          // Exponential backoff: wait 1s, 2s, 4s
          const delay = Math.pow(2, retryCount - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    if (retryCount === maxRetries && lastError) {
      throw new Error(`Failed to update invitation after ${maxRetries} attempts: ${lastError.message}`);
    }

    if (action === 'accept') {
      // Add user to team members with timeout and retry logic
      const teamMember: TeamMember = {
        id: `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        teamId: String(invitation.teamId),
        userId,
        email: userEmail,
        role: String(invitation.role) as TeamRole,
        joinedAt: new Date(),
        invitedAt: new Date(String(invitation.invitedAt)),
        status: 'active',
        invitedBy: String(invitation.invitedBy)
      };

      const addMemberWithTimeout = async () => {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Pinecone operation timed out')), 30000); // 30 second timeout
        });

        const upsertPromise = index.namespace('team_members').upsert([{
          id: teamMember.id,
          values: new Array(1024).fill(0.1),
          metadata: {
            ...teamMember,
            joinedAt: teamMember.joinedAt.toISOString(),
            invitedAt: teamMember.invitedAt.toISOString()
          }
        }]);

        return Promise.race([upsertPromise, timeoutPromise]);
      };

      // Retry logic for adding team member
      let retryCount = 0;
      const maxRetries = 3;
      let lastError: Error | undefined;

      while (retryCount < maxRetries) {
        try {
          await addMemberWithTimeout();
          break; // Success, exit retry loop
        } catch (error) {
          lastError = error as Error;
          retryCount++;
          console.warn(`Pinecone team member creation attempt ${retryCount} failed:`, error);
          
          if (retryCount < maxRetries) {
            // Exponential backoff: wait 1s, 2s, 4s
            const delay = Math.pow(2, retryCount - 1) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      if (retryCount === maxRetries && lastError) {
        throw new Error(`Failed to add team member after ${maxRetries} attempts: ${lastError.message}`);
      }

      // Update the invitation record to link to the team member
      await index.namespace('team_invitations').upsert([{
        id: invitationId,
        values: new Array(1024).fill(0.1),
        metadata: {
          ...invitation,
          status: newStatus,
          respondedAt: new Date().toISOString(),
          teamMemberId: teamMember.id
        }
      }]);
    }

    return NextResponse.json({
      success: true,
      message: `Team invitation ${action}ed successfully`,
      status: newStatus
    });

  } catch (error) {
    console.error('Error responding to team invitation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to respond to invitation' },
      { status: 500 }
    );
  }
}
