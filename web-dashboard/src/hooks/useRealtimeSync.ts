// React hooks for real-time file synchronization using Server-Sent Events
import { useState, useCallback, useRef, useEffect } from 'react';

// Import types from shared types
interface ActivityItem {
  taskId: string;
  title: string;
  completedAt: Date;
  completedBy: 'manual' | 'auto-detection';
}

export interface SyncStatus {
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
}

export interface DocumentSyncState {
  content: string;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
  lastSynced: Date | null;
  error: string | null;
}

export interface ProgressSyncState {
  totalTasks: number;
  completedTasks: number;
  percentage: number;
  recentActivity: ActivityItem[];
  lastUpdated: Date | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for managing real-time synchronization for a project using Server-Sent Events
 */
export function useRealtimeSync(projectPath: string) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isActive: false,
    isLoading: false,
    error: null,
    lastUpdate: null,
    connectionStatus: 'disconnected'
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const startSync = useCallback(async () => {
    setSyncStatus(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Start file watcher on server
      const response = await fetch('/api/file-watcher/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath })
      });

      if (!response.ok) {
        throw new Error(`Failed to start file watcher: ${response.statusText}`);
      }

      // Connect to Server-Sent Events
      await connectToSSE();

      setSyncStatus(prev => ({
        ...prev,
        isActive: true,
        isLoading: false,
        error: null,
        lastUpdate: new Date()
      }));

    } catch (error) {
      setSyncStatus({
        isActive: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to start sync',
        lastUpdate: null,
        connectionStatus: 'error'
      });
    }
  }, [projectPath]);

  const stopSync = useCallback(async () => {
    try {
      // Disconnect from SSE
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Stop file watcher on server
      await fetch('/api/file-watcher/status', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath })
      });

      setSyncStatus({
        isActive: false,
        isLoading: false,
        error: null,
        lastUpdate: new Date(),
        connectionStatus: 'disconnected'
      });

    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to stop sync',
        connectionStatus: 'error'
      }));
    }
  }, [projectPath]);

  const connectToSSE = useCallback(async () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setSyncStatus(prev => ({ ...prev, connectionStatus: 'connecting' }));

    const eventSource = new EventSource(`/api/file-watcher/events?projectPath=${encodeURIComponent(projectPath)}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('SSE connection opened for project:', projectPath);
      reconnectAttempts.current = 0;
      setSyncStatus(prev => ({ 
        ...prev, 
        connectionStatus: 'connected',
        error: null,
        lastUpdate: new Date()
      }));
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      setSyncStatus(prev => ({ 
        ...prev, 
        connectionStatus: 'error',
        error: 'Connection lost'
      }));

      // Attempt to reconnect with exponential backoff
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const delay = Math.pow(2, reconnectAttempts.current) * 1000; // 1s, 2s, 4s, 8s, 16s
        reconnectAttempts.current++;
        
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log(`Attempting to reconnect (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
          connectToSSE();
        }, delay);
      } else {
        setSyncStatus(prev => ({ 
          ...prev, 
          connectionStatus: 'error',
          error: 'Max reconnection attempts reached'
        }));
      }
    };

    // Handle specific events
    eventSource.addEventListener('connected', (event) => {
      const data = JSON.parse(event.data);
      console.log('Connected to file watcher:', data.message);
    });

    eventSource.addEventListener('heartbeat', (event) => {
      const data = JSON.parse(event.data);
      setSyncStatus(prev => ({ 
        ...prev, 
        lastUpdate: new Date(data.timestamp),
        isActive: data.isWatching
      }));
    });

    eventSource.addEventListener('fileChanged', (event) => {
      const data = JSON.parse(event.data);
      console.log('File changed:', data.relativePath);
      setSyncStatus(prev => ({ ...prev, lastUpdate: new Date(data.timestamp) }));
    });

    eventSource.addEventListener('watcherError', (event) => {
      const data = JSON.parse(event.data);
      console.error('Watcher error:', data.error);
      setSyncStatus(prev => ({ 
        ...prev, 
        error: data.error,
        lastUpdate: new Date(data.timestamp)
      }));
    });

  }, [projectPath]);

  const triggerSyncCheck = useCallback(async () => {
    try {
      const response = await fetch('/api/file-watcher/status');
      if (response.ok) {
        setSyncStatus(prev => ({ ...prev, lastUpdate: new Date() }));
      }
    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Sync check failed'
      }));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    syncStatus,
    startSync,
    stopSync,
    triggerSyncCheck,
    connectToSSE
  };
}

