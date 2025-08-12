'use client';

import Link from 'next/link';
import { ProgressData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  FileText, 
  Palette, 
  CheckSquare, 
  FolderOpen, 
  Settings,
  Brain,
  BarChart3,
  Network
} from 'lucide-react';

interface ProjectNavigationProps {
  projectId: string;
  activeTab: string;
  progress: ProgressData;
}

interface NavItem {
  id: string;
  name: string;
  href: string;
  icon: React.ReactNode;
  description: string;
}

export function ProjectNavigation({ projectId, activeTab, progress }: ProjectNavigationProps) {
  const navItems: NavItem[] = [
    {
      id: 'overview',
      name: 'Overview',
      href: `/project/${projectId}`,
      description: 'Project summary and quick actions',
      icon: <LayoutDashboard className="w-5 h-5" />
    },
    {
      id: 'requirements',
      name: 'Requirements',
      href: `/project/${projectId}/requirements`,
      description: 'Project requirements and user stories',
      icon: <FileText className="w-5 h-5" />
    },
    {
      id: 'design',
      name: 'Design',
      href: `/project/${projectId}/design`,
      description: 'System architecture and design',
      icon: <Palette className="w-5 h-5" />
    },
    {
      id: 'tasks',
      name: 'Tasks',
      href: `/project/${projectId}/tasks`,
      description: 'Implementation tasks and checklist',
      icon: <CheckSquare className="w-5 h-5" />
    },
    {
      id: 'context',
      name: 'Context',
      href: `/project/${projectId}/context`,
      description: 'Context documents and references',
      icon: <FolderOpen className="w-5 h-5" />
    },
    {
      id: 'api',
      name: 'API',
      href: `/project/${projectId}/api`,
      description: 'AI provider configuration and API settings',
      icon: <Settings className="w-5 h-5" />
    },
    {
      id: 'analysis',
      name: 'Analysis',
      href: `/project/${projectId}/analysis`,
      description: 'AI-powered project analysis and insights',
      icon: <Brain className="w-5 h-5" />
    },
    {
      id: 'progress',
      name: 'Progress',
      href: `/project/${projectId}/progress`,
      description: 'Progress tracking and analytics',
      icon: <BarChart3 className="w-5 h-5" />
    },
    {
      id: 'visualization',
      name: 'Visualization',
      href: `/project/${projectId}/visualization`,
      description: '3D vector space visualization of project documents',
      icon: <Network className="w-5 h-5" />
    }
  ];

  return (
    <Card className="rounded-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Navigation</CardTitle>
      </CardHeader>
      
      <CardContent className="p-3">
        <nav>
          <ul className="space-y-2">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={`group flex items-center px-4 py-3 text-sm font-medium rounded-none transition-all duration-200 ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <span className={`mr-3 flex-shrink-0 ${
                      isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                    }`}>
                      {item.icon}
                    </span>
                    <span className="truncate flex-1">{item.name}</span>
                    
                    {/* Show task count for tasks tab */}
                    {item.id === 'tasks' && (
                      <Badge variant={isActive ? "secondary" : "outline"} className="ml-auto">
                        {progress.completedTasks}/{progress.totalTasks}
                      </Badge>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </CardContent>
      
      {/* Progress Summary */}
      <CardContent className="pt-0 border-t bg-muted/30">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Overall Progress</span>
            <span className="font-bold">{progress.percentage}%</span>
          </div>
          <Progress value={progress.percentage} className="h-2" />
          <div className="text-xs text-muted-foreground text-center">
            {progress.completedTasks} of {progress.totalTasks} tasks completed
          </div>
        </div>
      </CardContent>
    </Card>
  );
}