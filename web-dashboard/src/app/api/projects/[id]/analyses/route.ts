import { NextRequest, NextResponse } from 'next/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';
import { embeddingService } from '@/lib/embeddingService';
import { analysisVectorService } from '@/lib/analysisVectorService';

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
    const chunkedAnalyses: Record<string, { chunks: any[], totalChunks: number }> = {};
    
    if (queryResponse.matches) {
      for (const match of queryResponse.matches) {
        if (match.metadata) {
          const analysisType = match.metadata.analysisType as string;
          const analysisData = match.metadata.analysisData;
          const isChunked = match.metadata.isChunked === 'true';
          const chunkIndex = parseInt(String(match.metadata.chunkIndex || '0'));
          const totalChunks = parseInt(String(match.metadata.totalChunks || '1'));
          const originalAnalysisId = match.metadata.originalAnalysisId as string;
          
          if (analysisType && analysisData) {
            try {
              if (isChunked) {
                // Handle chunked analysis
                if (!chunkedAnalyses[analysisType]) {
                  chunkedAnalyses[analysisType] = { chunks: [], totalChunks };
                }
                chunkedAnalyses[analysisType].chunks[chunkIndex] = JSON.parse(String(analysisData));
              } else {
                // Handle non-chunked analysis
                analyses[analysisType] = typeof analysisData === 'string' 
                  ? JSON.parse(analysisData) 
                  : analysisData;
              }
            } catch (e) {
              console.error(`Failed to parse analysis data for ${analysisType}:`, e);
            }
          }
        }
      }
    }

    // Reassemble chunked analyses
    for (const [analysisType, chunkData] of Object.entries(chunkedAnalyses)) {
      if (chunkData.chunks.length === chunkData.totalChunks) {
        // All chunks are present, reassemble
        const reassembledData: any = {};
        for (const chunk of chunkData.chunks) {
          Object.assign(reassembledData, chunk);
        }
        analyses[analysisType] = reassembledData;
        console.log(`✅ Reassembled chunked ${analysisType} analysis from ${chunkData.totalChunks} chunks`);
      } else {
        console.warn(`⚠️ Incomplete chunked analysis for ${analysisType}: ${chunkData.chunks.length}/${chunkData.totalChunks} chunks found`);
        // Use available chunks as partial data
        const partialData: any = {};
        for (const chunk of chunkData.chunks) {
          if (chunk) {
            Object.assign(partialData, chunk);
          }
        }
        analyses[analysisType] = partialData;
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

// Helper function to chunk large data
function chunkAnalysisData(analysisData: any, maxChunkSize: number = 25000): string[] {
  const jsonString = JSON.stringify(analysisData);
  const chunks: string[] = [];
  
  if (jsonString.length <= maxChunkSize) {
    return [jsonString];
  }
  
  // Try to chunk by sections if it's a roast analysis
  if (analysisData.businessModelCritique || analysisData.marketReality) {
    const sections = [
      'businessModelCritique',
      'marketReality', 
      'technicalChallenges',
      'financialViability',
      'competitiveThreats',
      'executionRisks',
      'regulatoryHurdles',
      'overallVerdict'
    ];
    
    for (const section of sections) {
      if (analysisData[section]) {
        const sectionData = { [section]: analysisData[section] };
        const sectionJson = JSON.stringify(sectionData);
        if (sectionJson.length <= maxChunkSize) {
          chunks.push(sectionJson);
        } else {
          // If section is still too large, split it further
          const sectionChunks = splitStringIntoChunks(sectionJson, maxChunkSize);
          chunks.push(...sectionChunks);
        }
      }
    }
  } else {
    // For other analysis types, split by character count
    chunks.push(...splitStringIntoChunks(jsonString, maxChunkSize));
  }
  
  return chunks;
}

function splitStringIntoChunks(str: string, maxSize: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += maxSize) {
    chunks.push(str.slice(i, i + maxSize));
  }
  return chunks;
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
    // Generate proper embedding for the analysis using the enhanced embedding service
    let vector: number[];
    
    try {
      console.log(`🔄 Generating embedding for ${analysisType} analysis`);
      vector = await embeddingService.generateAnalysisEmbedding(analysisData, analysisType);
      console.log(`✅ Generated embedding with ${vector.length} dimensions for ${analysisType} analysis`);
    } catch (error) {
      console.error('❌ Failed to generate analysis embedding:', error);
      // Use fallback embedding
      vector = embeddingService.generateFallbackEmbedding(`${analysisType}-analysis-${Date.now()}`);
    }

    // Check if analysis data is too large and needs chunking
    const analysisDataString = JSON.stringify(analysisData);
    const chunks = chunkAnalysisData(analysisData);
    
    console.log(`📊 Analysis data size: ${analysisDataString.length} bytes, split into ${chunks.length} chunks`);

    // Prepare vectors for upsert with minimal metadata
    const vectorsToUpsert = chunks.map((chunk, index) => {
      const chunkId = chunks.length === 1 ? analysisId : `${analysisId}-chunk-${index}`;
      
      // Create minimal metadata to stay under limit
      const baseMetadata = {
        projectId,
        analysisType,
        analysisData: chunk,
        documentType: 'analysis',
        timestamp: new Date().toISOString(),
        isChunked: chunks.length > 1 ? 'true' : 'false',
        chunkIndex: index.toString(),
        totalChunks: chunks.length.toString(),
        originalAnalysisId: analysisId
      };

      // Add additional metadata only if we have space
      const metadataSize = JSON.stringify(baseMetadata).length;
      const availableSpace = 25000 - metadataSize; // Leave buffer
      
      if (availableSpace > 1000) {
        // Add essential metadata if space allows
        Object.assign(baseMetadata, {
          title: `${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)} Analysis${chunks.length > 1 ? ` (Part ${index + 1})` : ''}`,
          summary: (analysisData.summary || '').substring(0, 500),
          category: analysisType === 'technical' ? 'technical' : 
                   analysisType === 'market' ? 'business' :
                   analysisType === 'differentiation' ? 'strategy' :
                   analysisType === 'financial' ? 'financial' :
                   analysisType === 'bmc' ? 'business_model' :
                   analysisType === 'roast' ? 'critique' : 'general'
        });
      }
      
      const finalMetadata = baseMetadata;
      const finalMetadataSize = JSON.stringify(finalMetadata).length;
      console.log(`📊 Chunk ${index} metadata size: ${finalMetadataSize} bytes`);
      
      return {
        id: chunkId,
        values: vector,
        metadata: finalMetadata,
      };
    });

    // Log total metadata sizes before upsert
    console.log(`📊 Total chunks to upsert: ${vectorsToUpsert.length}`);
    for (let i = 0; i < vectorsToUpsert.length; i++) {
      const metadataSize = JSON.stringify(vectorsToUpsert[i].metadata).length;
      console.log(`📊 Chunk ${i} final metadata size: ${metadataSize} bytes`);
    }

    // Upsert the analysis chunks to Pinecone
    await index.namespace('analyses').upsert(vectorsToUpsert);

    console.log(`✅ ${analysisType} analysis saved to Pinecone in ${chunks.length} chunk(s)`);

    return NextResponse.json({
      success: true,
      message: `${analysisType} analysis saved successfully`,
      analysisId,
      chunks: chunks.length
    });

  } catch (error) {
    console.error('Error saving analysis:', error);
    return NextResponse.json(
      { error: 'Failed to save analysis' },
      { status: 500 }
    );
  }
}