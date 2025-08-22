'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UnifiedNavigation } from './UnifiedNavigation';
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
  Code2
} from 'lucide-react';

export function NavigationHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [projectName, setProjectName] = useState<string>('');
  
  // Don't show navigation on the homepage (UnifiedNavigation handles this)
  if (pathname === '/') {
    return null;
  }

  // Check if we're on a project page
  const projectMatch = pathname.match(/^\/project\/([^\/]+)/);
  const isProjectPage = !!projectMatch;
  const projectId = projectMatch ? projectMatch[1] : undefined;
  
  // Fetch project name when on a project page
  useEffect(() => {
    if (isProjectPage && projectId) {
      fetch(`/api/projects/${projectId}`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to fetch project');
          }
          return response.json();
        })
        .then(data => {
          if (data.name) {
            setProjectName(data.name);
          } else {
            // Fallback: show first 4 characters of project ID
            setProjectName(projectId.substring(0, 4));
          }
        })
        .catch(error => {
          console.error('Failed to fetch project name:', error);
          // Fallback: show first 4 characters of project ID
          setProjectName(projectId.substring(0, 4));
        });
    }
  }, [isProjectPage, projectId]);

  // Create simplified mobile project navigation
  const createMobileProjectNavigation = () => {
    if (!isProjectPage || !projectId) return null;

    const navItems = [
      { id: 'overview', name: 'Overview', href: `/project/${projectId}`, icon: LayoutDashboard },
      { id: 'requirements', name: 'Requirements', href: `/project/${projectId}/requirements`, icon: FileText },
      { id: 'design', name: 'Design', href: `/project/${projectId}/design`, icon: Palette },
      { id: 'tasks', name: 'Tasks', href: `/project/${projectId}/tasks`, icon: CheckSquare },
      { id: 'context', name: 'Context', href: `/project/${projectId}/context`, icon: FolderOpen },
      { id: 'api', name: 'API', href: `/project/${projectId}/api`, icon: Settings },
      { id: 'analysis', name: 'Analysis', href: `/project/${projectId}/analysis`, icon: Brain },
      { id: 'progress', name: 'Progress', href: `/project/${projectId}/progress`, icon: BarChart3 },
      { id: 'visualization', name: 'Visualization', href: `/project/${projectId}/visualization`, icon: Network },
      { id: 'social', name: 'Social Posts', href: `/project/${projectId}/social`, icon: Share2 },
      { id: 'prompts', name: 'Prompts', href: `/project/${projectId}/prompts`, icon: Code2 }
    ];

    // Determine active tab from pathname
    const getActiveTab = () => {
      if (pathname === `/project/${projectId}`) return 'overview';
      const parts = pathname.split('/');
      return parts[parts.length - 1];
    };

    const activeTab = getActiveTab();

    return (
      <div className="space-y-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          
          return (
            <Link key={item.id} href={item.href}>
              <Button 
                variant={isActive ? "default" : "ghost"} 
                size="sm" 
                className="w-full justify-start text-sm"
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.name}
              </Button>
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <UnifiedNavigation 
      variant={isProjectPage ? 'project' : 'global'}
      projectId={projectId}
      projectName={projectName}
      onRefresh={isProjectPage ? () => router.refresh() : undefined}
      projectNavigation={createMobileProjectNavigation()}
    />
  );
}
