import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getApiConfiguration } from '@/lib/apiConfig';

// GET /api/config-status - Get overall API configuration status
export async function GET(): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use the same logic as the backend to determine configuration
    const config = await getApiConfiguration();
    
    return NextResponse.json({
      provider: config.provider,
      model: config.model,
      baseUrl: config.baseUrl,
      source: config.source,
      // Don't send the actual API key to the frontend
      hasApiKey: !!config.apiKey,
      // For display purposes, show masked key
      apiKey: config.apiKey ? '••••••••' : ''
    });
  } catch (error) {
    console.error('Failed to get configuration status:', error);
    return NextResponse.json(
      { error: 'Failed to get configuration status' },
      { status: 500 }
    );
  }
}