// Backup management component
'use client';

import React, { useState, useEffect } from 'react';

interface BackupInfo {
  filePath: string;
  backupPath: string;
  timestamp: Date;
  checksum: string;
  size: number;
}

interface BackupManagerProps {
  filePath: string;
  onRestore?: (backupPath: string) => void;
  className?: string;
}

export function BackupManager({ filePath, onRestore, className = '' }: BackupManagerProps) {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Load backups for the file
  const loadBackups = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/backups?filePath=${encodeURIComponent(filePath)}`);
      
      if (!response.ok) {
        throw new Error('Failed to load backups');
      }
      
      const data = await response.json();
      setBackups(data.backups.map((backup: any) => ({
        ...backup,
        timestamp: new Date(backup.timestamp)
      })));
    } catch (error) {
      console.error('Failed to load backups:', error);
      setError(error instanceof Error ? error.message : 'Failed to load backups');
    } finally {
      setIsLoading(false);
    }
  };

  // Restore from backup
  const handleRestore = async (backupPath: string) => {
    try {
      const confirmed = confirm(
        'Are you sure you want to restore from this backup? This will overwrite the current file content.'
      );
      
      if (!confirmed) return;

      setIsLoading(true);
      
      const response = await fetch('/api/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupPath, targetPath: filePath })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to restore backup');
      }

      alert('File restored successfully from backup!');
      
      if (onRestore) {
        onRestore(backupPath);
      }
    } catch (error) {
      console.error('Failed to restore backup:', error);
      alert(`Failed to restore backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format relative time
  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  // Load backups when component mounts or filePath changes
  useEffect(() => {
    if (filePath && isExpanded) {
      loadBackups();
    }
  }, [filePath, isExpanded]);

  if (!filePath) {
    return null;
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      <div className="p-4">
        <button
          onClick={() => {
            setIsExpanded(!isExpanded);
            if (!isExpanded && backups.length === 0) {
              loadBackups();
            }
          }}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="font-medium text-gray-900">File Backups</span>
            {backups.length > 0 && (
              <span className="text-sm text-gray-500">({backups.length})</span>
            )}
          </div>
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isExpanded && (
          <div className="mt-4">
            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-none h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600">Loading backups...</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-sm text-red-800">{error}</span>
                </div>
                <button
                  onClick={loadBackups}
                  className="mt-2 text-xs bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded"
                >
                  Retry
                </button>
              </div>
            )}

            {!isLoading && !error && backups.length === 0 && (
              <div className="text-center py-4">
                <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-gray-500">No backups available</p>
                <p className="text-xs text-gray-400 mt-1">Backups are created automatically when files are modified</p>
              </div>
            )}

            {!isLoading && !error && backups.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500 border-b border-gray-200 pb-2">
                  <span>Backup Time</span>
                  <span>Size</span>
                  <span>Actions</span>
                </div>
                
                {backups.map((backup, index) => (
                  <div key={backup.backupPath} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {formatRelativeTime(backup.timestamp)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {backup.timestamp.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400 font-mono">
                        {backup.checksum.substring(0, 8)}...
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600 px-4">
                      {formatFileSize(backup.size)}
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleRestore(backup.backupPath)}
                        disabled={isLoading}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        title="Restore this backup"
                      >
                        Restore
                      </button>
                      
                      {index === 0 && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                          Latest
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                
                <div className="pt-2 text-xs text-gray-500">
                  <p>💡 Tip: Backups are automatically created before each save operation</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}