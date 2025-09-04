'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus, Loader2, Mail, Crown, Shield, Edit, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TeamRole } from '@/types/shared';

interface InviteTeamMemberDialogProps {
  teamId: string;
  teamName: string;
  onInvitationSent?: () => void;
}

const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  owner: 'Full control over team and projects',
  admin: 'Can manage team members and projects',
  editor: 'Can edit project content and files',
  viewer: 'Can view projects and content only'
};

export function InviteTeamMemberDialog({ 
  teamId, 
  teamName, 
  onInvitationSent 
}: InviteTeamMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    role: 'viewer' as TeamRole
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email.trim()) {
      toast({
        title: 'Error',
        description: 'Email is required',
        variant: 'destructive'
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: 'Error',
        description: 'Please enter a valid email address',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/teams/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId,
          email: formData.email.trim().toLowerCase(),
          role: formData.role
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Success',
          description: `Invitation sent to ${formData.email}!`,
        });
        setFormData({ email: '', role: 'viewer' });
        setOpen(false);
        onInvitationSent?.();
      } else {
        throw new Error(result.error || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send invitation',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Invite someone to join <strong>{teamName}</strong> by entering their email address.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="colleague@company.com"
                  disabled={loading}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: TeamRole) => handleInputChange('role', value)}
                disabled={loading}
              >
                <SelectTrigger className="h-auto py-3">
                  <SelectValue>
                    <div className="flex items-center gap-3">
                      {formData.role === 'owner' && (
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700">
                          <Crown className="w-3 h-3" />
                        </div>
                      )}
                      {formData.role === 'admin' && (
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700">
                          <Shield className="w-3 h-3" />
                        </div>
                      )}
                      {formData.role === 'editor' && (
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700">
                          <Edit className="w-3 h-3" />
                        </div>
                      )}
                      {formData.role === 'viewer' && (
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-700">
                          <Eye className="w-3 h-3" />
                        </div>
                      )}
                      <div className="flex flex-col items-start">
                        <span className="font-medium capitalize">{formData.role}</span>
                        <span className="text-xs text-muted-foreground">
                          {ROLE_DESCRIPTIONS[formData.role]}
                        </span>
                      </div>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">
                    <div className="flex items-center gap-3 py-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700">
                        <Crown className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-amber-700">Owner</span>
                        <span className="text-sm text-muted-foreground">
                          {ROLE_DESCRIPTIONS.owner}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-3 py-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-blue-700">Admin</span>
                        <span className="text-sm text-muted-foreground">
                          {ROLE_DESCRIPTIONS.admin}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="editor">
                    <div className="flex items-center gap-3 py-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700">
                        <Edit className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-green-700">Editor</span>
                        <span className="text-sm text-muted-foreground">
                          {ROLE_DESCRIPTIONS.editor}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-3 py-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700">
                        <Eye className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-700">Viewer</span>
                        <span className="text-sm text-muted-foreground">
                          {ROLE_DESCRIPTIONS.viewer}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Invitation'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
