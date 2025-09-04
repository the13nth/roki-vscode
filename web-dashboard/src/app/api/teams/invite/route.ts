import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';
import { TeamInvitation, TeamRole } from '@/types/shared';
import { NotificationService } from '@/lib/notificationService';

const pinecone = getPineconeClient();
const index = pinecone.index(PINECONE_INDEX_NAME);

// Invite a user to a team
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { teamId, email, role = 'viewer' } = body;

    if (!teamId || !email) {
      return NextResponse.json(
        { success: false, error: 'Team ID and email are required' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles: TeamRole[] = ['admin', 'editor', 'viewer'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role. Must be admin, editor, or viewer' },
        { status: 400 }
      );
    }

    // Check if user has permission to invite (must be owner or admin)
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
        { success: false, error: 'Insufficient permissions to invite users' },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const existingMemberResponse = await index.namespace('team_members').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        teamId: { $eq: teamId },
        email: { $eq: email }
      },
      topK: 1,
      includeMetadata: true
    });

    if (existingMemberResponse.matches && existingMemberResponse.matches.length > 0) {
      return NextResponse.json(
        { success: false, error: 'User is already a member of this team' },
        { status: 409 }
      );
    }

    // Create invitation
    const invitationId = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation: TeamInvitation = {
      id: invitationId,
      teamId,
      email,
      role,
      invitedBy: userId,
      invitedAt: now,
      expiresAt,
      status: 'pending',
      token: Math.random().toString(36).substr(2, 15)
    };

    // Store invitation in Pinecone
    await index.namespace('team_invitations').upsert([{
      id: invitationId,
      values: new Array(1024).fill(0.1),
      metadata: {
        ...invitation,
        invitedAt: invitation.invitedAt.toISOString(),
        expiresAt: invitation.expiresAt.toISOString()
      }
    }]);

    // Get team name for notification
    const teamResponse = await index.namespace('teams').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        teamId: { $eq: teamId }
      },
      topK: 1,
      includeMetadata: true
    });

    // Create notification for team member invitation
    try {
      const teamName = String(teamResponse.matches?.[0]?.metadata?.name || 'Unknown Team');
      await NotificationService.notifyTeamMemberAdded(userId, teamId, teamName, email);
    } catch (notificationError) {
      console.error('Failed to create team invitation notification:', notificationError);
      // Don't fail the invitation if notification fails
    }

    // TODO: Send email invitation (implement email service)
    console.log(`Invitation sent to ${email} for team ${teamId} with role ${role}`);

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitationId,
        email,
        role,
        expiresAt: invitation.expiresAt.toISOString()
      },
      message: 'Invitation sent successfully'
    });

  } catch (error) {
    console.error('Error inviting user to team:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send invitation' },
      { status: 500 }
    );
  }
}

// Get pending invitations for a team
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json(
        { success: false, error: 'Team ID is required' },
        { status: 400 }
      );
    }

    // Check if user has permission to view invitations
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
        { success: false, error: 'Insufficient permissions to view invitations' },
        { status: 403 }
      );
    }

    // Get pending invitations
    const response = await index.namespace('team_invitations').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        teamId: { $eq: teamId },
        status: { $eq: 'pending' }
      },
      topK: 100,
      includeMetadata: true
    });

    const invitations = response.matches?.map(match => ({
      id: match.metadata?.id || match.id,
      email: match.metadata?.email || '',
      role: match.metadata?.role || 'viewer',
      invitedAt: match.metadata?.invitedAt || '',
      expiresAt: match.metadata?.expiresAt || '',
      status: match.metadata?.status || 'pending'
    })) || [];

    return NextResponse.json({
      success: true,
      invitations
    });

  } catch (error) {
    console.error('Error fetching team invitations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}
