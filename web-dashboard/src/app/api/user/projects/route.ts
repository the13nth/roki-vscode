import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);

    // Get user's projects from Pinecone
    const response = await index.namespace('projects').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        userId: { $eq: userId }
      },
      topK: 100,
      includeMetadata: true
    });

    const projects = response.matches?.map(match => ({
      id: match.metadata?.projectId || match.id,
      name: match.metadata?.name || 'Untitled Project',
      description: match.metadata?.description || '',
      createdAt: match.metadata?.createdAt || '',
      lastModified: match.metadata?.lastModified || ''
    })) || [];

    // Sort by last modified date (newest first)
    projects.sort((a, b) => new Date(String(b.lastModified)).getTime() - new Date(String(a.lastModified)).getTime());

    return NextResponse.json({
      success: true,
      projects
    });

  } catch (error) {
    console.error('Error fetching user projects:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}
