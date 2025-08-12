import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface ApiConfiguration {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

function getGlobalConfigPath(): string {
  return path.join(process.cwd(), '.ai-project', 'global-api-config.json');
}

// GET /api/global-api-config - Get global API configuration
export async function GET(): Promise<NextResponse> {
  try {
    const configPath = getGlobalConfigPath();
    
    if (!await fileExists(configPath)) {
      return NextResponse.json({
        provider: '',
        apiKey: '',
        model: '',
        baseUrl: ''
      });
    }

    const configData = await fs.readFile(configPath, 'utf8');
    const config: ApiConfiguration = JSON.parse(configData);

    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to load global API configuration:', error);
    return NextResponse.json(
      { error: 'Failed to load global API configuration' },
      { status: 500 }
    );
  }
}

// POST /api/global-api-config - Save global API configuration
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const config: ApiConfiguration = await request.json();

    // Validate required fields
    if (!config.provider || !config.apiKey || !config.model) {
      return NextResponse.json(
        { error: 'Provider, API key, and model are required' },
        { status: 400 }
      );
    }

    // Ensure directory exists
    const configDir = path.dirname(getGlobalConfigPath());
    await fs.mkdir(configDir, { recursive: true });

    // Save configuration
    await fs.writeFile(
      getGlobalConfigPath(),
      JSON.stringify(config, null, 2),
      'utf-8'
    );

    return NextResponse.json({ success: true, message: 'Global API configuration saved successfully' });
  } catch (error) {
    console.error('Failed to save global API configuration:', error);
    return NextResponse.json(
      { error: 'Failed to save global API configuration' },
      { status: 500 }
    );
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
