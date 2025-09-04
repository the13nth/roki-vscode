import { Pinecone } from '@pinecone-database/pinecone';

export interface PineconeOperationOptions {
  timeout?: number; // milliseconds
  maxRetries?: number;
  baseDelay?: number; // milliseconds for exponential backoff
}

export class PineconeUtils {
  private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private static readonly DEFAULT_MAX_RETRIES = 3;
  private static readonly DEFAULT_BASE_DELAY = 1000; // 1 second

  /**
   * Execute a Pinecone operation with timeout and retry logic
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: PineconeOperationOptions = {}
  ): Promise<T> {
    const {
      timeout = this.DEFAULT_TIMEOUT,
      maxRetries = this.DEFAULT_MAX_RETRIES,
      baseDelay = this.DEFAULT_BASE_DELAY
    } = options;

    let retryCount = 0;
    let lastError: Error;

    while (retryCount < maxRetries) {
      try {
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Pinecone operation timed out after ${timeout}ms`)), timeout);
        });

        // Execute operation with timeout
        const result = await Promise.race([operation(), timeoutPromise]);
        return result;
      } catch (error) {
        lastError = error as Error;
        retryCount++;
        
        console.warn(`Pinecone operation attempt ${retryCount} failed:`, error);
        
        if (retryCount < maxRetries) {
          // Exponential backoff with jitter
          const delay = Math.pow(2, retryCount - 1) * baseDelay + Math.random() * 1000;
          console.log(`Retrying in ${Math.round(delay)}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Failed to execute Pinecone operation after ${maxRetries} attempts: ${lastError?.message}`);
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
  static validateNamespace(index: any, namespace: string): boolean {
    if (!index || typeof index.namespace !== 'function') {
      throw new Error('Invalid Pinecone index provided');
    }
    
    if (!namespace || typeof namespace !== 'string') {
      throw new Error('Invalid namespace provided');
    }
    
    return true;
  }

  /**
   * Create a standardized error message for Pinecone operations
   */
  static createErrorMessage(operation: string, error: Error, context?: Record<string, any>): string {
    let message = `Pinecone ${operation} failed: ${error.message}`;
    
    if (context) {
      const contextStr = Object.entries(context)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ');
      message += ` | Context: ${contextStr}`;
    }
    
    return message;
  }
}
