'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Clock, ExternalLink, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

interface ProjectInvitation {
  id: string;
  projectId: string;
  projectName: string;
  projectDescription: string;
  sharedWithEmail: string;
  role: string;
  sharedAt: string;
  sharedBy: string;
  sharedByName: string;
  expiresAt: string;
}

export function ProjectInvitations() {
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/project-invitations');
      const data = await response.json();
      
      if (data.success) {
        setInvitations(data.invitations);
      } else {
        console.error('Failed to fetch invitations:', data.error);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const respondToInvitation = async (invitationId: string, action: 'accept' | 'decline') => {
    try {
      setResponding(invitationId);
      const response = await fetch(`/api/projects/invitations/${invitationId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: `Invitation ${action}ed`,
          description: data.message,
        });

        if (action === 'accept') {
          // Wait a moment for the database to update
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Retry fetching the project multiple times with exponential backoff
          const invitation = invitations.find(inv => inv.id === invitationId);
          if (invitation) {
            let projectFound = false;
            let attempts = 0;
            const maxAttempts = 5;
            const baseDelay = 1000;

            while (!projectFound && attempts < maxAttempts) {
              try {
                // Try to fetch the project to verify it's accessible
                const projectResponse = await fetch(`/api/projects/${invitation.projectId}`);
                
                if (projectResponse.ok) {
                  projectFound = true;
                  toast({
                    title: 'Project access confirmed!',
                    description: `You now have access to "${invitation.projectName}"`,
                  });
                  
                  // Navigate to the project after a short delay
                  setTimeout(() => {
                    router.push(`/project/${invitation.projectId}`);
                  }, 500);
                  
                  break;
                }
              } catch (error) {
                console.log(`Attempt ${attempts + 1} failed, retrying...`);
              }

              attempts++;
              if (attempts < maxAttempts) {
                const delay = baseDelay * Math.pow(2, attempts - 1) + Math.random() * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }

            if (!projectFound) {
              toast({
                title: 'Invitation accepted',
                description: 'The project may take a moment to appear. Please refresh your projects list.',
              });
            }
          }
        }

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
      console.error('Error responding to invitation:', error);
      toast({
        title: 'Error',
        description: 'Failed to respond to invitation',
        variant: 'destructive',
      });
    } finally {
      setResponding(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'editor':
        return 'bg-blue-100 text-blue-800';
      case 'viewer':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Invitations</CardTitle>
          <CardDescription>Loading your invitations...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Invitations</CardTitle>
          <CardDescription>You don't have any pending project invitations.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Invitations</CardTitle>
        <CardDescription>
          You have {invitations.length} pending project invitation{invitations.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {invitations.map((invitation) => (
          <div key={invitation.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg">{invitation.projectName}</h3>
                  <Badge className={getRoleColor(invitation.role)}>
                    {invitation.role}
                  </Badge>
                  {isExpired(invitation.expiresAt) && (
                    <Badge variant="destructive">Expired</Badge>
                  )}
                </div>
                
                {invitation.projectDescription && (
                  <p className="text-sm text-gray-600 mb-2">
                    {invitation.projectDescription}
                  </p>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>Shared by {invitation.sharedByName}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>Shared {formatDate(invitation.sharedAt)}</span>
                  </div>
                  {!isExpired(invitation.expiresAt) && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>Expires {formatDate(invitation.expiresAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex items-center gap-2">
              {!isExpired(invitation.expiresAt) ? (
                <>
                  <Button
                    onClick={() => respondToInvitation(invitation.id, 'accept')}
                    disabled={responding === invitation.id}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => respondToInvitation(invitation.id, 'decline')}
                    disabled={responding === invitation.id}
                    className="flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Decline
                  </Button>
                </>
              ) : (
                <div className="text-sm text-red-600 flex items-center gap-1">
                  <XCircle className="w-4 h-4" />
                  This invitation has expired
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
