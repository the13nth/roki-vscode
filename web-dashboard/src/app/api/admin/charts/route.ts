import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';

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

    // Check if user is admin using session claims
    const isAdmin = sessionClaims?.org_slug === 'binghi_admins' || 
                   sessionClaims?.org_name === 'binghi_admins' ||
                   sessionClaims?.org_id?.includes('binghi_admins');

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
          
          const isAdminMember = Array.isArray(memberships) && memberships.some((membership: any) => 
            membership.organization?.slug === 'binghi_admins' || 
            membership.organization?.name === 'binghi_admins' ||
            membership.organization?.slug?.includes('binghi_admins')
          );

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

    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get('timeRange') || '30d';

    console.log('📊 Chart data request from user:', userId, 'timeRange:', timeRange);

    // Get time series data
    const chartData = await getTimeSeriesData(timeRange);

    return NextResponse.json(chartData);
  } catch (error) {
    console.error('Failed to fetch chart data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
}

async function getTimeSeriesData(timeRange: string) {
  const pinecone = getPineconeClient();
  const index = pinecone.index(PINECONE_INDEX_NAME);

  // Calculate date range
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  console.log('📅 Date range:', { startDate: startDate.toISOString(), endDate: endDate.toISOString() });

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

  // Get all analyses
  const analysesResponse = await index.namespace('analyses').query({
    vector: new Array(1024).fill(0.1),
    topK: 1000,
    includeMetadata: true
  });

  // Get all user API configs
  const userConfigsResponse = await index.namespace('user-api-configs').query({
    vector: new Array(1024).fill(0.1),
    topK: 1000,
    includeMetadata: true
  });

  // Calculate costs using Google's actual pricing
  const calculateCost = (inputTokens: number, outputTokens: number): number => {
    const inputCostPerMillion = 0.075; // Google Gemini 1.5 Flash pricing
    const outputCostPerMillion = 0.30;
    
    const inputCost = (inputTokens / 1000000) * inputCostPerMillion;
    const outputCost = (outputTokens / 1000000) * outputCostPerMillion;
    
    return inputCost + outputCost;
  };

  // Process data by date
  const dailyData: Record<string, { projects: number; users: Set<string>; analyses: number; tokens: number; cost: number }> = {};

  // Initialize daily data structure
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    dailyData[dateKey] = {
      projects: 0,
      users: new Set(),
      analyses: 0,
      tokens: 0,
      cost: 0
    };
  }

  // Process projects
  projectsResponse.matches?.forEach((match: any) => {
    const metadata = match.metadata;
    if (metadata?.createdAt || metadata?.lastModified) {
      const date = new Date(metadata.createdAt || metadata.lastModified);
      const dateKey = date.toISOString().split('T')[0];
      
      if (dailyData[dateKey]) {
        dailyData[dateKey].projects++;
        if (metadata.userId) {
          dailyData[dateKey].users.add(metadata.userId);
        }
      }
    }
  });

  // Process token usage
  tokenUsageResponse.matches?.forEach((match: any) => {
    const metadata = match.metadata;
    if (metadata?.timestamp) {
      const date = new Date(metadata.timestamp);
      const dateKey = date.toISOString().split('T')[0];
      
      if (dailyData[dateKey]) {
        const tokens = metadata.totalTokens || metadata.tokensUsed || 0;
        dailyData[dateKey].tokens += tokens;
        
        // Calculate cost for this day
        const inputTokens = tokens * 0.6; // Assuming 60% input, 40% output
        const outputTokens = tokens * 0.4;
        const dayCost = calculateCost(inputTokens, outputTokens);
        dailyData[dateKey].cost += dayCost;
      }
    }
  });

  // Process analyses from token usage records (more accurate)
  tokenUsageResponse.matches?.forEach((match: any) => {
    const metadata = match.metadata;
    if (metadata?.timestamp) {
      const date = new Date(metadata.timestamp);
      const dateKey = date.toISOString().split('T')[0];
      
      if (dailyData[dateKey]) {
        dailyData[dateKey].analyses++;
      }
    }
  });

  // Process user registrations (from user configs)
  userConfigsResponse.matches?.forEach((match: any) => {
    const metadata = match.metadata;
    if (metadata?.timestamp) {
      const date = new Date(metadata.timestamp);
      const dateKey = date.toISOString().split('T')[0];
      
      if (dailyData[dateKey] && metadata.userId) {
        dailyData[dateKey].users.add(metadata.userId);
      }
    }
  });

  // Convert to array format for charts
  const chartData = Object.entries(dailyData)
    .map(([date, data]) => ({
      date,
      projects: data.projects,
      users: data.users.size,
      analyses: data.analyses,
      tokens: data.tokens,
      cost: parseFloat(data.cost.toFixed(2))
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  console.log('📈 Generated chart data points:', chartData.length);

  return chartData;
}
