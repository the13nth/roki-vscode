import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';
import { TokenTrackingService } from '@/lib/tokenTrackingService';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔐 Admin stats request from user:', userId);
    console.log('🔐 Session claims:', JSON.stringify(sessionClaims, null, 2));

    // Check if user is admin using session claims
    const isAdmin = sessionClaims?.org_slug === 'binghi_admins' || 
                   sessionClaims?.org_name === 'binghi_admins' ||
                   sessionClaims?.org_id?.includes('binghi_admins');

    console.log('🔐 Is admin check:', {
      org_slug: sessionClaims?.org_slug,
      org_name: sessionClaims?.org_name,
      org_id: sessionClaims?.org_id,
      isAdmin
    });

    if (!isAdmin) {
      // Use Clerk API to directly check user's organization memberships
      try {
        const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
        if (!CLERK_SECRET_KEY) {
          throw new Error('CLERK_SECRET_KEY not found');
        }

        const userResponse = await fetch(`https://api.clerk.com/v1/users/${userId}/organization_memberships`, {
          headers: {
            'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        if (userResponse.ok) {
          const response = await userResponse.json();
          const memberships = response.data || response || [];
          
          console.log('🔐 Raw API response:', response);
          
          const isAdminMember = Array.isArray(memberships) && memberships.some((membership: any) => 
            membership.organization?.slug === 'binghi_admins' || 
            membership.organization?.name === 'binghi_admins' ||
            membership.organization?.slug?.includes('binghi_admins')
          );

          console.log('🔐 Direct API admin check:', {
            memberships: Array.isArray(memberships) ? memberships.map((m: any) => ({ 
              orgName: m.organization?.name, 
              orgSlug: m.organization?.slug,
              role: m.role 
            })) : [],
            isAdminMember
          });

          if (isAdminMember) {
            console.log('✅ Admin access granted via direct API check');
          } else {
            console.log('❌ Admin access denied for user:', userId);
            return NextResponse.json(
              { error: 'Admin access required' },
              { status: 403 }
            );
          }
        } else {
          console.log('❌ Failed to fetch user memberships:', userResponse.status);
          return NextResponse.json(
            { error: 'Failed to verify admin status' },
            { status: 500 }
          );
        }
      } catch (error) {
        console.error('❌ Error checking admin status:', error);
        return NextResponse.json(
          { error: 'Failed to verify admin status' },
          { status: 500 }
        );
      }
    }

    console.log('✅ Admin access granted for user:', userId);

    // Get time range from query params
    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get('timeRange') || '30d';

    // Get statistics from Pinecone
    const stats = await getAdminStats(timeRange);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to fetch admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin statistics' },
      { status: 500 }
    );
  }
}

