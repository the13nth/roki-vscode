'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ProjectDashboard } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Palette, 
  CheckSquare, 
  FolderOpen, 
  ArrowRight, 
  Clock,
  File,
  Sparkles,
  Loader2
} from 'lucide-react';

interface ProjectOverviewTabProps {
  project: ProjectDashboard;
  onUpdate: (updatedProject: Partial<ProjectDashboard>) => void;
}

export function ProjectOverviewTab({ project, onUpdate }: ProjectOverviewTabProps) {
  const [isGeneratingSpecs, setIsGeneratingSpecs] = useState(false);
  const [specsError, setSpecsError] = useState<string | null>(null);
  const [specsSuccess, setSpecsSuccess] = useState<string | null>(null);

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
    if (percentage >= 75) return 'text-blue-600 bg-blue-100';
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

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-3">Project Overview</h1>
        <p className="text-muted-foreground text-lg">
          Manage your project documentation, track progress, and access AI-powered development assistance.
        </p>
      </div>

      {/* Specs Generation Section */}
      <Card className="mb-8 rounded-none border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="w-5 h-5 mr-2 text-blue-600" />
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
              className="bg-blue-600 hover:bg-blue-700 text-white"
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

      {/* Project Info */}
      <Card className="mb-8 rounded-none">
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Name</dt>
              <dd className="text-sm font-medium">{project.projectId}</dd>
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
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Card key={action.name} className="hover:shadow-md transition-shadow rounded-none">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="text-blue-600">
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
                className="text-xs text-blue-600 hover:text-blue-700"
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
                className="text-xs text-blue-600 hover:text-blue-700"
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
                className="text-xs text-blue-600 hover:text-blue-700"
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
                className="text-xs text-blue-600 hover:text-blue-700"
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