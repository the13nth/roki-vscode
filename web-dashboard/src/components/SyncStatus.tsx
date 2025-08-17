'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  Download, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { pineconeClient, SyncStatus as SyncStatusType } from '@/lib/pineconeClient';

interface SyncStatusProps {
  projectId: string;
  onSync?: () => void;
}

export default function SyncStatus({ projectId, onSync }: SyncStatusProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatusType>({
    isOnline: false,
    lastSync: null,
    pendingChanges: 0,
    conflicts: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadSyncStatus();
    // Check sync status every 30 seconds
    const interval = setInterval(loadSyncStatus, 30000);
    return () => clearInterval(interval);
  }, [projectId]);

  const loadSyncStatus = async () => {
    try {
      const status = await pineconeClient.getSyncStatus(projectId);
      setSyncStatus(status);
      setLastSyncTime(status.lastSync);
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  const handleSync = async () => {
    setIsLoading(true);
    try {
      // Fetch the current project data to sync
      const projectResponse = await fetch(`/api/projects/${projectId}`);
      if (!projectResponse.ok) {
        throw new Error('Failed to fetch project data');
      }
      const projectData = await projectResponse.json();
      console.log('Project data received:', {
        projectId: projectData.projectId,
        name: projectData.name,
        hasDocuments: !!projectData.documents,
        documentKeys: projectData.documents ? Object.keys(projectData.documents) : [],
        requirementsLength: projectData.documents?.requirements?.length || 0,
        designLength: projectData.documents?.design?.length || 0,
        tasksLength: projectData.documents?.tasks?.length || 0
      });
      
      // Fetch context documents
      const contextResponse = await fetch(`/api/projects/${projectId}/context`);
      const contextData = contextResponse.ok ? await contextResponse.json() : [];
      
      // Prepare data for sync
      const syncData = {
        ...projectData,
        requirements: projectData.documents?.requirements || '',
        design: projectData.documents?.design || '',
        tasks: projectData.documents?.tasks || '',
        progress: projectData.progress || {},
        contextDocuments: contextData
      };
      
      console.log('Sync data being sent:', {
        projectId,
        hasRequirements: !!syncData.requirements,
        hasDesign: !!syncData.design,
        hasTasks: !!syncData.tasks,
        contextCount: syncData.contextDocuments?.length || 0
      });
      
      const result = await pineconeClient.syncProject(projectId, syncData);
      
      if (result.success) {
        await loadSyncStatus();
        onSync?.();
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      const result = await pineconeClient.downloadProject(projectId);
      
      if (result.success) {
        await loadSyncStatus();
        onSync?.();
      }
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getStatusColor = () => {
    if (!syncStatus.isOnline) return 'destructive';
    if (syncStatus.conflicts > 0) return 'destructive';
    if (syncStatus.pendingChanges > 0) return 'secondary';
    return 'default';
  };

  const getStatusIcon = () => {
    if (!syncStatus.isOnline) return <WifiOff className="h-4 w-4" />;
    if (syncStatus.conflicts > 0) return <AlertCircle className="h-4 w-4" />;
    if (syncStatus.pendingChanges > 0) return <Clock className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  return (
    <Card className="w-full rounded-none">
      <CardHeader className="pb-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-left hover:bg-muted/50 transition-colors rounded-sm p-1 -m-1"
        >
          <CardTitle className="flex items-center gap-2 text-sm">
            <Cloud className="h-4 w-4" />
            Online Sync
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Status Icons */}
            <div className="flex items-center gap-1">
              {syncStatus.isOnline ? (
                <Wifi className="h-3 w-3 text-green-500" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-500" />
              )}
              {syncStatus.conflicts > 0 && (
                <AlertCircle className="h-3 w-3 text-red-500" />
              )}
              {syncStatus.pendingChanges > 0 && (
                <Clock className="h-3 w-3 text-yellow-500" />
              )}
              {syncStatus.isOnline && syncStatus.conflicts === 0 && syncStatus.pendingChanges === 0 && (
                <CheckCircle className="h-3 w-3 text-green-500" />
              )}
            </div>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </div>
        </button>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {syncStatus.isOnline ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm">
              {syncStatus.isOnline ? 'Connected' : 'Offline'}
            </span>
          </div>
          <Badge variant={getStatusColor()} className="flex items-center gap-1">
            {getStatusIcon()}
            {syncStatus.isOnline ? 'Online' : 'Offline'}
          </Badge>
        </div>

        {/* Sync Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Last sync:</span>
            <span className="text-muted-foreground">
              {formatLastSync(lastSyncTime)}
            </span>
          </div>
          
          {syncStatus.pendingChanges > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span>Pending changes:</span>
              <Badge variant="secondary">{syncStatus.pendingChanges}</Badge>
            </div>
          )}
          
          {syncStatus.conflicts > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span>Conflicts:</span>
              <Badge variant="destructive">{syncStatus.conflicts}</Badge>
            </div>
          )}
        </div>

        {/* Sync Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSync}
            disabled={!syncStatus.isOnline || isLoading}
            className="flex-1 rounded-none"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Sync
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            disabled={!syncStatus.isOnline || isLoading}
            className="flex-1 rounded-none"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>

        {/* Alerts */}
        {!syncStatus.isOnline && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You're currently offline. Sync will resume when connection is restored.
            </AlertDescription>
          </Alert>
        )}

        {syncStatus.conflicts > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {syncStatus.conflicts} conflict(s) detected. Please resolve them before syncing.
            </AlertDescription>
          </Alert>
        )}

        {syncStatus.pendingChanges > 0 && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              {syncStatus.pendingChanges} change(s) waiting to be synced.
            </AlertDescription>
          </Alert>
        )}
        </CardContent>
      )}
    </Card>
  );
}
