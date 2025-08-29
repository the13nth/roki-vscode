import { getPineconeClient, PINECONE_INDEX_NAME } from './pinecone';

// Helper function for embeddings (same as in projectService)
async function generateEmbedding(text: string): Promise<number[]> {
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

// Enhanced token tracking with rate limiting and alerts
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
  provider?: string; // Track which AI provider was used
  model?: string; // Track specific model used
  responseTime?: number; // Track API response time
  success?: boolean; // Track if the request was successful
  errorMessage?: string; // Track any errors
}

export interface CumulativeTokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCost: number;
  sessionCount: number;
  lastUpdated: string;
  dailyAverage?: number; // New: daily average usage
  monthlyProjection?: number; // New: monthly cost projection
}

export interface SessionTokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  sessionId: string;
  lastUpdated: string;
  averageResponseTime?: number; // New: average response time
  successRate?: number; // New: success rate percentage
}

// New: Rate limiting configuration
export interface RateLimitConfig {
  dailyLimit: number; // Daily token limit per user
  monthlyLimit: number; // Monthly token limit per user
  burstLimit: number; // Burst limit (tokens per minute)
  alertThreshold: number; // Percentage of limit to trigger alerts
}

// New: Alert system
export interface TokenAlert {
  userId: string;
  type: 'daily_limit' | 'monthly_limit' | 'burst_limit' | 'cost_threshold';
  message: string;
  timestamp: string;
  severity: 'warning' | 'critical';
  currentUsage: number;
  limit: number;
}

export class TokenTrackingService {
  private static instance: TokenTrackingService;
  private sessionId: string;
  private rateLimits: Map<string, { tokens: number; lastReset: number; requests: number[] }> = new Map();
  private alerts: TokenAlert[] = [];

  // Enhanced pricing configuration for multiple providers
  private pricingConfig = {
    'google-gemini': {
      inputCostPerMillion: 0.075,
      outputCostPerMillion: 0.30,
      model: 'gemini-1.5-flash'
    },
    'openai-gpt4': {
      inputCostPerMillion: 0.03,
      outputCostPerMillion: 0.06,
      model: 'gpt-4'
    },
    'anthropic-claude': {
      inputCostPerMillion: 0.015,
      outputCostPerMillion: 0.075,
      model: 'claude-3-sonnet'
    }
  };

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

  // Enhanced cost calculation with provider support
  private calculateCost(inputTokens: number, outputTokens: number, provider: string = 'google-gemini'): number {
    const config = this.pricingConfig[provider as keyof typeof this.pricingConfig] || this.pricingConfig['google-gemini'];
    const inputCost = (inputTokens / 1000000) * config.inputCostPerMillion;
    const outputCost = (outputTokens / 1000000) * config.outputCostPerMillion;
    return inputCost + outputCost;
  }

  // New: Rate limiting check
  private async checkRateLimit(userId: string, tokens: number): Promise<{ allowed: boolean; reason?: string }> {
    const now = Date.now();
    const userLimit = this.rateLimits.get(userId) || { tokens: 0, lastReset: now, requests: [] };
    
    // Reset daily limit if it's a new day
    const dayStart = new Date().setHours(0, 0, 0, 0);
    if (userLimit.lastReset < dayStart) {
      userLimit.tokens = 0;
      userLimit.lastReset = now;
      userLimit.requests = [];
    }

    // Check daily limit (default: 1M tokens per day)
    const dailyLimit = 1000000;
    if (userLimit.tokens + tokens > dailyLimit) {
      return { allowed: false, reason: 'Daily token limit exceeded' };
    }

    // Check burst limit (default: 10k tokens per minute)
    const burstLimit = 10000;
    const oneMinuteAgo = now - 60000;
    const recentRequests = userLimit.requests.filter(_time => _time > oneMinuteAgo);
    const recentTokens = recentRequests.reduce((sum, _time) => sum + tokens, 0);
    
    if (recentTokens > burstLimit) {
      return { allowed: false, reason: 'Burst limit exceeded' };
    }

    // Update limits
    userLimit.tokens += tokens;
    userLimit.requests.push(now);
    this.rateLimits.set(userId, userLimit);

    return { allowed: true };
  }

