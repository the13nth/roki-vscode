import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin (part of binghi_admins organization)
    const user = await currentUser();
    const isAdmin = user?.organizationMemberships?.some((membership: any) => 
      membership.organization?.slug === 'binghi_admins' || 
      membership.organization?.name === 'binghi_admins'
    );

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    console.log('🔐 Admin stats request from user:', userId);

    // Get statistics from Pinecone
    const stats = await getAdminStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to fetch admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin statistics' },
      { status: 500 }
    );
  }
}

async function getAdminStats() {
  const pinecone = getPineconeClient();
  const index = pinecone.index(PINECONE_INDEX_NAME);

  // Get all projects
  const projectsResponse = await index.namespace('projects').query({
    vector: new Array(1024).fill(0.1),
    topK: 1000,
    includeMetadata: true
  });

  // Get all token usage records
  const tokenUsageResponse = await index.namespace('token-usage').query({
    vector: new Array(1024).fill(0.1),
    topK: 1000,
    includeMetadata: true
  });

  // Get all user API configs to count users
  const userConfigsResponse = await index.namespace('user-api-configs').query({
    vector: new Array(1024).fill(0.1),
    topK: 1000,
    includeMetadata: true
  });

  // Process projects data
  const projects = projectsResponse.matches || [];
  const uniqueUsers = new Set<string>();
  const projectsByStatus: Record<string, number> = {};
  const projectsByUser: Record<string, number> = {};

  projects.forEach((match: any) => {
    const metadata = match.metadata;
    if (metadata) {
      uniqueUsers.add(metadata.userId);
      
      // Count projects by status
      const status = metadata.progress?.status || 'unknown';
      projectsByStatus[status] = (projectsByStatus[status] || 0) + 1;
      
      // Count projects by user
      projectsByUser[metadata.userId] = (projectsByUser[metadata.userId] || 0) + 1;
    }
  });

  // Process token usage data
  const tokenUsage = tokenUsageResponse.matches || [];
  const totalTokens = tokenUsage.reduce((sum: number, match: any) => {
    const metadata = match.metadata;
    return sum + (metadata?.tokensUsed || 0);
  }, 0);

  const tokenUsageByUser: Record<string, number> = {};
  tokenUsage.forEach((match: any) => {
    const metadata = match.metadata;
    if (metadata?.userId) {
      tokenUsageByUser[metadata.userId] = (tokenUsageByUser[metadata.userId] || 0) + (metadata.tokensUsed || 0);
    }
  });

  // Get user names for display
  const userNames: Record<string, string> = {};
  projects.forEach((match: any) => {
    const metadata = match.metadata;
    if (metadata?.userId && metadata?.userName) {
      userNames[metadata.userId] = metadata.userName;
    }
  });

  // Convert to arrays for the frontend
  const tokenUsageByUserArray = Object.entries(tokenUsageByUser)
    .map(([userId, tokens]) => ({
      userId,
      userName: userNames[userId] || 'Unknown User',
      tokens
    }))
    .sort((a, b) => b.tokens - a.tokens);

  const projectsByUserArray = Object.entries(projectsByUser)
    .map(([userId, count]) => ({
      userId,
      userName: userNames[userId] || 'Unknown User',
      projectCount: count
    }))
    .sort((a, b) => b.projectCount - a.projectCount);

  // Count analyses (this would need to be tracked separately)
  // For now, we'll estimate based on token usage
  const totalAnalyses = Math.ceil(totalTokens / 1000); // Rough estimate

  // Generate recent activity (this would need to be tracked separately)
  const recentActivity = projects.slice(0, 10).map((match: any) => {
    const metadata = match.metadata;
    return {
      type: 'project_updated',
      user: userNames[metadata?.userId] || 'Unknown User',
      project: metadata?.name || 'Unknown Project',
      timestamp: metadata?.updatedAt || new Date().toISOString()
    };
  });

  // Analysis types (this would need to be tracked separately)
  const analysesByType = {
    'comprehensive': Math.ceil(totalAnalyses * 0.4),
    'market_analysis': Math.ceil(totalAnalyses * 0.2),
    'technical_review': Math.ceil(totalAnalyses * 0.2),
    'risk_assessment': Math.ceil(totalAnalyses * 0.1),
    'financial_analysis': Math.ceil(totalAnalyses * 0.1)
  };

  return {
    totalUsers: uniqueUsers.size,
    totalProjects: projects.length,
    totalAnalyses,
    totalTokens,
    activeUsers: Math.ceil(uniqueUsers.size * 0.7), // Estimate active users
    projectsByStatus,
    analysesByType,
    tokenUsageByUser: tokenUsageByUserArray,
    recentActivity,
    projectsByUser: projectsByUserArray
  };
}
