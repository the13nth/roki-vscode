import { NextRequest, NextResponse } from 'next/server';
import { TokenTrackingService } from '@/lib/tokenTrackingService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      inputTokens,
      outputTokens,
      analysisType,
      sessionId
    } = body;

    // Validate required fields
    if (!projectId || typeof inputTokens !== 'number' || typeof outputTokens !== 'number' || !analysisType) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, inputTokens, outputTokens, analysisType' },
        { status: 400 }
      );
    }

    const tokenTrackingService = TokenTrackingService.getInstance();
    
    await tokenTrackingService.trackTokenUsage(
      projectId,
      inputTokens,
      outputTokens,
      analysisType
    );

    return NextResponse.json({ 
      success: true,
      message: 'Token usage tracked successfully'
    });

  } catch (error) {
    console.error('Error tracking token usage:', error);
    return NextResponse.json(
      { error: 'Failed to track token usage' },
      { status: 500 }
    );
  }
}