  // New: Generate alerts
  private async generateAlert(userId: string, usage: number, limit: number, type: TokenAlert['type']): Promise<void> {
    const alert: TokenAlert = {
      userId,
      type,
      message: `User ${userId} has reached ${Math.round((usage / limit) * 100)}% of their ${type.replace('_', ' ')} limit`,
      timestamp: new Date().toISOString(),
      severity: usage / limit > 0.9 ? 'critical' : 'warning',
      currentUsage: usage,
      limit
    };

    this.alerts.push(alert);
    
    // Save alert to Pinecone for persistence
    await this.saveAlertToPinecone(alert);
    
    console.log(`🚨 Token Alert: ${alert.message}`);
  }

  // New: Save alerts to Pinecone
  private async saveAlertToPinecone(alert: TokenAlert): Promise<void> {
    try {
      const pinecone = getPineconeClient();
      const index = pinecone.index(PINECONE_INDEX_NAME);

      const content = `Token alert for user ${alert.userId}: ${alert.message}`;
      const embedding = await generateEmbedding(content);

      const vectorId = `token_alert_${alert.userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await index.upsert([{
        id: vectorId,
        values: embedding,
        metadata: {
          type: 'token_alert',
          userId: alert.userId,
          alertType: alert.type,
          message: alert.message,
          timestamp: alert.timestamp,
          severity: alert.severity,
          currentUsage: alert.currentUsage,
          limit: alert.limit,
          createdAt: new Date().toISOString()
        }
      }]);
    } catch (error) {
      console.error('Error saving alert to Pinecone:', error);
    }
  }

  // Enhanced token tracking with rate limiting and alerts
  async trackTokenUsage(
    projectId: string,
    inputTokens: number,
    outputTokens: number,
    _analysisType: string,
    userId?: string,
    provider: string = 'google-gemini',
    model?: string,
    responseTime?: number,
    success: boolean = true,
    errorMessage?: string
  ): Promise<{ success: boolean; reason?: string }> {
    try {
      if (!userId) {
        console.warn('No userId provided for token tracking');
        return { success: false, reason: 'No userId provided' };
      }

      // Check subscription limits first
      const subscriptionCheck = await this.checkSubscriptionLimits(userId, inputTokens + outputTokens);
      if (!subscriptionCheck.allowed) {
        return { success: false, reason: subscriptionCheck.reason };
      }

      // Check rate limits
      const totalTokens = inputTokens + outputTokens;
      const rateLimitCheck = await this.checkRateLimit(userId, totalTokens);
      
      if (!rateLimitCheck.allowed) {
        await this.generateAlert(userId, totalTokens, 1000000, 'daily_limit');
        return { success: false, reason: rateLimitCheck.reason };
      }

      const cost = this.calculateCost(inputTokens, outputTokens, provider);
      const timestamp = new Date().toISOString();

      const tokenUsage: TokenUsage = {
        inputTokens,
        outputTokens,
        totalTokens,
        cost,
        timestamp,
        projectId,
        userId,
        analysisType: _analysisType,
        sessionId: this.sessionId,
        provider,
        model,
        responseTime,
        success,
        errorMessage
      };

      // Save to Pinecone
      await this.saveToPinecone(tokenUsage);

      // Check for cost thresholds and generate alerts
      const dailyUsage = await this.getDailyUsage(userId);
      if (dailyUsage.totalCost > 10) { // Alert if daily cost exceeds $10
        await this.generateAlert(userId, dailyUsage.totalCost, 10, 'cost_threshold');
      }

      console.log('Token usage tracked:', tokenUsage);
      return { success: true };
    } catch (error) {
      console.error('Error tracking token usage:', error);
      return { success: false, reason: 'Internal error' };
    }
  }

  private async saveToPinecone(tokenUsage: TokenUsage): Promise<void> {
    try {
      const pinecone = getPineconeClient();
      const index = pinecone.index(PINECONE_INDEX_NAME);

      // Create a simple embedding for the token usage data
      const content = `Token usage for ${tokenUsage.analysisType} analysis in project ${tokenUsage.projectId}`;
      const embedding = await generateEmbedding(content);

      const vectorId = `token_usage_${tokenUsage.projectId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await index.upsert([{
        id: vectorId,
        values: embedding,
        metadata: {
          type: 'token_usage',
          projectId: tokenUsage.projectId,
          userId: tokenUsage.userId || '',
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

  // New: Get daily usage for a user
  async getDailyUsage(userId: string): Promise<{ totalTokens: number; totalCost: number; requestCount: number }> {
    try {
      const pinecone = getPineconeClient();
      const index = pinecone.index(PINECONE_INDEX_NAME);

      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);

      const queryResponse = await index.query({
        vector: new Array(1024).fill(0),
        filter: {
          userId: { $eq: userId },
          type: { $eq: 'token_usage' }
        },
        topK: 1000,
        includeMetadata: true
      });

      let totalTokens = 0;
      let totalCost = 0;
      let requestCount = 0;

      queryResponse.matches.forEach(match => {
        if (match.metadata) {
          const timestamp = new Date(match.metadata.timestamp as string);
          if (timestamp >= dayStart) {
            totalTokens += (match.metadata.totalTokens as number) || 0;
            totalCost += (match.metadata.cost as number) || 0;
            requestCount++;
          }
        }
      });

      return { totalTokens, totalCost, requestCount };
    } catch (error) {
      console.error('Error getting daily usage:', error);
      return { totalTokens: 0, totalCost: 0, requestCount: 0 };
    }
  }

  // New: Get alerts for admin dashboard
  async getAlerts(timeRange: string = '7d'): Promise<TokenAlert[]> {
    try {
      const pinecone = getPineconeClient();
      const index = pinecone.index(PINECONE_INDEX_NAME);

      const queryResponse = await index.query({
        vector: new Array(1024).fill(0),
        filter: {
          type: { $eq: 'token_alert' }
        },
        topK: 1000,
        includeMetadata: true
      });

      const alerts = queryResponse.matches
        .map(match => match.metadata)
        .filter((metadata): metadata is Record<string, string | number | boolean> => metadata !== undefined)
        .map(metadata => ({
          userId: metadata.userId,
          type: metadata.alertType,
          message: metadata.message,
          timestamp: metadata.timestamp,
          severity: metadata.severity,
          currentUsage: metadata.currentUsage,
          limit: metadata.limit
        } as TokenAlert));

      // Filter by time range
      const now = new Date();
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      return alerts.filter(alert => new Date(alert.timestamp) >= startDate);
    } catch (error) {
      console.error('Error getting alerts:', error);
      return [];
    }
  }

  // Enhanced cumulative usage with projections
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
      const dailyUsage: Record<string, number> = {};

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

          // Track daily usage for average calculation
          const date = new Date(match.metadata.timestamp as string).toISOString().split('T')[0];
          dailyUsage[date] = (dailyUsage[date] || 0) + inputTokens + outputTokens;
        }
      });

      // Calculate daily average and monthly projection
      const days = Object.keys(dailyUsage).length;
      const dailyAverage = days > 0 ? (totalInputTokens + totalOutputTokens) / days : 0;
      const monthlyProjection = dailyAverage * 30;

      return {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        totalTokens: totalInputTokens + totalOutputTokens,
        totalCost,
        sessionCount: sessionIds.size,
        lastUpdated: new Date().toISOString(),
        dailyAverage,
        monthlyProjection
      };
    } catch (error) {
      console.error('Error getting cumulative usage:', error);
      return this.getDefaultCumulativeUsage();
    }
  }

  // Enhanced session usage with performance metrics
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
      let totalResponseTime = 0;
      let successfulRequests = 0;

      queryResponse.matches.forEach(match => {
        if (match.metadata) {
          const inputTokens = typeof match.metadata.inputTokens === 'number' ? match.metadata.inputTokens : 0;
          const outputTokens = typeof match.metadata.outputTokens === 'number' ? match.metadata.outputTokens : 0;
          const cost = typeof match.metadata.cost === 'number' ? match.metadata.cost : 0;
          const responseTime = typeof match.metadata.responseTime === 'number' ? match.metadata.responseTime : 0;
          const success = match.metadata.success !== false; // Default to true

          totalInputTokens += inputTokens;
          totalOutputTokens += outputTokens;
          totalCost += cost;
          totalResponseTime += responseTime;
          requestCount++;
          
          if (success) {
            successfulRequests++;
          }
        }
      });

      const averageResponseTime = requestCount > 0 ? totalResponseTime / requestCount : 0;
      const successRate = requestCount > 0 ? (successfulRequests / requestCount) * 100 : 100;

      return {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        totalTokens: totalInputTokens + totalOutputTokens,
        totalCost,
        requestCount,
        sessionId: this.sessionId,
        lastUpdated: new Date().toISOString(),
        averageResponseTime,
        successRate
      };
    } catch (error) {
      console.error('Error getting session usage:', error);
      return this.getDefaultSessionUsage();
    }
  }

  // New: Check subscription limits
  private async checkSubscriptionLimits(userId: string, tokens: number): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const pinecone = getPineconeClient();
      const index = pinecone.index(PINECONE_INDEX_NAME);

      // Get user's current subscription
      const subscriptionResponse = await index.query({
        vector: new Array(1024).fill(0),
        filter: {
          type: { $eq: 'user_subscription' },
          userId: { $eq: userId }
        },
        topK: 1,
        includeMetadata: true
      });

      let currentPlan = 'free'; // Default to free plan
      if (subscriptionResponse.matches.length > 0) {
        const metadata = subscriptionResponse.matches[0].metadata;
        if (metadata?.planId) {
          currentPlan = metadata.planId as string;
        }
      }

      // Get user's current usage for this month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const usageResponse = await index.query({
        vector: new Array(1024).fill(0),
        filter: {
          type: { $eq: 'token_usage' },
          userId: { $eq: userId }
        },
        topK: 1000,
        includeMetadata: true
      });

      let monthlyTokensUsed = 0;
      usageResponse.matches.forEach(match => {
        if (match.metadata?.timestamp) {
          const usageDate = new Date(match.metadata.timestamp as string);
          if (usageDate >= monthStart) {
            monthlyTokensUsed += (match.metadata.totalTokens as number) || 0;
          }
        }
      });

      // Get plan limits
      const planLimits = this.getPlanLimits(currentPlan);
      const totalTokensAfterThisRequest = monthlyTokensUsed + tokens;

      if (totalTokensAfterThisRequest > planLimits.tokens) {
        return { 
          allowed: false, 
          reason: `Monthly token limit exceeded. You have ${planLimits.tokens.toLocaleString()} tokens/month, used ${monthlyTokensUsed.toLocaleString()}, trying to use ${tokens.toLocaleString()}` 
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking subscription limits:', error);
      // Allow the request if we can't check limits
      return { allowed: true };
    }
  }

  // New: Get plan limits
  private getPlanLimits(planId: string): { tokens: number; projects: number; analyses: number; socialPosts: number } {
    const limits = {
      free: { tokens: 500000, projects: 2, analyses: 2, socialPosts: 5 },
      starter: { tokens: 2000000, projects: 10, analyses: 5, socialPosts: 25 },
      professional: { tokens: 10000000, projects: -1, analyses: -1, socialPosts: 100 },
      enterprise: { tokens: 50000000, projects: -1, analyses: -1, socialPosts: -1 }
    };

    return limits[planId as keyof typeof limits] || limits.free;
  }

  // New: Check if user can create a project
  async canCreateProject(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const pinecone = getPineconeClient();
      const index = pinecone.index(PINECONE_INDEX_NAME);

      // Get user's current subscription
      const subscriptionResponse = await index.query({
        vector: new Array(1024).fill(0),
        filter: {
          type: { $eq: 'user_subscription' },
          userId: { $eq: userId }
        },
        topK: 1,
        includeMetadata: true
      });

      let currentPlan = 'free';
      if (subscriptionResponse.matches.length > 0) {
        const metadata = subscriptionResponse.matches[0].metadata;
        if (metadata?.planId) {
          currentPlan = metadata.planId as string;
        }
      }

      // Get user's current projects count
      const projectsResponse = await index.query({
        vector: new Array(1024).fill(0),
        filter: {
          type: { $eq: 'project' },
          userId: { $eq: userId }
        },
        topK: 1000,
        includeMetadata: true
      });

      const projectsCount = projectsResponse.matches.length;
      const planLimits = this.getPlanLimits(currentPlan);

      if (planLimits.projects !== -1 && projectsCount >= planLimits.projects) {
        return { 
          allowed: false, 
          reason: `Project limit exceeded. You can create ${planLimits.projects} projects, currently have ${projectsCount}` 
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking project creation limits:', error);
      return { allowed: true };
    }
  }

  // New: Check if user can perform analysis
  async canPerformAnalysis(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const pinecone = getPineconeClient();
      const index = pinecone.index(PINECONE_INDEX_NAME);

      // Get user's current subscription
      const subscriptionResponse = await index.query({
        vector: new Array(1024).fill(0),
        filter: {
          type: { $eq: 'user_subscription' },
          userId: { $eq: userId }
        },
        topK: 1,
        includeMetadata: true
      });

      let currentPlan = 'free';
      if (subscriptionResponse.matches.length > 0) {
        const metadata = subscriptionResponse.matches[0].metadata;
        if (metadata?.planId) {
          currentPlan = metadata.planId as string;
        }
      }

      // Get user's current analyses count for this month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const analysesResponse = await index.query({
        vector: new Array(1024).fill(0),
        filter: {
          type: { $eq: 'token_usage' },
          userId: { $eq: userId }
        },
        topK: 1000,
        includeMetadata: true
      });

      let monthlyAnalyses = 0;
      analysesResponse.matches.forEach(match => {
        if (match.metadata?.timestamp) {
          const usageDate = new Date(match.metadata.timestamp as string);
          if (usageDate >= monthStart) {
            monthlyAnalyses++;
          }
        }
      });

      const planLimits = this.getPlanLimits(currentPlan);

      if (planLimits.analyses !== -1 && monthlyAnalyses >= planLimits.analyses) {
        return { 
          allowed: false, 
          reason: `Monthly analysis limit exceeded. You can perform ${planLimits.analyses} analyses/month, currently have ${monthlyAnalyses}` 
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking analysis limits:', error);
      return { allowed: true };
    }
  }

  // New: Check if user can create social posts
  async canCreateSocialPost(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const pinecone = getPineconeClient();
      const index = pinecone.index(PINECONE_INDEX_NAME);

      // Get user's current subscription
      const subscriptionResponse = await index.query({
        vector: new Array(1024).fill(0),
        filter: {
          type: { $eq: 'user_subscription' },
          userId: { $eq: userId }
        },
        topK: 1,
        includeMetadata: true
      });

      let currentPlan = 'free';
      if (subscriptionResponse.matches.length > 0) {
        const metadata = subscriptionResponse.matches[0].metadata;
        if (metadata?.planId) {
          currentPlan = metadata.planId as string;
        }
      }

      // Get user's current social posts count for this month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const socialPostsResponse = await index.query({
        vector: new Array(1024).fill(0),
        filter: {
          type: { $eq: 'social_post' },
          userId: { $eq: userId }
        },
        topK: 1000,
        includeMetadata: true
      });

      let monthlySocialPosts = 0;
      socialPostsResponse.matches.forEach(match => {
        if (match.metadata?.timestamp) {
          const usageDate = new Date(match.metadata.timestamp as string);
          if (usageDate >= monthStart) {
            monthlySocialPosts++;
          }
        }
      });

      const planLimits = this.getPlanLimits(currentPlan);

      if (planLimits.socialPosts !== -1 && monthlySocialPosts >= planLimits.socialPosts) {
        return { 
          allowed: false, 
          reason: `Monthly social posts limit exceeded. You can create ${planLimits.socialPosts} social posts/month, currently have ${monthlySocialPosts}` 
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking social posts limits:', error);
      return { allowed: true };
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
