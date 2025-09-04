'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, UserCheck, Loader2, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TeamInvitation {
  id: string;
  teamId: string;
  teamName: string;
  teamDescription: string;
  email: string;
  role: string;
  invitedAt: string;
  invitedBy: string;
  invitedByName: string;
  expiresAt: string;
  status: string;
}

export function TeamInvitations() {
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTeamInvitations();
  }, []);

  const fetchTeamInvitations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/team-invitations');
      const data = await response.json();
      
      if (data.success) {
        setInvitations(data.invitations);
      } else {
        console.error('Failed to fetch team invitations:', data.error);
      }
    } catch (error) {
      console.error('Error fetching team invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const respondToInvitation = async (invitationId: string, action: 'accept' | 'decline') => {
    try {
      setResponding(invitationId);
      const response = await fetch(`/api/teams/invitations/${invitationId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: `Team invitation ${action}ed`,
          description: data.message,
        });

        // Remove the invitation from the list
        setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to respond to invitation',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error responding to team invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to respond to invitation',
        variant: 'destructive',
      });
    } finally {
      setResponding(invitationId);
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
      case 'owner': return <UserCheck className="w-4 h-4" />;
      case 'admin': return <UserCheck className="w-4 h-4" />;
      case 'editor': return <UserCheck className="w-4 h-4" />;
      case 'viewer': return <UserCheck className="w-4 h-4" />;
      default: return <UserCheck className="w-4 h-4" />;
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

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="ml-2">Loading team invitations...</span>
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <Card className="text-center py-8">
        <CardContent>
          <UserCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No pending team invitations</h3>
          <p className="text-muted-foreground">
            You don't have any pending team invitations at the moment.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Team Invitations</h3>
        <Badge variant="outline">{invitations.length} pending</Badge>
      </div>
      
      {invitations.map((invitation) => (
        <Card key={invitation.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{invitation.teamName}</CardTitle>
                {invitation.teamDescription && (
                  <CardDescription className="mt-1">
                    {invitation.teamDescription}
                  </CardDescription>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getRoleBadgeVariant(invitation.role)}>
                  {getRoleIcon(invitation.role)}
                  <span className="ml-1">{invitation.role}</span>
                </Badge>
                {isExpired(invitation.expiresAt) && (
                  <Badge variant="destructive">Expired</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  <span>Invited by {invitation.invitedByName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Invited {formatDate(invitation.invitedAt)}</span>
                </div>
              </div>

              {invitation.expiresAt && (
                <div className="text-sm text-muted-foreground">
                  Expires: {formatDate(invitation.expiresAt)}
                </div>
              )}

      

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => respondToInvitation(invitation.id, 'accept')}
                  disabled={responding === invitation.id || isExpired(invitation.expiresAt)}
                  className="flex-1"
                >
                  {responding === invitation.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span className="ml-2">Accept</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => respondToInvitation(invitation.id, 'decline')}
                  disabled={responding === invitation.id}
                  className="flex-1"
                >
                  {responding === invitation.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  <span className="ml-2">Decline</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
