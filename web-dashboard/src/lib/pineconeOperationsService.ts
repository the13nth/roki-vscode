import { getPineconeClient, PINECONE_INDEX_NAME, PINECONE_NAMESPACE_PROJECTS } from './pinecone';
import { PineconeUtils } from './pineconeUtils';
import { embeddingService } from './embeddingService';

export interface VectorOperation {
  id: string;
  values: number[];
  metadata: Record<string, any>;
}

export interface QueryOptions {
  topK?: number;
  filter?: Record<string, any>;
  includeMetadata?: boolean;
  includeValues?: boolean;
  namespace?: string;
}

export interface UpsertOptions {
  namespace?: string;
  batchSize?: number;
}

export class PineconeOperationsService {
  private static instance: PineconeOperationsService;
  private pinecone = getPineconeClient();
  private index = this.pinecone.index(PINECONE_INDEX_NAME);

  private constructor() {}

  static getInstance(): PineconeOperationsService {
    if (!PineconeOperationsService.instance) {
      PineconeOperationsService.instance = new PineconeOperationsService();
    }
    return PineconeOperationsService.instance;
  }

  /**
   * Get the appropriate namespace for operations
   */
  private getNamespace(namespace?: string) {
    return namespace ? this.index.namespace(namespace) : this.index;
  }

  /**
   * Optimized query operation with enhanced error handling
   */
  async query(
    vector: number[],
    options: QueryOptions = {}
  ): Promise<any> {
    const {
      topK = 10,
      filter = {},
      includeMetadata = true,
      includeValues = false,
      namespace
    } = options;

    return PineconeUtils.executeWithRetry(
      async () => {
        const targetIndex = this.getNamespace(namespace);
        
        const queryResponse = await targetIndex.query({
          vector,
          topK,
          filter,
          includeMetadata,
          includeValues
        });

        return queryResponse;
      },
      {
        operationType: 'query',
        maxRetries: 3,
        timeout: 45000 // 45 seconds for queries
      }
    );
  }

  /**
   * Optimized upsert operation with batching
   */
  async upsert(
    vectors: VectorOperation[],
    options: UpsertOptions = {}
  ): Promise<any> {
    const { namespace, batchSize = 100 } = options;

    if (vectors.length === 0) {
      return { upsertedCount: 0 };
    }

    // Split into batches if necessary
    const batches = [];
    for (let i = 0; i < vectors.length; i += batchSize) {
      batches.push(vectors.slice(i, i + batchSize));
    }

    console.log(`🔄 Upserting ${vectors.length} vectors in ${batches.length} batches`);

    const batchOperations = batches.map((batch, index) => 
      async () => {
        const targetIndex = this.getNamespace(namespace);
        
        const upsertResponse = await targetIndex.upsert(batch);
        console.log(`✅ Batch ${index + 1}/${batches.length} completed (${batch.length} vectors)`);
        return upsertResponse;
      }
    );

    const results = await PineconeUtils.executeBatchWithRetry(batchOperations, {
      operationType: 'upsert',
      maxRetries: 2,
      batchSize: 3 // Process 3 batches in parallel
    });

    return {
      upsertedCount: vectors.length,
      batches: results.length
    };
  }

  /**
   * Optimized delete operation
   */
  async delete(
    ids: string[],
    namespace?: string
  ): Promise<any> {
    if (ids.length === 0) {
      return { deletedCount: 0 };
    }

    return PineconeUtils.executeWithRetry(
      async () => {
        const targetIndex = this.getNamespace(namespace);
        
        const deleteResponse = await targetIndex.deleteMany(ids);
        console.log(`🗑️ Deleted ${ids.length} vectors`);
        return deleteResponse;
      },
      {
        operationType: 'delete',
        maxRetries: 2,
        timeout: 30000 // 30 seconds for deletes
      }
    );
  }

  /**
   * Fetch vectors by IDs
   */
  async fetch(
    ids: string[],
    namespace?: string,
    includeMetadata: boolean = true,
    includeValues: boolean = true
  ): Promise<any> {
    if (ids.length === 0) {
      return { vectors: {} };
    }

    return PineconeUtils.executeWithRetry(
      async () => {
        const targetIndex = this.getNamespace(namespace);
        
        const fetchResponse = await targetIndex.fetch(ids);
        
        return fetchResponse;
      },
      {
        operationType: 'fetch',
        maxRetries: 2,
        timeout: 30000 // 30 seconds for fetches
      }
    );
  }

  /**
   * Search for similar vectors with text input (generates embedding automatically)
   */
  async searchSimilar(
    text: string,
    options: QueryOptions = {}
  ): Promise<any> {
    const embedding = await embeddingService.generateEmbeddingWithFallback(text);
    return this.query(embedding, options);
  }

