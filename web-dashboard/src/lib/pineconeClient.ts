// Client-side service for Pinecone operations
// This uses API routes to avoid browser-side Pinecone imports

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
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: Record<string, any>;
}

class PineconeClientService {
  async getSyncStatus(projectId: string): Promise<SyncStatus> {
    try {
      const response = await fetch(`/api/projects/${projectId}/sync/status`);
      if (!response.ok) {
        throw new Error('Failed to get sync status');
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get sync status:', error);
      return {
        isOnline: false,
        lastSync: null,
        pendingChanges: 0,
        conflicts: 0
      };
    }
  }

  async syncProject(projectId: string, localData: any): Promise<SyncResult> {
    try {
      const response = await fetch(`/api/projects/${projectId}/sync/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(localData),
      });

      if (!response.ok) {
        throw new Error('Failed to sync project');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to sync project:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Sync failed'
      };
    }
  }

  async downloadProject(projectId: string): Promise<SyncResult> {
    try {
      const response = await fetch(`/api/projects/${projectId}/sync/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download project');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to download project:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Download failed'
      };
    }
  }

  async searchContextDocuments(projectId: string, query: string, topK: number = 5): Promise<SearchResult[]> {
    try {
      const response = await fetch(`/api/projects/${projectId}/sync/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, topK }),
      });

      if (!response.ok) {
        throw new Error('Failed to search documents');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to search documents:', error);
      return [];
    }
  }

  async resolveConflict(projectId: string, documentId: string, resolution: 'local' | 'remote' | 'merge'): Promise<SyncResult> {
    try {
      const response = await fetch(`/api/projects/${projectId}/sync/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentId, resolution }),
      });

      if (!response.ok) {
        throw new Error('Failed to resolve conflict');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to resolve conflict'
      };
    }
  }

  async getSimilarDocuments(projectId: string, content: string, topK: number = 5): Promise<SearchResult[]> {
    try {
      const response = await fetch(`/api/projects/${projectId}/sync/similar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, topK }),
      });

      if (!response.ok) {
        throw new Error('Failed to get similar documents');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get similar documents:', error);
      return [];
    }
  }
}

export const pineconeClient = new PineconeClientService();
