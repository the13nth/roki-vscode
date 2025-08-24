import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// This endpoint is deprecated - API configurations are now managed globally
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Redirect to global user API config
    return NextResponse.json({
      error: 'Per-project API configurations are deprecated. Please use global user API settings.',
      redirectTo: '/profile',
      useGlobalEndpoint: '/api/user-api-config'
    }, { status: 410 });
  } catch (error) {
    console.error('Failed to load API configuration:', error);
    return NextResponse.json(
      { error: 'Failed to load API configuration' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return NextResponse.json({
    error: 'Per-project API configurations are deprecated. Please configure your API keys globally in user settings.',
    redirectTo: '/profile'
  }, { status: 410 });
}
