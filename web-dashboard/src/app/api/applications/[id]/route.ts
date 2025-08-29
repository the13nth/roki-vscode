import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';
import { Application } from '@/types/applications';

function getPineconeIndex() {
  const pinecone = getPineconeClient();
  return pinecone.index(PINECONE_INDEX_NAME);
}

// GET /api/applications/[id] - Get specific application
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
    console.log(`📋 Loading application ${applicationId}`);

    const index = getPineconeIndex();

    // Fetch the application
    const fetchResponse = await index.namespace('applications').fetch([`application-${applicationId}`]);
    const record = fetchResponse.records?.[`application-${applicationId}`];

    if (!record?.metadata) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Check if user owns this application
    if (record.metadata.userId !== userId) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    let application: Application;
    try {
      application = JSON.parse(record.metadata.applicationData as string);
    } catch (error) {
      console.error('Failed to parse application data:', error);
      return NextResponse.json(
        { error: 'Application data corrupted' },
        { status: 500 }
      );
    }

    console.log(`✅ Loaded application: ${application.name}`);
    
    return NextResponse.json({
      success: true,
      application
    });

  } catch (error) {
    console.error('Error loading application:', error);
    return NextResponse.json(
      { error: 'Failed to load application' },
      { status: 500 }
    );
  }
}

// PUT /api/applications/[id] - Update application
export async function PUT(
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
    const updates = await request.json();

    console.log(`📝 Updating application ${applicationId}`);

    const index = getPineconeIndex();

    // Fetch the current application
    const fetchResponse = await index.namespace('applications').fetch([`application-${applicationId}`]);
    const record = fetchResponse.records?.[`application-${applicationId}`];

    if (!record?.metadata) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Check if user owns this application
    if (record.metadata.userId !== userId) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    let currentApplication: Application;
    try {
      currentApplication = JSON.parse(record.metadata.applicationData as string);
    } catch (error) {
      console.error('Failed to parse application data:', error);
      return NextResponse.json(
        { error: 'Application data corrupted' },
        { status: 500 }
      );
    }

    // Update the application
    const updatedApplication: Application = {
      ...currentApplication,
      ...updates,
      id: applicationId, // Ensure ID doesn't change
      userId, // Ensure userId doesn't change
      updatedAt: new Date().toISOString()
    };

    // If status is being updated to submitted, set submittedAt
    if (updates.status === 'submitted' && currentApplication.status !== 'submitted') {
      updatedApplication.submittedAt = new Date().toISOString();
    }

    // Update the vector in Pinecone
    await index.namespace('applications').upsert([
      {
        id: `application-${applicationId}`,
        values: record.values || new Array(1024).fill(0), // Keep existing vector
        metadata: {
          ...record.metadata,
          applicationData: JSON.stringify(updatedApplication),
          name: updatedApplication.name,
          status: updatedApplication.status,
          deadline: updatedApplication.deadline,
          prizeType: updatedApplication.prizeType,
          organizationName: updatedApplication.organizationName || '',
          updatedAt: updatedApplication.updatedAt
        },
      },
    ]);

    console.log(`✅ Application updated: ${updatedApplication.name}`);

    return NextResponse.json({
      success: true,
      application: updatedApplication
    });

  } catch (error) {
    console.error('Error updating application:', error);
    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    );
  }
}

// DELETE /api/applications/[id] - Delete application
export async function DELETE(
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
    console.log(`🗑️ Deleting application ${applicationId}`);

    const index = getPineconeIndex();

    // Fetch the application to verify ownership
    const fetchResponse = await index.namespace('applications').fetch([`application-${applicationId}`]);
    const record = fetchResponse.records?.[`application-${applicationId}`];

    if (!record?.metadata) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Check if user owns this application
    if (record.metadata.userId !== userId) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Delete the application
    await index.namespace('applications').deleteOne(`application-${applicationId}`);

    // Also delete any associated questions
    const questionsQuery = await index.namespace('application-questions').query({
      vector: new Array(1024).fill(0),
      filter: {
        applicationId: applicationId,
        documentType: 'application-question'
      },
      topK: 100,
      includeMetadata: true,
    });

    if (questionsQuery.matches && questionsQuery.matches.length > 0) {
      const questionIds = questionsQuery.matches.map(match => match.id);
      await index.namespace('application-questions').deleteMany(questionIds);
      console.log(`🗑️ Deleted ${questionIds.length} associated questions`);
    }

    console.log(`✅ Application deleted: ${applicationId}`);

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error('Error deleting application:', error);
    return NextResponse.json(
      { error: 'Failed to delete application' },
      { status: 500 }
    );
  }
}