/**
 * Hook for real-time document synchronization with Server-Sent Events
 */
export function useDocumentSync(
  projectPath: string,
  documentType: 'requirements' | 'design' | 'tasks' | 'config'
) {
  const [documentState, setDocumentState] = useState<DocumentSyncState>({
    content: '',
    isLoading: false,
    hasUnsavedChanges: false,
    lastSynced: null,
    error: null
  });

  const localContentRef = useRef<string>('');
  const lastSyncedContentRef = useRef<string>('');
  const eventSourceRef = useRef<EventSource | null>(null);
  const isUpdatingFromServer = useRef(false);

  // Update local content and track unsaved changes
  const updateLocalContent = useCallback((content: string) => {
    // Don't update if this is coming from a server update
    if (isUpdatingFromServer.current) {
      return;
    }

    localContentRef.current = content;
    setDocumentState(prev => ({
      ...prev,
      content,
      hasUnsavedChanges: content !== lastSyncedContentRef.current
    }));
  }, []);

  // Mark content as saved
  const markAsSaved = useCallback(() => {
    lastSyncedContentRef.current = localContentRef.current;
    setDocumentState(prev => ({
      ...prev,
      hasUnsavedChanges: false,
      lastSynced: new Date()
    }));
  }, []);

  // Handle server-side document updates
  const handleServerUpdate = useCallback((newContent: string) => {
    isUpdatingFromServer.current = true;
    
    // Check if there are unsaved local changes
    const hasLocalChanges = localContentRef.current !== lastSyncedContentRef.current;
    
    if (hasLocalChanges) {
      // There's a potential conflict - emit a conflict event
      console.warn(`Potential conflict detected for ${documentType} in project ${projectPath}`);
      setDocumentState(prev => ({
        ...prev,
        error: 'Document was modified externally while you have unsaved changes'
      }));
    } else {
      // Safe to update from server
      localContentRef.current = newContent;
      lastSyncedContentRef.current = newContent;
      setDocumentState(prev => ({
        ...prev,
        content: newContent,
        hasUnsavedChanges: false,
        lastSynced: new Date(),
        error: null
      }));
    }
    
    setTimeout(() => {
      isUpdatingFromServer.current = false;
    }, 100);
  }, [documentType, projectPath]);

  // Connect to document-specific events
  useEffect(() => {
    if (!projectPath) return;

    const eventSource = new EventSource(`/api/file-watcher/events?projectPath=${encodeURIComponent(projectPath)}`);
    eventSourceRef.current = eventSource;

    // Listen for document-specific changes
    const eventName = `${documentType}Changed`;
    eventSource.addEventListener(eventName, (event) => {
      const data = JSON.parse(event.data);
      console.log(`${documentType} document changed externally:`, data.relativePath);
      
      // Fetch the updated content
      fetch(`/api/projects/${encodeURIComponent(projectPath)}/documents/${documentType}`)
        .then(response => response.json())
        .then(result => {
          if (result.content) {
            handleServerUpdate(result.content);
          }
        })
        .catch(error => {
          console.error(`Failed to fetch updated ${documentType}:`, error);
          setDocumentState(prev => ({
            ...prev,
            error: `Failed to sync ${documentType} changes`
          }));
        });
    });

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [projectPath, documentType, handleServerUpdate]);

  // Clear errors
  const clearError = useCallback(() => {
    setDocumentState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    documentState,
    updateLocalContent,
    markAsSaved,
    clearError,
    handleServerUpdate
  };
}

/**
 * Hook for real-time progress synchronization (simplified version)
 */
export function useProgressSync(_projectPath: string) {
  const [progressState] = useState<ProgressSyncState>({
    totalTasks: 0,
    completedTasks: 0,
    percentage: 0,
    recentActivity: [],
    lastUpdated: null,
    isLoading: false,
    error: null
  });

  return progressState;
}

/**
 * Hook for real-time context document synchronization (simplified version)
 */
export function useContextSync(_projectPath: string) {
  const [contextFiles] = useState<string[]>([]);
  const [lastUpdate] = useState<Date | null>(null);
  const [isLoading] = useState(false);

  return {
    contextFiles,
    lastUpdate,
    isLoading
  };
}

/**
 * Hook for handling sync conflicts and integrity warnings
 */
interface Conflict {
  id: string;
  filePath: string;
  projectPath: string;
  relativePath: string;
  localContent: string;
  remoteContent: string;
  baseContent?: string;
  localTimestamp: Date;
  remoteTimestamp: Date;
  conflictType: 'simultaneous_edit' | 'external_change' | 'version_mismatch';
  description: string;
}

interface IntegrityWarning {
  id: string;
  filePath: string;
  errors: string[];
  warnings: string[];
  timestamp: Date;
}

interface MergeResult {
  success: boolean;
  mergedContent: string;
  conflicts: Array<{
    lineNumber: number;
    localContent: string;
    remoteContent: string;
    baseContent?: string;
  }>;
  warnings: string[];
}

export function useSyncConflicts(projectPath: string) {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [integrityWarnings, setIntegrityWarnings] = useState<IntegrityWarning[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch active conflicts
  const fetchConflicts = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/conflicts');
      if (response.ok) {
        const data = await response.json();
        const projectConflicts = data.conflicts.filter(
          (conflict: Conflict) => conflict.projectPath === projectPath
        );
        setConflicts(projectConflicts);
      }
    } catch (error) {
      console.error('Failed to fetch conflicts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectPath]);

  // Resolve a conflict
  const resolveConflict = useCallback(async (
    conflictId: string, 
    resolution: 'local' | 'remote' | 'merge' | 'manual',
    manualContent?: string
  ) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/conflicts/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conflictId,
          resolution,
          manualContent,
          resolvedBy: 'user'
        })
      });

      if (response.ok) {
        // Remove resolved conflict from state
        setConflicts(prev => prev.filter(conflict => conflict.id !== conflictId));
        return true;
      } else {
        const error = await response.json();
        throw new Error(error.details || 'Failed to resolve conflict');
      }
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get merge preview for a conflict
  const getMergePreview = useCallback(async (conflictId: string): Promise<MergeResult | null> => {
    try {
      const response = await fetch(`/api/conflicts/${conflictId}/merge`, {
        method: 'POST'
      });

      if (response.ok) {
        return await response.json();
      } else {
        console.error('Failed to get merge preview');
        return null;
      }
    } catch (error) {
      console.error('Failed to get merge preview:', error);
      return null;
    }
  }, []);

  // Dismiss integrity warning
  const dismissIntegrityWarning = useCallback((warningId: string) => {
    setIntegrityWarnings(prev => prev.filter(warning => warning.id !== warningId));
  }, []);

  // Add conflict (called when conflict is detected)
  const addConflict = useCallback((conflict: Conflict) => {
    setConflicts(prev => {
      const existing = prev.find(c => c.id === conflict.id);
      if (existing) {
        return prev.map(c => c.id === conflict.id ? conflict : c);
      }
      return [...prev, conflict];
    });
  }, []);

  // Add integrity warning
  const addIntegrityWarning = useCallback((warning: IntegrityWarning) => {
    setIntegrityWarnings(prev => {
      const existing = prev.find(w => w.id === warning.id);
      if (existing) {
        return prev.map(w => w.id === warning.id ? warning : w);
      }
      return [...prev, warning];
    });
  }, []);

  // Load conflicts on mount
  useEffect(() => {
    if (projectPath) {
      fetchConflicts();
    }
  }, [projectPath, fetchConflicts]);

  return {
    conflicts,
    integrityWarnings,
    isLoading,
    resolveConflict,
    getMergePreview,
    dismissIntegrityWarning,
    addConflict,
    addIntegrityWarning,
    fetchConflicts
  };
}