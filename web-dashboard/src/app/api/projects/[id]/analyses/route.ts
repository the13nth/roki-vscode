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
      vector: new Array(1024).fill(0), // Dummy vector for metadata-only query
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
    
    // Create a more meaningful embedding based on the analysis content
    let vector = new Array(1024).fill(0);
    
    try {
      // Generate embeddings using a simple approach - you could enhance this with actual embeddings
      const contentForEmbedding = [
        analysisData.summary || '',
        ...(analysisData.insights || []).map((insight: any) => 
          typeof insight === 'object' ? insight.content || insight.title || '' : insight
        ),
        ...(analysisData.recommendations || []).map((rec: any) => 
          typeof rec === 'object' ? rec.content || rec.title || '' : rec
        ),
        analysisData.marketAnalysis?.content || '',
        analysisData.differentiationAnalysis?.content || '',
        analysisData.financialProjections?.content || '',
        analysisType // Include the analysis type to help with categorization
      ].filter(text => text.length > 0).join(' ');

      // Simple hash-based approach for creating distinctive vectors
      // In live environment, you'd use OpenAI embeddings or similar
      const hash = contentForEmbedding.split('').reduce((acc, char, i) => {
        return ((acc << 5) - acc + char.charCodeAt(0) + i) >>> 0;
      }, 0);
      
      // Fill vector with a pattern based on content hash and analysis type
      const typeMultipliers: Record<string, number> = {
        'technical': 1.1,
        'market': 1.2,
        'differentiation': 1.3,
        'financial': 1.4,
        'bmc': 1.5,
        'roast': 1.6
      };
      const typeMultiplier = typeMultipliers[analysisType] || 1.0;
      
      for (let i = 0; i < 1024; i++) {
        const seed = (hash + i * 37) * typeMultiplier;
        vector[i] = (Math.sin(seed) + Math.cos(seed * 1.3)) * 0.1;
      }
      
      console.log(`🔍 Created semantic vector for ${analysisType} analysis`);
    } catch (error) {
      console.warn('⚠️ Failed to create enhanced embedding, using default:', error);
      vector = new Array(1024).fill(0);
    }

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
          // Enhanced metadata for better search and social post generation
          summary: (analysisData.summary || '').substring(0, 1000),
          hasInsights: (analysisData.insights && analysisData.insights.length > 0) ? 'true' : 'false',
          hasRecommendations: (analysisData.recommendations && analysisData.recommendations.length > 0) ? 'true' : 'false',
          hasMarketAnalysis: analysisData.marketAnalysis ? 'true' : 'false',
          hasDifferentiation: analysisData.differentiationAnalysis ? 'true' : 'false',
          hasFinancialData: analysisData.financialProjections ? 'true' : 'false',
          hasBMC: analysisData.businessModelCanvas ? 'true' : 'false',
          isRoast: analysisType === 'roast' ? 'true' : 'false',
          category: analysisType === 'technical' ? 'technical' : 
                   analysisType === 'market' ? 'business' :
                   analysisType === 'differentiation' ? 'strategy' :
                   analysisType === 'financial' ? 'financial' :
                   analysisType === 'bmc' ? 'business_model' :
                   analysisType === 'roast' ? 'critique' : 'general'
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