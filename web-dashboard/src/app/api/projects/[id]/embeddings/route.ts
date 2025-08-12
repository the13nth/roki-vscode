import { NextRequest, NextResponse } from 'next/server';
import { pinecone } from '@/lib/pinecone';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    
    console.log('Fetching embeddings for project:', projectId);
    
    if (!pinecone) {
      return NextResponse.json(
        { error: 'Pinecone not configured' },
        { status: 500 }
      );
    }

    const index = pinecone.index(process.env.NEXT_PUBLIC_PINECONE_INDEX_NAME || 'roki');
    
    // Fetch all vectors for this project (using 1024 dimension to match the index)
    const points: any[] = [];
    
    try {
      const queryResponse = await index.query({
        vector: new Array(1024).fill(0), // Match the index dimension
        filter: {
          projectId: { $eq: projectId }
        },
        topK: 100,
        includeMetadata: true,
        includeValues: true // Explicitly request vector values
      });
      
      queryResponse.matches.forEach(match => {
        if (match.metadata) {
          console.log('Processing match:', match.id, 'metadata:', match.metadata);
          console.log('Match values:', match.values?.length || 0, 'sample:', match.values?.slice(0, 3));
          
          // Determine type based on metadata structure
          let type = 'document';
          let title = 'Unknown Document';
          
          // Use the actual type from Pinecone metadata
          if (typeof match.metadata.type === 'string') {
            type = match.metadata.type;
            title = (typeof match.metadata.title === 'string' ? match.metadata.title : 
                    match.metadata.type.charAt(0).toUpperCase() + match.metadata.type.slice(1));
          } else if (typeof match.metadata.docType === 'string') {
            type = match.metadata.docType;
            title = (typeof match.metadata.title === 'string' ? match.metadata.title : 
                    match.metadata.docType.charAt(0).toUpperCase() + match.metadata.docType.slice(1));
          } else {
            // Fallback for legacy data
            type = 'unknown';
            title = (typeof match.metadata.title === 'string' ? match.metadata.title : 'Unknown Document');
          }
          
          console.log('Determined type:', type, 'title:', title);
          
          // Ensure we have a valid vector
          const vector = match.values && Array.isArray(match.values) && match.values.length > 0 
            ? match.values 
            : new Array(1024).fill(0).map(() => Math.random() - 0.5); // Fallback random vector
          
          points.push({
            id: match.id,
            vector: vector,
            metadata: {
              type,
              title,
              content: match.metadata.content,
              projectId: match.metadata.projectId || projectId,
              ...match.metadata
            }
          });
        }
      });
    } catch (error) {
      console.log('Error fetching embeddings:', error);
    }
    
          console.log(`Found ${points.length} embedding points for project ${projectId}`);
      console.log('Sample point data:', points[0] ? {
        id: points[0].id,
        vectorLength: points[0].vector.length,
        vectorSample: points[0].vector.slice(0, 5),
        type: points[0].metadata.type,
        title: points[0].metadata.title
      } : 'No points found');
      
      // If vectors are empty, suggest re-syncing
      if (points.length > 0 && points[0].vector.length === 0) {
        console.log('WARNING: Vectors are empty. Data may need to be re-synced with proper embeddings.');
      }
    
    return NextResponse.json({
      points,
      total: points.length,
      projectId
    });
    
  } catch (error) {
    console.error('Error fetching embeddings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch embeddings' },
      { status: 500 }
    );
  }
}


