'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

import { ProjectDashboard } from '@/types';
import { ProjectNavigation } from './ProjectNavigation';

import { ProjectOverviewTab } from './ProjectOverviewTab';
import { DocumentEditor } from './DocumentEditor';
import { ProgressDashboard } from './ProgressDashboard';
import { ContextDocumentManager } from './ContextDocumentManager';
import { ApiConfiguration } from './ApiConfiguration';
import { ProjectAnalysis } from './ProjectAnalysis';
import { SocialPostsGenerator } from './SocialPostsGenerator';
import { PromptsViewer } from './PromptsViewer';
import ProjectApplicationsView from './ProjectApplicationsView';
import ProjectTeamTab from './ProjectTeamTab';

import SyncStatus from './SyncStatus';
import { EmbeddingsVisualization } from './EmbeddingsVisualization';
import { Card, CardContent } from '@/components/ui/card';


interface ProjectDashboardLayoutProps {
  projectId: string;
  activeTab?: 'overview' | 'requirements' | 'design' | 'tasks' | 'context' | 'api' | 'analysis' | 'enhanced-analysis' | 'progress' | 'visualization' | 'social' | 'prompts' | 'applications' | 'team';
}

export function ProjectDashboardLayout({ 
  projectId, 
  activeTab = 'overview' 
}: ProjectDashboardLayoutProps) {
  const [project, setProject] = useState<ProjectDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(activeTab);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  useEffect(() => {
    setCurrentTab(activeTab);
  }, [activeTab]);


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

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab as any);
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
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800"
          >
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background/80 flex flex-col">


      {/* Main Content Area */}
      <div className="flex-1 p-2 relative">
        <div className="w-full">
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 w-full">
            {/* Sidebar */}
            <div className="xl:col-span-1 space-y-2 hidden xl:block">
              {/* Navigation */}
              <ProjectNavigation 
                projectId={projectId} 
                activeTab={currentTab}
                progress={project.progress}
                onNavigate={handleTabChange}
                isOwned={(project as any).isOwned ?? true}
              />
              
              {/* Sync Status */}
              <SyncStatus 
                projectId={projectId}
                isOwned={project.isOwned}
                onSync={loadProject}
              />
            </div>

            {/* Main Content */}
            <div className="xl:col-span-4 w-full">
              <Card className="min-h-[600px] rounded-none w-full">
                <CardContent className="p-0 w-full">
                  {currentTab === 'overview' && (
                    <ProjectOverviewTab 
                      project={project}
                      onUpdate={handleProjectUpdate}
                    />
                  )}
                  
                  {currentTab === 'requirements' && (
                    <DocumentEditor 
                      projectId={projectId}
                      projectPath={project.projectPath}
                      documentType="requirements"
                      title="Requirements"
                      description="Define project requirements and user stories"
                      isOwned={project.isOwned}
                    />
                  )}
                  
                  {currentTab === 'design' && (
                    <DocumentEditor 
                      projectId={projectId}
                      projectPath={project.projectPath}
                      documentType="design"
                      title="Design"
                      description="System architecture and design documentation"
                      isOwned={project.isOwned}
                    />
                  )}
                  
                  {currentTab === 'tasks' && (
                    <DocumentEditor 
                      projectId={projectId}
                      projectPath={project.projectPath}
                      documentType="tasks"
                      title="Tasks"
                      description="Implementation tasks and checklist"
                      isOwned={project.isOwned}
                      onDocumentSaved={loadProject}
                    />
                  )}
                  
                  {currentTab === 'context' && (
                    <ContextDocumentManager projectId={projectId} isOwned={project.isOwned} />
                  )}
                
                  {currentTab === 'api' && (
                    <ApiConfiguration projectId={projectId} />
                  )}
                
                  {currentTab === 'analysis' && (
                    <ProjectAnalysis projectId={projectId} isOwned={(project as any).isOwned ?? true} />
                  )}
                
                  {currentTab === 'progress' && (
                    <div className="p-6">
                      <ProgressDashboard projectId={projectId} />
                    </div>
                  )}
                
                  {currentTab === 'visualization' && (
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
                
                  {currentTab === 'social' && (
                    <div className="p-6">
                      <div className="space-y-6">
                        <div>
                          <h1 className="text-2xl font-bold">Social Media Posts</h1>
                          <p className="text-gray-600">
                            Generate engaging social media content for your project using AI-powered analysis.
                          </p>
                        </div>
                        
                        <SocialPostsGenerator projectId={projectId} isOwned={(project as any).isOwned ?? true} />
                      </div>
                    </div>
                  )}
                
                  {currentTab === 'prompts' && (
                    <div className="p-6">
                      <PromptsViewer projectId={projectId} />
                    </div>
                  )}
                
                  {currentTab === 'applications' && (
                    <div className="p-6">
                      <div className="space-y-6">
                        <div>
                          <h1 className="text-2xl font-bold">Project Applications</h1>
                          <p className="text-gray-600">
                            Review applications from people interested in contributing to your project requirements.
                          </p>
                        </div>
                        
                        <ProjectApplicationsView projectId={projectId} isOwned={project.isOwned} />
                      </div>
                    </div>
                  )}
                  
                  {currentTab === 'team' && (
                    <div className="p-6">
                      <ProjectTeamTab 
                        projectId={projectId} 
                        isOwned={(project as any).isOwned ?? true}
                      />
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