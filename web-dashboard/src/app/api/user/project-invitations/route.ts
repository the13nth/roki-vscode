import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';

export async function GET(): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userEmail = user.emailAddresses[0]?.emailAddress;
    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'User email not found' },
        { status: 400 }
      );
    }

    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);

    // Get pending invitations for the current user's email
    const invitationsResponse = await index.namespace('project_sharing').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        sharedWithEmail: { $eq: userEmail },
        status: { $eq: 'pending' }
      },
      topK: 100,
      includeMetadata: true
    });

    // Get project details for each invitation
    const userInvitations = [];
    
    for (const match of invitationsResponse.matches || []) {
      const invitation = match.metadata;
      if (invitation) {
        // Get project details
        const projectResponse = await index.namespace('projects').query({
          vector: new Array(1024).fill(0.1),
          filter: {
            projectId: { $eq: invitation.projectId }
          },
          topK: 1,
          includeMetadata: true
        });

        const project = projectResponse.matches?.[0]?.metadata;
        if (project) {
          // Get sharer's name from Clerk or fallback
          let sharerName = 'Unknown User';
          try {
            // Try to get sharer info from Clerk (this would need proper implementation)
            // For now, we'll use a fallback
            if (invitation.sharedBy === userId) {
              sharerName = user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : user.username || 'You';
            }
          } catch (error) {
            console.error('Error getting sharer info:', error);
          }

          userInvitations.push({
            id: invitation.id || match.id,
            projectId: invitation.projectId,
            projectName: project.name || 'Unknown Project',
            // Only return a brief preview for pending invitations - not the full description
            projectPreview: project.description 
              ? `${String(project.description).substring(0, 150)}${String(project.description).length > 150 ? '...' : ''}`
              : 'No description available',
            sharedWithEmail: invitation.sharedWithEmail,
            role: invitation.role,
            sharedAt: invitation.sharedAt,
            sharedBy: invitation.sharedBy,
            sharedByName: sharerName,
            expiresAt: invitation.expiresAt
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      invitations: userInvitations
    });

  } catch (error) {
    console.error('Error fetching project invitations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}
