import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';
import { UserNotificationPreferences } from '@/types';

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

    // Get user's notification preferences from Pinecone
    const preferencesResponse = await index.namespace('user_notification_preferences').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        userId: { $eq: userId }
      },
      topK: 1,
      includeMetadata: true
    });

    let preferences: UserNotificationPreferences | null = null;

    if (preferencesResponse.matches?.[0]?.metadata) {
      const metadata = preferencesResponse.matches[0].metadata;
      preferences = {
        userId: metadata.userId as string,
        emailNotifications: metadata.emailNotifications as boolean,
        projectUpdates: metadata.projectUpdates as boolean,
        taskCompletions: metadata.taskCompletions as boolean,
        teamChanges: metadata.teamChanges as boolean,
        projectSharing: metadata.projectSharing as boolean,
        digestFrequency: metadata.digestFrequency as 'immediate' | 'daily' | 'weekly',
        lastDigestSent: metadata.lastDigestSent ? new Date(metadata.lastDigestSent as string) : undefined
      };
    } else {
      // Create default preferences if none exist
      preferences = {
        userId,
        emailNotifications: true,
        projectUpdates: true,
        taskCompletions: true,
        teamChanges: true,
        projectSharing: true,
        digestFrequency: 'daily'
      };
    }

    return NextResponse.json({
      success: true,
      preferences
    });

  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const preferences: UserNotificationPreferences = body;

    if (!preferences || preferences.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid preferences data' },
        { status: 400 }
      );
    }

    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);

    const preferencesId = `preferences_${userId}`;
    
    // Upsert notification preferences in Pinecone
    const metadata: Record<string, any> = {
      userId: preferences.userId,
      emailNotifications: preferences.emailNotifications,
      projectUpdates: preferences.projectUpdates,
      taskCompletions: preferences.taskCompletions,
      teamChanges: preferences.teamChanges,
      projectSharing: preferences.projectSharing,
      digestFrequency: preferences.digestFrequency,
      updatedAt: new Date().toISOString()
    };

    if (preferences.lastDigestSent) {
      metadata.lastDigestSent = preferences.lastDigestSent.toISOString();
    }

    await index.namespace('user_notification_preferences').upsert([{
      id: preferencesId,
      values: new Array(1024).fill(0.1),
      metadata
    }]);

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully'
    });

  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
