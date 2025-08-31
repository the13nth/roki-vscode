import { NextRequest, NextResponse } from 'next/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Fetching blog posts for jobs...');
    
    // Fetch all blog posts directly from Pinecone
    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);
    
    const blogQuery = await index.namespace('blog-posts').query({
      vector: new Array(1024).fill(0.1),
      topK: 100,
      includeMetadata: true
    });
    
    const blogPosts = blogQuery.matches || [];
    console.log(`📝 Found ${blogPosts.length} blog posts`);
    
    // Filter blog posts that have requirements
    const postsWithRequirements = blogPosts.filter((match: any) => {
      const metadata = match.metadata;
      const hasFundingNeed = metadata.fundingStatus === 'funding needed';
      const hasResourceNeed = metadata.resourceNeeded && metadata.resourceNeeded !== 'N/A';
      return hasFundingNeed || hasResourceNeed;
    });
    
    console.log(`🎯 Found ${postsWithRequirements.length} blog posts with requirements`);
    
    // Convert blog posts to job format
    const projectsWithRequirements = postsWithRequirements.map((match: any) => {
      const metadata = match.metadata;
      return {
        projectId: metadata.projectId,
        blogId: match.id, // Add the blog post ID
        name: metadata.title,
        description: metadata.excerpt,
        authorName: metadata.authorName,
        createdAt: metadata.publishedAt,
        lastModified: metadata.updatedAt,
        fundingStatus: metadata.fundingStatus,
        resourceNeeded: metadata.resourceNeeded,
        requirements: [],
        tags: metadata.tags ? JSON.parse(metadata.tags) : [],
        isPublic: true
      };
    });
    
    console.log('✅ Jobs API returning:', projectsWithRequirements.length, 'opportunities');
    
    return NextResponse.json({
      success: true,
      projects: projectsWithRequirements
    });

  } catch (error) {
    console.error('❌ Error in Jobs API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}
