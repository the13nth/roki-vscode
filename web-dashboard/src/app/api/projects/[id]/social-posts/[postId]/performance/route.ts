import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';

const pinecone = getPineconeClient();
const index = pinecone.index(PINECONE_INDEX_NAME);

interface UpdatePerformanceRequest {
  performance: {
    likes?: number;
    shares?: number;
    comments?: number;
    views?: number;
    clicks?: number;
    engagement_rate?: number;
  };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId, postId } = await params;
    const body: UpdatePerformanceRequest = await request.json();
    
    const { performance } = body;

    if (!performance) {
      return NextResponse.json(
        { success: false, error: 'Missing performance data' },
        { status: 400 }
      );
    }

    console.log(`📊 Updating performance for post ${postId} in project ${projectId}`);

    // First, fetch the existing post to get current metadata
    const fetchResponse = await index.namespace('social-posts').fetch([postId]);
    const existingPost = fetchResponse.records[postId];

    if (!existingPost || !existingPost.metadata) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (existingPost.metadata.userId !== userId || existingPost.metadata.projectId !== projectId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to update this post' },
        { status: 403 }
      );
    }

    // Update the metadata with new performance data
    const updatedMetadata = {
      ...existingPost.metadata,
      likes: performance.likes ?? existingPost.metadata.likes ?? 0,
      shares: performance.shares ?? existingPost.metadata.shares ?? 0,
      comments: performance.comments ?? existingPost.metadata.comments ?? 0,
      views: performance.views ?? existingPost.metadata.views ?? 0,
      clicks: performance.clicks ?? existingPost.metadata.clicks ?? 0,
      engagement_rate: performance.engagement_rate ?? existingPost.metadata.engagement_rate ?? 0,
      lastUpdated: new Date().toISOString()
    };

    // Update the post in Pinecone
    await index.namespace('social-posts').upsert([
      {
        id: postId,
        values: existingPost.values,
        metadata: updatedMetadata,
      },
    ]);

    console.log('✅ Post performance updated successfully');
    return NextResponse.json({ 
      success: true, 
      message: 'Performance updated successfully',
      updatedPerformance: {
        likes: updatedMetadata.likes,
        shares: updatedMetadata.shares,
        comments: updatedMetadata.comments,
        views: updatedMetadata.views,
        clicks: updatedMetadata.clicks,
        engagement_rate: updatedMetadata.engagement_rate
      }
    });

  } catch (error) {
    console.error('❌ Update post performance error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        success: false, 
        error: `Error updating post performance: ${errorMessage}` 
      },
      { status: 500 }
    );
  }
}
