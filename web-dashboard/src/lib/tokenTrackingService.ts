import { pinecone } from './pinecone';
import { generateEmbedding } from './pinecone';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  timestamp: string;
  projectId: string;
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
    analysisType: string
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
    if (!pinecone) {
      console.warn('Pinecone not configured, skipping token usage storage');
      return;
    }

    try {
      const index = pinecone.index(process.env.NEXT_PUBLIC_PINECONE_INDEX_NAME || 'roki');
      
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
      if (!pinecone) {
        return this.getDefaultCumulativeUsage();
      }

      const index = pinecone.index(process.env.NEXT_PUBLIC_PINECONE_INDEX_NAME || 'roki');
      
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
          totalInputTokens += match.metadata.inputTokens || 0;
          totalOutputTokens += match.metadata.outputTokens || 0;
          totalCost += match.metadata.cost || 0;
          if (match.metadata.sessionId) {
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
      if (!pinecone) {
        return this.getDefaultSessionUsage();
      }

      const index = pinecone.index(process.env.NEXT_PUBLIC_PINECONE_INDEX_NAME || 'roki');
      
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
          totalInputTokens += match.metadata.inputTokens || 0;
          totalOutputTokens += match.metadata.outputTokens || 0;
          totalCost += match.metadata.cost || 0;
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