  /**
   * Search for analysis-related content using semantic similarity
   */
  async searchAnalysisContent(
    query: string,
    projectId: string,
    analysisTypes?: string[],
    topK: number = 10
  ): Promise<any> {
    try {
      console.log(`🔍 Searching analysis content for project ${projectId} with query: "${query}"`);
      
      const embedding = await embeddingService.generateEmbeddingWithFallback(query);
      
      const filter: Record<string, any> = {
        projectId: { $eq: projectId },
        type: { $in: ['analysis', 'context', 'requirements', 'design'] }
      };

      if (analysisTypes && analysisTypes.length > 0) {
        filter.analysisType = { $in: analysisTypes };
      }

      const queryResponse = await this.query(embedding, {
        topK,
        filter,
        includeMetadata: true,
        includeValues: false
      });

      console.log(`📊 Found ${queryResponse.matches?.length || 0} relevant analysis documents`);
      return queryResponse;
    } catch (error) {
      console.error('Failed to search analysis content:', error);
      return { matches: [] };
    }
  }

  /**
   * Get related analyses for a given analysis type
   */
  async getRelatedAnalyses(
    analysisType: string,
    projectId: string,
    excludeId?: string,
    topK: number = 5
  ): Promise<any> {
    try {
      console.log(`🔍 Finding related analyses for ${analysisType} in project ${projectId}`);
      
      // Create a query embedding based on the analysis type
      const queryText = `${analysisType} analysis insights recommendations market technical financial`;
      const embedding = await embeddingService.generateEmbeddingWithFallback(queryText);
      
      const filter: Record<string, any> = {
        projectId: { $eq: projectId },
        type: { $eq: 'analysis' }
      };

      if (excludeId) {
        filter.id = { $ne: excludeId };
      }

      const queryResponse = await this.query(embedding, {
        topK,
        filter,
        includeMetadata: true,
        includeValues: false
      });

      console.log(`📊 Found ${queryResponse.matches?.length || 0} related analyses`);
      return queryResponse;
    } catch (error) {
      console.error('Failed to get related analyses:', error);
      return { matches: [] };
    }
  }

  /**
   * Batch upsert with automatic embedding generation
   */
  async upsertWithEmbeddings(
    items: Array<{ id: string; text: string; metadata: Record<string, any> }>,
    options: UpsertOptions = {}
  ): Promise<any> {
    if (items.length === 0) {
      return { upsertedCount: 0 };
    }

    console.log(`🔄 Generating embeddings for ${items.length} items`);

    // Generate embeddings in batches
    const texts = items.map(item => item.text);
    const embeddings = await embeddingService.generateEmbeddingsBatch(texts);

    // Create vector operations
    const vectors: VectorOperation[] = items.map((item, index) => ({
      id: item.id,
      values: embeddings[index],
      metadata: {
        ...item.metadata,
        text: item.text,
        lastModified: new Date().toISOString()
      }
    }));

    return this.upsert(vectors, options);
  }

  /**
   * Get project vectors with optimized querying
   */
  async getProjectVectors(
    projectId: string,
    namespace?: string,
    includeValues: boolean = true
  ): Promise<any[]> {
    const queryResponse = await this.query(
      new Array(1024).fill(0), // Dummy vector for filtering
      {
        topK: 1000, // Large number to get all project vectors
        filter: { projectId: { $eq: projectId } },
        includeMetadata: true,
        includeValues,
        namespace
      }
    );

    return queryResponse.matches || [];
  }

  /**
   * Delete all vectors for a project
   */
  async deleteProjectVectors(
    projectId: string,
    namespace?: string
  ): Promise<any> {
    // First, get all vector IDs for the project
    const projectVectors = await this.getProjectVectors(projectId, namespace, false);
    const vectorIds = projectVectors.map((vector: any) => vector.id);

    if (vectorIds.length === 0) {
      console.log(`📭 No vectors found for project ${projectId}`);
      return { deletedCount: 0 };
    }

    console.log(`🗑️ Deleting ${vectorIds.length} vectors for project ${projectId}`);
    return this.delete(vectorIds, namespace);
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    try {
      const startTime = Date.now();
      
      // Test basic connectivity
      await this.query(new Array(1024).fill(0), {
        topK: 1,
        includeMetadata: false,
        includeValues: false
      });

      const latency = Date.now() - startTime;
      return { healthy: true, latency };
    } catch (error) {
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      pinecone: PineconeUtils.getMetrics(),
      embedding: embeddingService.getCacheStats()
    };
  }

  /**
   * Reset service state
   */
  reset(): void {
    PineconeUtils.resetMetrics();
    PineconeUtils.resetCircuitBreaker();
    embeddingService.clearCache();
    console.log('🔄 PineconeOperationsService reset');
  }
}

// Export singleton instance
export const pineconeOperationsService = PineconeOperationsService.getInstance();
