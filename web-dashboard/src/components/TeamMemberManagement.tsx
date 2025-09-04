'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle,
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  UserX, 
  UserCheck, 
  AlertTriangle, 
  Crown, 
  UserCheck as UserCheckIcon, 
  UserX as UserXIcon, 
  Users 
} from 'lucide-react';
import { TeamMember, TeamRole } from '@/types/shared';
import { useToast } from '@/hooks/use-toast';

interface TeamMemberManagementProps {
  teamId: string;
  members: TeamMember[];
  currentUserRole: TeamRole;
  onMemberUpdated: () => void;
}

export default function TeamMemberManagement({ 
  teamId, 
  members, 
  currentUserRole, 
  onMemberUpdated 
}: TeamMemberManagementProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';

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
      case 'admin': return <UserCheckIcon className="w-4 h-4" />;
      case 'editor': return <UserCheckIcon className="w-4 h-4" />;
      case 'viewer': return <UserXIcon className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge variant="default" className="text-xs">Active</Badge>;
      case 'inactive': return <Badge variant="secondary" className="text-xs">Suspended</Badge>;
      case 'pending': return <Badge variant="outline" className="text-xs">Pending</Badge>;
      default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const handleMemberAction = async (memberId: string, action: 'suspend' | 'activate' | 'remove') => {
    if (!canManageMembers) return;

    setIsLoading(memberId);
    
    try {
      const response = await fetch(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: result.message,
        });
        onMemberUpdated();
      } else {
        toast({
          title: "Error",
          description: result.error || 'Failed to update team member',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating team member:', error);
      toast({
        title: "Error",
        description: 'Failed to update team member',
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
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

  if (!canManageMembers) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Team Members</CardTitle>
          <CardDescription>
            You need admin or owner permissions to manage team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                <div className="flex items-center gap-2">
                  {getRoleIcon(member.role)}
                  <span className="text-sm font-medium">
                    {member.email || member.userId || 'Unknown User'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(member.status)}
                  <Badge variant={getRoleBadgeVariant(member.role)}>
                    {member.role}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="w-5 h-5" />
          Team Members Management
        </CardTitle>
        <CardDescription>
          Manage team member roles and access. You can suspend, activate, or remove members.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
              <div className="flex items-center gap-3">
                {getRoleIcon(member.role)}
                <div>
                  <span className="text-sm font-medium">
                    {member.email || member.userId || 'Unknown User'}
                  </span>
                  <div className="text-xs text-muted-foreground">
                    Joined {formatDate(member.joinedAt)}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {getStatusBadge(member.status)}
                <Badge variant={getRoleBadgeVariant(member.role)}>
                  {member.role}
                </Badge>
                
                {/* Only show management options for non-owners and non-self */}
                {member.role !== 'owner' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        disabled={isLoading === member.id}
                        className="h-8 w-8 p-0"
                      >
                        {isLoading === member.id ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <MoreHorizontal className="w-4 h-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {member.status === 'active' ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <UserX className="w-4 h-4 mr-2" />
                              Suspend Member
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Suspend Team Member</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to suspend {member.email || member.userId}? 
                                They will lose access to all team projects until reactivated.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleMemberAction(member.id, 'suspend')}
                                className="bg-yellow-600 hover:bg-yellow-700"
                              >
                                Suspend Member
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <DropdownMenuItem 
                          onClick={() => handleMemberAction(member.id, 'activate')}
                        >
                          <UserCheck className="w-4 h-4 mr-2" />
                          Activate Member
                        </DropdownMenuItem>
                      )}
                      
                      <DropdownMenuSeparator />
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <UserX className="w-4 h-4 mr-2 text-red-600" />
                            Remove Member
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove {member.email || member.userId} from the team? 
                              This action cannot be undone and they will lose access to all team projects.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleMemberAction(member.id, 'remove')}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Remove Member
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <Separator className="my-4" />
        
        <div className="text-sm text-muted-foreground">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">Management Notes:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 ml-6">
            <li>Team owners cannot be modified or removed</li>
            <li>Suspended members lose access to team projects</li>
            <li>Removed members are permanently deleted from the team</li>
            <li>Only admins and owners can manage team members</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
