import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';
import { encryptApiKey, decryptApiKey } from '@/lib/secureConfig';

interface UserApiConfiguration {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
  encryptedApiKey?: string;
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
    
    try {
      const pinecone = getPineconeClient();
      const index = pinecone.index(PINECONE_INDEX_NAME);
      
      // Try to fetch existing configuration from Pinecone
      const queryResponse = await index.namespace('user-api-configs').query({
        vector: new Array(1024).fill(0.1), // Vector with non-zero values for metadata-only query
        topK: 1,
        filter: { userId: { $eq: userId } },
        includeMetadata: true
      });

      if (queryResponse.matches && queryResponse.matches.length > 0) {
        const metadata = queryResponse.matches[0].metadata;
        if (metadata) {
          const configData = metadata as unknown as UserApiConfiguration;
          
          // Decrypt API key if it's encrypted
          let decryptedApiKey = '';
          try {
            if (configData.encryptedApiKey) {
              decryptedApiKey = decryptApiKey(configData.encryptedApiKey);
            } else if (configData.apiKey) {
              // Legacy support for unencrypted keys
              decryptedApiKey = configData.apiKey;
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
            provider: configData.provider,
            apiKey: decryptedApiKey,
            model: configData.model,
            baseUrl: configData.baseUrl
          });
        }
      }
      
      console.log('GET /api/user-api-config: No existing config found, returning empty config');
      return NextResponse.json({
        provider: '',
        apiKey: '',
        model: '',
        baseUrl: ''
      });
    } catch (error) {
      console.error('GET /api/user-api-config: Pinecone error:', error);
      // Fallback to empty config if Pinecone is not available
      return NextResponse.json({
        provider: '',
        apiKey: '',
        model: '',
        baseUrl: ''
      });
    }
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

    try {
      // Save to Pinecone
      const pinecone = getPineconeClient();
      const index = pinecone.index(PINECONE_INDEX_NAME);
      
      // Create a vector with at least one non-zero value (Pinecone requirement)
      const vector = new Array(1024).fill(0.1);
      vector[0] = 1.0; // Ensure first element is non-zero
      
      await index.namespace('user-api-configs').upsert([
        {
          id: `user-config-${userId}`,
          values: vector,
          metadata: {
            userId,
            ...configToSave,
            timestamp: new Date().toISOString()
          }
        }
      ]);

      console.log('POST /api/user-api-config: Successfully saved config to Pinecone for user:', userId);
      return NextResponse.json({ 
        success: true, 
        message: 'User API configuration saved successfully' 
      });
    } catch (error) {
      console.error('POST /api/user-api-config: Failed to save to Pinecone:', error);
      return NextResponse.json(
        { error: 'Failed to save user API configuration to database' },
        { status: 500 }
      );
    }
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
    
    try {
      const pinecone = getPineconeClient();
      const index = pinecone.index(PINECONE_INDEX_NAME);
      
      // Delete the configuration from Pinecone
      await index.namespace('user-api-configs').deleteOne(`user-config-${userId}`);
      
      console.log('DELETE /api/user-api-config: Successfully deleted config for user:', userId);
    } catch (error) {
      console.error('DELETE /api/user-api-config: Failed to delete from Pinecone:', error);
      // Continue even if deletion fails (config might not exist)
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