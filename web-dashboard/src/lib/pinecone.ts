// This file should only be used on the server side
// Client-side components should use API routes instead

import { Pinecone } from '@pinecone-database/pinecone';

const pineconeApiKey = process.env.NEXT_PUBLIC_PINECONE_API_KEY || '';
const pineconeIndexName = process.env.NEXT_PUBLIC_PINECONE_INDEX_NAME || 'roki';

if (!pineconeApiKey) {
  console.warn('Pinecone API key is not set. Vector storage will be disabled.');
}

export const pinecone = new Pinecone({
  apiKey: pineconeApiKey,
});

export const index = pinecone.Index(pineconeIndexName);

// Vector dimensions for different content types
export const VECTOR_DIMENSIONS = {
  PROJECT_METADATA: 1024,
  DOCUMENT_CONTENT: 1024,
  CONTEXT_DOCUMENT: 1024,
  TASK_EMBEDDING: 512,
};

// Namespace structure for organizing data
export const NAMESPACES = {
  PROJECTS: 'projects',
  DOCUMENTS: 'documents',
  CONTEXT: 'context',
  TASKS: 'tasks',
  SYNC_LOGS: 'sync_logs',
} as const;

// Metadata types for different vector types
export interface ProjectMetadata {
  id: string;
  name: string;
  description?: string;
  status: string;
  path: string;
  lastModified: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  syncEnabled: boolean;
  type: 'project_metadata';
}

export interface DocumentMetadata {
  id: string;
  projectId: string;
  docType: 'requirements' | 'design' | 'tasks' | 'context';
  title: string;
  content: string;
  lastModified: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'synced' | 'pending' | 'conflict';
  type: 'document';
}

export interface ContextDocumentMetadata {
  id: string;
  projectId: string;
  filename: string;
  title: string;
  content: string;
  tags: string[];
  category: string;
  lastModified: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'synced' | 'pending' | 'conflict';
  type: 'context_document';
}

export interface TaskMetadata {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  type: 'task';
}

export interface SyncLogMetadata {
  id: string;
  projectId: string;
  action: 'upload' | 'download' | 'conflict_resolved';
  status: 'success' | 'error' | 'pending';
  details?: string;
  createdAt: string;
  type: 'sync_log';
}

export type MetadataType = 
  | ProjectMetadata 
  | DocumentMetadata 
  | ContextDocumentMetadata 
  | TaskMetadata 
  | SyncLogMetadata;

// Helper function to generate embeddings (you'll need to implement this with your preferred embedding model)
export async function generateEmbedding(text: string, dimension: number): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    // Return zero vector for empty text
    return new Array(dimension).fill(0);
  }

  // Create a simple hash-based embedding for demonstration
  // In production, you'd use OpenAI's text-embedding-ada-002 or similar
  const hash = text.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
  
  const embedding = new Array(dimension).fill(0);
  
  // Use the hash to create deterministic but varied vectors
  for (let i = 0; i < dimension; i++) {
    const seed = hash + i * 31; // Use different seeds for each dimension
    const random = Math.sin(seed) * 10000; // Deterministic "random" number
    embedding[i] = (random % 2) - 1; // Scale to [-1, 1]
  }
  
  // Normalize the vector
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < dimension; i++) {
      embedding[i] = embedding[i] / magnitude;
    }
  }
  
  return embedding;
}

// Helper function to create a unique ID for vectors
export function createVectorId(namespace: string, id: string): string {
  return `${namespace}:${id}`;
}

// Helper function to extract ID from vector ID
export function extractIdFromVectorId(vectorId: string): string {
  return vectorId.split(':')[1];
}
