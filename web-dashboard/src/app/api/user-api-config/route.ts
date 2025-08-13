import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { promises as fs } from 'fs';
import path from 'path';
import { encryptApiKey, decryptApiKey } from '@/lib/secureConfig';

interface UserApiConfiguration {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
  encryptedApiKey?: string;
}

function getUserConfigPath(userId: string): string {
  return path.join(process.cwd(), '.ai-project', 'user-configs', `${userId}-api-config.json`);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// GET /api/user-api-config - Get user's API configuration
export async function GET(): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const configPath = getUserConfigPath(userId);
    
    if (!await fileExists(configPath)) {
      return NextResponse.json({
        provider: '',
        apiKey: '',
        model: '',
        baseUrl: ''
      });
    }

    const configData = await fs.readFile(configPath, 'utf8');
    const config: UserApiConfiguration = JSON.parse(configData);

    // Decrypt API key if it's encrypted
    let decryptedApiKey = '';
    try {
      if (config.encryptedApiKey) {
        decryptedApiKey = decryptApiKey(config.encryptedApiKey);
      } else if (config.apiKey) {
        // Legacy support for unencrypted keys
        decryptedApiKey = config.apiKey;
      }
    } catch (error) {
      console.error('Failed to decrypt user API key:', error);
      return NextResponse.json(
        { error: 'Failed to decrypt API key. Please re-enter your API key.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      provider: config.provider,
      apiKey: decryptedApiKey,
      model: config.model,
      baseUrl: config.baseUrl
    });
  } catch (error) {
    console.error('Failed to load user API configuration:', error);
    return NextResponse.json(
      { error: 'Failed to load user API configuration' },
      { status: 500 }
    );
  }
}

// POST /api/user-api-config - Save user's API configuration
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const config: UserApiConfiguration = await request.json();

    // Validate required fields
    if (!config.provider || !config.apiKey || !config.model) {
      return NextResponse.json(
        { error: 'Provider, API key, and model are required' },
        { status: 400 }
      );
    }

    // Encrypt the API key
    let encryptedApiKey: string;
    try {
      encryptedApiKey = encryptApiKey(config.apiKey);
    } catch (error) {
      console.error('Failed to encrypt user API key:', error);
      return NextResponse.json(
        { error: 'Failed to encrypt API key. Please check your security configuration.' },
        { status: 500 }
      );
    }

    const configToSave: UserApiConfiguration = {
      provider: config.provider,
      apiKey: '', // Don't store plaintext
      encryptedApiKey,
      model: config.model,
      baseUrl: config.baseUrl
    };

    // Ensure directory exists
    const configDir = path.dirname(getUserConfigPath(userId));
    await fs.mkdir(configDir, { recursive: true });

    // Save configuration
    await fs.writeFile(
      getUserConfigPath(userId),
      JSON.stringify(configToSave, null, 2),
      'utf-8'
    );

    return NextResponse.json({ 
      success: true, 
      message: 'User API configuration saved successfully' 
    });
  } catch (error) {
    console.error('Failed to save user API configuration:', error);
    return NextResponse.json(
      { error: 'Failed to save user API configuration' },
      { status: 500 }
    );
  }
}

// DELETE /api/user-api-config - Delete user's API configuration
export async function DELETE(): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const configPath = getUserConfigPath(userId);
    
    if (await fileExists(configPath)) {
      await fs.unlink(configPath);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User API configuration deleted successfully' 
    });
  } catch (error) {
    console.error('Failed to delete user API configuration:', error);
    return NextResponse.json(
      { error: 'Failed to delete user API configuration' },
      { status: 500 }
    );
  }
}