import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME, PINECONE_NAMESPACE_PROJECTS } from '@/lib/pinecone';

// Helper function to retry operations with exponential backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    const { id: invitationId } = await params;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
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

    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);

    // Get the invitation
    const invitationResponse = await index.namespace('project_sharing').query({
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
        { success: false, error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check if invitation is still pending
    if (invitation.status !== 'pending') {
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

      const upsertPromise = index.namespace('project_sharing').upsert([{
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
    let lastError: Error;

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

    if (retryCount === maxRetries) {
      throw new Error(`Failed to update invitation after ${maxRetries} attempts: ${lastError?.message}`);
    }

    if (action === 'accept') {
      // Get the project to update sharedWith array with retry logic
      const project = await retryWithBackoff(async () => {
        const projectResponse = await index.namespace(PINECONE_NAMESPACE_PROJECTS).query({
          vector: new Array(1024).fill(0.1),
          filter: {
            projectId: { $eq: invitation.projectId }
          },
          topK: 1,
          includeMetadata: true
        });

        const project = projectResponse.matches?.[0]?.metadata;
        if (!project) {
          throw new Error('Project not found');
        }
        return project;
      });

      // Update project's sharedWith array with retry logic
      await retryWithBackoff(async () => {
        const currentSharedWith = Array.isArray(project.sharedWith) ? project.sharedWith : [];
        if (!currentSharedWith.includes(String(invitation.sharedWithEmail))) {
          const updatedSharedWith = [...currentSharedWith, String(invitation.sharedWithEmail)];
          
          await index.namespace(PINECONE_NAMESPACE_PROJECTS).upsert([{
            id: String(project.projectId),
            values: new Array(1024).fill(0.1),
            metadata: {
              ...project,
              sharedWith: updatedSharedWith
            }
          }]);
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: `Project invitation ${action}ed successfully`,
      status: newStatus
    });

  } catch (error) {
    console.error('Error responding to project invitation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to respond to invitation' },
      { status: 500 }
    );
  }
}
