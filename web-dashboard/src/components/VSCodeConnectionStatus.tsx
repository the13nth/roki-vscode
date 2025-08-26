'use client';

import React, { useState, useEffect } from 'react';

interface VSCodeConnection {
  connected: boolean;
  lastSeen: string | null;
  version?: string | null;
  workspacePath?: string | null;
}

interface VSCodeConnectionStatusProps {
  projectId: string;
}

export default function VSCodeConnectionStatus({ projectId }: VSCodeConnectionStatusProps) {
  const [connection, setConnection] = useState<VSCodeConnection>({
    connected: false,
    lastSeen: null,
    version: null,
    workspacePath: null
  });
  const [loading, setLoading] = useState(true);

  const fetchConnectionStatus = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/vscode`);
      if (response.ok) {
        const data = await response.json();
        setConnection(data);
      }
    } catch (error) {
      console.error('Failed to fetch VS Code connection status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnectionStatus();
    
    // Poll for connection status every 10 seconds
    const interval = setInterval(fetchConnectionStatus, 10000);
    
    return () => clearInterval(interval);
  }, [projectId]);

  const getStatusIndicator = () => {
    if (loading) {
      return (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-none h-4 w-4 border-b-2 border-blue-500"></div>
          <span className="text-sm text-gray-600">Checking...</span>
        </div>
      );
    }

    if (connection.connected) {
      return (
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-none animate-pulse"></div>
          <span className="text-sm text-green-700 font-medium">VS Code Connected</span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2">
        <div className="w-3 h-3 bg-gray-400 rounded-none"></div>
        <span className="text-sm text-gray-600">VS Code Disconnected</span>
      </div>
    );
  };

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return 'Never';
    
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="bg-white rounded-none border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">VS Code Integration</h3>
        {getStatusIndicator()}
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Last Seen:</span>
          <span className="text-gray-900">{formatLastSeen(connection.lastSeen)}</span>
        </div>
        
        {connection.version && (
          <div className="flex justify-between">
            <span className="text-gray-600">VS Code Version:</span>
            <span className="text-gray-900">{connection.version}</span>
          </div>
        )}
        
        {connection.workspacePath && (
          <div className="flex justify-between">
            <span className="text-gray-600">Workspace:</span>
            <span className="text-gray-900 truncate max-w-xs" title={connection.workspacePath}>
              {connection.workspacePath.split('/').pop()}
            </span>
          </div>
        )}
      </div>

      {!connection.connected && (
        <div className="mt-4 p-3 bg-gray-50 rounded-none">
          <div className="text-sm">
            <p className="text-gray-800 font-medium mb-1">Connect VS Code Extension</p>
            <p className="text-gray-700 mb-2">
              Install the AI Project Manager extension and run:
            </p>
            <code className="bg-gray-100 text-gray-800 px-2 py-1 rounded-none text-xs">
              AI Project Manager: Connect to Dashboard
            </code>
          </div>
        </div>
      )}
    </div>
  );
}

