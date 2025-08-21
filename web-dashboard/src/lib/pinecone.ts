import { Pinecone } from '@pinecone-database/pinecone';

let pinecone: Pinecone | null = null;

export function getPineconeClient(): Pinecone {
  if (!pinecone) {
    const apiKey = process.env.NEXT_PUBLIC_PINECONE_API_KEY || process.env.PINECONE_API_KEY;
    if (!apiKey) {
      // During build time, use a dummy client to prevent build failures
      if (process.env.NODE_ENV !== 'production' && typeof window === 'undefined') {
        console.warn('Pinecone API key not found during build - using dummy client');
        pinecone = new Pinecone({
          apiKey: 'build-time-dummy-key',
        });
      } else {
        throw new Error('NEXT_PUBLIC_PINECONE_API_KEY or PINECONE_API_KEY environment variable is required');
      }
    } else {
      pinecone = new Pinecone({
        apiKey: apiKey,
      });
    }
  }
  
  return pinecone;
}

export const PINECONE_INDEX_NAME = process.env.NEXT_PUBLIC_PINECONE_INDEX_NAME || process.env.PINECONE_INDEX_NAME || 'ai-project-manager';
export const PINECONE_NAMESPACE_PROJECTS = 'projects';