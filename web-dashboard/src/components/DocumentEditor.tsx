'use client';

import { useState, useEffect, useCallback } from 'react';
import { MarkdownEditor } from './MarkdownEditor';
import { useRealtimeSync, useDocumentSync } from '../hooks/useRealtimeSync';
import { RealtimeSyncStatus, DocumentSyncIndicator, UnsavedChangesIndicator } from './RealtimeSyncStatus';
import { BackupManager } from './BackupManager';
import AddTaskDialog from './AddTaskDialog';
import AddRequirementDialog from './AddRequirementDialog';
import TransitionRequirementDialog from './TransitionRequirementDialog';

interface DocumentEditorProps {
  projectId: string;
  projectPath: string;
  documentType: 'requirements' | 'design' | 'tasks';
  title: string;
  description: string;
  onDocumentSaved?: () => void; // Callback when document is saved
}

export function DocumentEditor({ 
  projectId, 
  projectPath,
  documentType, 
  title, 
  description,
  onDocumentSaved
}: DocumentEditorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Real-time sync hooks
  const { syncStatus, startSync } = useRealtimeSync(projectPath);
  const { documentState, updateLocalContent, markAsSaved } = useDocumentSync(projectPath, documentType);

  // Start sync when component mounts
  useEffect(() => {
    if (!syncStatus.isActive && !syncStatus.isLoading) {
      startSync();
    }
  }, [syncStatus.isActive, syncStatus.isLoading, startSync]);

  // Load document content
  useEffect(() => {
    loadDocument();
  }, [projectId, documentType]);

  const loadDocument = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      
      const response = await fetch(`/api/projects/${projectId}/documents/${documentType}`);
      
      if (!response.ok) {
        throw new Error(`Failed to load ${documentType}: ${response.statusText}`);
      }
      
      const data = await response.json();
      updateLocalContent(data.content || '');
    } catch (error) {
      console.error(`Failed to load ${documentType}:`, error);
      setLoadError(error instanceof Error ? error.message : 'Failed to load document');
    } finally {
      setIsLoading(false);
    }
  };

  // Save document content with conflict detection
  const saveDocument = useCallback(async (contentToSave: string) => {
    const response = await fetch(`/api/projects/${projectId}/documents/${documentType}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        content: contentToSave,
        lastKnownTimestamp: documentState.lastSynced?.toISOString()
      }),
    });

    if (response.status === 409) {
      // Conflict detected
      const conflictData = await response.json();
      
      // Show conflict information to user
      const shouldResolve = confirm(
        `Conflict detected: ${conflictData.description}\n\n` +
        `The file was modified externally. Would you like to resolve this conflict?\n\n` +
        `Click OK to open conflict resolution, or Cancel to reload the document.`
      );

      if (shouldResolve) {
        // TODO: Open ConflictResolutionDialog
        // For now, just show the conflict details
        console.log('Conflict details:', conflictData);
        throw new Error(`Conflict detected: ${conflictData.description}. Please resolve manually.`);
      } else {
        // Reload document to get latest version
        await loadDocument();
        throw new Error('Document was reloaded due to conflict. Please review and save again.');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to save ${documentType}`);
    }

    // Mark as saved in sync state
    markAsSaved();
    
    // Call the callback if provided (useful for refreshing project data)
    if (onDocumentSaved) {
      onDocumentSaved();
    }
    
    return response.json();
  }, [projectId, documentType, markAsSaved, documentState.lastSynced, loadDocument, onDocumentSaved]);

  // Handle content changes
  const handleContentChange = useCallback((newContent: string) => {
    updateLocalContent(newContent);
  }, [updateLocalContent]);



  // Handle task added callback
  const handleTaskAdded = useCallback(() => {
    // Reload the document to show the new task
    loadDocument();
  }, [loadDocument]);

  // Handle requirement added callback
  const handleRequirementAdded = useCallback(() => {
    // Reload the document to show the new requirement
    loadDocument();
  }, [loadDocument]);

  if (isLoading || documentState.isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-none h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading {title.toLowerCase()}...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">Failed to load {title}</h3>
              <p className="text-sm text-red-700 mt-1">{loadError}</p>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={loadDocument}
              className="text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              <DocumentSyncIndicator 
                projectPath={projectPath} 
                documentType={documentType}
              />
            </div>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
            <UnsavedChangesIndicator 
              hasUnsavedChanges={documentState.hasUnsavedChanges}
              lastSynced={documentState.lastSynced}
              className="mt-2"
            />
          </div>
          
          {/* Document Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={loadDocument}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Refresh document"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Sync Error Display */}
        {documentState.error && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start">
              <span className="text-yellow-500 mr-2">⚠️</span>
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Sync Conflict</h4>
                <p className="text-xs text-yellow-700 mt-1">{documentState.error}</p>
                <button
                  onClick={loadDocument}
                  className="mt-2 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-2 py-1 rounded"
                >
                  Reload Document
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sync Status Panel */}
      <div className="px-6 py-2 bg-gray-50 border-b border-gray-200 space-y-4">
        <RealtimeSyncStatus projectPath={projectPath} />
        <BackupManager 
          filePath={`${projectPath}/.ai-project/${documentType}.md`}
          onRestore={() => loadDocument()}
        />
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <MarkdownEditor
          content={documentState.content}
          onChange={handleContentChange}
          onSave={saveDocument}
          language="markdown"
          autoSave={true}
          autoSaveDelay={2000}
          showPreview={true}
          height="100%"
          additionalToolbarButtons={
            <>
              {/* Add Task Dialog - only show for tasks document */}
              {documentType === 'tasks' && (
                <AddTaskDialog
                  projectId={projectId}
                  onTaskAdded={handleTaskAdded}
                />
              )}
              
              {/* Add Requirement Dialog - only show for requirements document */}
              {documentType === 'requirements' && (
                <AddRequirementDialog
                  projectId={projectId}
                  onRequirementAdded={handleRequirementAdded}
                />
              )}
              
              {/* Transition Requirement Dialog - only show for requirements document */}
              {documentType === 'requirements' && (
                <TransitionRequirementDialog
                  projectId={projectId}
                  onTaskAdded={handleTaskAdded}
                />
              )}
            </>
          }
        />
      </div>
    </div>
  );
}