import { NextRequest, NextResponse } from 'next/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';

function getPineconeIndex() {
  const pinecone = getPineconeClient();
  return pinecone.index(PINECONE_INDEX_NAME);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    console.log(`📚 Loading saved analyses for project ${projectId}`);

    const index = getPineconeIndex();

    // Query for saved analyses
    const queryResponse = await index.namespace('analyses').query({
      vector: new Array(1536).fill(0), // Dummy vector for metadata-only query
      filter: {
        projectId: projectId,
        documentType: 'analysis'
      },
      topK: 100,
      includeMetadata: true,
    });

    const analyses: Record<string, any> = {};
    
    if (queryResponse.matches) {
      for (const match of queryResponse.matches) {
        if (match.metadata) {
          const analysisType = match.metadata.analysisType as string;
          const analysisData = match.metadata.analysisData;
          
          if (analysisType && analysisData) {
            try {
              analyses[analysisType] = typeof analysisData === 'string' 
                ? JSON.parse(analysisData) 
                : analysisData;
            } catch (e) {
              console.error(`Failed to parse analysis data for ${analysisType}:`, e);
            }
          }
        }
      }
    }

    console.log(`✅ Loaded ${Object.keys(analyses).length} saved analyses`);
    
    return NextResponse.json({
      success: true,
      analyses,
      count: Object.keys(analyses).length
    });

  } catch (error) {
    console.error('Error loading saved analyses:', error);
    return NextResponse.json(
      { error: 'Failed to load saved analyses' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { analysisType, analysisData } = await request.json();

    if (!analysisType || !analysisData) {
      return NextResponse.json(
        { error: 'Analysis type and data are required' },
        { status: 400 }
      );
    }

    console.log(`💾 Saving ${analysisType} analysis for project ${projectId}`);

    const index = getPineconeIndex();

    // Create a unique ID for this analysis
    const analysisId = `${projectId}-analysis-${analysisType}`;

    // Create embedding for the analysis content
    const analysisContent = `${analysisType} analysis: ${analysisData.summary || ''} ${JSON.stringify(analysisData)}`;
    
    // For now, use a dummy vector - in production you'd want to create actual embeddings
    const vector = new Array(1536).fill(0);

    // Upsert the analysis to Pinecone
    await index.namespace('analyses').upsert([
      {
        id: analysisId,
        values: vector,
        metadata: {
          projectId,
          analysisType,
          analysisData: JSON.stringify(analysisData),
          documentType: 'analysis',
          timestamp: new Date().toISOString(),
          title: `${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)} Analysis`,
          content: analysisContent.substring(0, 40000), // Limit content size
        },
      },
    ]);

    console.log(`✅ ${analysisType} analysis saved to Pinecone`);

    return NextResponse.json({
      success: true,
      message: `${analysisType} analysis saved successfully`,
      analysisId
    });

  } catch (error) {
    console.error('Error saving analysis:', error);
    return NextResponse.json(
      { error: 'Failed to save analysis' },
      { status: 500 }
    );
  }
}