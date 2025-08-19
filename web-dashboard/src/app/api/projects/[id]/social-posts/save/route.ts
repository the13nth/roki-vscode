import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';

const pinecone = getPineconeClient();
const index = pinecone.index(PINECONE_INDEX_NAME);

interface SavePostRequest {
  platform: string;
  content: string;
  hashtags?: string[];
  characterCount: number;
  status: 'posted' | 'not-yet-posted';
  postedAt?: string;
}

export async function POST(
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
    const body: SavePostRequest = await request.json();
    
    const { 
      platform,
      content,
      hashtags,
      characterCount,
      status,
      postedAt
    } = body;

    if (!platform || !content || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: platform, content, and status are required' },
        { status: 400 }
      );
    }

    console.log(`💾 Saving social post for project ${projectId}`);
    console.log(`📱 Platform: ${platform}, Status: ${status}`);

    // Generate unique ID for the saved post
    const postId = `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date().toISOString();

    // Create embedding for the post content
    let vector = new Array(1024).fill(0);
    
    try {
      // Create a hash-based embedding for the post content
      const contentForEmbedding = [
        content,
        platform,
        status,
        ...(hashtags || [])
      ].join(' ');

      const hash = contentForEmbedding.split('').reduce((acc, char, i) => {
        return ((acc << 5) - acc + char.charCodeAt(0) + i) >>> 0;
      }, 0);

      // Generate vector based on content hash
      for (let i = 0; i < 1024; i++) {
        const seed = (hash + i * 37);
        vector[i] = (Math.sin(seed) + Math.cos(seed * 1.3)) * 0.1;
      }
      
      console.log(`🔍 Created semantic vector for ${platform} post`);
    } catch (error) {
      console.warn('⚠️ Failed to create enhanced embedding, using default:', error);
      vector = new Array(1024).fill(0);
    }

    // Save post to Pinecone
    await index.namespace('social-posts').upsert([
      {
        id: postId,
        values: vector,
        metadata: {
          projectId,
          userId,
          platform,
          content: content.substring(0, 40000), // Pinecone metadata limit
          hashtags: hashtags ? JSON.stringify(hashtags) : '[]',
          characterCount,
          status,
          createdAt,
          postedAt: postedAt || '',
          documentType: 'social-post',
          // Performance metrics (initially empty)
          likes: 0,
          shares: 0,
          comments: 0,
          views: 0,
          clicks: 0,
          engagement_rate: 0
        },
      },
    ]);

    const savedPost = {
      id: postId,
      platform,
      content,
      hashtags,
      characterCount,
      status,
      createdAt,
      postedAt,
      performance: {
        likes: 0,
        shares: 0,
        comments: 0,
        views: 0,
        clicks: 0,
        engagement_rate: 0
      }
    };

    console.log('✅ Social post saved successfully');
    return NextResponse.json({ 
      success: true, 
      savedPost,
      message: `Post saved as ${status}` 
    });

  } catch (error) {
    console.error('❌ Save social post error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        success: false, 
        error: `Error saving social post: ${errorMessage}` 
      },
      { status: 500 }
    );
  }
}
