import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { Pinecone } from '@pinecone-database/pinecone';

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'roki-index';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, type } = await request.json();
    
    if (!email || !type) {
      return NextResponse.json({ error: 'Email and type are required' }, { status: 400 });
    }

    // Initialize Pinecone
    const pinecone = new Pinecone({
      apiKey: PINECONE_API_KEY!,
    });

    const index = pinecone.index(PINECONE_INDEX_NAME);

    // Create a unique ID for the waitlist entry
    const waitlistId = `waitlist_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Prepare the vector data
    const vectorData = {
      id: waitlistId,
      values: new Array(1536).fill(0.1), // Simple placeholder vector
      metadata: {
        type: 'waitlist',
        waitlistType: type,
        email: email,
        userId: userId,
        timestamp: new Date().toISOString(),
        source: 'vscode-extension'
      }
    };

    // Upsert the vector to Pinecone
    await index.upsert([vectorData]);

    return NextResponse.json({ 
      success: true, 
      message: 'Email added to waitlist successfully',
      waitlistId: waitlistId
    });

  } catch (error) {
    console.error('Error adding email to waitlist:', error);
    return NextResponse.json(
      { error: 'Failed to add email to waitlist' }, 
      { status: 500 }
    );
  }
}
