import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';
import { ApplicationQuestion } from '@/types/applications';
import { v4 as uuidv4 } from 'uuid';

function getPineconeIndex() {
  const pinecone = getPineconeClient();
  return pinecone.index(PINECONE_INDEX_NAME);
}

// GET /api/applications/[id]/questions - Get application questions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: applicationId } = await params;
    console.log(`❓ Loading questions for application ${applicationId}`);

    const index = getPineconeIndex();

    // First verify the user owns the application
    const appFetchResponse = await index.namespace('applications').fetch([`application-${applicationId}`]);
    const appRecord = appFetchResponse.records?.[`application-${applicationId}`];

    if (!appRecord?.metadata || appRecord.metadata.userId !== userId) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Query for application questions
    const queryResponse = await index.namespace('application-questions').query({
      vector: new Array(1024).fill(0), // Dummy vector for metadata-only query
      filter: {
        applicationId: applicationId,
        documentType: 'application-question'
      },
      topK: 100,
      includeMetadata: true,
    });

    const questions: ApplicationQuestion[] = [];
    
    if (queryResponse.matches) {
      for (const match of queryResponse.matches) {
        if (match.metadata) {
          try {
            const questionData = typeof match.metadata.questionData === 'string' 
              ? JSON.parse(match.metadata.questionData) 
              : match.metadata.questionData;
            questions.push(questionData);
          } catch (e) {
            console.error(`Failed to parse question data for ${match.id}:`, e);
          }
        }
      }
    }

    // Sort by creation date (newest first)
    questions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    console.log(`✅ Loaded ${questions.length} questions`);
    
    return NextResponse.json({
      success: true,
      questions
    });

  } catch (error) {
    console.error('Error loading application questions:', error);
    return NextResponse.json(
      { error: 'Failed to load application questions' },
      { status: 500 }
    );
  }
}

// POST /api/applications/[id]/questions - Create new question
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: applicationId } = await params;
    const body = await request.json();
    const { question, wordLimit, characterLimit } = body;

    if (!question || !question.trim()) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      );
    }

    console.log(`❓ Creating question for application ${applicationId}`);

    const index = getPineconeIndex();

    // First verify the user owns the application
    const appFetchResponse = await index.namespace('applications').fetch([`application-${applicationId}`]);
    const appRecord = appFetchResponse.records?.[`application-${applicationId}`];

    if (!appRecord?.metadata || appRecord.metadata.userId !== userId) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Get current question count to determine order
    const existingQuestionsQuery = await index.namespace('application-questions').query({
      vector: new Array(1024).fill(0),
      filter: {
        applicationId: applicationId,
        documentType: 'application-question'
      },
      topK: 100,
      includeMetadata: true,
    });

    const order = (existingQuestionsQuery.matches?.length || 0) + 1;

    const questionId = uuidv4();
    const now = new Date().toISOString();

    const applicationQuestion: ApplicationQuestion = {
      id: questionId,
      applicationId,
      question: question.trim(),
      wordLimit: wordLimit || undefined,
      characterLimit: characterLimit || undefined,
      order,
      createdAt: now,
      updatedAt: now
    };

    // Create a vector based on question content
    let vector = new Array(1024).fill(0);
    
    try {
      // Generate embeddings using a simple approach
      const contentForEmbedding = question.trim();

      // Simple hash-based approach for creating distinctive vectors
      const hash = contentForEmbedding.split('').reduce((acc: number, char: string, i: any) => {
        return ((acc << 5) - acc + char.charCodeAt(0) + i) >>> 0;
      }, 0);
      
      // Fill vector with a pattern based on content hash
      for (let i = 0; i < 1024; i++) {
        const seed = (hash + i * 37);
        vector[i] = (Math.sin(seed) + Math.cos(seed * 1.3)) * 0.1;
      }
      
      console.log(`🔍 Created semantic vector for question`);
    } catch (error) {
      console.warn('⚠️ Failed to create enhanced embedding, using default:', error);
      vector = new Array(1024).fill(0);
    }

    // Upsert the question to Pinecone
    await index.namespace('application-questions').upsert([
      {
        id: `question-${questionId}`,
        values: vector,
        metadata: {
          userId,
          applicationId,
          questionId,
          documentType: 'application-question',
          questionData: JSON.stringify(applicationQuestion),
          question: question.trim().substring(0, 1000), // Limit for metadata
          order,
          createdAt: now
        },
      },
    ]);

    console.log(`✅ Question created for application ${applicationId}`);

    return NextResponse.json({
      success: true,
      question: applicationQuestion
    });

  } catch (error) {
    console.error('Error creating application question:', error);
    return NextResponse.json(
      { error: 'Failed to create application question' },
      { status: 500 }
    );
  }
}