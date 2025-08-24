import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPineconeClient } from '@/lib/pinecone';

interface ApiKeySelection {
  usePersonalApiKey: boolean;
  lastUpdated: string;
}

// GET /api/projects/[id]/api-key-selection - Get project's API key selection
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

    const { id: projectId } = await params;
    
    try {
      // Get user's API configuration from Pinecone
      const pinecone = getPineconeClient();
      const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);
      
      // Query user's API configuration
      const queryResponse = await index.namespace('user-api-configs').fetch([`user-config-${userId}`]);
      const matches = queryResponse as unknown as { 
        [key: string]: { 
          metadata: { 
            provider: string;
            model: string;
            encryptedApiKey: string;
          } 
        } 
      };
      
      const userConfig = matches[`user-config-${userId}`];
      
      // If user has configured their API key, use it
      const hasPersonalApiKey = userConfig?.metadata?.encryptedApiKey ? true : false;

      return NextResponse.json({
        usePersonalApiKey: hasPersonalApiKey,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to get API key selection from Pinecone:', error);
      // Default to app API key on error
      return NextResponse.json({
        usePersonalApiKey: false,
        lastUpdated: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Failed to load API key selection:', error);
    return NextResponse.json(
      { error: 'Failed to load API key selection' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/api-key-selection - Save project's API key selection
export async function POST(
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

    const { id: projectId } = await params;
    const { usePersonalApiKey }: { usePersonalApiKey: boolean } = await request.json();

    // Validate input
    if (typeof usePersonalApiKey !== 'boolean') {
      return NextResponse.json(
        { error: 'usePersonalApiKey must be a boolean' },
        { status: 400 }
      );
    }

    // This endpoint is deprecated - API keys are now managed globally in user settings
    return NextResponse.json({ 
      error: 'API keys are now managed globally in user settings. Please configure your API key in the profile settings.',
      redirectTo: '/profile'
    }, { status: 410 });
  } catch (error) {
    console.error('Failed to save API key selection:', error);
    return NextResponse.json(
      { error: 'Failed to save API key selection' },
      { status: 500 }
    );
  }
}