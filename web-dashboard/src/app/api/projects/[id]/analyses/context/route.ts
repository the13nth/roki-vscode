import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { analysisVectorService } from '@/lib/analysisVectorService';

// GET /api/projects/[id]/analyses/context - Get analysis context using vector search
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const analysisType = searchParams.get('type');
    const query = searchParams.get('query');

    if (!analysisType) {
      return NextResponse.json(
        { error: 'Analysis type is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Getting analysis context for ${analysisType} in project ${projectId}`);

    // Get comprehensive context using vector search
    const context = await analysisVectorService.getAnalysisContext(
      projectId,
      analysisType,
      query || undefined
    );

    // Format context for AI analysis
    const formattedContext = analysisVectorService.formatContextForAnalysis(context, analysisType);

    return NextResponse.json({
      success: true,
      context: {
        relevantDocuments: context.relevantDocuments,
        relatedAnalyses: context.relatedAnalyses,
        projectInfo: context.projectInfo,
        formattedContext,
        totalDocuments: context.relevantDocuments.length + context.relatedAnalyses.length + context.projectInfo.length
      }
    });
  } catch (error) {
    console.error('Failed to get analysis context:', error);
    return NextResponse.json(
      { error: 'Failed to get analysis context' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/analyses/context - Search for specific analysis information
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;
    const { query, analysisType, documentTypes, maxResults = 10 } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Searching analysis information: "${query}" in project ${projectId}`);

    // Search for specific information
    const results = await analysisVectorService.searchProjectInformation(
      query,
      projectId,
      documentTypes || ['requirements', 'design', 'context', 'analysis'],
      maxResults
    );

    return NextResponse.json({
      success: true,
      results,
      totalResults: results.length,
      query
    });
  } catch (error) {
    console.error('Failed to search analysis information:', error);
    return NextResponse.json(
      { error: 'Failed to search analysis information' },
      { status: 500 }
    );
  }
}
