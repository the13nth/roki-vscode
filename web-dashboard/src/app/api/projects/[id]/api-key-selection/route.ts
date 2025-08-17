import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PineconeSyncServiceInstance } from '@/lib/pineconeSyncService';

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
    
    // Get API key selection from Pinecone
    const selection = await PineconeSyncServiceInstance.getApiKeySelection(projectId, userId);
    
    if (!selection) {
      // Default to app API key if no selection exists
      return NextResponse.json({
        usePersonalApiKey: false,
        lastUpdated: new Date().toISOString()
      });
    }

    return NextResponse.json(selection);
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

    // Save the selection to Pinecone
    const success = await PineconeSyncServiceInstance.saveApiKeySelection(projectId, userId, usePersonalApiKey);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to save API key selection to cloud storage' },
        { status: 500 }
      );
    }

    const selection: ApiKeySelection = {
      usePersonalApiKey,
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json({ 
      success: true, 
      message: `API key selection updated to ${usePersonalApiKey ? 'personal' : 'app default'} key and saved to cloud storage`,
      selection
    });
  } catch (error) {
    console.error('Failed to save API key selection:', error);
    return NextResponse.json(
      { error: 'Failed to save API key selection' },
      { status: 500 }
    );
  }
}