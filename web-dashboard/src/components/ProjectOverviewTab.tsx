'use client';

import Link from 'next/link';
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
  File 
} from 'lucide-react';

interface ProjectOverviewTabProps {
  project: ProjectDashboard;
  onUpdate: (updatedProject: Partial<ProjectDashboard>) => void;
}

export function ProjectOverviewTab({ project }: ProjectOverviewTabProps) {
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

      {/* Progress Summary */}
      <Card className="mb-8 rounded-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Progress Summary</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/project/${project.projectId}/progress`}>
                View Details <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <Badge variant="outline" className="text-sm">
                {project.progress.percentage}% Complete
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">Overall Progress</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold">
                {project.progress.completedTasks}
              </div>
              <p className="text-xs text-muted-foreground">Tasks Completed</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold">
                {project.progress.totalTasks - project.progress.completedTasks}
              </div>
              <p className="text-xs text-muted-foreground">Tasks Remaining</p>
            </div>
          </div>
          
          <Progress value={project.progress.percentage} />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action) => (
            <Card key={action.name} className="hover:shadow-lg transition-all duration-200 hover:scale-105 rounded-none">
              <Link href={action.href}>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="flex-shrink-0 text-primary p-3 bg-primary/10 rounded-none">
                      {action.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium mb-2">{action.name}</h3>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                    <div className="mt-2">
                      <ArrowRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Link>
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