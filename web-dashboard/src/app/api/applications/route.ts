import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';
import { Application } from '@/types/applications';
import { v4 as uuidv4 } from 'uuid';

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
    let vector = new Array(1024).fill(0);
    
    try {
      // Generate embeddings using a simple approach
      const contentForEmbedding = [
        name,
        description,
        prizeDetails,
        organizationName || '',
        requirements || '',
        prizeType
      ].filter(text => text.length > 0).join(' ');

      // Simple hash-based approach for creating distinctive vectors
      const hash = contentForEmbedding.split('').reduce((acc, char, i) => {
        return ((acc << 5) - acc + char.charCodeAt(0) + i) >>> 0;
      }, 0);
      
      // Fill vector with a pattern based on content hash
      for (let i = 0; i < 1024; i++) {
        const seed = (hash + i * 37);
        vector[i] = (Math.sin(seed) + Math.cos(seed * 1.3)) * 0.1;
      }
      
      console.log(`🔍 Created semantic vector for application: ${name}`);
    } catch (error) {
      console.warn('⚠️ Failed to create enhanced embedding, using default:', error);
      vector = new Array(1024).fill(0);
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