import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import * as fs from 'fs';
import * as path from 'path';
import { decryptApiKey } from '@/lib/secureConfig';

interface ApiConfiguration {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

interface ApiKeySelection {
  usePersonalApiKey: boolean;
  lastUpdated: string;
}

interface UserApiConfiguration {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
  encryptedApiKey?: string;
}

function getApiConfigPath(projectId: string): string {
  const projectPath = path.join(process.cwd(), '.ai-project', 'projects', projectId);
  return path.join(projectPath, 'api-config.json');
}

function getApiKeySelectionPath(projectId: string): string {
  const projectPath = path.join(process.cwd(), '.ai-project', 'projects', projectId);
  return path.join(projectPath, 'api-key-selection.json');
}

function getUserConfigPath(userId: string): string {
  return path.join(process.cwd(), '.ai-project', 'user-configs', `${userId}-api-config.json`);
}

function getGlobalConfigPath(): string {
  return path.join(process.cwd(), '.ai-project', 'global-api-config.json');
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getApiKeySelection(projectId: string): Promise<ApiKeySelection> {
  const selectionPath = getApiKeySelectionPath(projectId);
  
  if (!await fileExists(selectionPath)) {
    return {
      usePersonalApiKey: false,
      lastUpdated: new Date().toISOString()
    };
  }

  try {
    const selectionData = await fs.promises.readFile(selectionPath, 'utf8');
    return JSON.parse(selectionData);
  } catch {
    return {
      usePersonalApiKey: false,
      lastUpdated: new Date().toISOString()
    };
  }
}

async function getUserApiConfig(userId: string): Promise<ApiConfiguration | null> {
  const configPath = getUserConfigPath(userId);
  
  if (!await fileExists(configPath)) {
    return null;
  }

  try {
    const configData = await fs.promises.readFile(configPath, 'utf8');
    const config: UserApiConfiguration = JSON.parse(configData);

    // Decrypt API key if it's encrypted
    let decryptedApiKey = '';
    if (config.encryptedApiKey) {
      decryptedApiKey = decryptApiKey(config.encryptedApiKey);
    } else if (config.apiKey) {
      // Legacy support for unencrypted keys
      decryptedApiKey = config.apiKey;
    }

    return {
      provider: config.provider,
      apiKey: decryptedApiKey,
      model: config.model,
      baseUrl: config.baseUrl
    };
  } catch (error) {
    console.error('Failed to load user API config:', error);
    return null;
  }
}

async function getGlobalApiConfig(): Promise<ApiConfiguration | null> {
  const configPath = getGlobalConfigPath();
  
  if (!await fileExists(configPath)) {
    return null;
  }

  try {
    const configData = await fs.promises.readFile(configPath, 'utf8');
    return JSON.parse(configData);
  } catch {
    return null;
  }
}

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
    
    // Get API key selection for this project
    const selection = await getApiKeySelection(projectId);
    
    let config: ApiConfiguration | null = null;
    let source = '';

    if (selection.usePersonalApiKey) {
      // Try to get user's personal API config
      config = await getUserApiConfig(userId);
      source = 'personal';
      
      if (!config) {
        // Fallback to global config if personal config not found
        config = await getGlobalApiConfig();
        source = 'global-fallback';
      }
    } else {
      // Use global/app default config
      config = await getGlobalApiConfig();
      source = 'global';
    }

    if (!config) {
      return NextResponse.json({
        provider: '',
        apiKey: '',
        model: '',
        source: 'none',
        usePersonalApiKey: selection.usePersonalApiKey
      });
    }

    return NextResponse.json({
      ...config,
      source,
      usePersonalApiKey: selection.usePersonalApiKey
    });
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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;
    const config: ApiConfiguration = await request.json();

    // Validate required fields
    if (!config.provider || !config.apiKey || !config.model) {
      return NextResponse.json(
        { error: 'Provider, API key, and model are required' },
        { status: 400 }
      );
    }

    // Note: This endpoint is now deprecated in favor of user-specific API configs
    // and the API key selection system. We'll keep it for backward compatibility
    // but recommend using the new system.

    const configToSave = {
      ...config
    };

    const configPath = getApiConfigPath(projectId);
    const projectDir = path.dirname(configPath);

    // Ensure project directory exists
    await fs.promises.mkdir(projectDir, { recursive: true });

    // Save the configuration
    await fs.promises.writeFile(configPath, JSON.stringify(configToSave, null, 2));

    return NextResponse.json({ 
      success: true,
      message: 'Configuration saved. Consider using the new API key selection system for better security.'
    });
  } catch (error) {
    console.error('Failed to save API configuration:', error);
    return NextResponse.json(
      { error: 'Failed to save API configuration' },
      { status: 500 }
    );
  }
}
