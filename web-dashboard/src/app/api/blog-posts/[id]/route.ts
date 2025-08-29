import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    
    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);

    // Get specific blog post from Pinecone using fetch
    const response = await index.namespace('blog-posts').fetch([id]);

    if (!response.records || !response.records[id]) {
      return NextResponse.json(
        { success: false, error: 'Blog post not found' },
        { status: 404 }
      );
    }

    const match = response.records[id];
    const post = {
      id: match.id,
      title: match.metadata?.title || '',
      content: match.metadata?.content || '',
      excerpt: match.metadata?.excerpt || '',
      authorId: match.metadata?.authorId || '',
      authorName: match.metadata?.authorName || '',
      projectId: match.metadata?.projectId || '',
      projectName: match.metadata?.projectName || '',
      tags: match.metadata?.tags ? JSON.parse(String(match.metadata.tags)) : [],
      fundingStatus: match.metadata?.fundingStatus || 'N/A',
      resourceNeeded: match.metadata?.resourceNeeded || 'N/A',
      publishedAt: match.metadata?.publishedAt || '',
      createdAt: match.metadata?.createdAt || '',
      updatedAt: match.metadata?.updatedAt || '',
      readTime: match.metadata?.readTime || 0,
      likes: parseInt(String(match.metadata?.likes || '0')),
      views: parseInt(String(match.metadata?.views || '0'))
    };

    // Increment view count
    try {
      await index.namespace('blog-posts').upsert([
        {
          id: match.id,
          values: match.values,
          metadata: {
            ...match.metadata,
            views: (parseInt(String(match.metadata?.views || '0')) + 1).toString()
          }
        }
      ]);
    } catch (error) {
      console.warn('Failed to increment view count:', error);
    }

    return NextResponse.json({
      success: true,
      post
    });

  } catch (error) {
    console.error('Error fetching blog post:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch blog post' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { title, content, tags = [], fundingStatus = 'N/A', resourceNeeded = 'N/A' } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);

    // First, get the existing post to check ownership
    const existingResponse = await index.namespace('blog-posts').fetch([id]);

    if (!existingResponse.records || !existingResponse.records[id]) {
      return NextResponse.json(
        { success: false, error: 'Blog post not found' },
        { status: 404 }
      );
    }

    const existingPost = existingResponse.records[id];
    
    // Check if user owns the post
    if (existingPost.metadata?.authorId !== userId) {
      return NextResponse.json(
        { success: false, error: 'You can only edit your own posts' },
        { status: 403 }
      );
    }

    // Create excerpt from content (first 200 characters)
    const excerpt = content.length > 200 ? content.substring(0, 200) + '...' : content;
    
    // Calculate read time (rough estimate: 200 words per minute)
    const wordCount = content.split(/\s+/).length;
    const readTime = Math.ceil(wordCount / 200);

    const now = new Date().toISOString();

    // Update blog post in Pinecone
    await index.namespace('blog-posts').upsert([
      {
        id: existingPost.id,
        values: existingPost.values,
        metadata: {
          ...existingPost.metadata,
          title: title.substring(0, 200),
          content: content.substring(0, 40000), // Pinecone metadata limit
          excerpt: excerpt.substring(0, 500),
          tags: JSON.stringify(tags),
          fundingStatus: fundingStatus,
          resourceNeeded: resourceNeeded,
          updatedAt: now,
          readTime
        }
      }
    ]);

    const updatedPost = {
      id: existingPost.id,
      title,
      content,
      excerpt,
      authorId: existingPost.metadata?.authorId || '',
      authorName: existingPost.metadata?.authorName || '',
      projectId: existingPost.metadata?.projectId || '',
      projectName: existingPost.metadata?.projectName || '',
      tags,
      fundingStatus,
      resourceNeeded,
      publishedAt: existingPost.metadata?.publishedAt || '',
      createdAt: existingPost.metadata?.createdAt || '',
      updatedAt: now,
      readTime,
      likes: parseInt(String(existingPost.metadata?.likes || '0')),
      views: parseInt(String(existingPost.metadata?.views || '0'))
    };

    console.log('✅ Blog post updated successfully');
    return NextResponse.json({ 
      success: true, 
      post: updatedPost,
      message: 'Blog post updated successfully' 
    });

  } catch (error) {
    console.error('❌ Update blog post error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        success: false, 
        error: `Error updating blog post: ${errorMessage}` 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);

    // First, get the existing post to check ownership
    const existingResponse = await index.namespace('blog-posts').fetch([id]);

    if (!existingResponse.records || !existingResponse.records[id]) {
      return NextResponse.json(
        { success: false, error: 'Blog post not found' },
        { status: 404 }
      );
    }

    const existingPost = existingResponse.records[id];
    
    // Check if user owns the post
    if (existingPost.metadata?.authorId !== userId) {
      return NextResponse.json(
        { success: false, error: 'You can only delete your own posts' },
        { status: 403 }
      );
    }

    // Delete blog post from Pinecone
    await index.namespace('blog-posts').deleteOne(id);

    console.log('✅ Blog post deleted successfully');
    return NextResponse.json({ 
      success: true,
      message: 'Blog post deleted successfully' 
    });

  } catch (error) {
    console.error('❌ Delete blog post error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        success: false, 
        error: `Error deleting blog post: ${errorMessage}` 
      },
      { status: 500 }
    );
  }
}
