import { Pinecone } from '@pinecone-database/pinecone';

let pinecone: Pinecone | null = null;

export function getPineconeClient(): Pinecone {
  if (!pinecone) {
    const apiKey = process.env.NEXT_PUBLIC_PINECONE_API_KEY || process.env.PINECONE_API_KEY;
    if (!apiKey) {
      throw new Error('NEXT_PUBLIC_PINECONE_API_KEY or PINECONE_API_KEY environment variable is required');
    }
    
    pinecone = new Pinecone({
      apiKey: apiKey,
    });
  }
  
  return pinecone;
}

export const PINECONE_INDEX_NAME = process.env.NEXT_PUBLIC_PINECONE_INDEX_NAME || process.env.PINECONE_INDEX_NAME || 'ai-project-manager';
export const PINECONE_NAMESPACE_PROJECTS = 'projects';