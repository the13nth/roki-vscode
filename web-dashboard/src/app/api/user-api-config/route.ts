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
      console.error('GET /api/user-api-config: No userId found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('GET /api/user-api-config: Loading config for user:', userId);
    const configPath = getUserConfigPath(userId);
    
    if (!await fileExists(configPath)) {
      console.log('GET /api/user-api-config: No existing config found, returning empty config');
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
      console.error('GET /api/user-api-config: Failed to decrypt user API key:', error);
      return NextResponse.json(
        { error: 'Failed to decrypt API key. Please re-enter your API key.' },
        { status: 500 }
      );
    }

    console.log('GET /api/user-api-config: Successfully loaded config for user:', userId);
    return NextResponse.json({
      provider: config.provider,
      apiKey: decryptedApiKey,
      model: config.model,
      baseUrl: config.baseUrl
    });
  } catch (error) {
    console.error('GET /api/user-api-config: Failed to load user API configuration:', error);
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
      console.error('POST /api/user-api-config: No userId found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('POST /api/user-api-config: Saving config for user:', userId);
    const config: UserApiConfiguration = await request.json();
    console.log('POST /api/user-api-config: Received config:', { 
      provider: config.provider, 
      model: config.model, 
      hasApiKey: !!config.apiKey,
      baseUrl: config.baseUrl 
    });

    // Validate required fields
    if (!config.provider || !config.apiKey || !config.model) {
      console.error('POST /api/user-api-config: Missing required fields:', { 
        hasProvider: !!config.provider, 
        hasApiKey: !!config.apiKey, 
        hasModel: !!config.model 
      });
      return NextResponse.json(
        { error: 'Provider, API key, and model are required' },
        { status: 400 }
      );
    }

    // Encrypt the API key
    let encryptedApiKey: string;
    try {
      encryptedApiKey = encryptApiKey(config.apiKey);
      console.log('POST /api/user-api-config: Successfully encrypted API key');
    } catch (error) {
      console.error('POST /api/user-api-config: Failed to encrypt user API key:', error);
      
      // In development or when encryption fails, store without encryption
      if (process.env.NODE_ENV !== 'production') {
        console.log('POST /api/user-api-config: Using unencrypted storage for development');
        encryptedApiKey = config.apiKey; // Store as plaintext in development
      } else {
        return NextResponse.json(
          { error: 'Failed to encrypt API key. Please check your security configuration.' },
          { status: 500 }
        );
      }
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
    console.log('POST /api/user-api-config: Creating config directory:', configDir);
    await fs.mkdir(configDir, { recursive: true });

    // Save configuration
    const configPath = getUserConfigPath(userId);
    console.log('POST /api/user-api-config: Saving config to:', configPath);
    await fs.writeFile(
      configPath,
      JSON.stringify(configToSave, null, 2),
      'utf-8'
    );

    console.log('POST /api/user-api-config: Successfully saved config for user:', userId);
    return NextResponse.json({ 
      success: true, 
      message: 'User API configuration saved successfully' 
    });
  } catch (error) {
    console.error('POST /api/user-api-config: Failed to save user API configuration:', error);
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
      console.error('DELETE /api/user-api-config: No userId found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('DELETE /api/user-api-config: Deleting config for user:', userId);
    const configPath = getUserConfigPath(userId);
    
    if (await fileExists(configPath)) {
      await fs.unlink(configPath);
      console.log('DELETE /api/user-api-config: Successfully deleted config for user:', userId);
    } else {
      console.log('DELETE /api/user-api-config: No config file found for user:', userId);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User API configuration deleted successfully' 
    });
  } catch (error) {
    console.error('DELETE /api/user-api-config: Failed to delete user API configuration:', error);
    return NextResponse.json(
      { error: 'Failed to delete user API configuration' },
      { status: 500 }
    );
  }
}