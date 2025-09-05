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
  Network,
  Share2,
  Code2,
  Users
} from 'lucide-react';

interface ProjectNavigationProps {
  projectId: string;
  activeTab?: string;
  progress: ProgressData;
  onNavigate?: (tab: string) => void;
  isOwned?: boolean;
  isCollapsed?: boolean;
}

export function ProjectNavigation({ projectId, activeTab, progress, onNavigate, isOwned = true, isCollapsed = false }: ProjectNavigationProps) {
  const allNavItems = [
    {
      id: 'overview',
      name: 'Overview',
      description: 'Project overview and quick actions',
      icon: <LayoutDashboard className="w-5 h-4" />
    },
    {
      id: 'requirements',
      name: 'Requirements',
      description: 'Define project requirements and user stories',
      icon: <FileText className="w-5 h-4" />
    },
    {
      id: 'design',
      name: 'Design',
      description: 'System architecture and design documentation',
      icon: <Palette className="w-5 h-4" />
    },
    {
      id: 'tasks',
      name: 'Tasks',
      description: 'Implementation tasks and checklist',
      icon: <CheckSquare className="w-5 h-4" />
    },
    {
      id: 'context',
      name: 'Context',
      description: 'Manage project context documents',
      icon: <FolderOpen className="w-5 h-4" />
    },
    // {
    //   id: 'api',
    //   name: 'API Config',
    //   description: 'Configure API endpoints and settings',
    //   icon: <Settings className="w-5 h-4" />
    // },
    {
      id: 'analysis',
      name: 'Analysis',
      description: 'AI-powered project analysis and insights',
      icon: <Brain className="w-5 h-4" />
    },
    {
      id: 'progress',
      name: 'Progress',
      description: 'Track project progress and milestones',
      icon: <BarChart3 className="w-5 h-4" />
    },
    {
      id: 'visualization',
      name: 'Visualization',
      description: '3D document visualization and insights',
      icon: <Network className="w-5 h-4" />
    },
    {
      id: 'social',
      name: 'Social Posts',
      description: 'Generate social media content',
      icon: <Share2 className="w-5 h-4" />
    },
    {
      id: 'prompts',
      name: 'Prompts',
      description: 'View and manage AI prompts',
      icon: <Code2 className="w-5 h-4" />
    },
    {
      id: 'applications',
      name: 'Applications',
      description: 'View applications for project requirements',
      icon: <Users className="w-5 h-4" />
    },
    {
      id: 'team',
      name: 'Team',
      description: 'Manage team members and collaboration',
      icon: <Users className="w-5 h-4" />
    }
  ];

  // Filter navigation items based on ownership
  const navItems = allNavItems.filter(item => {
    // Always show overview
    if (item.id === 'overview') return true;
    
    // For non-owners, show read-only tabs plus analysis, social, and team
    if (!isOwned) {
      return ['requirements', 'design', 'tasks', 'context', 'visualization', 'analysis', 'social', 'team'].includes(item.id);
    }
    
    // For owners, show all tabs except applications if they don't own the project
    if (item.id === 'applications' && !isOwned) {
      return false;
    }
    
    // For owners, show all tabs
    return true;
  });

  return (
    <Card className="rounded-none">
      {!isCollapsed && (
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Navigation</CardTitle>
        </CardHeader>
      )}
      
      <CardContent className={isCollapsed ? "p-2" : "p-3"}>
        <nav>
          <ul className="space-y-2">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onNavigate?.(item.id)}
                    title={isCollapsed ? item.name : undefined}
                    className={`group flex items-center w-full ${isCollapsed ? 'px-2 py-3 justify-center' : 'px-4 py-3'} text-sm font-medium rounded-none transition-all duration-200 ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <span className={`${isCollapsed ? '' : 'mr-3'} flex-shrink-0 ${
                      isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                    }`}>
                      {item.icon}
                    </span>
                    {!isCollapsed && (
                      <>
                        <span className="truncate flex-1 text-left">{item.name}</span>
                        
                        {/* Show task count for tasks tab */}
                        {item.id === 'tasks' && (
                          <Badge variant={isActive ? "secondary" : "outline"} className="ml-auto">
                            {progress.completedTasks}/{progress.totalTasks}
                          </Badge>
                        )}
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </CardContent>
      
      {/* Progress Summary - only show when not collapsed */}
      {!isCollapsed && (
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
      )}
    </Card>
  );
}