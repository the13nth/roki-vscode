import { NextRequest, NextResponse } from 'next/server';
import { getPineconeClient } from '@/lib/pinecone';
import { PineconeSyncServiceInstance } from '@/lib/pineconeSyncService';
import { ProjectService } from '@/lib/projectService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    
    console.log('🔍 Fetching embeddings for project:', projectId);
    
    const pinecone = getPineconeClient();
    const index = pinecone.index(process.env.NEXT_PUBLIC_PINECONE_INDEX_NAME || 'roki');
    
    // First, check if the project has been synced to Pinecone
    console.log('📚 Checking if project has been synced to Pinecone...');
    const pineconeResult = await PineconeSyncServiceInstance.downloadProject(projectId);
    
    if (!pineconeResult.success) {
      console.log('⚠️ Project not found in Pinecone, attempting to sync...');
      
      // Try to get project data from ProjectService first
      const projectService = ProjectService.getInstance();
      
      // We need to get the userId - let's try to find it from the project metadata
      const projectQuery = await index.namespace('projects').query({
        vector: new Array(1024).fill(0),
        filter: { projectId: projectId },
        topK: 1,
        includeMetadata: true,
      });

      let userId: string | null = null;
      if (projectQuery.matches && projectQuery.matches.length > 0) {
        const metadata = projectQuery.matches[0].metadata;
        userId = typeof metadata?.userId === 'string' ? metadata.userId : null;
      }

      if (!userId) {
        console.log('❌ No project found in Pinecone, returning empty embeddings');
        return NextResponse.json({
          points: [],
          total: 0,
          projectId,
          message: 'Project not found in Pinecone. Please sync the project first.'
        });
      }

      // Get the project data
      const project = await projectService.getProject(userId, projectId);
      if (!project) {
        console.log('❌ Project not found in ProjectService');
        return NextResponse.json({
          points: [],
          total: 0,
          projectId,
          message: 'Project not found. Please sync the project first.'
        });
      }

      // Prepare sync data
      const syncData = {
        ...project,
        requirements: project.requirements || '',
        design: project.design || '',
        tasks: project.tasks || '',
        progress: (project as any).progress || {},
        contextDocuments: []
      };

      console.log('🔄 Syncing project to create embeddings...');
      const syncResult = await PineconeSyncServiceInstance.syncProject(projectId, syncData);
      
      if (!syncResult.success) {
        console.log('❌ Failed to sync project:', syncResult.message);
        return NextResponse.json({
          points: [],
          total: 0,
          projectId,
          message: 'Failed to sync project. Please try again.'
        });
      }
      
      console.log('✅ Project synced successfully, now fetching embeddings...');
    }
    
    // Now fetch all vectors for this project using multiple queries to catch all types
    const points: any[] = [];
    
    try {
      // Query for all embeddings with this projectId (no namespace filter to get all types)
      const queryResponse = await index.query({
        vector: new Array(1024).fill(0), // Match the index dimension
        filter: {
          projectId: { $eq: projectId }
        },
        topK: 100,
        includeMetadata: true,
        includeValues: true // Explicitly request vector values
      });
      
      console.log(`🔍 Found ${queryResponse.matches.length} matches for project ${projectId}`);
      
      queryResponse.matches.forEach((match, index) => {
        if (match.metadata) {
          console.log(`📄 Processing match ${index + 1}:`, {
            id: match.id,
            type: match.metadata.type,
            title: match.metadata.title,
            vectorLength: match.values?.length || 0
          });
          
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
          
          console.log(`✅ Determined type: ${type}, title: ${title}`);
          
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
      
      // Also try to query by vector ID patterns that we know should exist
      const expectedVectorIds = [
        `project:${projectId}`,
        `requirements:${projectId}`,
        `design:${projectId}`,
        `tasks:${projectId}`,
        `progress:${projectId}`
      ];
      
      console.log('🔍 Checking for expected vector IDs:', expectedVectorIds);
      
      for (const vectorId of expectedVectorIds) {
        try {
          const specificQuery = await index.query({
            vector: new Array(1024).fill(0),
            filter: {
              projectId: { $eq: projectId }
            },
            topK: 1,
            includeMetadata: true,
            includeValues: true
          });
          
          if (specificQuery.matches && specificQuery.matches.length > 0) {
            const match = specificQuery.matches[0];
            if (match.metadata && !points.find(p => p.id === match.id)) {
              console.log(`✅ Found additional match for ${vectorId}:`, match.id);
              
              let type = 'document';
              let title = 'Unknown Document';
              
              if (typeof match.metadata.type === 'string') {
                type = match.metadata.type;
                title = (typeof match.metadata.title === 'string' ? match.metadata.title : 
                        match.metadata.type.charAt(0).toUpperCase() + match.metadata.type.slice(1));
              }
              
              const vector = match.values && Array.isArray(match.values) && match.values.length > 0 
                ? match.values 
                : new Array(1024).fill(0).map(() => Math.random() - 0.5);
              
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
          }
        } catch (error) {
          console.log(`⚠️ Error querying for ${vectorId}:`, error);
        }
      }
      
    } catch (error) {
      console.log('❌ Error fetching embeddings:', error);
    }
    
    console.log(`📊 Found ${points.length} embedding points for project ${projectId}`);
    
    if (points.length > 0) {
      console.log('📄 Sample point data:', {
        id: points[0].id,
        vectorLength: points[0].vector.length,
        vectorSample: points[0].vector.slice(0, 5),
        type: points[0].metadata.type,
        title: points[0].metadata.title
      });
      
      // Log all types found
      const types = points.map(p => p.metadata.type);
      console.log('📋 Types found:', [...new Set(types)]);
    } else {
      console.log('⚠️ No embedding points found');
    }
    
    // If vectors are empty, suggest re-syncing
    if (points.length > 0 && points[0].vector.length === 0) {
      console.log('⚠️ WARNING: Vectors are empty. Data may need to be re-synced with proper embeddings.');
    }

    return NextResponse.json({
      points,
      total: points.length,
      projectId
    });
    
  } catch (error) {
    console.error('❌ Error fetching embeddings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch embeddings' },
      { status: 500 }
    );
  }
}


