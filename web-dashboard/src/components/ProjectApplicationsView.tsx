'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Mail, 
  Calendar, 
  MessageSquare, 
  Clock,
  User,
  Briefcase,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface Application {
  id: string;
  projectId: string;
  requirementType: 'funding needed' | 'cofounder needed' | 'dev needed' | 'business manager needed';
  name: string;
  email: string;
  message: string;
  experience: string;
  availability: string;
  contribution: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewerNotes?: string;
}

interface ProjectApplicationsViewProps {
  projectId: string;
  isOwned?: boolean;
}

export default function ProjectApplicationsView({ projectId, isOwned = true }: ProjectApplicationsViewProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'funding needed' | 'cofounder needed' | 'dev needed' | 'business manager needed'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reviewed' | 'accepted' | 'rejected'>('all');
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchApplications();
  }, [projectId]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/applications`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch applications');
      }

      const data = await response.json();
      setApplications(data.applications || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (applicationId: string, status: 'reviewed' | 'accepted' | 'rejected', notes?: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/applications/${applicationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, reviewerNotes: notes }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update application status');
      }

      // Update local state
      setApplications(prev => prev.map(app => 
        app.id === applicationId 
          ? { ...app, status, reviewedAt: new Date().toISOString(), reviewerNotes: notes }
          : app
      ));
    } catch (err) {
      console.error('Error updating application status:', err);
    }
  };

  const getRequirementIcon = (type: string) => {
    switch (type) {
      case 'funding needed':
        return '💸';
      case 'cofounder needed':
        return '👥';
      case 'dev needed':
        return '💻';
      case 'business manager needed':
        return '📊';
      default:
        return '🎯';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'reviewed':
        return <Badge variant="outline">Reviewed</Badge>;
      case 'accepted':
        return <Badge variant="default" className="bg-green-600">Accepted</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredApplications = applications.filter(app => {
    const matchesType = filter === 'all' || app.requirementType === filter;
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesType && matchesStatus;
  });

  const groupedApplications = filteredApplications.reduce((acc, app) => {
    if (!acc[app.requirementType]) {
      acc[app.requirementType] = [];
    }
    acc[app.requirementType].push(app);
    return acc;
  }, {} as Record<string, Application[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Loading applications...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No Applications Yet</h3>
        <p className="text-muted-foreground">
          When people apply to your project requirements, their applications will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Filter by Type</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 border border-input rounded-md bg-background text-sm"
          >
            <option value="all">All Types</option>
            <option value="funding needed">Funding Needed</option>
            <option value="cofounder needed">Cofounder Needed</option>
            <option value="dev needed">Developer Needed</option>
            <option value="business manager needed">Business Manager Needed</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Filter by Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-input rounded-md bg-background text-sm"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="flex items-end">
          <Button variant="outline" onClick={fetchApplications} size="sm">
            <Loader2 className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Applications by Type */}
      {Object.entries(groupedApplications).map(([type, typeApplications]) => (
        <Card key={type}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">{getRequirementIcon(type)}</span>
              {type.charAt(0).toUpperCase() + type.slice(1).replace(' needed', ' Needed')}
              <Badge variant="outline">{typeApplications.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {typeApplications.map((application) => (
                <div key={application.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{application.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {application.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(application.status)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDetails(prev => ({ ...prev, [application.id]: !prev[application.id] }))}
                      >
                        {showDetails[application.id] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Applied {formatDate(application.createdAt)}
                    </div>
                    {application.reviewedAt && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Reviewed {formatDate(application.reviewedAt)}
                      </div>
                    )}
                  </div>

                  {showDetails[application.id] && (
                    <div className="space-y-3 mt-4 pt-4 border-t">
                      <div>
                        <h5 className="font-medium mb-1 flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          Experience
                        </h5>
                        <p className="text-sm text-muted-foreground">{application.experience}</p>
                      </div>

                      <div>
                        <h5 className="font-medium mb-1">Availability & Commitment</h5>
                        <p className="text-sm text-muted-foreground">{application.availability}</p>
                      </div>

                      <div>
                        <h5 className="font-medium mb-1">How They Can Contribute</h5>
                        <p className="text-sm text-muted-foreground">{application.contribution}</p>
                      </div>

                      {application.message && (
                        <div>
                          <h5 className="font-medium mb-1 flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Additional Message
                          </h5>
                          <p className="text-sm text-muted-foreground">{application.message}</p>
                        </div>
                      )}

                      {isOwned && application.status === 'pending' && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate(application.id, 'accepted')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(application.id, 'reviewed')}
                          >
                            Mark Reviewed
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleStatusUpdate(application.id, 'rejected')}
                          >
                            Reject
                          </Button>
                        </div>
                      )}

                      {application.reviewerNotes && (
                        <div className="mt-3 p-3 bg-muted rounded-md">
                          <h6 className="font-medium mb-1">Reviewer Notes</h6>
                          <p className="text-sm text-muted-foreground">{application.reviewerNotes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
