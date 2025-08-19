import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';

const pinecone = getPineconeClient();
const index = pinecone.index(PINECONE_INDEX_NAME);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;

    console.log(`📥 Loading saved social posts for project ${projectId}`);

    // Query Pinecone for saved posts
    const queryResponse = await index.namespace('social-posts').query({
      vector: new Array(1024).fill(0), // Dummy vector for metadata-only query
      filter: {
        projectId: { $eq: projectId },
        userId: { $eq: userId },
        documentType: { $eq: 'social-post' }
      },
      topK: 100,
      includeMetadata: true
    });

    const savedPosts = queryResponse.matches
      .map(match => {
        if (!match.metadata) return null;
        
        const metadata = match.metadata;
        return {
          id: match.id,
          platform: metadata.platform as string,
          content: metadata.content as string,
          hashtags: metadata.hashtags ? JSON.parse(metadata.hashtags as string) : [],
          characterCount: metadata.characterCount as number,
          status: metadata.status as 'posted' | 'not-yet-posted',
          createdAt: metadata.createdAt as string,
          postedAt: metadata.postedAt as string || undefined,
          performance: {
            likes: metadata.likes as number || 0,
            shares: metadata.shares as number || 0,
            comments: metadata.comments as number || 0,
            views: metadata.views as number || 0,
            clicks: metadata.clicks as number || 0,
            engagement_rate: metadata.engagement_rate as number || 0
          }
        };
      })
      .filter(post => post !== null)
      .sort((a, b) => new Date(b!.createdAt).getTime() - new Date(a!.createdAt).getTime()); // Sort by creation date, newest first

    console.log(`✅ Found ${savedPosts.length} saved social posts`);
    
    return NextResponse.json({ 
      success: true, 
      savedPosts,
      count: savedPosts.length 
    });

  } catch (error) {
    console.error('❌ Load saved posts error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        success: false, 
        error: `Error loading saved posts: ${errorMessage}` 
      },
      { status: 500 }
    );
  }
}
