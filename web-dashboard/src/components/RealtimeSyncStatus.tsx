// Real-time synchronization status component
'use client';

import React from 'react';
import { useRealtimeSync, useSyncConflicts } from '../hooks/useRealtimeSync';

interface RealtimeSyncStatusProps {
  projectPath: string;
  className?: string;
}

export function RealtimeSyncStatus({ projectPath, className = '' }: RealtimeSyncStatusProps) {
  const { syncStatus, startSync, stopSync, triggerSyncCheck } = useRealtimeSync(projectPath);
  const { conflicts, integrityWarnings, resolveConflict, dismissIntegrityWarning, isLoading: conflictsLoading } = useSyncConflicts(projectPath);

  const getSyncStatusColor = () => {
    if (syncStatus.error || syncStatus.connectionStatus === 'error') return 'text-red-600';
    if (syncStatus.isLoading || syncStatus.connectionStatus === 'connecting') return 'text-yellow-600';
    if (syncStatus.isActive && syncStatus.connectionStatus === 'connected') return 'text-green-600';
    return 'text-gray-600';
  };

  const getSyncStatusText = () => {
    if (syncStatus.error) return 'Sync Error';
    if (syncStatus.connectionStatus === 'error') return 'Connection Error';
    if (syncStatus.isLoading || syncStatus.connectionStatus === 'connecting') return 'Connecting...';
    if (syncStatus.isActive && syncStatus.connectionStatus === 'connected') return 'Live Sync Active';
    return 'Sync Inactive';
  };

  const getSyncStatusIcon = () => {
    if (syncStatus.error || syncStatus.connectionStatus === 'error') return '⚠️';
    if (syncStatus.isLoading || syncStatus.connectionStatus === 'connecting') return '⏳';
    if (syncStatus.isActive && syncStatus.connectionStatus === 'connected') return '🟢';
    return '⚫';
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getSyncStatusIcon()}</span>
          <div>
            <h3 className="text-sm font-medium text-gray-900">Real-time Sync</h3>
            <p className={`text-xs ${getSyncStatusColor()}`}>
              {getSyncStatusText()}
            </p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          {!syncStatus.isActive ? (
            <button
              onClick={startSync}
              disabled={syncStatus.isLoading}
              className="px-3 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {syncStatus.isLoading ? 'Starting...' : 'Start Sync'}
            </button>
          ) : (
            <>
              <button
                onClick={triggerSyncCheck}
                className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Refresh
              </button>
              <button
                onClick={stopSync}
                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
              >
                Stop
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sync Status Details */}
      <div className="text-xs text-gray-500 mb-3 space-y-1">
        <div>Connection: {syncStatus.connectionStatus}</div>
        {syncStatus.lastUpdate && (
          <div>Last update: {syncStatus.lastUpdate.toLocaleTimeString()}</div>
        )}
      </div>

      {/* Error Display */}
      {syncStatus.error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
          <div className="flex items-start">
            <span className="text-red-500 mr-2">⚠️</span>
            <div>
              <h4 className="text-sm font-medium text-red-800">Sync Error</h4>
              <p className="text-xs text-red-700 mt-1">{syncStatus.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">
            Sync Conflicts ({conflicts.length})
          </h4>
          {conflicts.map((conflict) => (
            <div key={conflict.id} className="bg-white border border-yellow-300 rounded p-2 mb-2 last:mb-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-900">{conflict.filePath}</p>
                  <p className="text-xs text-gray-600 mt-1">{conflict.description}</p>
                </div>
                <div className="flex space-x-1 ml-2">
                  <button
                    onClick={() => resolveConflict(conflict.id, 'local')}
                    disabled={conflictsLoading}
                    className="px-2 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-800 disabled:opacity-50"
                  >
                    Keep Local
                  </button>
                  <button
                    onClick={() => resolveConflict(conflict.id, 'remote')}
                    disabled={conflictsLoading}
                    className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    Use Remote
                  </button>
                  <button
                    onClick={() => {
                      // This would open the ConflictResolutionDialog
                      // For now, just show an alert
                      alert(`Open conflict resolution dialog for ${conflict.id}`);
                    }}
                    disabled={conflictsLoading}
                    className="px-2 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-800 disabled:opacity-50"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Integrity Warnings */}
      {integrityWarnings.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded p-3">
          <h4 className="text-sm font-medium text-orange-800 mb-2">
            File Integrity Warnings ({integrityWarnings.length})
          </h4>
          {integrityWarnings.map((warning) => (
            <div key={warning.id} className="bg-white border border-orange-300 rounded p-2 mb-2 last:mb-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-900">
                    {warning.filePath.split('/').pop()}
                  </p>
                  {warning.errors.length > 0 && (
                    <div className="mt-1">
                      <p className="text-xs text-red-600">Errors:</p>
                      <ul className="text-xs text-red-600 ml-2">
                        {warning.errors.map((error: string, index: number) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {warning.warnings.length > 0 && (
                    <div className="mt-1">
                      <p className="text-xs text-orange-600">Warnings:</p>
                      <ul className="text-xs text-orange-600 ml-2">
                        {warning.warnings.map((warn: string, index: number) => (
                          <li key={index}>• {warn}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => dismissIntegrityWarning(warning.id)}
                  className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 ml-2"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface DocumentSyncIndicatorProps {
  projectPath: string;
  documentType: 'requirements' | 'design' | 'tasks' | 'config';
  className?: string;
}

export function DocumentSyncIndicator({ 
  projectPath, 
  documentType: _documentType, 
  className = '' 
}: DocumentSyncIndicatorProps) {
  const { syncStatus } = useRealtimeSync(projectPath);

  if (!syncStatus.isActive) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-1 text-xs ${className}`}>
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      <span className="text-green-600">Live</span>
    </div>
  );
}

interface UnsavedChangesIndicatorProps {
  hasUnsavedChanges: boolean;
  lastSynced: Date | null;
  className?: string;
}

export function UnsavedChangesIndicator({ 
  hasUnsavedChanges, 
  lastSynced, 
  className = '' 
}: UnsavedChangesIndicatorProps) {
  if (!hasUnsavedChanges && !lastSynced) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 text-xs ${className}`}>
      {hasUnsavedChanges ? (
        <div className="flex items-center space-x-1 text-yellow-600">
          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
          <span>Unsaved changes</span>
        </div>
      ) : (
        <div className="flex items-center space-x-1 text-green-600">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>
            Saved {lastSynced ? `at ${lastSynced.toLocaleTimeString()}` : ''}
          </span>
        </div>
      )}
    </div>
  );
}