async function getAdminStats(timeRange: string = '30d') {
  const pinecone = getPineconeClient();
  const index = pinecone.index(PINECONE_INDEX_NAME);

  console.log('🔍 Fetching admin statistics from Pinecone...');

  // Get all projects
  const projectsResponse = await index.namespace('projects').query({
    vector: new Array(1024).fill(0.1),
    topK: 1000,
    includeMetadata: true
  });

  // Get all token usage records (saved to main index, not namespace)
  const tokenUsageResponse = await index.query({
    vector: new Array(1024).fill(0.1),
    filter: {
      type: { $eq: 'token_usage' }
    },
    topK: 1000,
    includeMetadata: true
  });

  // Get all token alerts
  const tokenAlertsResponse = await index.query({
    vector: new Array(1024).fill(0.1),
    filter: {
      type: { $eq: 'token_alert' }
    },
    topK: 1000,
    includeMetadata: true
  });

  // Get all analyses
  const analysesResponse = await index.namespace('analyses').query({
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

  // Get user details from Clerk API
  const userDetails: Record<string, { email: string; name: string; createdAt: string }> = {};
  
  try {
    const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
    if (CLERK_SECRET_KEY) {
      // Get all users from Clerk with pagination
      let allUsers: any[] = [];
      let offset = 0;
      const limit = 100;
      
      while (true) {
        const usersResponse = await fetch(`https://api.clerk.com/v1/users?limit=${limit}&offset=${offset}`, {
          headers: {
            'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          const users = usersData.data || usersData || [];
          
          if (users.length === 0) break;
          
          allUsers = allUsers.concat(users);
          offset += limit;
          
          // Break if we've fetched all users
          if (users.length < limit) break;
        } else {
          console.error('Failed to fetch users from Clerk:', usersResponse.status, usersResponse.statusText);
          break;
        }
      }
      
      console.log(`📊 Fetched ${allUsers.length} users from Clerk API`);
      
      // Log the first few user objects for debugging
      console.log('🔍 Sample user objects from Clerk API:');
      allUsers.slice(0, 3).forEach((user: any, index: number) => {
        console.log(`User ${index + 1}:`, {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          email_addresses: user.email_addresses,
          primary_email_address_id: user.primary_email_address_id,
          created_at: user.created_at,
          full_object: user
        });
      });
      
      allUsers.forEach((user: any) => {
        const primaryEmail = user.email_addresses?.find((email: any) => email.id === user.primary_email_address_id);
        const email = primaryEmail?.email_address || user.email_addresses?.[0]?.email_address || 'No email';
        const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || user.email_addresses?.[0]?.email_address?.split('@')[0] || 'Unknown';
        const createdAt = user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown';
        
        userDetails[user.id] = {
          email,
          name,
          createdAt
        };
      });
      
      console.log('📊 Processed user details:', Object.keys(userDetails).length, 'users');
      console.log('📊 Sample processed user details:', Object.entries(userDetails).slice(0, 3));
      
      console.log('📊 User details populated:', Object.keys(userDetails).length, 'users');
    } else {
      console.error('CLERK_SECRET_KEY not found in environment variables');
    }
  } catch (error) {
    console.error('Failed to fetch user details from Clerk:', error);
  }

  console.log('📊 Raw data counts:', {
    projects: projectsResponse.matches?.length || 0,
    tokenUsage: tokenUsageResponse.matches?.length || 0,
    tokenAlerts: tokenAlertsResponse.matches?.length || 0,
    analyses: analysesResponse.matches?.length || 0,
    userConfigs: userConfigsResponse.matches?.length || 0
  });

  // Process projects data
  const projects = projectsResponse.matches || [];
  const uniqueUsers = new Set<string>();
  const projectsByStatus: Record<string, number> = {};
  const projectsByUser: Record<string, number> = {};
  const userNames: Record<string, string> = {};

  projects.forEach((match: any) => {
    const metadata = match.metadata;
    if (metadata) {
      const userId = metadata.userId;
      if (userId) {
        uniqueUsers.add(userId);
        
        // Count projects by status
        const status = metadata.progress?.status || metadata.status || 'active';
        projectsByStatus[status] = (projectsByStatus[status] || 0) + 1;
        
        // Count projects by user
        projectsByUser[userId] = (projectsByUser[userId] || 0) + 1;
        
        // Get user name from project metadata
        if (metadata.name && !userNames[userId]) {
          // Try to extract name from project data
          try {
            const projectData = metadata.projectData ? JSON.parse(metadata.projectData) : null;
            if (projectData?.userName) {
              userNames[userId] = projectData.userName;
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
      }
    }
  });

  // Process token usage data
  const tokenUsage = tokenUsageResponse.matches || [];
  const totalTokens = tokenUsage.reduce((sum: number, match: any) => {
    const metadata = match.metadata;
    return sum + (metadata?.totalTokens || metadata?.tokensUsed || 0);
  }, 0);

  const tokenUsageByUser: Record<string, number> = {};
  const analysisTypes: Record<string, number> = {};
  const userDailyUsage: Record<string, number> = {};
  const userMonthlyProjections: Record<string, number> = {};

  // Process token usage with enhanced tracking
  tokenUsage.forEach((match: any) => {
    const metadata = match.metadata;
    if (metadata) {
      const userId = metadata.userId;
      const totalTokens = metadata.totalTokens || metadata.tokensUsed || 0;
      const analysisType = metadata.analysisType || 'unknown';
      const timestamp = metadata.timestamp;
      
      if (userId) {
        tokenUsageByUser[userId] = (tokenUsageByUser[userId] || 0) + totalTokens;
        
        // Track daily usage
        if (timestamp) {
          const date = new Date(timestamp as string).toISOString().split('T')[0];
          const today = new Date().toISOString().split('T')[0];
          if (date === today) {
            userDailyUsage[userId] = (userDailyUsage[userId] || 0) + totalTokens;
          }
        }
      }
      
      // Normalize analysis type names
      const normalizedType = normalizeAnalysisType(analysisType);
      analysisTypes[normalizedType] = (analysisTypes[normalizedType] || 0) + 1;
    }
  });

  // Calculate monthly projections based on daily averages
  Object.keys(tokenUsageByUser).forEach(userId => {
    const dailyAvg = userDailyUsage[userId] || 0;
    userMonthlyProjections[userId] = dailyAvg * 30;
  });

  // Process token alerts
  const tokenAlerts = tokenAlertsResponse.matches?.map(match => match.metadata).filter(Boolean) || [];
  const alerts = tokenAlerts.map((metadata: any) => ({
    userId: metadata.userId,
    type: metadata.alertType,
    message: metadata.message,
    timestamp: metadata.timestamp,
    severity: metadata.severity,
    currentUsage: metadata.currentUsage,
    limit: metadata.limit
  }));

  // Calculate rate limiting statistics
  const rateLimitStats = calculateRateLimitStats(tokenUsageByUser, userDailyUsage);

  // Calculate cost trends
  const costTrends = calculateCostTrends(tokenUsage, timeRange);

  // Helper function to normalize analysis type names
  function normalizeAnalysisType(type: string): string {
    const typeMap: Record<string, string> = {
      'pitch-generation': 'Pitch Generation',
      'differentiation-analysis': 'Differentiation Analysis',
      'bmc-analysis': 'Business Model Canvas',
      'project-specs-generation': 'Project Specifications',
      'technical-analysis': 'Technical Analysis',
      'financial-analysis': 'Financial Analysis',
      'roast-analysis': 'Roast Analysis',
      'market-analysis': 'Market Analysis',
      'social-posts-generation': 'Social Posts Generation',
      'social-post-enhancement': 'Social Post Enhancement',
      'social-analysis': 'Social Analysis',
      'description-expansion': 'Description Expansion',
      'improve_document': 'Document Improvement',
      'context-injection': 'Context Injection',
      'pitch': 'Pitch Generation',
      'differentiation': 'Differentiation Analysis',
      'bmc': 'Business Model Canvas',
      'technical': 'Technical Analysis',
      'financial': 'Financial Analysis',
      'roast': 'Roast Analysis',
      'market': 'Market Analysis'
    };
    
    return typeMap[type.toLowerCase()] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  // Get user names from user configs as fallback and ensure all users have details
  userConfigsResponse.matches?.forEach((match: any) => {
    const metadata = match.metadata;
    if (metadata?.userId) {
      // If we don't have user details from Clerk, try to get them from user configs
      if (!userDetails[metadata.userId]) {
        const email = metadata.email || metadata.userEmail || 'No email';
        const name = metadata.userName || metadata.name || `User ${metadata.userId.slice(-6)}`;
        const createdAt = metadata.createdAt || metadata.created_at || 'Unknown';
        
        userDetails[metadata.userId] = {
          email,
          name,
          createdAt
        };
      }
      
      // Also populate userNames for consistency
      if (!userNames[metadata.userId]) {
        userNames[metadata.userId] = userDetails[metadata.userId]?.name || `User ${metadata.userId.slice(-6)}`;
      }
    }
  });
  
  // Ensure all unique users have at least basic details
  console.log('📊 Unique users found in projects/token usage:', Array.from(uniqueUsers));
  console.log('📊 User details before fallback:', Object.keys(userDetails));
  
  Array.from(uniqueUsers).forEach(userId => {
    if (!userDetails[userId]) {
      console.log(`📊 Adding fallback details for user: ${userId}`);
      userDetails[userId] = {
        email: 'No email',
        name: `User ${userId.slice(-6)}`,
        createdAt: 'Unknown'
      };
    }
  });
  
  console.log('📊 User details after fallback:', Object.keys(userDetails));

  // Convert to arrays for the frontend
  const tokenUsageByUserArray = Object.entries(tokenUsageByUser)
    .map(([userId, tokens]) => ({
      userId,
      userName: userDetails[userId]?.name || userNames[userId] || `User ${userId.slice(-6)}`,
      email: userDetails[userId]?.email || 'No email',
      tokens
    }))
    .sort((a, b) => b.tokens - a.tokens);

  const projectsByUserArray = Object.entries(projectsByUser)
    .map(([userId, count]) => ({
      userId,
      userName: userDetails[userId]?.name || userNames[userId] || `User ${userId.slice(-6)}`,
      email: userDetails[userId]?.email || 'No email',
      projectCount: count
    }))
    .sort((a, b) => b.projectCount - a.projectCount);

  // Calculate costs using Google's actual pricing
  const calculateCost = (inputTokens: number, outputTokens: number): number => {
    // Google Gemini 1.5 Flash pricing (as of 2024)
    // Input: $0.075 per 1M tokens (≤128k context) or $0.15 per 1M tokens (>128k context)
    // Output: $0.30 per 1M tokens (≤128k context) or $0.60 per 1M tokens (>128k context)
    
    const inputCostPerMillion = 0.075; // Using the lower tier for most usage
    const outputCostPerMillion = 0.30;
    
    const inputCost = (inputTokens / 1000000) * inputCostPerMillion;
    const outputCost = (outputTokens / 1000000) * outputCostPerMillion;
    
    return inputCost + outputCost;
  };

  // Calculate cost breakdown by user
  const userCosts = Object.entries(tokenUsageByUser).map(([userId, tokens]) => {
    const userInputTokens = tokens * 0.6;
    const userOutputTokens = tokens * 0.4;
    const userCost = calculateCost(userInputTokens, userOutputTokens);
    
    return {
      userId,
      userName: userNames[userId] || `User ${userId.slice(-6)}`,
      tokens,
      cost: userCost
    };
  }).sort((a, b) => b.cost - a.cost);

  // Create comprehensive user list with all details
  // First, get all users from Clerk API and create a base list
  const clerkUserIds = Object.keys(userDetails);
  console.log('📊 Clerk user IDs:', clerkUserIds);
  
  // Create a consolidated list starting with Clerk users
  const allUsers = await Promise.all(clerkUserIds.map(async userId => {
    // Get user subscription from user-api-configs namespace
    const userSubscriptionResponse = await index.namespace('user-api-configs').query({
      vector: new Array(1024).fill(0.1),
      filter: { 
        type: { $eq: 'user_subscription' },
        userId: { $eq: userId }
      },
      topK: 1,
      includeMetadata: true
    });

    const subscription = userSubscriptionResponse.matches?.[0]?.metadata;

    return {
      userId,
      userName: userDetails[userId]?.name || `User ${userId.slice(-6)}`,
      email: userDetails[userId]?.email || 'No email',
      createdAt: userDetails[userId]?.createdAt || 'Unknown',
      projectCount: projectsByUser[userId] || 0,
      tokenUsage: tokenUsageByUser[userId] || 0,
      cost: userCosts.find(u => u.userId === userId)?.cost || 0,
      dailyUsage: userDailyUsage[userId] || 0,
      monthlyProjection: userMonthlyProjections[userId] || 0,
      rateLimitStatus: getRateLimitStatus(userId, userDailyUsage[userId] || 0, userMonthlyProjections[userId] || 0),
      plan: subscription?.planName || 'Free',
      subscriptionStatus: subscription?.status || 'Free',
      trialEnd: subscription?.trialEnd || null
    };
  }));
  
  // Add any database-only users (users who have data but aren't in Clerk)
  const databaseOnlyUsers = Array.from(uniqueUsers).filter(userId => !clerkUserIds.includes(userId));
  console.log('📊 Database-only users:', databaseOnlyUsers);
  
  if (databaseOnlyUsers.length > 0) {
    const databaseUsers = await Promise.all(databaseOnlyUsers.map(async userId => {
      // Get user subscription from user-api-configs namespace
      const userSubscriptionResponse = await index.namespace('user-api-configs').query({
        vector: new Array(1024).fill(0.1),
        filter: { 
          type: { $eq: 'user_subscription' },
          userId: { $eq: userId }
        },
        topK: 1,
        includeMetadata: true
      });

      const subscription = userSubscriptionResponse.matches?.[0]?.metadata;

      return {
        userId,
        userName: `User ${userId.slice(-6)}`,
        email: 'No email (Database only)',
        createdAt: 'Unknown',
        projectCount: projectsByUser[userId] || 0,
        tokenUsage: tokenUsageByUser[userId] || 0,
        cost: userCosts.find(u => u.userId === userId)?.cost || 0,
        dailyUsage: userDailyUsage[userId] || 0,
        monthlyProjection: userMonthlyProjections[userId] || 0,
        rateLimitStatus: getRateLimitStatus(userId, userDailyUsage[userId] || 0, userMonthlyProjections[userId] || 0),
        plan: subscription?.planName || 'Free',
        subscriptionStatus: subscription?.status || 'Free',
        trialEnd: subscription?.trialEnd || null
      };
    }));
    
    allUsers.push(...databaseUsers);
  }

  allUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Log the final user data that will be returned
  console.log('📊 Final allUsers data to be returned:');
  console.log('📊 Total allUsers count:', allUsers.length);
  allUsers.forEach((user: any, index: number) => {
    console.log(`Final User ${index + 1}:`, {
      userId: user.userId,
      userName: user.userName,
      email: user.email,
      createdAt: user.createdAt,
      projectCount: user.projectCount,
      tokenUsage: user.tokenUsage,
      dailyUsage: user.dailyUsage,
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus
    });
  });

  // Generate recent activity from projects and analyses
  const recentActivity: { type: string; user: string; project: any; timestamp: any; }[] = [];
  
  // Add recent project activities
  projects.slice(0, 5).forEach((match: any) => {
    const metadata = match.metadata;
    if (metadata) {
      recentActivity.push({
        type: 'project_created',
        user: userNames[metadata.userId] || `User ${metadata.userId?.slice(-6)}`,
        project: metadata.name || 'Unknown Project',
        timestamp: metadata.createdAt || metadata.lastModified || new Date().toISOString()
      });
    }
  });

  // Add recent analysis activities from token usage records
  tokenUsage.slice(0, 5).forEach((match: any) => {
    const metadata = match.metadata;
    if (metadata) {
      recentActivity.push({
        type: `${metadata.analysisType || 'analysis'}_completed`,
        user: userNames[metadata.userId] || `User ${metadata.userId?.slice(-6)}`,
        project: metadata.projectId || 'Unknown Project',
        timestamp: metadata.timestamp || new Date().toISOString()
      });
    }
  });

  // Sort by timestamp and take top 10
  recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const topRecentActivity = recentActivity.slice(0, 10);

  // Calculate total analyses from token usage records
  const totalAnalyses = Object.values(analysisTypes).reduce((sum, count) => sum + count, 0);

  // Calculate total cost
  const totalCost = calculateCost(totalTokens * 0.6, totalTokens * 0.4); // Assuming 60% input, 40% output ratio

  // Calculate cost per user
  const costPerUser = totalCost / Math.max(uniqueUsers.size, 1);

  // Calculate average tokens per analysis
  const avgTokensPerAnalysis = totalAnalyses > 0 ? totalTokens / totalAnalyses : 0;

  // Suggested pricing tiers based on usage patterns
  const pricingTiers = {
    free: {
      name: 'Free Tier',
      price: 0,
      tokens: 10000, // 10k tokens per month
      analyses: 5,
      projects: 1,
      features: ['Basic Analysis', 'Project Creation', 'Limited Context']
    },
    starter: {
      name: 'Starter',
      price: 9.99,
      tokens: 100000, // 100k tokens per month
      analyses: 50,
      projects: 3,
      features: ['All Analysis Types', 'Social Posts', 'Enhanced Context']
    },
    professional: {
      name: 'Professional',
      price: 29.99,
      tokens: 500000, // 500k tokens per month
      analyses: 250,
      projects: 10,
      features: ['Priority Support', 'Advanced Analytics', 'Team Collaboration']
    },
    enterprise: {
      name: 'Enterprise',
      price: 99.99,
      tokens: 2000000, // 2M tokens per month
      analyses: 1000,
      projects: 50,
      features: ['Custom Integrations', 'Dedicated Support', 'Advanced Security']
    }
  };

  console.log('📈 Processed statistics:', {
    totalUsers: uniqueUsers.size,
    totalProjects: projects.length,
    totalAnalyses,
    totalTokens,
    totalCost: totalCost.toFixed(2),
    costPerUser: costPerUser.toFixed(2),
    avgTokensPerAnalysis: avgTokensPerAnalysis.toFixed(0),
    projectsByStatus,
    analysisTypes,
    alertsCount: alerts.length,
    rateLimitStats
  });

  return {
    totalUsers: allUsers.length, // Use the consolidated user count
    totalProjects: projects.length,
    totalAnalyses,
    totalTokens,
    totalCost: parseFloat(totalCost.toFixed(2)),
    costPerUser: parseFloat(costPerUser.toFixed(2)),
    avgTokensPerAnalysis: parseFloat(avgTokensPerAnalysis.toFixed(0)),
    activeUsers: Math.ceil(uniqueUsers.size * 0.7), // Estimate active users
    projectsByStatus,
    analysesByType: analysisTypes,
    tokenUsageByUser: tokenUsageByUserArray,
    userCosts,
    pricingTiers,
    recentActivity: topRecentActivity,
    projectsByUser: projectsByUserArray,
    allUsers,
    tokenAlerts: alerts,
    rateLimitStats,
    costTrends
  };
}

// Helper function to calculate rate limiting statistics
function calculateRateLimitStats(tokenUsageByUser: Record<string, number>, userDailyUsage: Record<string, number>) {
  const dailyLimit = 1000000; // 1M tokens per day
  const monthlyLimit = 30000000; // 30M tokens per month
  
  let usersAtLimit = 0;
  let usersNearLimit = 0;
  let totalRateLimitViolations = 0;

  Object.entries(userDailyUsage).forEach(([userId, dailyUsage]) => {
    if (dailyUsage >= dailyLimit) {
      usersAtLimit++;
      totalRateLimitViolations++;
    } else if (dailyUsage >= dailyLimit * 0.8) {
      usersNearLimit++;
    }
  });

  return {
    usersAtLimit,
    usersNearLimit,
    totalRateLimitViolations
  };
}

// Helper function to calculate cost trends
function calculateCostTrends(tokenUsage: any[], timeRange: string) {
  const now = new Date();
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Filter usage by time range
  const recentUsage = tokenUsage.filter(match => {
    const metadata = match.metadata;
    if (metadata?.timestamp) {
      const usageDate = new Date(metadata.timestamp as string);
      return usageDate >= startDate;
    }
    return false;
  });

  // Calculate daily averages
  const dailyCosts: Record<string, number> = {};
  recentUsage.forEach(match => {
    const metadata = match.metadata;
    if (metadata?.timestamp && metadata?.cost) {
      const date = new Date(metadata.timestamp as string).toISOString().split('T')[0];
      dailyCosts[date] = (dailyCosts[date] || 0) + (metadata.cost as number);
    }
  });

  const dailyValues = Object.values(dailyCosts);
  const dailyAverage = dailyValues.length > 0 ? dailyValues.reduce((sum, cost) => sum + cost, 0) / dailyValues.length : 0;
  const monthlyProjection = dailyAverage * 30;

  // Calculate weekly growth (simplified)
  const weeklyGrowth = dailyValues.length > 7 ? 
    ((dailyValues[dailyValues.length - 1] - dailyValues[dailyValues.length - 8]) / dailyValues[dailyValues.length - 8]) * 100 : 0;

  // Calculate cost per token
  const totalTokens = recentUsage.reduce((sum, match) => {
    const metadata = match.metadata;
    return sum + (metadata?.totalTokens || 0);
  }, 0);
  const totalCost = recentUsage.reduce((sum, match) => {
    const metadata = match.metadata;
    return sum + (metadata?.cost || 0);
  }, 0);
  const costPerToken = totalTokens > 0 ? totalCost / totalTokens : 0;

  return {
    dailyAverage,
    weeklyGrowth,
    monthlyProjection,
    costPerToken
  };
}

// Helper function to determine rate limit status
function getRateLimitStatus(userId: string, dailyUsage: number, monthlyProjection: number): 'normal' | 'warning' | 'critical' {
  const dailyLimit = 1000000; // 1M tokens per day
  const monthlyLimit = 30000000; // 30M tokens per month

  if (dailyUsage >= dailyLimit || monthlyProjection >= monthlyLimit) {
    return 'critical';
  } else if (dailyUsage >= dailyLimit * 0.8 || monthlyProjection >= monthlyLimit * 0.8) {
    return 'warning';
  }
  return 'normal';
}
