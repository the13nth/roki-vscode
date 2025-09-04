import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';
import { ProjectNotification } from '@/types';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);

    // Get user's notifications from Pinecone
    const notificationsResponse = await index.namespace('user_notifications').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        userId: { $eq: userId }
      },
      topK: 100,
      includeMetadata: true
    });

    const notifications: ProjectNotification[] = (notificationsResponse.matches || [])
      .map(match => {
        if (!match.metadata) return null;
        
        return {
          id: match.id,
          projectId: match.metadata.projectId as string,
          projectName: match.metadata.projectName as string,
          type: match.metadata.type as ProjectNotification['type'],
          message: match.metadata.message as string,
          timestamp: new Date(match.metadata.timestamp as string),
          isRead: match.metadata.isRead as boolean,
          metadata: match.metadata.metadata ? JSON.parse(match.metadata.metadata as string) : undefined
        };
      })
      .filter(Boolean) as ProjectNotification[];

    // Sort by timestamp (newest first)
    notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return NextResponse.json({
      success: true,
      notifications
    });

  } catch (error) {
    console.error('Error fetching user notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { projectId, projectName, type, message, metadata } = body;

    if (!projectId || !projectName || !type || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);

    const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create notification record in Pinecone
    const notificationMetadata: Record<string, any> = {
      userId,
      projectId,
      projectName,
      type,
      message,
      timestamp: new Date().toISOString(),
      isRead: false
    };

    if (metadata) {
      notificationMetadata.metadata = JSON.stringify(metadata);
    }

    await index.namespace('user_notifications').upsert([{
      id: notificationId,
      values: new Array(1024).fill(0.1),
      metadata: notificationMetadata
    }]);

    return NextResponse.json({
      success: true,
      notificationId
    });

  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}
