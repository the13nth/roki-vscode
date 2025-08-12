import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

interface ApiConfiguration {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
}



function getApiConfigPath(projectId: string): string {
  const projectPath = path.join(process.cwd(), '.ai-project', 'projects', projectId);
  return path.join(projectPath, 'api-config.json');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: projectId } = await params;
    const configPath = getApiConfigPath(projectId);

    if (!fs.existsSync(configPath)) {
      return NextResponse.json({
        provider: '',
        apiKey: '',
        model: ''
      });
    }

    const configData = fs.readFileSync(configPath, 'utf8');
    const config: ApiConfiguration = JSON.parse(configData);

    return NextResponse.json(config);
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
  try {
    const { id: projectId } = await params;
    const config: ApiConfiguration = await request.json();

    // Validate required fields
    if (!config.provider || !config.apiKey || !config.model) {
      return NextResponse.json(
        { error: 'Provider, API key, and model are required' },
        { status: 400 }
      );
    }



    const configToSave = {
      ...config
    };

    const configPath = getApiConfigPath(projectId);
    const projectDir = path.dirname(configPath);

    // Ensure project directory exists
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    // Save the configuration
    fs.writeFileSync(configPath, JSON.stringify(configToSave, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save API configuration:', error);
    return NextResponse.json(
      { error: 'Failed to save API configuration' },
      { status: 500 }
    );
  }
}
