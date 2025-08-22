import { getPineconeClient, PINECONE_INDEX_NAME } from './pinecone';

// Helper function for embeddings (same as in projectService)
async function generateEmbedding(text: string, dimensions: number = 1024): Promise<number[]> {
  try {
    // Use Gemini for embeddings
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
      throw new Error(`Gemini embedding API error: ${response.status}`);
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
  } catch (error) {
    console.error('Failed to generate embedding with Gemini:', error);
    // Fallback to a simple hash-based embedding
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

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  timestamp: string;
  projectId: string;
  userId?: string;
  analysisType: string;
  sessionId: string;
}

export interface CumulativeTokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCost: number;
  sessionCount: number;
  lastUpdated: string;
}

export interface SessionTokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  sessionId: string;
  lastUpdated: string;
}

export class TokenTrackingService {
  private static instance: TokenTrackingService;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  static getInstance(): TokenTrackingService {
    if (!TokenTrackingService.instance) {
      TokenTrackingService.instance = new TokenTrackingService();
    }
    return TokenTrackingService.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1000) * 0.000125; // Gemini 1.5 Flash input rate
    const outputCost = (outputTokens / 1000) * 0.000375; // Gemini 1.5 Flash output rate
    return inputCost + outputCost;
  }

  async trackTokenUsage(
    projectId: string,
    inputTokens: number,
    outputTokens: number,
    analysisType: string,
    userId?: string
  ): Promise<void> {
    try {
      const cost = this.calculateCost(inputTokens, outputTokens);
      const timestamp = new Date().toISOString();

      const tokenUsage: TokenUsage = {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        cost,
        timestamp,
        projectId,
        userId,
        analysisType,
        sessionId: this.sessionId
      };

      // Save to Pinecone
      await this.saveToPinecone(tokenUsage);

      console.log('Token usage tracked:', tokenUsage);
    } catch (error) {
      console.error('Error tracking token usage:', error);
    }
  }

  private async saveToPinecone(tokenUsage: TokenUsage): Promise<void> {
    try {
      const pinecone = getPineconeClient();
      const index = pinecone.index(PINECONE_INDEX_NAME);

      // Create a simple embedding for the token usage data
      const content = `Token usage for ${tokenUsage.analysisType} analysis in project ${tokenUsage.projectId}`;
      const embedding = await generateEmbedding(content, 1024);

      const vectorId = `token_usage_${tokenUsage.projectId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await index.upsert([{
        id: vectorId,
        values: embedding,
        metadata: {
          type: 'token_usage',
          projectId: tokenUsage.projectId,
          userId: tokenUsage.userId,
          sessionId: tokenUsage.sessionId,
          analysisType: tokenUsage.analysisType,
          inputTokens: tokenUsage.inputTokens,
          outputTokens: tokenUsage.outputTokens,
          totalTokens: tokenUsage.totalTokens,
          cost: tokenUsage.cost,
          timestamp: tokenUsage.timestamp,
          createdAt: new Date().toISOString()
        }
      }]);

      console.log('Token usage saved to Pinecone:', vectorId);
    } catch (error) {
      console.error('Error saving token usage to Pinecone:', error);
    }
  }

  async getCumulativeUsage(projectId: string): Promise<CumulativeTokenUsage> {
    try {
      const pinecone = getPineconeClient();
      const index = pinecone.index(PINECONE_INDEX_NAME);

      const queryResponse = await index.query({
        vector: new Array(1024).fill(0),
        filter: {
          projectId: { $eq: projectId },
          type: { $eq: 'token_usage' }
        },
        topK: 1000,
        includeMetadata: true
      });

      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let totalCost = 0;
      const sessionIds = new Set<string>();

      queryResponse.matches.forEach(match => {
        if (match.metadata) {
          const inputTokens = typeof match.metadata.inputTokens === 'number' ? match.metadata.inputTokens : 0;
          const outputTokens = typeof match.metadata.outputTokens === 'number' ? match.metadata.outputTokens : 0;
          const cost = typeof match.metadata.cost === 'number' ? match.metadata.cost : 0;

          totalInputTokens += inputTokens;
          totalOutputTokens += outputTokens;
          totalCost += cost;

          if (match.metadata.sessionId && typeof match.metadata.sessionId === 'string') {
            sessionIds.add(match.metadata.sessionId);
          }
        }
      });

      return {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        totalTokens: totalInputTokens + totalOutputTokens,
        totalCost,
        sessionCount: sessionIds.size,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting cumulative usage:', error);
      return this.getDefaultCumulativeUsage();
    }
  }

  async getSessionUsage(projectId: string): Promise<SessionTokenUsage> {
    try {
      const pinecone = getPineconeClient();
      const index = pinecone.index(PINECONE_INDEX_NAME);

      const queryResponse = await index.query({
        vector: new Array(1024).fill(0),
        filter: {
          projectId: { $eq: projectId },
          type: { $eq: 'token_usage' },
          sessionId: { $eq: this.sessionId }
        },
        topK: 1000,
        includeMetadata: true
      });

      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let totalCost = 0;
      let requestCount = 0;

      queryResponse.matches.forEach(match => {
        if (match.metadata) {
          const inputTokens = typeof match.metadata.inputTokens === 'number' ? match.metadata.inputTokens : 0;
          const outputTokens = typeof match.metadata.outputTokens === 'number' ? match.metadata.outputTokens : 0;
          const cost = typeof match.metadata.cost === 'number' ? match.metadata.cost : 0;

          totalInputTokens += inputTokens;
          totalOutputTokens += outputTokens;
          totalCost += cost;
          requestCount++;
        }
      });

      return {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        totalTokens: totalInputTokens + totalOutputTokens,
        totalCost,
        requestCount,
        sessionId: this.sessionId,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting session usage:', error);
      return this.getDefaultSessionUsage();
    }
  }

  private getDefaultCumulativeUsage(): CumulativeTokenUsage {
    return {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      sessionCount: 0,
      lastUpdated: new Date().toISOString()
    };
  }

  private getDefaultSessionUsage(): SessionTokenUsage {
    return {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      totalCost: 0,
      requestCount: 0,
      sessionId: this.sessionId,
      lastUpdated: new Date().toISOString()
    };
  }
}
