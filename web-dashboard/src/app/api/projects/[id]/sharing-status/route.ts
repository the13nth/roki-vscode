import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    const { id: projectId } = await params;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);

    // Get all sharing records for this project
    const sharingResponse = await index.namespace('project_sharing').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        projectId: { $eq: projectId }
      },
      topK: 100,
      includeMetadata: true
    });

    // Get project details to check ownership
    const projectResponse = await index.namespace('projects').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        projectId: { $eq: projectId }
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

    const isOwner = String(project.userId) === userId;

    // If not owner, only show records where user is shared with
    const sharedWithArray = Array.isArray(project.sharedWith) ? project.sharedWith : [];
    const userEmail = sharedWithArray.find((email: string) => email === userId) || '';
    
    let filteredSharingRecords = sharingResponse.matches || [];
    
    if (!isOwner) {
      // For non-owners, only show records where they are the shared user
      filteredSharingRecords = filteredSharingRecords.filter(match => {
        const record = match.metadata;
        return record && record.sharedWithEmail === userEmail;
      });
    }

    // Format the sharing records
    const sharingRecords = filteredSharingRecords.map(match => {
      const record = match.metadata;
      if (!record) return null;

      return {
        id: record.id || match.id,
        projectId: record.projectId,
        sharedWithEmail: record.sharedWithEmail,
        role: record.role,
        sharedAt: record.sharedAt,
        status: record.status,
        respondedAt: record.respondedAt,
        sharedBy: record.sharedBy
      };
    }).filter(Boolean); // Remove null entries

    return NextResponse.json({
      success: true,
      sharingRecords,
      isOwner,
      totalRecords: sharingRecords.length
    });

  } catch (error) {
    console.error('Error fetching project sharing status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch project sharing status' },
      { status: 500 }
    );
  }
}
