import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME, PINECONE_NAMESPACE_PROJECTS } from '@/lib/pinecone';

const pinecone = getPineconeClient();
const index = pinecone.index(PINECONE_INDEX_NAME);

// Get projects owned by the current user
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get all projects owned by the user
    const projectsResponse = await index.namespace(PINECONE_NAMESPACE_PROJECTS).query({
      vector: new Array(1024).fill(0.1),
      filter: {
        userId: { $eq: userId },
        type: { $eq: 'user-project' }
      },
      topK: 100,
      includeMetadata: true
    });

    const projects = projectsResponse.matches?.map(match => {
      const metadata = match.metadata;
      if (!metadata) return null;
      
      // Parse the projectData JSON string to get the full project configuration
      let projectData = null;
      try {
        if (typeof metadata.projectData === 'string') {
          projectData = JSON.parse(metadata.projectData);
        }
      } catch (e) {
        console.error('Error parsing projectData:', e);
        return null;
      }
      
      return {
        ...projectData,
        projectId: metadata.projectId,
        name: metadata.name,
        description: metadata.description,
        template: metadata.template,
        createdAt: metadata.createdAt,
        lastModified: metadata.lastModified,
        isPublic: metadata.isPublic
      };
    }).filter(Boolean) || [];

    return NextResponse.json({
      success: true,
      data: projects
    });

  } catch (error) {
    console.error('Error getting user owned projects:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
