'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  Clock, 
  Users, 
  Tag, 
  ArrowRight, 
  Lock, 
  Share2,
  FileText,
  Target,
  CheckCircle,
  AlertCircle,
  Clock as ClockIcon,
  Palette,
  CheckSquare,
  FolderOpen,
  Sparkles,
  Loader2,
  Globe
} from 'lucide-react';
import { ProjectDashboard } from '@/types/shared';
import { ShareProjectDialog } from './ShareProjectDialog';

interface ProjectOverviewTabProps {
  project: ProjectDashboard & { 
    isOwned?: boolean; 
    isPublic?: boolean;
    businessModel?: string[];
    technologyStack?: any;
    regulatoryCompliance?: any;
    industry?: string;
    customIndustry?: string;
    template?: string;
    customTemplate?: string;
    aiModel?: string;
  };
  onUpdate: (updatedProject: Partial<ProjectDashboard>) => void;
}

export function ProjectOverviewTab({ project, onUpdate }: ProjectOverviewTabProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isGeneratingSpecs, setIsGeneratingSpecs] = useState(false);
  const [specsError, setSpecsError] = useState<string | null>(null);
  const [specsSuccess, setSpecsSuccess] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);
  
  // Editing states for additional fields
  const [isEditing, setIsEditing] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Load project visibility status on component mount
  useEffect(() => {
    const loadProjectVisibility = async () => {
      try {
        const response = await fetch(`/api/projects/${project.projectId}`);
        if (response.ok) {
          const projectData = await response.json();
          // Check if the project data includes isPublic field
          // For now, we'll assume it's false if not present
          setIsPublic(projectData.isPublic || false);
        }
      } catch (error) {
        console.error('Failed to load project visibility:', error);
      }
    };

    loadProjectVisibility();
  }, [project.projectId]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getProgressColor = (percentage: number) => {
    if (percentage === 100) return 'text-green-600 bg-green-100';
    if (percentage >= 75) return 'text-gray-600 bg-gray-100';
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-100';
    if (percentage >= 25) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const handleGenerateSpecs = async () => {
    try {
      setIsGeneratingSpecs(true);
      setSpecsError(null);
      setSpecsSuccess(null);

      console.log('🔄 Generating specs for project:', project.projectId);

      const response = await fetch(`/api/projects/${project.projectId}/generate-specs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Specs generated successfully:', result);
        setSpecsSuccess('Project specifications generated successfully! They are now available in your project documents and will appear in the visualization.');
        
        // Refresh the project data to show updated documents
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to generate specs:', errorData);
        setSpecsError(errorData.error || 'Failed to generate specifications');
      }
    } catch (error) {
      console.error('❌ Error generating specs:', error);
      setSpecsError('Failed to generate specifications. Please try again.');
    } finally {
      setIsGeneratingSpecs(false);
    }
  };

  const handleToggleVisibility = async () => {
    try {
      setIsTogglingVisibility(true);
      const newVisibility = !isPublic;
      
      const response = await fetch(`/api/projects/${project.projectId}/visibility`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isPublic: newVisibility
        }),
      });

      if (response.ok) {
        setIsPublic(newVisibility);
        // Show success message
        console.log(`Project is now ${newVisibility ? 'public' : 'private'}`);
      } else {
        console.error('Failed to update project visibility');
      }
    } catch (error) {
      console.error('Failed to update project visibility:', error);
    } finally {
      setIsTogglingVisibility(false);
    }
  };

  // Helper function to check if specs are empty
  const areSpecsEmpty = () => {
    const { requirements, design, tasks } = project.documents;
    return !requirements?.trim() && !design?.trim() && !tasks?.trim();
  };

  const quickActions = [
    {
      name: 'Edit Requirements',
      href: `/project/${project.projectId}/requirements`,
      icon: <FileText className="w-5 h-5" />,
      description: 'Update project requirements and user stories'
    },
    {
      name: 'Update Design',
      href: `/project/${project.projectId}/design`,
      icon: <Palette className="w-5 h-5" />,
      description: 'Modify system architecture and design'
    },
    {
      name: 'Manage Tasks',
      href: `/project/${project.projectId}/tasks`,
      icon: <CheckSquare className="w-5 h-5" />,
      description: 'View and update implementation tasks'
    },
    {
      name: 'Add Context',
      href: `/project/${project.projectId}/context`,
      icon: <FolderOpen className="w-5 h-5" />,
      description: 'Upload context documents and references'
    }
  ];

  const handleSharingChanged = () => {
    // Increment refresh key to trigger re-renders of child components
    setRefreshKey(prev => prev + 1);
    // Also trigger a project refresh to get updated sharing data
    onUpdate({ ...project });
    
    // Dispatch a custom event to notify other components (like ProjectTeamTab)
    window.dispatchEvent(new CustomEvent('projectSharingChanged', { 
      detail: { projectId: project.projectId } 
    }));
  };

  const handleStartEdit = (field: string, currentValue: any) => {
    setEditingField(field);
    setEditValue(Array.isArray(currentValue) ? currentValue.join(', ') : (currentValue || ''));
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue('');
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!editingField) return;

    try {
      setIsSaving(true);
      
      let updateValue: any = editValue;
      
      // Handle different field types
      if (editingField === 'businessModel') {
        updateValue = editValue.split(',').map(item => item.trim()).filter(item => item);
      } else if (editingField === 'technologyStack' || editingField === 'regulatoryCompliance') {
        try {
          updateValue = editValue ? JSON.parse(editValue) : null;
        } catch {
          // If JSON parsing fails, treat as string
          updateValue = editValue;
        }
      }

      const response = await fetch(`/api/projects/${project.projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [editingField]: updateValue
        }),
      });

      if (response.ok) {
        // Update local state
        onUpdate({ [editingField]: updateValue });
        handleCancelEdit();
      } else {
        console.error('Failed to update project field');
      }
    } catch (error) {
      console.error('Error updating project field:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-3">Project Overview</h1>
        <p className="text-muted-foreground text-lg">
          Manage your project documentation, track progress, and access AI-powered development assistance.
        </p>
      </div>

      {/* Specs Generation Section - Only show for project owners when specs are empty */}
      {project.isOwned && areSpecsEmpty() && (
        <Card className="mb-8 rounded-none border-gray-200 bg-gray-50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-gray-600" />
              AI-Powered Specifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700 mb-2">
                  Generate comprehensive project specifications using AI. This will create requirements, design, and tasks documents.
                </p>
                {specsError && (
                  <p className="text-sm text-red-600 mb-2">{specsError}</p>
                )}
                {specsSuccess && (
                  <p className="text-sm text-green-600 mb-2">{specsSuccess}</p>
                )}
              </div>
              <Button
                onClick={handleGenerateSpecs}
                disabled={isGeneratingSpecs}
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                {isGeneratingSpecs ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Specs
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project Info */}
      <Card className="mb-8 rounded-none">
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Name</dt>
              <dd className="text-sm font-medium">{project.name}</dd>
            </div>
            
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Status</dt>
              <dd className="mt-1">
                <Badge variant={
                  project.progress.percentage === 100 
                    ? 'default'
                    : project.progress.percentage > 0 
                    ? 'secondary'
                    : 'outline'
                }>
                  {project.progress.percentage === 100 
                    ? 'Completed' 
                    : project.progress.percentage > 0 
                    ? 'In Progress' 
                    : 'Not Started'
                  }
                </Badge>
              </dd>
            </div>
            
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Progress</dt>
              <dd className="text-sm font-medium">{project.progress.percentage}%</dd>
              <Progress value={project.progress.percentage} className="mt-2" />
            </div>
            
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Last Updated</dt>
              <dd className="text-sm font-medium">{formatDate(project.progress.lastUpdated)}</dd>
            </div>
          </div>

          {/* Additional Project Details - Only show for project owners */}
          {project.isOwned && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Project Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Industry */}
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Industry</dt>
                  <dd className="text-sm font-medium">
                    {editingField === 'industry' ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                          placeholder="Enter industry"
                        />
                        <Button size="sm" onClick={handleSaveEdit} disabled={isSaving}>
                          {isSaving ? 'Saving...' : 'Save'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{project.industry || project.customIndustry || 'Not specified'}</span>
                        <Button size="sm" variant="ghost" onClick={() => handleStartEdit('industry', project.industry)}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                      </div>
                    )}
                  </dd>
                </div>

                {/* Business Model */}
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Business Model</dt>
                  <dd className="text-sm font-medium">
                    {editingField === 'businessModel' ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                          placeholder="Enter business models (comma-separated)"
                        />
                        <Button size="sm" onClick={handleSaveEdit} disabled={isSaving}>
                          {isSaving ? 'Saving...' : 'Save'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{project.businessModel?.length ? project.businessModel.join(', ') : 'Not specified'}</span>
                        <Button size="sm" variant="ghost" onClick={() => handleStartEdit('businessModel', project.businessModel)}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                      </div>
                    )}
                  </dd>
                </div>

                {/* AI Model */}
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">AI Model</dt>
                  <dd className="text-sm font-medium">
                    {editingField === 'aiModel' ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                        >
                          <option value="gpt-4">GPT-4</option>
                          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                          <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                          <option value="claude-3-haiku">Claude 3 Haiku</option>
                          <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                          <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                        </select>
                        <Button size="sm" onClick={handleSaveEdit} disabled={isSaving}>
                          {isSaving ? 'Saving...' : 'Save'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{project.aiModel || 'gpt-4'}</span>
                        <Button size="sm" variant="ghost" onClick={() => handleStartEdit('aiModel', project.aiModel)}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                      </div>
                    )}
                  </dd>
                </div>

                {/* Technology Stack */}
                <div className="md:col-span-2 lg:col-span-3">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Technology Stack</dt>
                  <dd className="text-sm font-medium">
                    {editingField === 'technologyStack' ? (
                      <div className="space-y-2">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          placeholder="Enter technology stack as JSON or plain text"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveEdit} disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          {project.technologyStack ? (
                            <pre className="text-xs bg-gray-50 p-2 rounded whitespace-pre-wrap">
                              {typeof project.technologyStack === 'string' 
                                ? project.technologyStack 
                                : JSON.stringify(project.technologyStack, null, 2)
                              }
                            </pre>
                          ) : (
                            <span className="text-gray-500">Not specified</span>
                          )}
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => handleStartEdit('technologyStack', project.technologyStack)}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                      </div>
                    )}
                  </dd>
                </div>

                {/* Regulatory Compliance */}
                <div className="md:col-span-2 lg:col-span-3">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Regulatory Compliance</dt>
                  <dd className="text-sm font-medium">
                    {editingField === 'regulatoryCompliance' ? (
                      <div className="space-y-2">
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          placeholder="Enter regulatory compliance requirements as JSON or plain text"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveEdit} disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          {project.regulatoryCompliance ? (
                            <pre className="text-xs bg-gray-50 p-2 rounded whitespace-pre-wrap">
                              {typeof project.regulatoryCompliance === 'string' 
                                ? project.regulatoryCompliance 
                                : JSON.stringify(project.regulatoryCompliance, null, 2)
                              }
                            </pre>
                          ) : (
                            <span className="text-gray-500">Not specified</span>
                          )}
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => handleStartEdit('regulatoryCompliance', project.regulatoryCompliance)}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                      </div>
                    )}
                  </dd>
                </div>

              </div>
            </div>
          )}
          
          {/* Visibility Toggle - Only show for project owners */}
          {project.isOwned && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Visibility</dt>
              <dd className="mt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleVisibility}
                  disabled={isTogglingVisibility}
                  className="flex items-center gap-2"
                >
                  {isTogglingVisibility ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  ) : isPublic ? (
                    <Globe className="h-4 w-4" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  {isPublic ? 'Public' : 'Private'}
                </Button>
                <p className="mt-1 text-xs text-gray-500">
                  {isPublic 
                    ? 'This project is visible to everyone on the platform.'
                    : 'This project is only visible to you.'
                  }
                </p>
              </dd>
            </div>
          )}

          {/* Project Sharing - Only show for project owners */}
          {project.isOwned && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Collaboration</dt>
              <dd className="mt-1">
                <ShareProjectDialog 
                  projectId={project.projectId}
                  projectName={project.name}
                  onSharingChanged={handleSharingChanged}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Share this project with specific users by email address.
                </p>
              </dd>
            </div>
          )}
          
          {/* Read-only notice for non-owners */}
          {!project.isOwned && project.isPublic && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Lock className="h-4 w-4" />
                <span>This is a public project. You can view it but cannot make changes.</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions - Only show for project owners */}
      {project.isOwned && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Card key={action.name} className="hover:shadow-md transition-shadow rounded-none">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="text-gray-600">
                      {action.icon}
                    </div>
                    <h3 className="font-medium">{action.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{action.description}</p>
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link href={action.href}>
                      Open <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {/* Read-only notice for non-owners */}
      {!project.isOwned && project.isPublic && (
        <div className="mb-8">
          <Card className="rounded-none border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-blue-900">Read-Only View</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    This is a public project shared by another user. You can view the project details and documents, but cannot make any changes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Activity */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Recent Activity</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/project/${project.projectId}/progress`}>
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>
        
        {project.progress.recentActivity.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {project.progress.recentActivity.slice(0, 6).map((activity, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow rounded-none">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-3 h-3 bg-green-500 rounded-full mt-1"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium mb-1">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Completed {formatDate(activity.completedAt)} • {activity.completedBy}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="rounded-none">
            <CardContent className="text-center py-12">
              <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No recent activity</p>
              <p className="text-sm text-muted-foreground">Start working on tasks to see activity here</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Project Files */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Files</h2>
        <div className="bg-gray-50 rounded-none p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm text-gray-700">requirements.md</span>
              </div>
              <Link
                href={`/project/${project.projectId}/requirements`}
                className="text-xs text-gray-600 hover:text-gray-700"
              >
                Edit
              </Link>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                </svg>
                <span className="text-sm text-gray-700">design.md</span>
              </div>
              <Link
                href={`/project/${project.projectId}/design`}
                className="text-xs text-gray-600 hover:text-gray-700"
              >
                Edit
              </Link>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <span className="text-sm text-gray-700">tasks.md</span>
              </div>
              <Link
                href={`/project/${project.projectId}/tasks`}
                className="text-xs text-gray-600 hover:text-gray-700"
              >
                Edit
              </Link>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="text-sm text-gray-700">context/ ({project.contextDocs.length} files)</span>
              </div>
              <Link
                href={`/project/${project.projectId}/context`}
                className="text-xs text-gray-600 hover:text-gray-700"
              >
                Manage
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}