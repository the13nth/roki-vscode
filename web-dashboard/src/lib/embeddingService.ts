import { PineconeUtils } from './pineconeUtils';

// Embedding cache to avoid regenerating embeddings for the same text
interface EmbeddingCache {
  [key: string]: {
    embedding: number[];
    timestamp: number;
    ttl: number; // Time to live in milliseconds
  };
}

export class EmbeddingService {
  private static instance: EmbeddingService;
  private cache: EmbeddingCache = {};
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_CACHE_SIZE = 1000; // Maximum number of cached embeddings
  private readonly BATCH_SIZE = 10; // Batch size for embedding generation

  private constructor() {}

  static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  /**
   * Generate a cache key for the given text
   */
  private generateCacheKey(text: string): string {
    // Use a simple hash for the cache key
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Clean expired entries from cache
   */
  private cleanCache(): void {
    const now = Date.now();
    const keys = Object.keys(this.cache);
    
    // Remove expired entries
    for (const key of keys) {
      const entry = this.cache[key];
      if (now - entry.timestamp > entry.ttl) {
        delete this.cache[key];
      }
    }

    // If cache is still too large, remove oldest entries
    if (Object.keys(this.cache).length > this.MAX_CACHE_SIZE) {
      const sortedEntries = Object.entries(this.cache)
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      const entriesToRemove = sortedEntries.slice(0, sortedEntries.length - this.MAX_CACHE_SIZE);
      for (const [key] of entriesToRemove) {
        delete this.cache[key];
      }
    }
  }

  /**
   * Generate embedding for a single text with caching
   */
  async generateEmbedding(text: string, useCache: boolean = true): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    const cacheKey = this.generateCacheKey(text);
    
    // Check cache first
    if (useCache && this.cache[cacheKey]) {
      const entry = this.cache[cacheKey];
      if (Date.now() - entry.timestamp < entry.ttl) {
        console.log('📋 Using cached embedding for text length:', text.length);
        return entry.embedding;
      } else {
        // Remove expired entry
        delete this.cache[cacheKey];
      }
    }

    // Clean cache periodically
    this.cleanCache();

    console.log('🔄 Generating new embedding for text length:', text.length);

    const embedding = await PineconeUtils.executeWithRetry(
      async () => {
        // Use Gemini for embeddings with enhanced timeout
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${process.env.GOOGLE_AI_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'models/text-embedding-004',
            content: {
              parts: [{ text }]
            }
          }),
        });

        if (!response.ok) {
          throw new Error(`Gemini embedding API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const geminiEmbedding = data.embedding.values;
        
        // Pad Gemini's 768-dimensional embedding to 1024 dimensions to match Pinecone index
        if (geminiEmbedding.length < 1024) {
          const paddedEmbedding = [...geminiEmbedding];
          while (paddedEmbedding.length < 1024) {
            paddedEmbedding.push(0);
          }
          return paddedEmbedding;
        } else if (geminiEmbedding.length > 1024) {
          // Truncate if somehow longer than expected
          return geminiEmbedding.slice(0, 1024);
        }
        
        return geminiEmbedding;
      },
      {
        operationType: 'embedding',
        maxRetries: 3,
        timeout: 120000, // 2 minutes for embedding generation
        baseDelay: 2000 // 2 seconds base delay for embedding operations
      }
    );

    // Cache the result
    if (useCache) {
      this.cache[cacheKey] = {
        embedding,
        timestamp: Date.now(),
        ttl: this.CACHE_TTL
      };
    }

    return embedding;
  }

  /**
   * Generate embeddings for multiple texts in batches
   */
  async generateEmbeddingsBatch(texts: string[], useCache: boolean = true): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    console.log(`🔄 Generating embeddings for ${texts.length} texts in batches of ${this.BATCH_SIZE}`);

    const results: number[][] = [];
    const uncachedTexts: string[] = [];
    const uncachedIndices: number[] = [];

    // Check cache for each text
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      const cacheKey = this.generateCacheKey(text);
      
      if (useCache && this.cache[cacheKey]) {
        const entry = this.cache[cacheKey];
        if (Date.now() - entry.timestamp < entry.ttl) {
          results[i] = entry.embedding;
          continue;
        } else {
          delete this.cache[cacheKey];
        }
      }
      
      uncachedTexts.push(text);
      uncachedIndices.push(i);
    }

    // Generate embeddings for uncached texts in batches
    if (uncachedTexts.length > 0) {
      const batchOperations = [];
      
      for (let i = 0; i < uncachedTexts.length; i += this.BATCH_SIZE) {
        const batch = uncachedTexts.slice(i, i + this.BATCH_SIZE);
        const batchIndices = uncachedIndices.slice(i, i + this.BATCH_SIZE);
        
        batchOperations.push(async () => {
          const batchEmbeddings = await Promise.all(
            batch.map(text => this.generateEmbedding(text, false)) // Don't use cache for batch generation
          );
          
          // Cache the results
          if (useCache) {
            for (let j = 0; j < batch.length; j++) {
              const text = batch[j];
              const embedding = batchEmbeddings[j];
              const cacheKey = this.generateCacheKey(text);
              
              this.cache[cacheKey] = {
                embedding,
                timestamp: Date.now(),
                ttl: this.CACHE_TTL
              };
            }
          }
          
          return { embeddings: batchEmbeddings, indices: batchIndices };
        });
      }

      // Execute batch operations with retry logic
      const batchResults = await PineconeUtils.executeBatchWithRetry(batchOperations, {
        operationType: 'embedding',
        batchSize: 5, // Process 5 batches in parallel
        maxRetries: 2
      });

      // Combine results
      for (const batchResult of batchResults) {
        for (let j = 0; j < batchResult.embeddings.length; j++) {
          const index = batchResult.indices[j];
          results[index] = batchResult.embeddings[j];
        }
      }
    }

    return results;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number; oldestEntry: number; newestEntry: number } {
    const entries = Object.values(this.cache);
    const now = Date.now();
    
    return {
      size: entries.length,
      hitRate: 0, // This would need to be tracked separately
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : 0,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : 0
    };
  }

  /**
   * Clear the embedding cache
   */
  clearCache(): void {
    this.cache = {};
    console.log('🗑️ Embedding cache cleared');
  }

  /**
   * Generate fallback embedding for error cases
   */
  generateFallbackEmbedding(text: string): number[] {
    console.warn('⚠️ Using fallback embedding generation');
    
    const hash = text.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    // Create a 1024-dimensional vector to match Pinecone index
    const vector = new Array(1024).fill(0);
    for (let i = 0; i < 1024; i++) {
      vector[i] = Math.sin(hash + i) * 0.1;
    }
    return vector;
  }
}

// Export singleton instance
export const embeddingService = EmbeddingService.getInstance();
