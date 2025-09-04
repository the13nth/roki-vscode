'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CreateTeamDialog } from '@/components/CreateTeamDialog';
import { InviteTeamMemberDialog } from '@/components/InviteTeamMemberDialog';
import { AddProjectToTeamDialog } from '@/components/AddProjectToTeamDialog';
import { Users, Calendar, Crown, UserCheck, UserX, Loader2, FolderOpen } from 'lucide-react';
import { Team, TeamMember, ProjectConfiguration, TeamProjectWithDetails } from '@/types/shared';

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<Record<string, TeamMember[]>>({});
  const [teamProjects, setTeamProjects] = useState<Record<string, TeamProjectWithDetails[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  useEffect(() => {
    fetchTeams();
  }, []);

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

  const fetchTeamMembers = async (teamId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members`);
      const result = await response.json();
      
      if (result.success) {
        setTeamMembers(prev => ({
          ...prev,
          [teamId]: result.members || []
        }));
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
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
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
          <p className="text-muted-foreground">
            Manage your teams and collaborate with others
          </p>
        </div>
        <CreateTeamDialog onTeamCreated={fetchTeams} />
      </div>

      {teams.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first team to start collaborating with others
            </p>
            <CreateTeamDialog onTeamCreated={fetchTeams} />
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
                      {teamMembers[team.id]?.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                          <div className="flex items-center gap-2">
                            {getRoleIcon(member.role)}
                            <span className="text-sm font-medium">{member.email || 'No email'}</span>
                          </div>
                          <Badge variant={getRoleBadgeVariant(member.role)}>
                            {member.role}
                          </Badge>
                        </div>
                      )) || (
                        <div className="text-center py-2 text-sm text-muted-foreground">
                          Loading members...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <InviteTeamMemberDialog
                      teamId={team.id}
                      teamName={team.name}
                      onInvitationSent={() => fetchTeamMembers(team.id)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTeam(team)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Team Details Modal */}
      {selectedTeam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">{selectedTeam.name}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTeam(null)}
                >
                  ✕
                </Button>
              </div>
              
              {selectedTeam.description && (
                <p className="text-muted-foreground mb-6">{selectedTeam.description}</p>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Team Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Created:</span>
                      <p>{formatDate(selectedTeam.createdAt)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Last Updated:</span>
                      <p>{formatDate(selectedTeam.updatedAt)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={selectedTeam.isActive ? 'default' : 'secondary'}>
                        {selectedTeam.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Team Members</h3>
                  <div className="space-y-2">
                    {teamMembers[selectedTeam.id]?.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          {getRoleIcon(member.role)}
                          <div>
                            <p className="font-medium">{member.email || 'No email'}</p>
                            <p className="text-sm text-muted-foreground">
                              Joined {formatDate(member.joinedAt)}
                            </p>
                          </div>
                        </div>
                        <Badge variant={getRoleBadgeVariant(member.role)}>
                          {member.role}
                        </Badge>
                      </div>
                    )) || (
                      <div className="text-center py-4 text-muted-foreground">
                        Loading members...
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Team Projects</h3>
                    <AddProjectToTeamDialog
                      teamId={selectedTeam.id}
                      teamName={selectedTeam.name}
                      onProjectAdded={() => fetchTeamProjects(selectedTeam.id)}
                    />
                  </div>
                  <div className="space-y-2">
                    {teamProjects[selectedTeam.id]?.map((project) => (
                      <div key={project.projectId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <FolderOpen className="w-4 h-4" />
                          <div>
                            <p className="font-medium">{project.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {project.description || 'No description'}
                            </p>
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
                      <div className="text-center py-4 text-muted-foreground">
                        No projects added to this team yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
