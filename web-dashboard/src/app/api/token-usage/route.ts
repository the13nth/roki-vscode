import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { TokenTrackingService } from '@/lib/tokenTrackingService';
import { getPineconeClient } from '@/lib/pinecone';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const timeRange = searchParams.get('timeRange') || '30d'; // 7d, 30d, 90d, all
    const groupBy = searchParams.get('groupBy') || 'day'; // day, week, month

    const pinecone = getPineconeClient();
    const index = pinecone.index(process.env.NEXT_PUBLIC_PINECONE_INDEX_NAME || 'roki');
    
    // Build filter based on parameters
    const filter: any = {
      type: { $eq: 'token_usage' }
    };

    if (projectId) {
      filter.projectId = { $eq: projectId };
    }

    // Note: Pinecone doesn't support date filtering with $gte on string fields
    // We'll filter the results after fetching them

    const queryResponse = await index.query({
      vector: new Array(1024).fill(0),
      filter,
      topK: 10000,
      includeMetadata: true
    });

    // Process and aggregate the data
    let usageData = queryResponse.matches
      .map(match => match.metadata)
      .filter((metadata): metadata is Record<string, any> => metadata !== undefined)
      .map(metadata => ({
        projectId: metadata.projectId as string,
        sessionId: metadata.sessionId as string,
        analysisType: metadata.analysisType as string,
        inputTokens: metadata.inputTokens as number,
        outputTokens: metadata.outputTokens as number,
        totalTokens: metadata.totalTokens as number,
        cost: metadata.cost as number,
        timestamp: metadata.timestamp as string
      }));

    // Apply time range filter client-side
    if (timeRange !== 'all') {
      const now = new Date();
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      
      usageData = usageData.filter(item => {
        const itemDate = new Date(item.timestamp);
        return itemDate >= startDate;
      });
    }

    // Aggregate by time period
    const aggregatedData = aggregateByTimePeriod(usageData, groupBy);
    
    // Calculate totals
    const totals = {
      inputTokens: usageData.reduce((sum, item) => sum + item.inputTokens, 0),
      outputTokens: usageData.reduce((sum, item) => sum + item.outputTokens, 0),
      totalTokens: usageData.reduce((sum, item) => sum + item.totalTokens, 0),
      totalCost: usageData.reduce((sum, item) => sum + item.cost, 0),
      requestCount: usageData.length,
      uniqueSessions: new Set(usageData.map(item => item.sessionId)).size
    };

    // Group by project
    const byProject = usageData.reduce((acc, item) => {
      if (!acc[item.projectId]) {
        acc[item.projectId] = {
          projectId: item.projectId,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          cost: 0,
          requestCount: 0
        };
      }
      acc[item.projectId].inputTokens += item.inputTokens;
      acc[item.projectId].outputTokens += item.outputTokens;
      acc[item.projectId].totalTokens += item.totalTokens;
      acc[item.projectId].cost += item.cost;
      acc[item.projectId].requestCount += 1;
      return acc;
    }, {} as Record<string, any>);

    // Group by analysis type
    const byAnalysisType = usageData.reduce((acc, item) => {
      if (!acc[item.analysisType]) {
        acc[item.analysisType] = {
          analysisType: item.analysisType,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          cost: 0,
          requestCount: 0
        };
      }
      acc[item.analysisType].inputTokens += item.inputTokens;
      acc[item.analysisType].outputTokens += item.outputTokens;
      acc[item.analysisType].totalTokens += item.totalTokens;
      acc[item.analysisType].cost += item.cost;
      acc[item.analysisType].requestCount += 1;
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      totals,
      timeSeriesData: aggregatedData,
      byProject: Object.values(byProject),
      byAnalysisType: Object.values(byAnalysisType),
      recentUsage: usageData.slice(-10).reverse() // Last 10 entries
    });

  } catch (error) {
    console.error('Error fetching token usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token usage data' },
      { status: 500 }
    );
  }
}

function aggregateByTimePeriod(data: any[], groupBy: string) {
  const grouped = data.reduce((acc, item) => {
    const date = new Date(item.timestamp);
    let key: string;

    switch (groupBy) {
      case 'day':
        key = date.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      default:
        key = date.toISOString().split('T')[0];
    }

    if (!acc[key]) {
      acc[key] = {
        period: key,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cost: 0,
        requestCount: 0
      };
    }

    acc[key].inputTokens += item.inputTokens;
    acc[key].outputTokens += item.outputTokens;
    acc[key].totalTokens += item.totalTokens;
    acc[key].cost += item.cost;
    acc[key].requestCount += 1;

    return acc;
  }, {} as Record<string, any>);

  return Object.values(grouped).sort((a: any, b: any) => a.period.localeCompare(b.period));
}