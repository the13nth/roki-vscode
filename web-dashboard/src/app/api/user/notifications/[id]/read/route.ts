import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    const { id: notificationId } = await params;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);

    // Get the notification to verify ownership
    const notificationResponse = await index.namespace('user_notifications').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        userId: { $eq: userId },
        id: { $eq: notificationId }
      },
      topK: 1,
      includeMetadata: true
    });

    if (!notificationResponse.matches?.[0]) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }

    const notification = notificationResponse.matches[0];
    
    // Update the notification to mark it as read
    await index.namespace('user_notifications').upsert([{
      id: notificationId,
      values: notification.values,
      metadata: {
        ...notification.metadata,
        isRead: true,
        readAt: new Date().toISOString()
      }
    }]);

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
}
