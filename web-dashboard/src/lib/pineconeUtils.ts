

export interface PineconeOperationOptions {
  timeout?: number; // milliseconds
  maxRetries?: number;
  baseDelay?: number; // milliseconds for exponential backoff
  operationType?: 'query' | 'upsert' | 'delete' | 'fetch' | 'embedding';
  enableCircuitBreaker?: boolean;
  batchSize?: number; // for batch operations
}

export interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

export class PineconeUtils {
  // Enhanced timeout configurations based on operation type
  private static readonly TIMEOUTS = {
    query: 45000, // 45 seconds for queries
    upsert: 60000, // 60 seconds for upserts
    delete: 30000, // 30 seconds for deletes
    fetch: 30000, // 30 seconds for fetches
    embedding: 120000, // 2 minutes for embedding generation
    default: 45000 // 45 seconds default
  };

  private static readonly DEFAULT_MAX_RETRIES = 3;
  private static readonly DEFAULT_BASE_DELAY = 1000; // 1 second
  private static readonly MAX_BATCH_SIZE = 100; // Pinecone batch limit
  private static readonly CIRCUIT_BREAKER_THRESHOLD = 5; // failures before opening
  private static readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute before half-open

  // Circuit breaker state
  private static circuitBreakerState: CircuitBreakerState = {
    failures: 0,
    lastFailureTime: 0,
    state: 'CLOSED'
  };

  // Performance metrics
  private static metrics = {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    averageResponseTime: 0,
    lastOperationTime: 0
  };

  /**
   * Check circuit breaker state
   */
  private static checkCircuitBreaker(): boolean {
    const now = Date.now();
    
    if (this.circuitBreakerState.state === 'OPEN') {
      if (now - this.circuitBreakerState.lastFailureTime > this.CIRCUIT_BREAKER_TIMEOUT) {
        this.circuitBreakerState.state = 'HALF_OPEN';
        console.log('🔧 Circuit breaker moved to HALF_OPEN state');
        return true;
      }
      return false;
    }
    
    return true;
  }

  /**
   * Update circuit breaker state
   */
  private static updateCircuitBreaker(success: boolean): void {
    if (success) {
      if (this.circuitBreakerState.state === 'HALF_OPEN') {
        this.circuitBreakerState.state = 'CLOSED';
        this.circuitBreakerState.failures = 0;
        console.log('✅ Circuit breaker moved to CLOSED state');
      }
    } else {
      this.circuitBreakerState.failures++;
      this.circuitBreakerState.lastFailureTime = Date.now();
      
      if (this.circuitBreakerState.failures >= this.CIRCUIT_BREAKER_THRESHOLD) {
        this.circuitBreakerState.state = 'OPEN';
        console.log('🚨 Circuit breaker moved to OPEN state');
      }
    }
  }

