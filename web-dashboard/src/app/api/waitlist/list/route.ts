import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { Pinecone } from '@pinecone-database/pinecone';

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'roki-index';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize Pinecone
    const pinecone = new Pinecone({
      apiKey: PINECONE_API_KEY!,
    });

    const index = pinecone.index(PINECONE_INDEX_NAME);

    // Query for all waitlist entries
    const queryResponse = await index.query({
      vector: new Array(1536).fill(0.1), // Simple placeholder vector
      filter: {
        type: 'waitlist'
      },
      topK: 1000, // Get up to 1000 waitlist entries
      includeMetadata: true
    });

    // Extract emails from the response
    const emails = queryResponse.matches
      ?.map(match => match.metadata?.email)
      .filter(email => email) || [];

    // Remove duplicates and sort by timestamp if available
    const uniqueEmails = [...new Set(emails)];

    return NextResponse.json({ 
      success: true,
      emails: uniqueEmails,
      total: uniqueEmails.length
    });

  } catch (error) {
    console.error('Error fetching waitlist emails:', error);
    return NextResponse.json(
      { error: 'Failed to fetch waitlist emails' }, 
      { status: 500 }
    );
  }
}
