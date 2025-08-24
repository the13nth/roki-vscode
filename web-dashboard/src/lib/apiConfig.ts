import { auth } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';
import { decryptApiKey } from '@/lib/secureConfig';

export interface ApiConfiguration {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
  source: 'user' | 'environment' | 'none';
}

/**
 * Get the current API configuration for the authenticated user
 * Priority: User personal API key > Environment variables > None
 */
export async function getApiConfiguration(): Promise<ApiConfiguration> {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('User not authenticated');
  }

  try {
    // First, try to get user's personal API configuration
    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);
    
    const queryResponse = await index.namespace('user-api-configs').query({
      vector: new Array(1024).fill(0.1),
      topK: 1,
      filter: { userId: { $eq: userId } },
      includeMetadata: true
    });

    if (queryResponse.matches && queryResponse.matches.length > 0) {
      const metadata = queryResponse.matches[0].metadata;
      if (metadata) {
        const configData = metadata as any;
        
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
          console.error('Failed to decrypt user API key:', error);
          throw new Error('Failed to decrypt API key. Please re-enter your API key.');
        }

        if (configData.provider && decryptedApiKey && configData.model) {
          return {
            provider: configData.provider,
            apiKey: decryptedApiKey,
            model: configData.model,
            baseUrl: configData.baseUrl,
            source: 'user'
          };
        }
      }
    }
  } catch (error) {
    console.warn('Failed to load user API configuration:', error);
  }

  // Fallback to environment variables
  if (process.env.GOOGLE_AI_API_KEY) {
    return {
      provider: 'google',
      apiKey: process.env.GOOGLE_AI_API_KEY,
      model: 'gemini-1.5-pro',
      source: 'environment'
    };
  }

  // No configuration found
  return {
    provider: '',
    apiKey: '',
    model: '',
    source: 'none'
  };
}

/**
 * Get Google AI configuration specifically (for backward compatibility)
 */
export function getGoogleAIConfig(): ApiConfiguration {
  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error('GOOGLE_AI_API_KEY environment variable not set');
  }

  return {
    provider: 'google',
    apiKey: process.env.GOOGLE_AI_API_KEY,
    model: 'gemini-1.5-pro',
    source: 'environment'
  };
}