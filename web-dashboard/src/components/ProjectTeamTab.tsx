'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CreateTeamDialog } from './CreateTeamDialog';
import { InviteTeamMemberDialog } from './InviteTeamMemberDialog';
import { AddProjectToTeamDialog } from './AddProjectToTeamDialog';
import TeamMemberManagement  from './TeamMemberManagement';
import { Users, Calendar, Crown, UserCheck, UserX, Loader2, FolderOpen, Building2 } from 'lucide-react';
import { Team, TeamMember, ProjectConfiguration, TeamProjectWithDetails, TeamRole } from '@/types/shared';
import { useToast } from '@/hooks/use-toast';

interface ProjectTeamTabProps {
  projectId: string;
  isOwned?: boolean;
  isPublic?: boolean;
}

export default function ProjectTeamTab({ projectId, isOwned = true, isPublic = false }: ProjectTeamTabProps) {
  const [teamMembers, setTeamMembers] = useState<Record<string, TeamMember[]>>({});
  const [teamProjects, setTeamProjects] = useState<Record<string, TeamProjectWithDetails[]>>({});
  const [loading, setLoading] = useState(true);
  const [projectTeam, setProjectTeam] = useState<Team | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<TeamRole>('viewer');
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProjectTeam();
    autoCreateTeamsFromSharedProjects();
  }, [projectId]);

  const autoCreateTeamsFromSharedProjects = async () => {
    try {
      setSyncing(true);
      const response = await fetch('/api/teams/auto-create-from-shared', {
        method: 'POST'
      });
      const result = await response.json();
      
      if (result.success && result.teamsCreated > 0) {
        // Refresh teams after creating new ones
        fetchProjectTeam();
        toast({
          title: `${result.teamsCreated} new team${result.teamsCreated > 1 ? 's' : ''} created from shared projects.`,
          description: `Processed ${result.totalProjectsProcessed || 0} shared projects.`,
        });
      } else {
        toast({
          title: 'No new teams created from shared projects.',
          description: `Processed ${result.totalProjectsProcessed || 0} shared projects. No new teams needed.`,
        });
      }
    } catch (error) {
      console.error('Error auto-creating teams from shared projects:', error);
      toast({
        title: 'Error syncing shared projects.',
        description: 'Failed to create new teams from shared projects.',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const fetchProjectTeam = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/teams/project-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.team) {
          setProjectTeam(result.team);
          fetchTeamMembers(result.team.id);
          fetchTeamProjects(result.team.id);
          
          // Get current user's role in this team
          if (result.team.id) {
            fetchCurrentUserRole(result.team.id);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching project team:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUserRole = async (teamId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members`);
      const result = await response.json();
      
      if (result.success && result.members) {
        // Find current user in team members
        const currentUser = result.members.find((member: TeamMember) => 
          member.userId === 'current' || member.email === 'current@user.com' // This will need to be updated with actual user ID
        );
        
        if (currentUser) {
          setCurrentUserRole(currentUser.role);
        }
      }
    } catch (error) {
      console.error('Error fetching current user role:', error);
    }
  };

  const fetchTeamMembers = async (teamId: string) => {
    try {
      console.log(`🔍 Fetching team members for team: ${teamId}`);
      const response = await fetch(`/api/teams/${teamId}/members`);
      const result = await response.json();
      
      console.log(`📊 Team members response for ${teamId}:`, result);
      
      if (result.success) {
        setTeamMembers(prev => ({
          ...prev,
          [teamId]: result.members || []
        }));
        console.log(`✅ Set team members for ${teamId}:`, result.members);
      } else {
        console.error(`❌ Failed to fetch team members for ${teamId}:`, result.error);
      }
    } catch (error) {
      console.error(`❌ Error fetching team members for ${teamId}:`, error);
    }
  };

  const fetchTeamProjects = async (teamId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/projects`);
      const result = await response.json();
      
      if (result.success) {
        setTeamProjects(prev => ({
          ...prev,
          [teamId]: result.data || []
        }));
      }
    } catch (error) {
      console.error('Error fetching team projects:', error);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'default';
      case 'admin': return 'destructive';
      case 'editor': return 'secondary';
      case 'viewer': return 'outline';
      default: return 'outline';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4" />;
      case 'admin': return <UserCheck className="w-4 h-4" />;
      case 'editor': return <UserCheck className="w-4 h-4" />;
      case 'viewer': return <UserX className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading project team...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Project Team Section */}
      {projectTeam && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Building2 className="w-6 h-6" />
                Project Team
              </h2>
              <p className="text-muted-foreground">
                Team members and collaboration for the "{projectTeam.name}" project
              </p>
            </div>
            {isOwned && (
              <div className="flex gap-2">
                <InviteTeamMemberDialog
                  teamId={projectTeam.id}
                  teamName={projectTeam.name}
                  onInvitationSent={() => fetchTeamMembers(projectTeam.id)}
                />
                <AddProjectToTeamDialog
                  teamId={projectTeam.id}
                  teamName={projectTeam.name}
                  onProjectAdded={() => fetchTeamProjects(projectTeam.id)}
                />
              </div>
            )}
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl">{projectTeam.name} Team</CardTitle>
                  {projectTeam.description && (
                    <CardDescription className="mt-2">
                      {projectTeam.description}
                    </CardDescription>
                  )}
                </div>
                <Badge variant={projectTeam.isActive ? 'default' : 'secondary'}>
                  {projectTeam.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Team Stats */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>
                      {teamMembers[projectTeam.id]?.length || 0} member{teamMembers[projectTeam.id]?.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Created {formatDate(projectTeam.createdAt)}</span>
                  </div>
                </div>

                <Separator />

                {/* Team Members Management */}
                <TeamMemberManagement
                  teamId={projectTeam.id}
                  members={teamMembers[projectTeam.id] || []}
                  currentUserRole={currentUserRole}
                  onMemberUpdated={() => {
                    fetchTeamMembers(projectTeam.id);
                    fetchCurrentUserRole(projectTeam.id);
                  }}
                />

                {/* Team Projects */}
                <div>
                  <h4 className="font-medium mb-2">Team Projects</h4>
                  <div className="space-y-2">
                    {teamProjects[projectTeam.id]?.map((project) => (
                      <div key={project.projectId} className="flex items-center justify-between p-2 bg-muted rounded-md">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4" />
                          <div>
                            <p className="text-sm font-medium">{project.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Added {formatDate(project.addedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{project.template}</Badge>
                          {project.teamRole && (
                            <Badge variant={getRoleBadgeVariant(project.teamRole)}>
                              {project.teamRole}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-2 text-sm text-muted-foreground">
                        No projects added to this team yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Show message if no project team found */}
      {!projectTeam && !loading && (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No team found for this project</h3>
            <p className="text-muted-foreground mb-4">
              This project is not currently part of a team. You can create a team or add this project to an existing team.
            </p>
            <div className="flex gap-2 justify-center">
              <CreateTeamDialog onTeamCreated={() => {
                // After creating a team, try to find the project team again
                // and potentially add this project to the newly created team
                fetchProjectTeam();
              }} />
              <Button
                variant="outline"
                onClick={autoCreateTeamsFromSharedProjects}
                disabled={syncing}
              >
                {syncing ? 'Syncing...' : 'Sync Shared Projects'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
