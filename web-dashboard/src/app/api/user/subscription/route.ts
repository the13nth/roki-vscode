import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';
import { TokenTrackingService } from '@/lib/tokenTrackingService';
import { getPlanById, getDefaultPlan } from '@/lib/subscriptionPlans';
import { SubscriptionUsage } from '@/types/subscription';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    let currentPlan = getDefaultPlan();
    let subscriptionData = null;

    if (subscriptionResponse.matches.length > 0) {
      const metadata = subscriptionResponse.matches[0].metadata;
      if (metadata?.planId) {
        const plan = getPlanById(metadata.planId as string, metadata.period as 'monthly' | 'yearly');
        if (plan) {
          currentPlan = plan;
          subscriptionData = {
            planId: metadata.planId,
            status: metadata.status || 'active',
            currentPeriodStart: metadata.currentPeriodStart,
            currentPeriodEnd: metadata.currentPeriodEnd,
            createdAt: metadata.createdAt,
            updatedAt: metadata.updatedAt
          };
        }
      }
    }

    // Get user's current usage
    const tokenTrackingService = TokenTrackingService.getInstance();
    const dailyUsage = await tokenTrackingService.getDailyUsage(userId);

    // Get user's projects count
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

    // Get user's analyses count (from token usage)
    const analysesResponse = await index.query({
      vector: new Array(1024).fill(0),
      filter: {
        type: { $eq: 'token_usage' },
        userId: { $eq: userId }
      },
      topK: 1000,
      includeMetadata: true
    });

    const analysesCount = analysesResponse.matches.length;

    // Get user's social posts count
    const socialPostsResponse = await index.query({
      vector: new Array(1024).fill(0),
      filter: {
        type: { $eq: 'social_post' },
        userId: { $eq: userId }
      },
      topK: 1000,
      includeMetadata: true
    });

    const socialPostsCount = socialPostsResponse.matches.length;

    // Calculate usage and remaining limits
    const currentUsage = {
      tokens: dailyUsage.totalTokens,
      projects: projectsCount,
      analyses: analysesCount,
      socialPosts: socialPostsCount
    };

    const limits = currentPlan.limits;
    const remaining = {
      tokens: limits.tokens === -1 ? -1 : Math.max(0, limits.tokens - currentUsage.tokens),
      projects: limits.projects === -1 ? -1 : Math.max(0, limits.projects - currentUsage.projects),
      analyses: limits.analysesPerSection === -1 ? -1 : Math.max(0, limits.analysesPerSection - currentUsage.analyses),
      socialPosts: limits.socialPosts === -1 ? -1 : Math.max(0, limits.socialPosts - currentUsage.socialPosts)
    };

    const percentageUsed = {
      tokens: limits.tokens === -1 ? 0 : Math.min(100, (currentUsage.tokens / limits.tokens) * 100),
      projects: limits.projects === -1 ? 0 : Math.min(100, (currentUsage.projects / limits.projects) * 100),
      analyses: limits.analysesPerSection === -1 ? 0 : Math.min(100, (currentUsage.analyses / limits.analysesPerSection) * 100),
      socialPosts: limits.socialPosts === -1 ? 0 : Math.min(100, (currentUsage.socialPosts / limits.socialPosts) * 100)
    };

    const subscriptionUsage: SubscriptionUsage = {
      userId,
      planId: currentPlan.id,
      currentUsage,
      limits,
      remaining,
      percentageUsed
    };

    return NextResponse.json({
      currentPlan,
      subscription: subscriptionData,
      usage: subscriptionUsage
    });

  } catch (error) {
    console.error('Error fetching user subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, planId, period = 'monthly' } = body;

    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);

    switch (action) {
      case 'subscribe':
        // Create or update user subscription
        const plan = getPlanById(planId, period);
        if (!plan) {
          return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
        }

        const now = new Date();
        const trialStart = now.toISOString();
        const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days trial
        const currentPeriodStart = now.toISOString();
        const currentPeriodEnd = new Date(now.getTime() + (period === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString();

        // Save subscription to Pinecone
        const subscriptionContent = `User ${userId} subscription to ${plan.name} plan with trial`;
        const embedding = await generateEmbedding(subscriptionContent, 1024);

        const vectorId = `user_subscription_${userId}_${Date.now()}`;

        await index.upsert([{
          id: vectorId,
          values: embedding,
          metadata: {
            type: 'user_subscription',
            userId,
            planId: plan.id,
            planName: plan.name,
            period,
            status: 'trialing',
            trialStart,
            trialEnd,
            currentPeriodStart,
            currentPeriodEnd,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
          }
        }]);

        return NextResponse.json({
          success: true,
          message: `Successfully subscribed to ${plan.name} plan`,
          subscription: {
            planId: plan.id,
            planName: plan.name,
            period,
            status: 'active',
            currentPeriodStart,
            currentPeriodEnd
          }
        });

      case 'cancel':
        // Cancel user subscription
        const subscriptionResponse = await index.query({
          vector: new Array(1024).fill(0),
          filter: {
            type: { $eq: 'user_subscription' },
            userId: { $eq: userId }
          },
          topK: 1,
          includeMetadata: true
        });

        if (subscriptionResponse.matches.length > 0) {
          const subscription = subscriptionResponse.matches[0];
          await index.update({
            id: subscription.id,
            metadata: {
              ...subscription.metadata,
              status: 'cancelled',
              updatedAt: new Date().toISOString()
            }
          });
        }

        return NextResponse.json({
          success: true,
          message: 'Subscription cancelled successfully'
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error managing user subscription:', error);
    return NextResponse.json(
      { error: 'Failed to manage subscription' },
      { status: 500 }
    );
  }
}

// Helper function for embeddings
async function generateEmbedding(text: string, dimensions: number = 1024): Promise<number[]> {
  try {
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
    
    // Pad Gemini's 768-dimensional embedding to 1024 dimensions
    if (geminiEmbedding.length < 1024) {
      const paddedEmbedding = [...geminiEmbedding];
      while (paddedEmbedding.length < 1024) {
        paddedEmbedding.push(0);
      }
      return paddedEmbedding;
    } else if (geminiEmbedding.length > 1024) {
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

    const vector = new Array(1024).fill(0);
    for (let i = 0; i < 1024; i++) {
      vector[i] = Math.sin(hash + i) * 0.1;
    }
    return vector;
  }
}
