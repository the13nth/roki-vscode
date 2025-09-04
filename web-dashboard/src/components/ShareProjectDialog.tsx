'use client';

import React, { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Share2, Loader2, Mail, X, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TeamRole, ProjectSharing } from '@/types/shared';

interface ShareProjectDialogProps {
  projectId: string;
  projectName: string;
  onSharingChanged?: () => void;
}

const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  owner: 'Full control over project',
  admin: 'Can manage project settings and sharing',
  editor: 'Can edit project content and files',
  viewer: 'Can view project content only'
};

export function ShareProjectDialog({ 
  projectId, 
  projectName, 
  onSharingChanged 
}: ShareProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    role: 'viewer' as TeamRole
  });
  const [currentSharing, setCurrentSharing] = useState<ProjectSharing[]>([]);
  const [loadingSharing, setLoadingSharing] = useState(true);
  const { toast } = useToast();

  // Fetch current sharing when dialog opens
  useEffect(() => {
    if (open) {
      fetchCurrentSharing();
    }
  }, [open, projectId]);

  const fetchCurrentSharing = async () => {
    try {
      const response = await fetch(`/api/projects/share?projectId=${projectId}`);
      const result = await response.json();
      
      if (result.success) {
        setCurrentSharing(result.sharing || []);
      }
    } catch (error) {
      console.error('Error fetching current sharing:', error);
    } finally {
      setLoadingSharing(false);
    }
  };

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

    // Check if already shared
    if (currentSharing.some(share => share.sharedWithEmail === formData.email.trim().toLowerCase())) {
      toast({
        title: 'Already Shared',
        description: 'This project is already shared with this email address',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/projects/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          email: formData.email.trim().toLowerCase(),
          role: formData.role
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Success',
          description: `Project shared with ${formData.email}!`,
        });
        setFormData({ email: '', role: 'viewer' });
        fetchCurrentSharing(); // Refresh the list
        onSharingChanged?.();
      } else {
        throw new Error(result.error || 'Failed to share project');
      }
    } catch (error) {
      console.error('Error sharing project:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to share project',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSharing = async (sharingId: string) => {
    try {
      const response = await fetch(`/api/projects/share?sharingId=${sharingId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Access revoked successfully',
        });
        fetchCurrentSharing(); // Refresh the list
        onSharingChanged?.();
      } else {
        throw new Error(result.error || 'Failed to revoke access');
      }
    } catch (error) {
      console.error('Error revoking access:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to revoke access',
        variant: 'destructive'
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getRoleBadgeVariant = (role: TeamRole) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'editor': return 'default';
      case 'viewer': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Share2 className="w-4 h-4 mr-2" />
          Share Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share Project</DialogTitle>
          <DialogDescription>
            Share <strong>{projectName}</strong> with others by entering their email address.
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
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">
                    <div className="flex flex-col">
                      <span className="font-medium">Viewer</span>
                      <span className="text-sm text-muted-foreground">
                        {ROLE_DESCRIPTIONS.viewer}
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="editor">
                    <div className="flex flex-col">
                      <span className="font-medium">Editor</span>
                      <span className="text-sm text-muted-foreground">
                        {ROLE_DESCRIPTIONS.editor}
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex flex-col">
                      <span className="font-medium">Admin</span>
                      <span className="text-sm text-muted-foreground">
                        {ROLE_DESCRIPTIONS.admin}
                      </span>
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
                  Sharing...
                </>
              ) : (
                'Share Project'
              )}
            </Button>
          </DialogFooter>
        </form>

        {/* Current Sharing List */}
        <div className="mt-6 border-t pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4" />
            <Label className="text-sm font-medium">Currently Shared With</Label>
          </div>
          
          {loadingSharing ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : currentSharing.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No one has access to this project yet
            </div>
          ) : (
            <div className="space-y-2">
              {currentSharing.map((share) => (
                <div key={share.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{share.sharedWithEmail}</span>
                    <Badge variant={getRoleBadgeVariant(share.role)}>
                      {share.role}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevokeSharing(share.id)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
