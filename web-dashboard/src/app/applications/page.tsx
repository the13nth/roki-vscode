'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Loader2,
  FileText,
  CheckCircle,
  AlertCircle,
  Plus,
  Calendar,
  Award,
  ExternalLink,
  Building,
  MessageSquare,
  X
} from 'lucide-react';
import { Application } from '@/types/applications';

interface UserProject {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  lastModified: string;
}

export default function ApplicationsPage() {
  const { user, isSignedIn } = useUser();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Applications state
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoadingApplications, setIsLoadingApplications] = useState(false);

  // Form state for new application
  const [newApplicationData, setNewApplicationData] = useState({
    projectId: '',
    name: '',
    description: '',
    deadline: '',
    prizeType: 'funding' as 'funding' | 'residency' | 'training' | 'other',
    prizeDetails: '',
    applicationUrl: '',
    organizationName: '',
    requirements: '',
    notes: ''
  });

  // User projects
  const [userProjects, setUserProjects] = useState<UserProject[]>([]);

  useEffect(() => {
    if (isSignedIn) {
      fetchUserProjects();
      fetchApplications();
    }
  }, [isSignedIn]);

  const fetchUserProjects = async () => {
    try {
      const response = await fetch('/api/user/projects');
      const data = await response.json();

      if (data.success) {
        setUserProjects(data.projects);
      }
    } catch (error) {
      console.error('Error fetching user projects:', error);
    }
  };

  const fetchApplications = async () => {
    try {
      setIsLoadingApplications(true);
      const response = await fetch('/api/applications');
      const data = await response.json();

      if (data.success) {
        setApplications(data.applications);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setIsLoadingApplications(false);
    }
  };

  const handleCreateApplication = async () => {
    if (!newApplicationData.projectId || !newApplicationData.name || !newApplicationData.description || !newApplicationData.deadline) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newApplicationData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create application');
      }

      const result = await response.json();
      setApplications(prev => [result.application, ...prev]);
      setSuccessMessage('Application created successfully!');

      // Reset form and hide it
      setNewApplicationData({
        projectId: '',
        name: '',
        description: '',
        deadline: '',
        prizeType: 'funding',
        prizeDetails: '',
        applicationUrl: '',
        organizationName: '',
        requirements: '',
        notes: ''
      });

      setShowCreateForm(false);
      setTimeout(() => setSuccessMessage(null), 5000);

    } catch (error: any) {
      console.error('Application creation error:', error);
      setError(error.message || 'Failed to create application');
      setTimeout(() => setError(null), 10000);
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusColor = (status: Application['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'submitted': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'waitlisted': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPrizeIcon = (prizeType: Application['prizeType']) => {
    switch (prizeType) {
      case 'funding': return '💰';
      case 'residency': return '🏢';
      case 'training': return '🎓';
      default: return '🏆';
    }
  };

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else {
      return `${diffDays} days left`;
    }
  };

  if (!isSignedIn) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-muted-foreground mb-6">You need to be signed in to use the Applications feature.</p>
          <Link href="/">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" className="flex items-center gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Applications</h1>
            <p className="text-muted-foreground mt-2">
              Manage your applications and generate compelling responses using your project's context and analysis
            </p>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Application
          </Button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <Alert className="mb-6">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="mb-6" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Create Application Form */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create New Application
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateForm(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Project Selection */}
              <div>
                <Label htmlFor="projectId">Project *</Label>
                <select
                  id="projectId"
                  value={newApplicationData.projectId}
                  onChange={(e) => setNewApplicationData(prev => ({ ...prev, projectId: e.target.value }))}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm mt-1"
                >
                  <option value="">Select a project...</option>
                  {userProjects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Application Name */}
              <div>
                <Label htmlFor="name">Application Name *</Label>
                <Input
                  id="name"
                  value={newApplicationData.name}
                  onChange={(e) => setNewApplicationData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Y Combinator W24, Techstars Boston, Google for Startups"
                  className="mt-1"
                />
              </div>

              {/* Organization */}
              <div>
                <Label htmlFor="organizationName">Organization</Label>
                <Input
                  id="organizationName"
                  value={newApplicationData.organizationName}
                  onChange={(e) => setNewApplicationData(prev => ({ ...prev, organizationName: e.target.value }))}
                  placeholder="e.g., Y Combinator, Techstars, Google"
                  className="mt-1"
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={newApplicationData.description}
                  onChange={(e) => setNewApplicationData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the application opportunity..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              {/* Deadline */}
              <div>
                <Label htmlFor="deadline">Deadline *</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={newApplicationData.deadline}
                  onChange={(e) => setNewApplicationData(prev => ({ ...prev, deadline: e.target.value }))}
                  className="mt-1"
                />
              </div>

              {/* Prize Type */}
              <div>
                <Label htmlFor="prizeType">Prize Type *</Label>
                <select
                  id="prizeType"
                  value={newApplicationData.prizeType}
                  onChange={(e) => setNewApplicationData(prev => ({ ...prev, prizeType: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm mt-1"
                >
                  <option value="funding">💰 Funding</option>
                  <option value="residency">🏢 Residency</option>
                  <option value="training">🎓 Training</option>
                  <option value="other">🏆 Other</option>
                </select>
              </div>

              {/* Prize Details */}
              <div>
                <Label htmlFor="prizeDetails">Prize Details</Label>
                <Input
                  id="prizeDetails"
                  value={newApplicationData.prizeDetails}
                  onChange={(e) => setNewApplicationData(prev => ({ ...prev, prizeDetails: e.target.value }))}
                  placeholder="e.g., $500K for 7% equity, 3-month program, $50K grant"
                  className="mt-1"
                />
              </div>

              {/* Application URL */}
              <div>
                <Label htmlFor="applicationUrl">Application URL</Label>
                <Input
                  id="applicationUrl"
                  type="url"
                  value={newApplicationData.applicationUrl}
                  onChange={(e) => setNewApplicationData(prev => ({ ...prev, applicationUrl: e.target.value }))}
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>

              {/* Requirements */}
              <div>
                <Label htmlFor="requirements">Requirements</Label>
                <Textarea
                  id="requirements"
                  value={newApplicationData.requirements}
                  onChange={(e) => setNewApplicationData(prev => ({ ...prev, requirements: e.target.value }))}
                  placeholder="Specific requirements or criteria for this application..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newApplicationData.notes}
                  onChange={(e) => setNewApplicationData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes or reminders..."
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleCreateApplication}
                  disabled={isCreating || !newApplicationData.projectId || !newApplicationData.name || !newApplicationData.description || !newApplicationData.deadline}
                  className="flex-1"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Application...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Application
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Applications List */}
        {isLoadingApplications ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading applications...</span>
          </div>
        ) : applications.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Applications Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first application to start tracking opportunities and generating responses.
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Application
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {applications.map((application) => (
              <Card key={application.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{application.name}</h3>
                        <Badge className={getStatusColor(application.status)}>
                          {application.status.replace('_', ' ')}
                        </Badge>
                      </div>

                      <p className="text-muted-foreground mb-3">{application.description}</p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span>{application.organizationName || 'Organization not specified'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDeadline(application.deadline)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Award className="h-4 w-4 text-muted-foreground" />
                          <span>{getPrizeIcon(application.prizeType)} {application.prizeType}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {application.applicationUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={application.applicationUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link href={`/applications/${application.id}`}>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Manage
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}