  /**
   * Update performance metrics
   */
  private static updateMetrics(success: boolean, responseTime: number): void {
    this.metrics.totalOperations++;
    this.metrics.lastOperationTime = responseTime;
    
    if (success) {
      this.metrics.successfulOperations++;
    } else {
      this.metrics.failedOperations++;
    }
    
    // Calculate rolling average response time
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalOperations - 1) + responseTime) / 
      this.metrics.totalOperations;
  }

  /**
   * Execute a Pinecone operation with timeout and retry logic
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: PineconeOperationOptions = {}
  ): Promise<T> {
    const {
      timeout,
      maxRetries = this.DEFAULT_MAX_RETRIES,
      baseDelay = this.DEFAULT_BASE_DELAY,
      operationType = 'default',
      enableCircuitBreaker = true
    } = options;

    // Use operation-specific timeout if not provided
    const operationTimeout = timeout || this.TIMEOUTS[operationType] || this.TIMEOUTS.default;

    // Check circuit breaker
    if (enableCircuitBreaker && !this.checkCircuitBreaker()) {
      throw new Error('Circuit breaker is OPEN - Pinecone operations temporarily disabled');
    }

    let retryCount = 0;
    let lastError: Error | undefined;
    const startTime = Date.now();

    while (retryCount < maxRetries) {
      try {
        // Create timeout promise with operation-specific timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Pinecone ${operationType} operation timed out after ${operationTimeout}ms`)), operationTimeout);
        });

        // Execute operation with timeout
        const result = await Promise.race([operation(), timeoutPromise]);
        
        // Update metrics and circuit breaker on success
        const responseTime = Date.now() - startTime;
        this.updateMetrics(true, responseTime);
        this.updateCircuitBreaker(true);
        
        return result;
      } catch (error) {
        lastError = error as Error;
        retryCount++;
        
        console.warn(`Pinecone ${operationType} operation attempt ${retryCount} failed:`, error);
        
        if (retryCount < maxRetries) {
          // Enhanced exponential backoff with jitter and operation-specific delays
          const baseDelayForOperation = operationType === 'embedding' ? baseDelay * 2 : baseDelay;
          const delay = Math.pow(2, retryCount - 1) * baseDelayForOperation + Math.random() * 1000;
          console.log(`Retrying ${operationType} operation in ${Math.round(delay)}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Update metrics and circuit breaker on final failure
    const responseTime = Date.now() - startTime;
    this.updateMetrics(false, responseTime);
    this.updateCircuitBreaker(false);

    throw new Error(`Failed to execute Pinecone ${operationType} operation after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Execute multiple Pinecone operations sequentially with retry logic
   */
  static async executeSequentiallyWithRetry<T>(
    operations: (() => Promise<T>)[],
    options: PineconeOperationOptions = {}
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < operations.length; i++) {
      try {
        const result = await this.executeWithRetry(operations[i], options);
        results.push(result);
        console.log(`Completed operation ${i + 1}/${operations.length}`);
      } catch (error) {
        console.error(`Failed to execute operation ${i + 1}/${operations.length}:`, error);
        throw error; // Fail fast if any operation fails
      }
    }
    
    return results;
  }

  /**
   * Execute multiple Pinecone operations in parallel with retry logic
   */
  static async executeParallelWithRetry<T>(
    operations: (() => Promise<T>)[],
    options: PineconeOperationOptions = {}
  ): Promise<T[]> {
    const promises = operations.map(operation => 
      this.executeWithRetry(operation, options)
    );
    
    return Promise.all(promises);
  }

  /**
   * Validate Pinecone index and namespace
   */
  static validateNamespace(index: unknown, namespace: string): boolean {
    if (!index || typeof (index as any).namespace !== 'function') {
      throw new Error('Invalid Pinecone index provided');
    }
    
    if (!namespace || typeof namespace !== 'string') {
      throw new Error('Invalid namespace provided');
    }
    
    return true;
  }

  /**
   * Execute batch operations with intelligent batching
   */
  static async executeBatchWithRetry<T>(
    operations: (() => Promise<T>)[],
    options: PineconeOperationOptions = {}
  ): Promise<T[]> {
    const { batchSize = this.MAX_BATCH_SIZE } = options;
    const results: T[] = [];
    
    // Split operations into batches
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(operations.length / batchSize)} (${batch.length} operations)`);
      
      try {
        const batchResults = await this.executeParallelWithRetry(batch, options);
        results.push(...batchResults);
      } catch (error) {
        console.error(`Batch ${Math.floor(i / batchSize) + 1} failed:`, error);
        throw error;
      }
    }
    
    return results;
  }

  /**
   * Get performance metrics
   */
  static getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalOperations > 0 
        ? (this.metrics.successfulOperations / this.metrics.totalOperations) * 100 
        : 0,
      circuitBreakerState: this.circuitBreakerState
    };
  }

  /**
   * Reset performance metrics
   */
  static resetMetrics(): void {
    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageResponseTime: 0,
      lastOperationTime: 0
    };
  }

  /**
   * Reset circuit breaker
   */
  static resetCircuitBreaker(): void {
    this.circuitBreakerState = {
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED'
    };
    console.log('🔄 Circuit breaker reset to CLOSED state');
  }

  /**
   * Create a standardized error message for Pinecone operations
   */
  static createErrorMessage(operation: string, error: Error, context?: Record<string, unknown>): string {
    let message = `Pinecone ${operation} failed: ${error.message}`;
    
    if (context) {
      const contextStr = Object.entries(context)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ');
      message += ` | Context: ${contextStr}`;
    }
    
    return message;
  }

  /**
   * Health check for Pinecone service
   */
  static async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    try {
      const startTime = Date.now();
      
      // Simple query to test connectivity
      const testOperation = async () => {
        const { getPineconeClient, PINECONE_INDEX_NAME } = await import('./pinecone');
        const pinecone = getPineconeClient();
        const index = pinecone.index(PINECONE_INDEX_NAME);
        
        // Perform a minimal query
        await index.query({
          vector: new Array(1024).fill(0),
          topK: 1,
          includeMetadata: false,
          includeValues: false
        });
      };

      await this.executeWithRetry(testOperation, {
        operationType: 'query',
        maxRetries: 1,
        timeout: 10000 // 10 second timeout for health check
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
}
