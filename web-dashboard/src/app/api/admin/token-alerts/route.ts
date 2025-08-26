import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';
import { TokenTrackingService } from '@/lib/tokenTrackingService';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const isAdmin = sessionClaims?.org_slug === 'binghi_admins' || 
                   sessionClaims?.org_name === 'binghi_admins' ||
                   sessionClaims?.org_id?.includes('binghi_admins');

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get('timeRange') || '7d';
    const severity = searchParams.get('severity'); // 'warning', 'critical', or undefined for all
    const userIdFilter = searchParams.get('userId'); // Filter by specific user

    const tokenTrackingService = TokenTrackingService.getInstance();
    const alerts = await tokenTrackingService.getAlerts(timeRange);

    // Apply filters
    let filteredAlerts = alerts;
    
    if (severity) {
      filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity);
    }
    
    if (userIdFilter) {
      filteredAlerts = filteredAlerts.filter(alert => alert.userId === userIdFilter);
    }

    // Sort by timestamp (most recent first)
    filteredAlerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      alerts: filteredAlerts,
      totalCount: filteredAlerts.length,
      criticalCount: filteredAlerts.filter(a => a.severity === 'critical').length,
      warningCount: filteredAlerts.filter(a => a.severity === 'warning').length
    });

  } catch (error) {
    console.error('Error fetching token alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token alerts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const isAdmin = sessionClaims?.org_slug === 'binghi_admins' || 
                   sessionClaims?.org_name === 'binghi_admins' ||
                   sessionClaims?.org_id?.includes('binghi_admins');

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, alertId, userId: targetUserId, newLimits } = body;

    switch (action) {
      case 'acknowledge':
        // Mark alert as acknowledged
        await acknowledgeAlert(alertId);
        break;
      
      case 'update_limits':
        // Update user's token limits
        if (targetUserId && newLimits) {
          await updateUserLimits(targetUserId, newLimits);
        }
        break;
      
      case 'dismiss':
        // Dismiss/delete alert
        await dismissAlert(alertId);
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({ 
      success: true,
      message: `Alert ${action} completed successfully`
    });

  } catch (error) {
    console.error('Error processing alert action:', error);
    return NextResponse.json(
      { error: 'Failed to process alert action' },
      { status: 500 }
    );
  }
}

async function acknowledgeAlert(alertId: string) {
  try {
    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);

    // Update the alert metadata to mark as acknowledged
    const queryResponse = await index.query({
      vector: new Array(1024).fill(0),
      filter: {
        type: { $eq: 'token_alert' }
      },
      topK: 1000,
      includeMetadata: true
    });

    // Find the specific alert and update it
    const alert = queryResponse.matches.find(match => 
      match.id === alertId || match.metadata?.alertId === alertId
    );

    if (alert) {
      await index.update({
        id: alert.id,
        metadata: {
          ...alert.metadata,
          acknowledged: true,
          acknowledgedAt: new Date().toISOString(),
          acknowledgedBy: 'admin'
        }
      });
    }
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    throw error;
  }
}

async function dismissAlert(alertId: string) {
  try {
    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);

    // Delete the alert from Pinecone
    await index.deleteOne(alertId);
  } catch (error) {
    console.error('Error dismissing alert:', error);
    throw error;
  }
}

async function updateUserLimits(userId: string, newLimits: { dailyLimit?: number; monthlyLimit?: number; burstLimit?: number }) {
  try {
    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);

    // Save user limits to Pinecone
    const content = `User limits for ${userId}: ${JSON.stringify(newLimits)}`;
    const embedding = await generateEmbedding(content, 1024);

    const vectorId = `user_limits_${userId}_${Date.now()}`;

    await index.upsert([{
      id: vectorId,
      values: embedding,
              metadata: {
          type: 'user_limits',
          userId,
          dailyLimit: newLimits.dailyLimit || 0,
          monthlyLimit: newLimits.monthlyLimit || 0,
          burstLimit: newLimits.burstLimit || 0,
          updatedAt: new Date().toISOString(),
          updatedBy: 'admin'
        }
    }]);

    console.log(`Updated limits for user ${userId}:`, newLimits);
  } catch (error) {
    console.error('Error updating user limits:', error);
    throw error;
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
