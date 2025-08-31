import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; applicationId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, applicationId } = await params;
    const body = await request.json();

    const { status, reviewerNotes } = body;

    // Validate status
    const validStatuses = ['pending', 'reviewed', 'accepted', 'rejected'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Check if user owns the project
    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);
    
    const projectQuery = await index.namespace('projects').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        projectId: { $eq: projectId }
      },
      topK: 1,
      includeMetadata: true
    });

    if (projectQuery.matches.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectMetadata = projectQuery.matches[0].metadata;
    const projectOwnerId = projectMetadata.userId;
    const isOwner = projectOwnerId === userId;

    // Only project owners can update application status
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if application exists and belongs to this project
    const applicationQuery = await index.namespace('project-applications').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        applicationId: { $eq: applicationId },
        projectId: { $eq: projectId }
      },
      topK: 1,
      includeMetadata: true
    });

    if (applicationQuery.matches.length === 0) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const applicationMetadata = applicationQuery.matches[0].metadata;
    const now = new Date().toISOString();

    // Update the application in Pinecone
    await index.namespace('project-applications').upsert([
      {
        id: `application-${applicationId}`,
        values: new Array(1024).fill(0.1),
        metadata: {
          ...applicationMetadata,
          status,
          reviewedAt: status === 'pending' ? null : now,
          reviewerNotes: reviewerNotes || null
        }
      }
    ]);

    return NextResponse.json({
      success: true,
      message: 'Application status updated successfully'
    });

  } catch (error) {
    console.error('Error updating application status:', error);
    return NextResponse.json(
      { error: 'Failed to update application status' },
      { status: 500 }
    );
  }
}
