'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProjectDashboard } from '@/types';
import { ProjectNavigation } from './ProjectNavigation';
import { ProjectMetadata } from './ProjectMetadata';
import { ProjectOverviewTab } from './ProjectOverviewTab';
import { DocumentEditor } from './DocumentEditor';
import { ProgressDashboard } from './ProgressDashboard';
import { ContextDocumentManager } from './ContextDocumentManager';
import { ApiConfiguration } from './ApiConfiguration';
import { ProjectAnalysis } from './ProjectAnalysis';

import SyncStatus from './SyncStatus';
import { EmbeddingsVisualization } from './EmbeddingsVisualization';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

interface ProjectDashboardLayoutProps {
  projectId: string;
  activeTab?: 'overview' | 'requirements' | 'design' | 'tasks' | 'context' | 'api' | 'analysis' | 'enhanced-analysis' | 'progress' | 'visualization';
}

export function ProjectDashboardLayout({ 
  projectId, 
  activeTab = 'overview' 
}: ProjectDashboardLayoutProps) {
  const [project, setProject] = useState<ProjectDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('Project not found');
        } else {
          setError('Failed to load project');
        }
        return;
      }
      
      const projectData = await response.json();
      setProject(projectData);
    } catch (error) {
      console.error('Failed to load project:', error);
      setError('Failed to load project');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectUpdate = (updatedProject: Partial<ProjectDashboard>) => {
    if (project) {
      setProject({ ...project, ...updatedProject });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/70 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-none h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50/70 flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {error || 'Project not found'}
          </h3>
          <p className="mt-2 text-gray-500">
            The project you're looking for doesn't exist or couldn't be loaded.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background/80 flex flex-col">
      {/* Header */}
      <div className="bg-card/90 border-b flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Breadcrumb */}
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/">
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Link>
              </Button>
              <div className="flex items-center space-x-2">
                <Link
                  href="/"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Projects
                </Link>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium truncate max-w-xs">
                  {project.projectId}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.refresh()}
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-2">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            {/* Sidebar */}
            <div className="xl:col-span-1 space-y-2">
              {/* Project Metadata */}
              
              
              {/* Navigation */}
              <ProjectNavigation 
                projectId={projectId} 
                activeTab={activeTab}
                progress={project.progress}
              />
              
              {/* Sync Status */}
              <SyncStatus 
                projectId={projectId}
                onSync={loadProject}
              />
              <ProjectMetadata 
                project={project} 
                onUpdate={handleProjectUpdate}
              />
            </div>

            {/* Main Content */}
            <div className="xl:col-span-4">
              <Card className="min-h-[600px] rounded-none">
                <CardContent className="p-0">
                  {activeTab === 'overview' && (
                    <ProjectOverviewTab 
                      project={project}
                      onUpdate={handleProjectUpdate}
                    />
                  )}
                  
                  {activeTab === 'requirements' && (
                    <DocumentEditor 
                      projectId={projectId}
                      projectPath={project.projectPath}
                      documentType="requirements"
                      title="Requirements"
                      description="Define project requirements and user stories"
                    />
                  )}
                  
                  {activeTab === 'design' && (
                    <DocumentEditor 
                      projectId={projectId}
                      projectPath={project.projectPath}
                      documentType="design"
                      title="Design"
                      description="System architecture and design documentation"
                    />
                  )}
                  
                  {activeTab === 'tasks' && (
                    <DocumentEditor 
                      projectId={projectId}
                      projectPath={project.projectPath}
                      documentType="tasks"
                      title="Tasks"
                      description="Implementation tasks and checklist"
                    />
                  )}
                  
                                  {activeTab === 'context' && (
                  <ContextDocumentManager projectId={projectId} />
                )}
                
                {activeTab === 'api' && (
                  <ApiConfiguration projectId={projectId} />
                )}
                
                {activeTab === 'analysis' && (
                  <ProjectAnalysis projectId={projectId} />
                )}
                
                {activeTab === 'progress' && (
                  <div className="p-6">
                    <ProgressDashboard projectId={projectId} />
                  </div>
                )}
                
                {activeTab === 'visualization' && (
                  <div className="p-6">
                    <div className="space-y-6">
                      <div>
                        <h1 className="text-2xl font-bold">Document Visualization</h1>
                        <p className="text-gray-600">
                          Explore your project documents in 3D vector space to understand relationships and similarities.
                        </p>
                      </div>
                      
                      <div style={{ border: '2px solid', padding: '10px' }}>
                        <EmbeddingsVisualization projectId={projectId} />
                      </div>
                    </div>
                  </div>
                )}
                </CardContent>
              </Card>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}