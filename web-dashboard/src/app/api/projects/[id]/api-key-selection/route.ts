import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { promises as fs } from 'fs';
import path from 'path';

interface ApiKeySelection {
  usePersonalApiKey: boolean;
  lastUpdated: string;
}

function getApiKeySelectionPath(projectId: string): string {
  const projectPath = path.join(process.cwd(), '.ai-project', 'projects', projectId);
  return path.join(projectPath, 'api-key-selection.json');
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
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
    const selectionPath = getApiKeySelectionPath(projectId);
    
    if (!await fileExists(selectionPath)) {
      // Default to app API key if no selection exists
      return NextResponse.json({
        usePersonalApiKey: false,
        lastUpdated: new Date().toISOString()
      });
    }

    const selectionData = await fs.readFile(selectionPath, 'utf8');
    const selection: ApiKeySelection = JSON.parse(selectionData);

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

    const selection: ApiKeySelection = {
      usePersonalApiKey,
      lastUpdated: new Date().toISOString()
    };

    const selectionPath = getApiKeySelectionPath(projectId);
    const projectDir = path.dirname(selectionPath);

    // Ensure project directory exists
    await fs.mkdir(projectDir, { recursive: true });

    // Save the selection
    await fs.writeFile(selectionPath, JSON.stringify(selection, null, 2));

    return NextResponse.json({ 
      success: true, 
      message: `API key selection updated to ${usePersonalApiKey ? 'personal' : 'app default'} key`,
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