'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Users, Calendar, Crown, UserCheck, UserX, Loader2, Share2, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProjectSharingRecord {
  id: string;
  projectId: string;
  sharedWithEmail: string;
  role: string;
  sharedAt: string;
  status: 'pending' | 'accepted' | 'declined' | 'active';
  respondedAt?: string;
}

interface ProjectSharingStatusProps {
  projectId: string;
  isOwned?: boolean;
}

export function ProjectSharingStatus({ projectId, isOwned = true }: ProjectSharingStatusProps) {
  const [sharingRecords, setSharingRecords] = useState<ProjectSharingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (projectId) {
      fetchProjectSharingStatus();
    }
  }, [projectId]);

  const fetchProjectSharingStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/sharing-status`);
      const data = await response.json();
      
      if (data.success) {
        setSharingRecords(data.sharingRecords || []);
      } else {
        console.error('Failed to fetch project sharing status:', data.error);
      }
    } catch (error) {
      console.error('Error fetching project sharing status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="flex items-center gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
      case 'accepted':
        return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />Accepted</Badge>;
      case 'declined':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="w-3 h-3" />Declined</Badge>;
      case 'active':
        return <Badge variant="secondary" className="flex items-center gap-1"><UserCheck className="w-3 h-3" />Active</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner': return <Badge variant="default"><Crown className="w-3 h-3 mr-1" />Owner</Badge>;
      case 'admin': return <Badge variant="destructive"><UserCheck className="w-3 h-3 mr-1" />Admin</Badge>;
      case 'editor': return <Badge variant="secondary"><UserCheck className="w-3 h-3 mr-1" />Editor</Badge>;
      case 'viewer': return <Badge variant="outline"><UserX className="w-3 h-3 mr-1" />Viewer</Badge>;
      default: return <Badge variant="outline">{role}</Badge>;
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const pendingCount = sharingRecords.filter(r => r.status === 'pending').length;
  const acceptedCount = sharingRecords.filter(r => r.status === 'accepted').length;
  const activeCount = sharingRecords.filter(r => r.status === 'active').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading sharing status...</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            <CardTitle className="text-lg">Project Sharing Status</CardTitle>
          </div>
          <div className="flex gap-2">
            {pendingCount > 0 && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                {pendingCount} pending
              </Badge>
            )}
            {acceptedCount > 0 && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {acceptedCount} accepted
              </Badge>
            )}
            {activeCount > 0 && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {activeCount} active
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          Track the status of project invitations and shared access
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sharingRecords.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Share2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No sharing records found for this project</p>
            {isOwned && (
              <p className="text-sm mt-2">Share this project with others to see sharing status here</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {sharingRecords.map((record) => (
              <div key={record.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{record.sharedWithEmail}</span>
                      {getRoleBadge(record.role)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Shared {formatDate(record.sharedAt)}</span>
                      </div>
                      {record.respondedAt && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          <span>Responded {formatDate(record.respondedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(record.status)}
                  {isOwned && record.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // TODO: Implement resend invitation functionality
                        toast({
                          title: 'Feature coming soon',
                          description: 'Resend invitation functionality will be available soon.',
                        });
                      }}
                    >
                      Resend
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
