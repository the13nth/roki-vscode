import { NextRequest, NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'roki-index';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    // Initialize Pinecone
    const pinecone = new Pinecone({
      apiKey: PINECONE_API_KEY!,
    });

    const index = pinecone.index(PINECONE_INDEX_NAME);

    // Create a unique ID for the waitlist entry
    const waitlistId = `waitlist_public_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Prepare the vector data
    const vectorData = {
      id: waitlistId,
      values: new Array(1536).fill(0.1), // Simple placeholder vector
      metadata: {
        type: 'waitlist',
        waitlistType: 'public_signup',
        email: email.toLowerCase().trim(),
        timestamp: new Date().toISOString(),
        source: 'web-dashboard',
        status: 'pending'
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
    console.error('Error adding email to public waitlist:', error);
    return NextResponse.json(
      { error: 'Failed to add email to waitlist' }, 
      { status: 500 }
    );
  }
}


