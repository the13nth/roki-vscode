import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';
import { ApplicationQuestion } from '@/types/applications';

function getPineconeIndex() {
  const pinecone = getPineconeClient();
  return pinecone.index(PINECONE_INDEX_NAME);
}

// PUT /api/applications/[id]/questions/[questionId] - Update question or response
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: applicationId, questionId } = await params;
    const body = await request.json();
    const { question, response, generatedResponse, keyPoints, suggestedImprovements, wordLimit, characterLimit } = body;

    console.log(`📝 Updating question response ${questionId}`);

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

    // Fetch the current question
    const fetchResponse = await index.namespace('application-questions').fetch([`question-${questionId}`]);
    const record = fetchResponse.records?.[`question-${questionId}`];

    if (!record?.metadata) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    let currentQuestion: ApplicationQuestion;
    try {
      currentQuestion = JSON.parse(record.metadata.questionData as string);
    } catch (error) {
      console.error('Failed to parse question data:', error);
      return NextResponse.json(
        { error: 'Question data corrupted' },
        { status: 500 }
      );
    }

    // Update the question
    const updatedQuestion: ApplicationQuestion = {
      ...currentQuestion,
      question: question !== undefined ? question : currentQuestion.question,
      response: response !== undefined ? response : currentQuestion.response,
      generatedResponse: generatedResponse !== undefined ? generatedResponse : currentQuestion.generatedResponse,
      keyPoints: keyPoints !== undefined ? keyPoints : currentQuestion.keyPoints,
      suggestedImprovements: suggestedImprovements !== undefined ? suggestedImprovements : currentQuestion.suggestedImprovements,
      wordLimit: wordLimit !== undefined ? wordLimit : currentQuestion.wordLimit,
      characterLimit: characterLimit !== undefined ? characterLimit : currentQuestion.characterLimit,
      updatedAt: new Date().toISOString()
    };

    // Update the vector in Pinecone
    await index.namespace('application-questions').upsert([
      {
        id: `question-${questionId}`,
        values: record.values || new Array(1024).fill(0), // Keep existing vector
        metadata: {
          ...record.metadata,
          questionData: JSON.stringify(updatedQuestion),
          question: updatedQuestion.question.substring(0, 1000), // Update metadata question text
          updatedAt: updatedQuestion.updatedAt
        },
      },
    ]);

    console.log(`✅ Question response updated: ${questionId}`);

    return NextResponse.json({
      success: true,
      question: updatedQuestion
    });

  } catch (error) {
    console.error('Error updating question response:', error);
    return NextResponse.json(
      { error: 'Failed to update question response' },
      { status: 500 }
    );
  }
}

// DELETE /api/applications/[id]/questions/[questionId] - Delete question
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: applicationId, questionId } = await params;
    console.log(`🗑️ Deleting question ${questionId}`);

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

    // Fetch the question to verify it exists
    const fetchResponse = await index.namespace('application-questions').fetch([`question-${questionId}`]);
    const record = fetchResponse.records?.[`question-${questionId}`];

    if (!record?.metadata) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // Delete the question
    await index.namespace('application-questions').deleteOne(`question-${questionId}`);

    console.log(`✅ Question deleted: ${questionId}`);

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error('Error deleting question:', error);
    return NextResponse.json(
      { error: 'Failed to delete question' },
      { status: 500 }
    );
  }
}