import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';
import { v4 as uuidv4 } from 'uuid';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Check if user owns the project
    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);
    
    const projectQuery = await index.namespace('projects').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        projectId: { $eq: projectId }
      },
      topK: 1,
      includeMetadata: true
    });

    if (projectQuery.matches.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectMetadata = projectQuery.matches[0].metadata;
    if (!projectMetadata) {
      return NextResponse.json({ error: 'Project metadata not found' }, { status: 404 });
    }
    const projectOwnerId = projectMetadata.userId;
    const isOwner = projectOwnerId === userId;

    // Only project owners can view applications
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch applications for the project
    const applicationsQuery = await index.namespace('project-applications').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        projectId: { $eq: projectId }
      },
      topK: 100,
      includeMetadata: true
    });

    const applications = applicationsQuery.matches.map(match => {
      const metadata = match.metadata;
      if (!metadata) {
        return null;
      }
      return {
        id: metadata.applicationId,
        projectId: metadata.projectId,
        requirementType: metadata.requirementType,
        name: metadata.name,
        email: metadata.email,
        message: metadata.message || '',
        experience: metadata.experience,
        availability: metadata.availability,
        contribution: metadata.contribution,
        status: metadata.status,
        createdAt: metadata.createdAt,
        reviewedAt: metadata.reviewedAt || null,
        reviewerNotes: metadata.reviewerNotes || null
      };
    }).filter((app): app is NonNullable<typeof app> => app !== null);

    // Sort by creation date (newest first)
    applications.sort((a, b) => new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime());

    return NextResponse.json({
      success: true,
      applications
    });

  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const { id: projectId } = await params;
    const body = await request.json();

    const {
      requirementType,
      name,
      email,
      message,
      experience,
      availability,
      contribution
    } = body;

    // Validate required fields
    if (!requirementType || !name || !email || !experience || !availability || !contribution) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate requirement type
    const validTypes = ['funding needed', 'cofounder needed', 'dev needed', 'business manager needed'];
    if (!validTypes.includes(requirementType)) {
      return NextResponse.json(
        { error: 'Invalid requirement type' },
        { status: 400 }
      );
    }

    // Check if project exists
    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);
    
    const projectQuery = await index.namespace('projects').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        projectId: { $eq: projectId }
      },
      topK: 1,
      includeMetadata: true
    });

    if (projectQuery.matches.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectMetadata = projectQuery.matches[0].metadata;
    if (!projectMetadata) {
      return NextResponse.json({ error: 'Project metadata not found' }, { status: 404 });
    }
    
    const applicationId = uuidv4();
    const now = new Date().toISOString();

    // Create a simple vector for the application
    const vector = new Array(1024).fill(0.1);
    vector[0] = 1.0; // Ensure first element is non-zero

    // Store the application in Pinecone
    await index.namespace('project-applications').upsert([
      {
        id: `application-${applicationId}`,
        values: vector,
        metadata: {
          applicationId,
          projectId,
          projectName: projectMetadata.name,
          requirementType,
          name,
          email,
          message: message || '',
          experience,
          availability,
          contribution,
          status: 'pending',
          createdAt: now,
          reviewedAt: '',
          reviewerNotes: ''
        }
      }
    ]);

    return NextResponse.json({
      success: true,
      applicationId,
      message: 'Application submitted successfully'
    });

  } catch (error) {
    console.error('Error creating application:', error);
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}
