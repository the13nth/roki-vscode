import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('📝 Fetching all blog posts...');
    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);

    // Get all blog posts from Pinecone
    const response = await index.namespace('blog-posts').query({
      vector: new Array(1024).fill(0.1),
      topK: 100,
      includeMetadata: true,
      filter: {
        documentType: { $eq: 'blog-post' }
      }
    });

    const posts = response.matches?.map(match => ({
      id: match.id,
      title: match.metadata?.title || '',
      content: match.metadata?.content || '',
      excerpt: match.metadata?.excerpt || '',
      authorId: match.metadata?.authorId || '',
      authorName: match.metadata?.authorName || '',
      projectId: match.metadata?.projectId || '',
      projectName: match.metadata?.projectName || '',
      tags: match.metadata?.tags ? JSON.parse(match.metadata.tags as string) : [],
      fundingStatus: match.metadata?.fundingStatus || 'N/A',
      resourceNeeded: match.metadata?.resourceNeeded || 'N/A',
      publishedAt: match.metadata?.publishedAt || '',
      createdAt: match.metadata?.createdAt || '',
      updatedAt: match.metadata?.updatedAt || '',
      readTime: match.metadata?.readTime || 0,
      views: parseInt(String(match.metadata?.views || '0'))
    })) || [];
    
    console.log(`📝 Found ${posts.length} blog posts`);
    console.log(`📝 Post IDs:`, posts.map(p => p.id));

    // Sort by published date (newest first)
    posts.sort((a, b) => new Date(String(b.publishedAt)).getTime() - new Date(String(a.publishedAt)).getTime());

    return NextResponse.json({
      success: true,
      posts
    });

  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch blog posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, content, projectId, tags = [], fundingStatus = 'N/A', resourceNeeded = 'N/A' } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);

    // Generate post ID
    const postId = `blog-post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create excerpt from content (first 200 characters)
    const excerpt = content.length > 200 ? content.substring(0, 200) + '...' : content;
    
    // Calculate read time (rough estimate: 200 words per minute)
    const wordCount = content.split(/\s+/).length;
    const readTime = Math.ceil(wordCount / 200);

    // Get project name if projectId is provided
    let projectName = '';
    if (projectId) {
      try {
        const projectResponse = await index.namespace('projects').query({
          vector: new Array(1024).fill(0.1),
          filter: {
            projectId: { $eq: projectId }
          },
          topK: 1,
          includeMetadata: true
        });
        
        if (projectResponse.matches?.[0]?.metadata?.name) {
          projectName = String(projectResponse.matches[0].metadata.name);
        }
      } catch (error) {
        console.warn('Could not fetch project name:', error);
      }
    }

    // Get user details from Clerk
    let authorName = `User ${userId.slice(-6)}`;
    try {
      const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
      if (CLERK_SECRET_KEY) {
        const userResponse = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
          headers: {
            'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          authorName = userData.first_name && userData.last_name 
            ? `${userData.first_name} ${userData.last_name}`
            : userData.username || userData.email_addresses?.[0]?.email_address || authorName;
        }
      }
    } catch (error) {
      console.warn('Could not fetch user details from Clerk:', error);
    }

    const now = new Date().toISOString();

    // Save blog post to Pinecone
    await index.namespace('blog-posts').upsert([
      {
        id: postId,
        values: new Array(1024).fill(0.1), // Placeholder vector
        metadata: {
          title: title.substring(0, 200),
          content: content.substring(0, 40000), // Pinecone metadata limit
          excerpt: excerpt.substring(0, 500),
          authorId: userId,
          authorName: authorName.substring(0, 100),
          projectId: projectId || '',
          projectName: projectName.substring(0, 100),
          tags: JSON.stringify(tags),
          fundingStatus: fundingStatus,
          resourceNeeded: resourceNeeded,
          publishedAt: now,
          createdAt: now,
          updatedAt: now,
          readTime,
          views: 0,
          documentType: 'blog-post'
        },
      },
    ]);

    const newPost = {
      id: postId,
      title,
      content,
      excerpt,
      authorId: userId,
      authorName,
      projectId: projectId || '',
      projectName,
      tags,
      fundingStatus,
      resourceNeeded,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
      readTime,
      views: 0
    };

    console.log('✅ Blog post created successfully');
    return NextResponse.json({ 
      success: true, 
      post: newPost,
      message: 'Blog post created successfully' 
    });

  } catch (error) {
    console.error('❌ Create blog post error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        success: false, 
        error: `Error creating blog post: ${errorMessage}` 
      },
      { status: 500 }
    );
  }
}
