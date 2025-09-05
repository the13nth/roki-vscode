import { Pinecone } from '@pinecone-database/pinecone';

let pinecone: Pinecone | null = null;

export function getPineconeClient(): Pinecone {
  if (!pinecone) {
    const apiKey = process.env.NEXT_PUBLIC_PINECONE_API_KEY || process.env.PINECONE_API_KEY;
    
    if (!apiKey) {
      // During build time or development, use a dummy client to prevent build failures
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Pinecone API key not found - using dummy client for build/development');
        pinecone = new Pinecone({
          apiKey: 'build-time-dummy-key-must-be-at-least-32-chars',
        });
      } else {
        throw new Error('NEXT_PUBLIC_PINECONE_API_KEY or PINECONE_API_KEY environment variable is required');
      }
    } else {
      pinecone = new Pinecone({
        apiKey: apiKey,
        // Enhanced configuration for better performance and reliability
        maxRetries: 3, // Add retry configuration
        sourceTag: 'roki-optimized' // Add source tag for monitoring
      });
    }
  }
  
  return pinecone;
}

export const PINECONE_INDEX_NAME = process.env.NEXT_PUBLIC_PINECONE_INDEX_NAME || process.env.PINECONE_INDEX_NAME || 'ai-project-manager';
export const PINECONE_NAMESPACE_PROJECTS = 'projects';