// Conflict resolution dialog component
'use client';

import React, { useState, useEffect } from 'react';
import { useSyncConflicts } from '../hooks/useRealtimeSync';

interface ConflictResolutionDialogProps {
  conflictId: string;
  projectPath: string;
  onResolved: () => void;
  onCancel: () => void;
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

export function ConflictResolutionDialog({
  conflictId,
  projectPath,
  onResolved,
  onCancel
}: ConflictResolutionDialogProps) {
  const { conflicts, resolveConflict, getMergePreview, isLoading } = useSyncConflicts(projectPath);
  const [selectedResolution, setSelectedResolution] = useState<'local' | 'remote' | 'merge' | 'manual'>('local');
  const [manualContent, setManualContent] = useState('');
  const [mergePreview, setMergePreview] = useState<MergeResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [resolving, setResolving] = useState(false);

  const conflict = conflicts.find(c => c.id === conflictId);

  useEffect(() => {
    if (conflict && selectedResolution === 'manual') {
      setManualContent(conflict.localContent);
    }
  }, [conflict, selectedResolution]);

  const handleGetMergePreview = async () => {
    if (!conflict) return;
    
    try {
      const preview = await getMergePreview(conflictId);
      setMergePreview(preview);
      setShowPreview(true);
      
      if (preview && preview.success) {
        setManualContent(preview.mergedContent);
      }
    } catch (error) {
      console.error('Failed to get merge preview:', error);
    }
  };

  const handleResolve = async () => {
    if (!conflict) return;

    try {
      setResolving(true);
      await resolveConflict(
        conflictId,
        selectedResolution,
        selectedResolution === 'manual' ? manualContent : undefined
      );
      onResolved();
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      alert(`Failed to resolve conflict: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setResolving(false);
    }
  };

  if (!conflict) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h2 className="text-lg font-semibold mb-4">Conflict Not Found</h2>
          <p className="text-gray-600 mb-4">The requested conflict could not be found.</p>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Resolve File Conflict</h2>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Conflict Information */}
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
          <h3 className="font-medium text-yellow-800 mb-2">Conflict Details</h3>
          <p className="text-sm text-yellow-700 mb-2">{conflict.description}</p>
          <div className="text-xs text-yellow-600 space-y-1">
            <div>File: {conflict.relativePath}</div>
            <div>Type: {conflict.conflictType}</div>
            <div>Local timestamp: {conflict.localTimestamp.toLocaleString()}</div>
            <div>Remote timestamp: {conflict.remoteTimestamp.toLocaleString()}</div>
          </div>
        </div>

        {/* Resolution Options */}
        <div className="mb-6">
          <h3 className="font-medium mb-3">Choose Resolution Strategy</h3>
          <div className="space-y-3">
            <label className="flex items-start space-x-3">
              <input
                type="radio"
                name="resolution"
                value="local"
                checked={selectedResolution === 'local'}
                onChange={(e) => setSelectedResolution(e.target.value as any)}
                className="mt-1"
              />
              <div>
                <div className="font-medium">Keep Local Changes</div>
                <div className="text-sm text-gray-600">Use your local changes and discard remote changes</div>
              </div>
            </label>

            <label className="flex items-start space-x-3">
              <input
                type="radio"
                name="resolution"
                value="remote"
                checked={selectedResolution === 'remote'}
                onChange={(e) => setSelectedResolution(e.target.value as any)}
                className="mt-1"
              />
              <div>
                <div className="font-medium">Use Remote Changes</div>
                <div className="text-sm text-gray-600">Discard local changes and use remote changes</div>
              </div>
            </label>

            <label className="flex items-start space-x-3">
              <input
                type="radio"
                name="resolution"
                value="merge"
                checked={selectedResolution === 'merge'}
                onChange={(e) => setSelectedResolution(e.target.value as any)}
                className="mt-1"
              />
              <div>
                <div className="font-medium">Automatic Merge</div>
                <div className="text-sm text-gray-600">Attempt to merge changes automatically</div>
                <button
                  onClick={handleGetMergePreview}
                  className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                >
                  Preview merge result
                </button>
              </div>
            </label>

            <label className="flex items-start space-x-3">
              <input
                type="radio"
                name="resolution"
                value="manual"
                checked={selectedResolution === 'manual'}
                onChange={(e) => setSelectedResolution(e.target.value as any)}
                className="mt-1"
              />
              <div>
                <div className="font-medium">Manual Resolution</div>
                <div className="text-sm text-gray-600">Manually edit the content to resolve conflicts</div>
              </div>
            </label>
          </div>
        </div>

        {/* Content Preview */}
        <div className="mb-6">
          <h3 className="font-medium mb-3">Content Preview</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Local Content */}
            <div>
              <h4 className="text-sm font-medium text-blue-800 mb-2">Local Changes</h4>
              <div className="bg-blue-50 border border-blue-200 rounded p-3 max-h-40 overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap">{conflict.localContent}</pre>
              </div>
            </div>

            {/* Remote Content */}
            <div>
              <h4 className="text-sm font-medium text-green-800 mb-2">Remote Changes</h4>
              <div className="bg-green-50 border border-green-200 rounded p-3 max-h-40 overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap">{conflict.remoteContent}</pre>
              </div>
            </div>
          </div>

          {/* Base Content (if available) */}
          {conflict.baseContent && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-800 mb-2">Base Content</h4>
              <div className="bg-gray-50 border border-gray-200 rounded p-3 max-h-32 overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap">{conflict.baseContent}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Manual Content Editor */}
        {selectedResolution === 'manual' && (
          <div className="mb-6">
            <h3 className="font-medium mb-3">Manual Resolution</h3>
            <textarea
              value={manualContent}
              onChange={(e) => setManualContent(e.target.value)}
              className="w-full h-64 p-3 border border-gray-300 rounded font-mono text-sm"
              placeholder="Edit the content to resolve conflicts..."
            />
          </div>
        )}

        {/* Merge Preview */}
        {showPreview && mergePreview && (
          <div className="mb-6">
            <h3 className="font-medium mb-3">Merge Preview</h3>
            {mergePreview.success ? (
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <div className="text-sm text-green-800 mb-2">✅ Automatic merge successful</div>
                <div className="bg-white border border-green-300 rounded p-3 max-h-40 overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap">{mergePreview.mergedContent}</pre>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <div className="text-sm text-red-800 mb-2">⚠️ Automatic merge failed</div>
                {mergePreview.warnings.map((warning, index) => (
                  <div key={index} className="text-xs text-red-700 mb-1">• {warning}</div>
                ))}
                {mergePreview.conflicts.length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm font-medium text-red-800 mb-2">Conflicts found:</div>
                    {mergePreview.conflicts.map((conflict, index) => (
                      <div key={index} className="bg-white border border-red-300 rounded p-2 mb-2 text-xs">
                        <div className="font-medium">Line {conflict.lineNumber}:</div>
                        <div className="mt-1">
                          <div className="text-blue-700">Local: {conflict.localContent}</div>
                          <div className="text-green-700">Remote: {conflict.remoteContent}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="bg-white border border-red-300 rounded p-3 mt-3 max-h-40 overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap">{mergePreview.mergedContent}</pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            disabled={resolving}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            disabled={resolving || isLoading || (selectedResolution === 'manual' && !manualContent.trim())}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {resolving ? 'Resolving...' : 'Resolve Conflict'}
          </button>
        </div>
      </div>
    </div>
  );
}