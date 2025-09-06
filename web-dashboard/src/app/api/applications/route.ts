import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';
import { Application } from '@/types/applications';
import { v4 as uuidv4 } from 'uuid';
import { embeddingService } from '@/lib/embeddingService';

function getPineconeIndex() {
  const pinecone = getPineconeClient();
  return pinecone.index(PINECONE_INDEX_NAME);
}

// GET /api/applications - Get user's applications
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log(`📋 Loading applications for user ${userId}`);

    const index = getPineconeIndex();

    // Query for user's applications
    const queryResponse = await index.namespace('applications').query({
      vector: new Array(1024).fill(0), // Dummy vector for metadata-only query
      filter: {
        userId: userId,
        documentType: 'application'
      },
      topK: 100,
      includeMetadata: true,
    });

    const applications: Application[] = [];
    
    if (queryResponse.matches) {
      for (const match of queryResponse.matches) {
        if (match.metadata) {
          try {
            const applicationData = typeof match.metadata.applicationData === 'string' 
              ? JSON.parse(match.metadata.applicationData) 
              : match.metadata.applicationData;
            applications.push(applicationData);
          } catch (e) {
            console.error(`Failed to parse application data for ${match.id}:`, e);
          }
        }
      }
    }

    // Sort by deadline (soonest first)
    applications.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

    console.log(`✅ Loaded ${applications.length} applications`);
    
    return NextResponse.json({
      success: true,
      applications
    });

  } catch (error) {
    console.error('Error loading applications:', error);
    return NextResponse.json(
      { error: 'Failed to load applications' },
      { status: 500 }
    );
  }
}

// POST /api/applications - Create new application
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      projectId,
      name,
      description,
      deadline,
      prizeType,
      prizeDetails,
      applicationUrl,
      organizationName,
      requirements,
      notes
    } = body;

    if (!projectId || !name || !description || !deadline || !prizeType) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, name, description, deadline, prizeType' },
        { status: 400 }
      );
    }

    const applicationId = uuidv4();
    const now = new Date().toISOString();

    const application: Application = {
      id: applicationId,
      userId,
      projectId,
      name,
      description,
      deadline,
      prizeType,
      prizeDetails: prizeDetails || '',
      status: 'draft',
      applicationUrl: applicationUrl || '',
      organizationName: organizationName || '',
      requirements: requirements || '',
      notes: notes || '',
      createdAt: now,
      updatedAt: now
    };

    console.log(`📝 Creating application: ${name} for project ${projectId}`);

    const index = getPineconeIndex();

    // Create a vector based on application content
    // Generate proper embedding for the application
    let vector: number[];
    
    try {
      const contentForEmbedding = [
        name,
        description,
        prizeDetails,
        organizationName || '',
        requirements || '',
        prizeType
      ].filter(text => text && text.length > 0).join(' ');

      console.log(`🔄 Generating embedding for application: ${name}`);
      vector = await embeddingService.generateEmbeddingWithFallback(contentForEmbedding);
      console.log(`✅ Generated embedding with ${vector.length} dimensions for application: ${name}`);
    } catch (error) {
      console.error('❌ Failed to generate application embedding:', error);
      vector = embeddingService.generateFallbackEmbedding(`application-${name}-${Date.now()}`);
    }

    // Upsert the application to Pinecone
    await index.namespace('applications').upsert([
      {
        id: `application-${applicationId}`,
        values: vector,
        metadata: {
          userId,
          applicationId,
          projectId,
          documentType: 'application',
          applicationData: JSON.stringify(application),
          name,
          status: application.status,
          deadline,
          prizeType,
          organizationName: organizationName || '',
          createdAt: now
        },
      },
    ]);

    console.log(`✅ Application created: ${name}`);

    return NextResponse.json({
      success: true,
      application
    });

  } catch (error) {
    console.error('Error creating application:', error);
    return NextResponse.json(
      { error: 'Failed to create application' },
      { status: 500 }
    );
  }
}