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
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<Record<string, TeamMember[]>>({});
  const [teamProjects, setTeamProjects] = useState<Record<string, TeamProjectWithDetails[]>>({});
  const [loading, setLoading] = useState(true);
  const [projectTeam, setProjectTeam] = useState<Team | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<TeamRole>('viewer');
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTeams();
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
        fetchTeams();
        fetchProjectTeam();
        toast({
          title: `${result.teamsCreated} new team${result.teamsCreated > 1 ? 's' : ''} created from shared projects.`,
          description: `Synced ${result.teamsCreated} shared projects.`,
        });
      } else {
        toast({
          title: 'No new teams created from shared projects.',
          description: 'No shared projects found to create new teams from.',
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

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams');
      const result = await response.json();
      
      if (result.success) {
        setTeams(result.teams || []);
        // Fetch members and projects for each team
        result.teams?.forEach((team: Team) => {
          fetchTeamMembers(team.id);
          fetchTeamProjects(team.id);
        });
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectTeam = async () => {
    try {
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
        <span className="ml-2">Loading teams...</span>
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
                Project Team: {projectTeam.name}
              </h2>
              <p className="text-muted-foreground">
                This project is part of the "{projectTeam.name}" team
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
                  <CardTitle className="text-xl">{projectTeam.name}</CardTitle>
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

      {/* All Teams Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">All Teams</h2>
            <p className="text-muted-foreground">
              Manage your teams and collaborate with others
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={autoCreateTeamsFromSharedProjects}
              disabled={loading || syncing}
            >
              {syncing ? 'Syncing...' : 'Sync Shared Projects'}
            </Button>
            {isOwned && <CreateTeamDialog onTeamCreated={fetchTeams} />}
          </div>
        </div>

        {teams.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first team to start collaborating with others
              </p>
              {isOwned && <CreateTeamDialog onTeamCreated={fetchTeams} />}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <Card key={team.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{team.name}</CardTitle>
                      {team.description && (
                        <CardDescription className="mt-2">
                          {team.description}
                        </CardDescription>
                      )}
                    </div>
                    <Badge variant={team.isActive ? 'default' : 'secondary'}>
                      {team.isActive ? 'Active' : 'Inactive'}
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
                          {teamMembers[team.id]?.length || 0} member{teamMembers[team.id]?.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Created {formatDate(team.createdAt)}</span>
                      </div>
                    </div>

                    <Separator />

                    {/* Team Members */}
                    <div>
                      <h4 className="font-medium mb-2">Members</h4>
                      <div className="space-y-2">
                        {teamMembers[team.id]?.length > 0 ? (
                          <>
                            {teamMembers[team.id].slice(0, 3).map((member) => (
                              <div key={member.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                                <div className="flex items-center gap-2">
                                  {getRoleIcon(member.role)}
                                  <span className="text-sm font-medium">
                                    {member.email || member.userId || 'Unknown User'}
                                  </span>
                                </div>
                                <Badge variant={getRoleBadgeVariant(member.role)}>
                                  {member.role}
                                </Badge>
                              </div>
                            ))}
                            {teamMembers[team.id].length > 3 && (
                              <div className="text-center py-2 text-sm text-muted-foreground">
                                +{teamMembers[team.id].length - 3} more members
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-center py-2 text-sm text-muted-foreground">
                            {teamMembers[team.id] === undefined ? 'Loading members...' : 'No members found'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {isOwned && (
                        <InviteTeamMemberDialog
                          teamId={team.id}
                          teamName={team.name}
                          onInvitationSent={() => fetchTeamMembers(team.id)}
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Team Details Modal */}
      {/* This section is no longer needed as the View Details button is removed */}
    </div>
  );
}
