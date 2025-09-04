'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  FolderOpen, 
  Users, 
  Crown, 
  UserCheck, 
  UserX, 
  Building2, 
  ExternalLink,
  Loader2,
  Calendar
} from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { ProjectConfiguration, TeamMember } from '@/types/shared';

interface ProjectAccess {
  projectId: string;
  projectName: string;
  accessType: 'owned' | 'shared' | 'team';
  role: string;
  teamName?: string;
  teamRole?: string;
  sharedAt?: Date;
  lastAccessed?: Date;
}

export default function ProjectAccessDisplay() {
  const { user } = useUser();
  const [projectAccess, setProjectAccess] = useState<ProjectAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'owned' | 'shared' | 'team'>('all');

  useEffect(() => {
    if (user) {
      fetchProjectAccess();
    }
  }, [user]);

  const fetchProjectAccess = async () => {
    try {
      setLoading(true);
      
      // Fetch owned projects
      const ownedResponse = await fetch('/api/user/owned-projects');
      const ownedResult = await ownedResponse.json();
      
      // Fetch shared projects
      const sharedResponse = await fetch('/api/user/projects');
      const sharedResult = await sharedResponse.json();
      
      // Fetch team memberships
      const teamsResponse = await fetch('/api/teams');
      const teamsResult = await teamsResponse.json();
      
      const accessList: ProjectAccess[] = [];
      
      // Add owned projects
      if (ownedResult.success && ownedResult.projects) {
        ownedResult.projects.forEach((project: any) => {
          accessList.push({
            projectId: project.id,
            projectName: project.name,
            accessType: 'owned',
            role: 'Owner',
            lastAccessed: project.lastModified ? new Date(project.lastModified) : undefined
          });
        });
      }
      
      // Add shared projects
      if (sharedResult.success && sharedResult.projects) {
        sharedResult.projects.forEach((project: any) => {
          if (project.isShared && !project.isOwned) {
            accessList.push({
              projectId: project.id,
              projectName: project.name,
              accessType: 'shared',
              role: project.sharedRole || 'Viewer',
              sharedAt: project.sharedAt ? new Date(project.sharedAt) : undefined,
              lastAccessed: project.lastModified ? new Date(project.lastModified) : undefined
            });
          }
        });
      }
      
      // Add team projects
      if (teamsResult.success && teamsResult.teams) {
        for (const team of teamsResult.teams) {
          const teamProjectsResponse = await fetch(`/api/teams/${team.id}/projects`);
          const teamProjectsResult = await teamProjectsResponse.json();
          
          if (teamProjectsResult.success && teamProjectsResult.data) {
            teamProjectsResult.data.forEach((teamProject: any) => {
              accessList.push({
                projectId: teamProject.projectId,
                projectName: teamProject.name,
                accessType: 'team',
                role: teamProject.teamRole || 'Viewer',
                teamName: team.name,
                teamRole: teamProject.teamRole || 'Viewer',
                lastAccessed: teamProject.addedAt ? new Date(teamProject.addedAt) : undefined
              });
            });
          }
        }
      }
      
      setProjectAccess(accessList);
    } catch (error) {
      console.error('Error fetching project access:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAccessTypeIcon = (accessType: string) => {
    switch (accessType) {
      case 'owned': return <Crown className="w-4 h-4" />;
      case 'shared': return <Users className="w-4 h-4" />;
      case 'team': return <Building2 className="w-4 h-4" />;
      default: return <FolderOpen className="w-4 h-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner': return 'default';
      case 'admin': return 'destructive';
      case 'editor': return 'secondary';
      case 'viewer': return 'outline';
      default: return 'outline';
    }
  };

  const getAccessTypeBadge = (accessType: string) => {
    switch (accessType) {
      case 'owned': return <Badge variant="default">Owned</Badge>;
      case 'shared': return <Badge variant="secondary">Shared</Badge>;
      case 'team': return <Badge variant="outline">Team</Badge>;
      default: return <Badge variant="outline">{accessType}</Badge>;
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'Never';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredAccess = projectAccess.filter(access => {
    if (activeTab === 'all') return true;
    return access.accessType === activeTab;
  });

  const navigateToProject = (projectId: string) => {
    window.open(`/project/${projectId}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading project access...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Project Access</h2>
          <p className="text-muted-foreground">
            Overview of all projects you have access to
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('all')}
          >
            All ({projectAccess.length})
          </Button>
          <Button
            variant={activeTab === 'owned' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('owned')}
          >
            Owned ({projectAccess.filter(p => p.accessType === 'owned').length})
          </Button>
          <Button
            variant={activeTab === 'shared' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('shared')}
          >
            Shared ({projectAccess.filter(p => p.accessType === 'shared').length})
          </Button>
          <Button
            variant={activeTab === 'team' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('team')}
          >
            Team ({projectAccess.filter(p => p.accessType === 'team').length})
          </Button>
        </div>
      </div>

      {filteredAccess.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects found</h3>
            <p className="text-muted-foreground">
              {activeTab === 'all' 
                ? 'You don\'t have access to any projects yet.'
                : `You don't have any ${activeTab} projects.`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredAccess.map((access) => (
            <Card key={access.projectId} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {getAccessTypeIcon(access.accessType)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{access.projectName}</h4>
                        {getAccessTypeBadge(access.accessType)}
                        <Badge variant={getRoleBadgeVariant(access.role)}>
                          {access.role}
                        </Badge>
                        {access.teamName && (
                          <Badge variant="outline" className="text-xs">
                            Team: {access.teamName}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {access.lastAccessed && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Last accessed: {formatDate(access.lastAccessed)}</span>
                          </div>
                        )}
                        {access.sharedAt && (
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>Shared: {formatDate(access.sharedAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateToProject(access.projectId)}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <Separator />
      
      <div className="text-sm text-muted-foreground">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4" />
          <span className="font-medium">Access Types:</span>
        </div>
        <ul className="list-disc list-inside space-y-1 ml-6">
          <li><strong>Owned:</strong> Projects you created and have full control over</li>
          <li><strong>Shared:</strong> Projects shared with you by other users</li>
          <li><strong>Team:</strong> Projects you have access to through team membership</li>
        </ul>
      </div>
    </div>
  );
}
