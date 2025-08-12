import { 
  index, 
  NAMESPACES, 
  VECTOR_DIMENSIONS,
  generateEmbedding,
  createVectorId,
  extractIdFromVectorId
} from './pinecone';
import * as crypto from 'crypto';

export interface SyncStatus {
  isOnline: boolean;
  lastSync: string | null;
  pendingChanges: number;
  conflicts: number;
}

export interface SyncResult {
  success: boolean;
  message: string;
  conflicts?: any[];
  syncedItems?: number;
  data?: any;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: Record<string, any>;
}

class PineconeSyncService {
  private isOnline = false;
  private syncInProgress = false;

  constructor() {
    this.checkConnection();
  }

  async checkConnection(): Promise<boolean> {
    try {
      // Check if we can access the index
      const stats = await index.describeIndexStats();
      this.isOnline = true;
      return true;
    } catch (error) {
      console.error('Pinecone connection failed:', error);
      this.isOnline = false;
      return false;
    }
  }

  private generateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  async syncProject(projectId: string, localData: any): Promise<SyncResult> {
    console.log('Starting sync for project:', projectId, 'with data:', localData);
    
    if (!this.isOnline) {
      console.log('Pinecone is offline');
      return { success: false, message: 'No internet connection' };
    }

    if (this.syncInProgress) {
      console.log('Sync already in progress');
      return { success: false, message: 'Sync already in progress' };
    }

    this.syncInProgress = true;

    try {
      console.log('Syncing project metadata...');
      // Sync project metadata
      await this.syncProjectMetadata(projectId, localData);
      
      console.log('Syncing project documents...');
      // Sync project documents
      const documentResult = await this.syncProjectDocuments(projectId, localData);
      
      console.log('Syncing context documents...');
      // Sync context documents
      const contextResult = await this.syncContextDocuments(projectId, localData);

      console.log('Syncing progress data...');
      // Sync progress data
      const progressResult = await this.syncProgressData(projectId, localData);

      console.log('Logging sync activity...');
      // Log sync activity
      await this.logSyncActivity(projectId, 'upload', 'success', 'Project synced successfully');

      const totalSynced = (documentResult.syncedItems || 0) + (contextResult.syncedItems || 0) + (progressResult.syncedItems || 0);
      console.log('Sync completed successfully. Total items synced:', totalSynced);

      return {
        success: true,
        message: 'Project synced successfully',
        syncedItems: totalSynced
      };

    } catch (error) {
      console.error('Sync error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logSyncActivity(projectId, 'upload', 'error', errorMessage);
      return { success: false, message: `Sync failed: ${errorMessage}` };
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncProjectMetadata(projectId: string, localData: any) {
    console.log('Syncing project metadata for:', projectId);
    
    const vectorId = createVectorId(NAMESPACES.PROJECTS, projectId);
    
    // Check if project metadata already exists
    try {
      const existingQuery = await index.query({
        vector: new Array(VECTOR_DIMENSIONS.PROJECT_METADATA).fill(0),
        id: vectorId,
        topK: 1,
        includeMetadata: true
      });

      if (existingQuery.matches.length > 0) {
        console.log('Project metadata already exists, updating...');
        const existing = existingQuery.matches[0].metadata;
        
        if (existing) {
          // Only update if there are actual changes
          const hasChanges = 
            existing.name !== (localData.name || projectId) ||
            existing.description !== (localData.description || '') ||
            existing.status !== (localData.status || 'In Progress');
          
          if (!hasChanges) {
            console.log('No changes detected in project metadata, skipping update');
            return;
          }
        }
      }
    } catch (error) {
      console.log('Error checking existing project metadata:', error);
    }
    
    const projectMetadata = {
      id: projectId,
      name: localData.name || projectId,
      description: localData.description || '',
      status: localData.status || 'In Progress',
      path: localData.path || '',
      lastModified: new Date().toISOString(),
      createdAt: localData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: localData.userId || 'default',
      syncEnabled: true,
      type: 'project_metadata'
    };

    console.log('Project metadata to sync:', projectMetadata);

    const embedding = await generateEmbedding(
      `${projectMetadata.name} ${projectMetadata.description} ${projectMetadata.status}`,
      VECTOR_DIMENSIONS.PROJECT_METADATA
    );

    console.log('Vector ID for project metadata:', vectorId);

    const upsertResult = await index.upsert([{
      id: vectorId,
      values: embedding,
      metadata: projectMetadata
    }]);
    
    console.log('Project metadata upsert result:', upsertResult);
  }

  private async syncProjectDocuments(projectId: string, localData: any): Promise<{ syncedItems: number }> {
    console.log('Syncing project documents for:', projectId);
    console.log('Available document types in local data:', Object.keys(localData));
    
    const documentTypes = ['requirements', 'design', 'tasks'];
    let syncedItems = 0;

    for (const docType of documentTypes) {
      console.log(`Checking for ${docType} document...`);
      if (localData[docType]) {
        console.log(`Found ${docType} document, syncing...`);
        const content = localData[docType];
        const contentHash = this.generateHash(content);
        const vectorId = createVectorId(NAMESPACES.DOCUMENTS, `${projectId}-${docType}`);

        // Check if document already exists and compare content hash
        try {
          const existingQuery = await index.query({
            vector: new Array(VECTOR_DIMENSIONS.DOCUMENT_CONTENT).fill(0),
            id: vectorId,
            topK: 1,
            includeMetadata: true
          });

          if (existingQuery.matches.length > 0) {
            const existing = existingQuery.matches[0].metadata;
            if (existing && existing.contentHash === contentHash) {
              console.log(`No changes detected in ${docType} document, skipping update`);
              continue;
            }
            console.log(`Changes detected in ${docType} document, updating...`);
          }
        } catch (error) {
          console.log(`Error checking existing ${docType} document:`, error);
        }

        const documentMetadata = {
          id: `${projectId}-${docType}`,
          projectId,
          type: docType,
          title: `${docType.charAt(0).toUpperCase() + docType.slice(1)} Document`,
          content,
          contentHash,
          lastModified: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          syncStatus: 'synced'
        };

        console.log(`Document metadata for ${docType}:`, documentMetadata);

        const embedding = await generateEmbedding(content, VECTOR_DIMENSIONS.DOCUMENT_CONTENT);
        console.log(`Vector ID for ${docType} document:`, vectorId);

        const upsertResult = await index.upsert([{
          id: vectorId,
          values: embedding,
          metadata: documentMetadata
        }]);
        
        console.log(`Upsert result for ${docType} document:`, upsertResult);
        syncedItems++;
      } else {
        console.log(`No ${docType} document found in local data`);
      }
    }

          console.log(`Total documents synced: ${syncedItems}`);
      return { syncedItems };
    }

    private async syncProgressData(projectId: string, localData: any): Promise<{ syncedItems: number }> {
      console.log('Syncing progress data for:', projectId);
      
      if (!localData.progress) {
        console.log('No progress data found in local data');
        return { syncedItems: 0 };
      }

      const vectorId = createVectorId(NAMESPACES.TASKS, `${projectId}-progress`);
      
      // Check if progress data already exists
      try {
        const existingQuery = await index.query({
          vector: new Array(VECTOR_DIMENSIONS.PROJECT_METADATA).fill(0),
          id: vectorId,
          topK: 1,
          includeMetadata: true
        });

        if (existingQuery.matches.length > 0) {
          const existing = existingQuery.matches[0].metadata;
          if (existing) {
            // Only update if there are actual changes
            const hasChanges = 
              existing.completedTasks !== (localData.progress.completedTasks || 0) ||
              existing.percentage !== (localData.progress.percentage || 0) ||
              existing.recentActivityCount !== (localData.progress.recentActivity?.length || 0);
            
            if (!hasChanges) {
              console.log('No changes detected in progress data, skipping update');
              return { syncedItems: 0 };
            }
            console.log('Changes detected in progress data, updating...');
          }
        }
      } catch (error) {
        console.log('Error checking existing progress data:', error);
      }

      const progressMetadata = {
        id: `${projectId}-progress`,
        projectId,
        totalTasks: localData.progress.totalTasks || 0,
        completedTasks: localData.progress.completedTasks || 0,
        percentage: localData.progress.percentage || 0,
        lastUpdated: localData.progress.lastUpdated || new Date().toISOString(),
        recentActivityCount: localData.progress.recentActivity?.length || 0,
        milestonesCount: localData.progress.milestones?.length || 0,
        type: 'progress'
      };

      console.log('Progress metadata to sync:', progressMetadata);

      const embedding = await generateEmbedding(
        `Progress: ${progressMetadata.completedTasks}/${progressMetadata.totalTasks} tasks completed (${progressMetadata.percentage}%)`,
        VECTOR_DIMENSIONS.PROJECT_METADATA
      );

      console.log('Vector ID for progress data:', vectorId);

      const upsertResult = await index.upsert([{
        id: vectorId,
        values: embedding,
        metadata: progressMetadata
      }]);
      
      console.log('Progress data upsert result:', upsertResult);
      return { syncedItems: 1 };
    }

  private async syncContextDocuments(projectId: string, localData: any): Promise<{ syncedItems: number }> {
    let syncedItems = 0;

    if (localData.contextDocuments && Array.isArray(localData.contextDocuments)) {
      for (const doc of localData.contextDocuments) {
        const contentHash = this.generateHash(doc.content);
        const docId = doc.id || `${projectId}-context-${Date.now()}`;
        const vectorId = createVectorId(NAMESPACES.CONTEXT, docId);

        // Check if context document already exists and compare content hash
        try {
          const existingQuery = await index.query({
            vector: new Array(VECTOR_DIMENSIONS.CONTEXT_DOCUMENT).fill(0),
            id: vectorId,
            topK: 1,
            includeMetadata: true
          });

          if (existingQuery.matches.length > 0) {
            const existing = existingQuery.matches[0].metadata;
            if (existing && existing.contentHash === contentHash) {
              console.log(`No changes detected in context document ${doc.filename}, skipping update`);
              continue;
            }
            console.log(`Changes detected in context document ${doc.filename}, updating...`);
          }
        } catch (error) {
          console.log(`Error checking existing context document ${doc.filename}:`, error);
        }

        const contextMetadata = {
          id: docId,
          projectId,
          filename: doc.filename,
          title: doc.title,
          content: doc.content,
          contentHash,
          tags: doc.tags || [],
          category: doc.category || 'other',
          type: 'context_document', // Explicitly set type for context documents
          lastModified: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          syncStatus: 'synced'
        };

        const embedding = await generateEmbedding(
          `${contextMetadata.title} ${contextMetadata.content} ${contextMetadata.tags.join(' ')}`,
          VECTOR_DIMENSIONS.CONTEXT_DOCUMENT
        );

        const upsertResult = await index.upsert([{
          id: vectorId,
          values: embedding,
          metadata: contextMetadata
        }]);

        console.log(`Upsert result for context document ${doc.filename}:`, upsertResult);
        syncedItems++;
      }
    }

    return { syncedItems };
  }

  async downloadProject(projectId: string): Promise<SyncResult> {
    if (!this.isOnline) {
      return { success: false, message: 'No internet connection' };
    }

    try {
      // Get project metadata
      const projectQuery = await index.query({
        vector: new Array(VECTOR_DIMENSIONS.PROJECT_METADATA).fill(0),
        filter: { projectId: { $eq: projectId } },
        topK: 1,
        includeMetadata: true
      });

      if (projectQuery.matches.length === 0) {
        return { success: false, message: 'Project not found in cloud storage' };
      }

      // Get project documents (requirements, design, tasks) - filter by type and deduplicate
      const documentsQuery = await index.query({
        vector: new Array(VECTOR_DIMENSIONS.DOCUMENT_CONTENT).fill(0),
        filter: { 
          projectId: { $eq: projectId },
          type: { $in: ['requirements', 'design', 'tasks'] }
        },
        topK: 50,
        includeMetadata: true
      });

      // Get context documents - try multiple approaches to find them
      console.log('🔍 Querying for context documents...');
      
      // First try: look for documents with context_document type
      let contextQuery = await index.query({
        vector: new Array(VECTOR_DIMENSIONS.CONTEXT_DOCUMENT).fill(0),
        filter: { 
          projectId: { $eq: projectId },
          type: { $eq: 'context_document' }
        },
        topK: 50,
        includeMetadata: true
      });
      
      console.log(`📊 Found ${contextQuery.matches.length} context documents with type 'context_document'`);
      
      // If no results, try looking for documents with category field (legacy context docs)
      if (contextQuery.matches.length === 0) {
        console.log('🔍 Trying legacy context document query...');
        contextQuery = await index.query({
          vector: new Array(VECTOR_DIMENSIONS.CONTEXT_DOCUMENT).fill(0),
          filter: { 
            projectId: { $eq: projectId },
            category: { $exists: true },
            type: { $nin: ['requirements', 'design', 'tasks', 'sync_log', 'progress'] }
          },
          topK: 50,
          includeMetadata: true
        });
        console.log(`📊 Found ${contextQuery.matches.length} legacy context documents`);
      }
      
      // If still no results, try a broader search excluding known document types
      if (contextQuery.matches.length === 0) {
        console.log('🔍 Trying broad context document query...');
        contextQuery = await index.query({
          vector: new Array(VECTOR_DIMENSIONS.CONTEXT_DOCUMENT).fill(0),
          filter: { 
            projectId: { $eq: projectId },
            type: { $nin: ['requirements', 'design', 'tasks', 'sync_log', 'progress', 'project_metadata'] }
          },
          topK: 50,
          includeMetadata: true
        });
        console.log(`📊 Found ${contextQuery.matches.length} documents in broad search`);
      }

      // Deduplicate documents by content hash to avoid multiple embeddings of the same document
      const uniqueDocuments = new Map();
      documentsQuery.matches.forEach(match => {
        const metadata = match.metadata;
        if (metadata && metadata.contentHash) {
          uniqueDocuments.set(metadata.contentHash, metadata);
        }
      });

      // Deduplicate context documents by content hash
      const uniqueContextDocuments = new Map();
      contextQuery.matches.forEach((match, index) => {
        const metadata = match.metadata;
        console.log(`📄 Context doc ${index + 1}: ${metadata?.title || metadata?.filename || 'Unknown'} (type: ${metadata?.type || 'none'}, category: ${metadata?.category || 'none'})`);
        
        if (metadata && metadata.type !== 'sync_log' && metadata.type !== 'progress' && metadata.type !== 'project_metadata') {
          const key = metadata.contentHash || metadata.id || `${metadata.title}-${metadata.filename}`;
          uniqueContextDocuments.set(key, metadata);
        }
      });
      
      console.log(`📊 Final context documents count: ${uniqueContextDocuments.size}`);

      await this.logSyncActivity(projectId, 'download', 'success', 'Project downloaded successfully');

      return {
        success: true,
        message: 'Project downloaded successfully',
        data: {
          project: projectQuery.matches[0].metadata,
          documents: Array.from(uniqueDocuments.values()),
          contextDocuments: Array.from(uniqueContextDocuments.values())
        }
      };
    } catch (error) {
      console.error('Failed to download project:', error);
      await this.logSyncActivity(projectId, 'download', 'error', `Download failed: ${error}`);
      return { success: false, message: 'Failed to download project' };
    }
  }

  // New method to embed a single context document
  async embedSingleContextDocument(projectId: string, document: any): Promise<{ success: boolean; message: string }> {
    if (!this.isOnline) {
      return { success: false, message: 'No internet connection' };
    }

    try {
      const contentHash = this.generateHash(document.content);
      const docId = document.id || `${projectId}-context-${Date.now()}`;
      const vectorId = createVectorId(NAMESPACES.CONTEXT, docId);

      const contextMetadata = {
        id: docId,
        projectId,
        filename: document.filename,
        title: document.title,
        content: document.content,
        contentHash,
        tags: document.tags || [],
        category: document.category || 'other',
        type: 'context_document', // Explicitly set type for context documents
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'synced'
      };

      const embedding = await generateEmbedding(
        `${contextMetadata.title} ${contextMetadata.content} ${contextMetadata.tags.join(' ')}`,
        VECTOR_DIMENSIONS.CONTEXT_DOCUMENT
      );

      const upsertResult = await index.upsert([{
        id: vectorId,
        values: embedding,
        metadata: contextMetadata
      }]);

      console.log(`Auto-embedded context document ${document.filename}:`, upsertResult);
      return { success: true, message: 'Document embedded successfully' };
    } catch (error) {
      console.error('Failed to embed context document:', error);
      return { success: false, message: 'Failed to embed document' };
    }
  }

  // New method to embed a single main document (requirements, design, tasks)
  async embedSingleMainDocument(projectId: string, documentType: string, content: string): Promise<{ success: boolean; message: string }> {
    if (!this.isOnline) {
      return { success: false, message: 'No internet connection' };
    }

    try {
      const contentHash = this.generateHash(content);
      const docId = `${projectId}-${documentType}`;
      const vectorId = createVectorId(NAMESPACES.DOCUMENTS, docId);

      const documentMetadata = {
        id: docId,
        projectId,
        type: documentType,
        content: content,
        contentHash,
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'synced'
      };

      const embedding = await generateEmbedding(
        `${documentType} ${content}`,
        VECTOR_DIMENSIONS.DOCUMENT_CONTENT
      );

      const upsertResult = await index.upsert([{
        id: vectorId,
        values: embedding,
        metadata: documentMetadata
      }]);

      console.log(`Auto-embedded main document ${documentType}:`, upsertResult);
      return { success: true, message: 'Document embedded successfully' };
    } catch (error) {
      console.error('Failed to embed main document:', error);
      return { success: false, message: 'Failed to embed document' };
    }
  }

  async searchContextDocuments(projectId: string, query: string, topK: number = 5): Promise<SearchResult[]> {
    if (!this.isOnline) {
      return [];
    }

    try {
      const embedding = await generateEmbedding(query, VECTOR_DIMENSIONS.CONTEXT_DOCUMENT);
      
      const searchResults = await index.query({
        vector: embedding,
        filter: { 
          projectId: { $eq: projectId },
          type: { $eq: 'context_document' }
        },
        topK,
        includeMetadata: true
      });

      return searchResults.matches.map(match => ({
        id: extractIdFromVectorId(match.id),
        score: match.score || 0,
        metadata: match.metadata || {}
      }));
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  async getSyncStatus(projectId: string): Promise<SyncStatus> {
    try {
      // Get last sync log
      const syncLogsQuery = await index.query({
        vector: new Array(VECTOR_DIMENSIONS.PROJECT_METADATA).fill(0),
        filter: { 
          projectId: { $eq: projectId },
          type: { $eq: 'sync_log' }
        },
        topK: 1,
        includeMetadata: true
      });

      // Count pending changes
      const pendingQuery = await index.query({
        vector: new Array(VECTOR_DIMENSIONS.DOCUMENT_CONTENT).fill(0),
        filter: { 
          projectId: { $eq: projectId },
          syncStatus: { $eq: 'pending' }
        },
        topK: 100,
        includeMetadata: true
      });

      // Count conflicts
      const conflictsQuery = await index.query({
        vector: new Array(VECTOR_DIMENSIONS.DOCUMENT_CONTENT).fill(0),
        filter: { 
          projectId: { $eq: projectId },
          syncStatus: { $eq: 'conflict' }
        },
        topK: 100,
        includeMetadata: true
      });

      const lastSync = syncLogsQuery.matches[0]?.metadata?.createdAt;
      return {
        isOnline: this.isOnline,
        lastSync: typeof lastSync === 'string' ? lastSync : null,
        pendingChanges: pendingQuery.matches.length,
        conflicts: conflictsQuery.matches.length
      };
    } catch (error) {
      return {
        isOnline: this.isOnline,
        lastSync: null,
        pendingChanges: 0,
        conflicts: 0
      };
    }
  }

  private async logSyncActivity(projectId: string, action: string, status: string, details?: string) {
    try {
      const syncLogMetadata: Record<string, any> = {
        id: `${projectId}-${Date.now()}`,
        projectId,
        action,
        status,
        createdAt: new Date().toISOString(),
        type: 'sync_log'
      };

      if (details) {
        syncLogMetadata.details = details;
      }

      const embedding = await generateEmbedding(
        `${action} ${status} ${details || ''}`,
        VECTOR_DIMENSIONS.PROJECT_METADATA
      );

      const vectorId = createVectorId(NAMESPACES.SYNC_LOGS, syncLogMetadata.id);

      await index.upsert([{
        id: vectorId,
        values: embedding,
        metadata: syncLogMetadata
      }]);
    } catch (error) {
      console.error('Failed to log sync activity:', error);
    }
  }

  async resolveConflict(projectId: string, documentId: string, resolution: 'local' | 'remote' | 'merge'): Promise<SyncResult> {
    try {
      // Update the document's sync status
      const documentVectorId = createVectorId(NAMESPACES.DOCUMENTS, documentId);
      
      // Get the current document
      const currentDoc = await index.query({
        vector: new Array(VECTOR_DIMENSIONS.DOCUMENT_CONTENT).fill(0),
        id: documentVectorId,
        topK: 1,
        includeMetadata: true
      });

      if (currentDoc.matches.length === 0) {
        return { success: false, message: 'Document not found' };
      }

      const metadata = currentDoc.matches[0].metadata || {};
      metadata.syncStatus = 'synced';
      metadata.updatedAt = new Date().toISOString();

      // Update the document
      await index.upsert([{
        id: documentVectorId,
        values: currentDoc.matches[0].values || new Array(VECTOR_DIMENSIONS.DOCUMENT_CONTENT).fill(0),
        metadata
      }]);

      await this.logSyncActivity(projectId, 'conflict_resolved', 'success', `Conflict resolved using ${resolution} version`);

      return { success: true, message: 'Conflict resolved successfully' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: `Failed to resolve conflict: ${errorMessage}` };
    }
  }

  async getSimilarDocuments(projectId: string, content: string, topK: number = 5): Promise<SearchResult[]> {
    if (!this.isOnline) {
      return [];
    }

    try {
      const embedding = await generateEmbedding(content, VECTOR_DIMENSIONS.DOCUMENT_CONTENT);
      
      const searchResults = await index.query({
        vector: embedding,
        filter: { 
          projectId: { $eq: projectId },
          type: { $in: ['document', 'context_document'] }
        },
        topK,
        includeMetadata: true
      });

      return searchResults.matches.map(match => ({
        id: extractIdFromVectorId(match.id),
        score: match.score || 0,
        metadata: match.metadata || {}
      }));
    } catch (error) {
      console.error('Similar documents search error:', error);
      return [];
    }
  }

  async deleteContextDocument(projectId: string, documentId: string): Promise<SyncResult> {
    if (!this.isOnline) {
      return { success: false, message: 'No internet connection' };
    }

    try {
      // Delete the context document vector from Pinecone
      const contextVectorId = createVectorId(NAMESPACES.CONTEXT, documentId);
      
      await index.deleteOne(contextVectorId);
      
      // Log the deletion activity
      await this.logSyncActivity(projectId, 'delete_context_document', 'success', `Deleted context document: ${documentId}`);

      return { success: true, message: 'Context document deleted from vector database' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to delete context document from Pinecone:', error);
      return { success: false, message: `Failed to delete from vector database: ${errorMessage}` };
    }
  }

  async deleteProjectDocument(projectId: string, documentId: string): Promise<SyncResult> {
    if (!this.isOnline) {
      return { success: false, message: 'No internet connection' };
    }

    try {
      // Delete the project document vector from Pinecone
      const documentVectorId = createVectorId(NAMESPACES.DOCUMENTS, documentId);
      
      await index.deleteOne(documentVectorId);
      
      // Log the deletion activity
      await this.logSyncActivity(projectId, 'delete_project_document', 'success', `Deleted project document: ${documentId}`);

      return { success: true, message: 'Project document deleted from vector database' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to delete project document from Pinecone:', error);
      return { success: false, message: `Failed to delete from vector database: ${errorMessage}` };
    }
  }
}

export const pineconeSyncService = new PineconeSyncService();
