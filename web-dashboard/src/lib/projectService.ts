import { getPineconeClient, PINECONE_INDEX_NAME, PINECONE_NAMESPACE_PROJECTS } from './pinecone';
import { ProjectConfiguration, ProjectListItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { embeddingService } from './embeddingService';
import { pineconeOperationsService } from './pineconeOperationsService';
import { PineconeUtils } from './pineconeUtils';

export function createVectorId(type: string, id: string): string {
  return `${type}:${id}`;
}

export interface UserProject extends ProjectConfiguration {
  userId: string;
}

export class ProjectService {
  private static instance: ProjectService;

  static getInstance(): ProjectService {
    if (!ProjectService.instance) {
      ProjectService.instance = new ProjectService();
    }
    return ProjectService.instance;
  }

  async createProject(userId: string, projectData: Omit<ProjectConfiguration, 'projectId' | 'createdAt' | 'lastModified'>): Promise<ProjectListItem> {
    const projectId = uuidv4();
    const now = new Date().toISOString();

    const { contextPreferences, ...restProjectData } = projectData;

    const project: UserProject = {
      ...restProjectData,
      projectId,
      userId,
      createdAt: now,
      lastModified: now,
      isPublic: projectData.isPublic || false, // Use the value from projectData
      tokenTracking: {
        totalTokens: 0,
        totalCost: 0,
        lastUpdated: now
      },
      contextPreferences: {
        ...{
          maxContextSize: 8000,
          prioritizeRecent: true,
          includeProgress: true
        },
        ...(contextPreferences || {})
      }
    };

    // Generate embedding for the project description
    const embedding = await embeddingService.generateEmbedding(project.description);

    // Store in Pinecone
    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);
    const vectorId = createVectorId('user-project', projectId);

    await index.namespace(PINECONE_NAMESPACE_PROJECTS).upsert([
      {
        id: vectorId,
        values: embedding,
        metadata: {
          userId,
          projectId,
          name: project.name,
          description: project.description,
          template: project.template,
          createdAt: now,
          lastModified: now,
          isPublic: project.isPublic || false,
          type: 'user-project',
          projectData: JSON.stringify(project)
        }
      }
    ]);

    return {
      id: projectId,
      name: project.name,
      description: project.description,
      lastModified: new Date(now),
      progress: 0
    };
  }

  async getUserProjects(userId: string): Promise<ProjectListItem[]> {
    // Query projects for this user
    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);

    const queryResponse = await index.namespace(PINECONE_NAMESPACE_PROJECTS).query({
      vector: new Array(1024).fill(0), // Placeholder query vector (match Pinecone index dimension)
      filter: {
        userId: { $eq: userId },
        type: { $eq: 'user-project' }
      },
      topK: 100,
      includeMetadata: true
    });

    return queryResponse.matches?.map((match: any) => {
      const metadata = match.metadata;
      if (!metadata) return null;

      return {
        id: metadata.projectId as string,
        name: metadata.name as string,
        description: metadata.description as string,
        lastModified: new Date(metadata.lastModified as string),
        progress: 0, // TODO: Calculate from project data
        isPublic: metadata.isPublic as boolean || false
      };
    }).filter(Boolean) as ProjectListItem[] || [];
  }

  async getPublicProjects(excludeUserId?: string): Promise<ProjectListItem[]> {
    // Query all public projects
    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);

    // Build filter to exclude projects owned by the specified user
    const filter: any = {
      isPublic: { $eq: true },
      type: { $eq: 'user-project' }
    };
    
    // If excludeUserId is provided, exclude projects owned by that user
    if (excludeUserId) {
      filter.userId = { $ne: excludeUserId };
    }

    const queryResponse = await index.namespace(PINECONE_NAMESPACE_PROJECTS).query({
      vector: new Array(1024).fill(0), // Placeholder query vector (match Pinecone index dimension)
      filter,
      topK: 100,
      includeMetadata: true
    });

    return queryResponse.matches?.map((match: any) => {
      const metadata = match.metadata;
      if (!metadata) return null;

      return {
        id: metadata.projectId as string,
        name: metadata.name as string,
        description: metadata.description as string,
        lastModified: new Date(metadata.lastModified as string),
        progress: 0, // TODO: Calculate from project data
        isPublic: metadata.isPublic as boolean || false
      };
    }).filter(Boolean) as ProjectListItem[] || [];
  }

  async getProject(userId: string, projectId: string): Promise<UserProject | null> {
    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);
    const vectorId = createVectorId('user-project', projectId);

    const fetchResponse = await index.namespace(PINECONE_NAMESPACE_PROJECTS).fetch([vectorId]);
    const record = fetchResponse.records?.[vectorId];

    if (!record?.metadata) {
      return null;
    }

    // Check if project is public or user owns it
    const isPublic = record.metadata.isPublic as boolean || false;
    if (!isPublic && record.metadata.userId !== userId) {
      return null;
    }

    try {
      const projectData = JSON.parse(record.metadata.projectData as string) as UserProject;
      
      // Check for chunked documents and retrieve them
      const processedProject = await this.processChunkedDocuments(projectData);
      
      return processedProject;
    } catch (error) {
      console.error('Failed to parse project data:', error);
      return null;
    }
  }

  async updateProject(userId: string, projectId: string, updates: Partial<UserProject>): Promise<boolean> {
    // For updates, we need to explicitly check ownership regardless of public status
    const updatePinecone = getPineconeClient();
    const updateIndex = updatePinecone.index(PINECONE_INDEX_NAME);
    const updateVectorId = createVectorId('user-project', projectId);

    const fetchResponse = await updateIndex.namespace(PINECONE_NAMESPACE_PROJECTS).fetch([updateVectorId]);
    const record = fetchResponse.records?.[updateVectorId];

    if (!record?.metadata) {
      return false;
    }

    // Only the owner can update the project, regardless of public status
    if (record.metadata.userId !== userId) {
      return false;
    }

    // Get the existing project data
    let existingProject: UserProject;
    try {
      existingProject = JSON.parse(record.metadata.projectData as string) as UserProject;
    } catch (error) {
      console.error('Failed to parse project data:', error);
      return false;
    }

    const updatedProject: UserProject = {
      ...existingProject,
      ...updates,
      projectId, // Ensure ID doesn't change
      userId, // Ensure user doesn't change
      lastModified: new Date().toISOString()
    };

    // Check if the updated project data would exceed Pinecone's metadata limit
    const projectDataString = JSON.stringify(updatedProject);
    const metadataSize = new Blob([projectDataString]).size;
    const MAX_METADATA_SIZE = 40000; // Leave some buffer below 40KB limit

    console.log(`📊 Metadata size check: ${metadataSize} bytes (limit: ${MAX_METADATA_SIZE} bytes)`);
    console.log(`📊 Project data breakdown:`, {
      requirements: updatedProject.requirements ? new Blob([updatedProject.requirements]).size : 0,
      design: updatedProject.design ? new Blob([updatedProject.design]).size : 0,
      tasks: updatedProject.tasks ? new Blob([updatedProject.tasks]).size : 0,
      total: metadataSize
    });

    if (metadataSize > MAX_METADATA_SIZE) {
      console.warn(`⚠️ Project data size (${metadataSize} bytes) exceeds Pinecone metadata limit. Implementing chunking strategy.`);
      
      // Store large documents separately and keep only references
      const chunkedProject = await this.storeLargeProjectInChunks(updatedProject, projectId, userId);
      
      if (!chunkedProject) {
        console.error('❌ Failed to store large project in chunks');
        return false;
      }
      
      // Use the chunked version for the main metadata
      updatedProject.requirements = chunkedProject.requirements;
      updatedProject.design = chunkedProject.design;
      updatedProject.tasks = chunkedProject.tasks;
      
      // Recalculate size after chunking
      const chunkedProjectDataString = JSON.stringify(updatedProject);
      const chunkedMetadataSize = new Blob([chunkedProjectDataString]).size;
      console.log(`✅ After chunking: ${chunkedMetadataSize} bytes (was: ${metadataSize} bytes)`);
    } else {
      console.log(`✅ Project data size (${metadataSize} bytes) is within limits, no chunking needed`);
    }

    // Generate new embedding for the updated project
    let embedding: number[];
    try {
      // Always generate a new embedding for the updated project data
      const embeddingText = updatedProject.description || updatedProject.name || projectId;
      embedding = await embeddingService.generateEmbedding(embeddingText);
      
      // Ensure the embedding has the correct dimension and is not all zeros
      if (embedding.length !== 1024) {
        console.warn(`⚠️ Generated embedding has wrong dimension: ${embedding.length}, padding to 1024`);
        while (embedding.length < 1024) {
          embedding.push(0);
        }
        if (embedding.length > 1024) {
          embedding = embedding.slice(0, 1024);
        }
      }
      
      // Check if embedding is all zeros and generate a fallback if needed
      const hasNonZero = embedding.some(val => val !== 0);
      if (!hasNonZero) {
        console.warn('⚠️ Generated embedding is all zeros, using fallback');
        // Create a simple hash-based embedding as fallback
        const hash = embeddingText.split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0);
          return a & a;
        }, 0);
        
        embedding = new Array(1024).fill(0);
        for (let i = 0; i < 1024; i++) {
          embedding[i] = Math.sin(hash + i) * 0.1;
        }
      }
      
      console.log('✅ Generated embedding for project update:', {
        dimension: embedding.length,
        hasNonZero: embedding.some(val => val !== 0),
        sampleValues: embedding.slice(0, 3)
      });
    } catch (error) {
      console.error('❌ Failed to generate embedding for project update:', error);
      // Use a simple fallback embedding
      const hash = (updatedProject.description || updatedProject.name || projectId).split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      
      embedding = new Array(1024).fill(0);
      for (let i = 0; i < 1024; i++) {
        embedding[i] = Math.sin(hash + i) * 0.1;
      }
      console.log('✅ Using fallback embedding for project update');
    }

    await updateIndex.namespace(PINECONE_NAMESPACE_PROJECTS).upsert([
      {
        id: updateVectorId,
        values: embedding,
        metadata: {
          userId,
          projectId,
          name: updatedProject.name,
          description: updatedProject.description,
          template: updatedProject.template,
          createdAt: updatedProject.createdAt,
          lastModified: updatedProject.lastModified,
          isPublic: updatedProject.isPublic || false,
          type: 'user-project',
          projectData: JSON.stringify(updatedProject)
        }
      }
    ]);

    return true;
  }

  // Helper method to store large project documents in chunks
  private async storeLargeProjectInChunks(project: UserProject, projectId: string, userId: string): Promise<UserProject | null> {
    try {
      const pinecone = getPineconeClient();
      const index = pinecone.index(PINECONE_INDEX_NAME);
      
      // Create a copy of the project with chunked documents
      const chunkedProject = { ...project };
      
      // Store large documents separately if they exceed a certain size
      const MAX_DOCUMENT_SIZE = 30000; // 30KB per document
      
      if (project.requirements && new Blob([project.requirements]).size > MAX_DOCUMENT_SIZE) {
        const chunkId = `doc_${projectId}_requirements`;
        await index.namespace('project_documents').upsert([{
          id: chunkId,
          values: new Array(1024).fill(0.1), // Placeholder vector
          metadata: {
            projectId,
            userId,
            documentType: 'requirements',
            content: project.requirements,
            lastModified: new Date().toISOString(),
            type: 'project_document'
          }
        }]);
        chunkedProject.requirements = `[CHUNKED:${chunkId}]`;
        console.log(`✅ Stored large requirements document as chunk: ${chunkId}`);
      }
      
      if (project.design && new Blob([project.design]).size > MAX_DOCUMENT_SIZE) {
        const chunkId = `doc_${projectId}_design`;
        await index.namespace('project_documents').upsert([{
          id: chunkId,
          values: new Array(1024).fill(0.1), // Placeholder vector
          metadata: {
            projectId,
            userId,
            documentType: 'design',
            content: project.design,
            lastModified: new Date().toISOString(),
            type: 'project_document'
          }
        }]);
        chunkedProject.design = `[CHUNKED:${chunkId}]`;
        console.log(`✅ Stored large design document as chunk: ${chunkId}`);
      }
      
      if (project.tasks && new Blob([project.tasks]).size > MAX_DOCUMENT_SIZE) {
        const chunkId = `doc_${projectId}_tasks`;
        await index.namespace('project_documents').upsert([{
          id: chunkId,
          values: new Array(1024).fill(0.1), // Placeholder vector
          metadata: {
            projectId,
            userId,
            documentType: 'tasks',
            content: project.tasks,
            lastModified: new Date().toISOString(),
            type: 'project_document'
          }
        }]);
        chunkedProject.tasks = `[CHUNKED:${chunkId}]`;
        console.log(`✅ Stored large tasks document as chunk: ${chunkId}`);
      }
      
      return chunkedProject;
    } catch (error) {
      console.error('❌ Failed to store large project in chunks:', error);
      return null;
    }
  }

  async deleteProject(userId: string, projectId: string): Promise<boolean> {
    // For deletion, we need to explicitly check ownership regardless of public status
    const deletePinecone = getPineconeClient();
    const deleteIndex = deletePinecone.index(PINECONE_INDEX_NAME);
    const deleteVectorId = createVectorId('user-project', projectId);

    const fetchResponse = await deleteIndex.namespace(PINECONE_NAMESPACE_PROJECTS).fetch([deleteVectorId]);
    const record = fetchResponse.records?.[deleteVectorId];

    if (!record?.metadata) {
      return false;
    }

    // Only the owner can delete the project, regardless of public status
    if (record.metadata.userId !== userId) {
      return false;
    }

    await deleteIndex.namespace(PINECONE_NAMESPACE_PROJECTS).deleteOne(deleteVectorId);
    return true;
  }

  // Helper method to process chunked documents and retrieve their content
  private async processChunkedDocuments(project: UserProject): Promise<UserProject> {
    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);

    const processedProject: UserProject = { ...project };

    if (processedProject.requirements && processedProject.requirements.includes('[CHUNKED:')) {
      const chunkId = processedProject.requirements.replace('[CHUNKED:', '').replace(']', '');
      const chunkResponse = await index.namespace('project_documents').fetch([chunkId]);
      const chunkRecord = chunkResponse.records?.[chunkId];
      if (chunkRecord?.metadata?.content) {
        processedProject.requirements = String(chunkRecord.metadata.content);
        console.log(`✅ Retrieved chunked requirements document: ${chunkId}`);
      }
    }

    if (processedProject.design && processedProject.design.includes('[CHUNKED:')) {
      const chunkId = processedProject.design.replace('[CHUNKED:', '').replace(']', '');
      const chunkResponse = await index.namespace('project_documents').fetch([chunkId]);
      const chunkRecord = chunkResponse.records?.[chunkId];
      if (chunkRecord?.metadata?.content) {
        processedProject.design = String(chunkRecord.metadata.content);
        console.log(`✅ Retrieved chunked design document: ${chunkId}`);
      }
    }

    if (processedProject.tasks && processedProject.tasks.includes('[CHUNKED:')) {
      const chunkId = processedProject.tasks.replace('[CHUNKED:', '').replace(']', '');
      const chunkResponse = await index.namespace('project_documents').fetch([chunkId]);
      const chunkRecord = chunkResponse.records?.[chunkId];
      if (chunkRecord?.metadata?.content) {
        processedProject.tasks = String(chunkRecord.metadata.content);
        console.log(`✅ Retrieved chunked tasks document: ${chunkId}`);
      }
    }

    return processedProject;
  }
}