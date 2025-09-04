'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
import { Plus, Loader2, FolderOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TeamRole, ProjectConfiguration } from '@/types/shared';

interface AddProjectToTeamDialogProps {
  teamId: string;
  teamName: string;
  onProjectAdded?: () => void;
}

const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  owner: 'Full control over project in team context',
  admin: 'Can manage project settings and team access',
  editor: 'Can edit project content and files',
  viewer: 'Can view project content only'
};

export function AddProjectToTeamDialog({ 
  teamId, 
  teamName, 
  onProjectAdded 
}: AddProjectToTeamDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectConfiguration[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<TeamRole>('viewer');
  const [fetchingProjects, setFetchingProjects] = useState(false);
  const { toast } = useToast();

  // Fetch user's owned projects
  const fetchOwnedProjects = async () => {
    try {
      setFetchingProjects(true);
      const response = await fetch('/api/user/owned-projects');
      const result = await response.json();
      
      if (result.success) {
        // Filter out projects that are already in this team
        const availableProjects = result.data.filter((project: ProjectConfiguration) => 
          !project.teamId || project.teamId !== teamId
        );
        setProjects(availableProjects);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to fetch projects",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error",
        description: "Failed to fetch projects",
        variant: "destructive"
      });
    } finally {
      setFetchingProjects(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchOwnedProjects();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProjectId) {
      toast({
        title: "Error",
        description: "Please select a project",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/teams/${teamId}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: selectedProjectId,
          projectRole: selectedRole
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Project added to team successfully",
        });
        setOpen(false);
        setSelectedProjectId('');
        setSelectedRole('viewer');
        onProjectAdded?.();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to add project to team",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error adding project to team:', error);
      toast({
        title: "Error",
        description: "Failed to add project to team",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedProject = projects.find(p => p.projectId === selectedProjectId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Project to {teamName}</DialogTitle>
          <DialogDescription>
            Select a project you own to add to this team. Team members will be able to view and work on the project based on their assigned role.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project">Select Project</Label>
            <Select
              value={selectedProjectId}
              onValueChange={setSelectedProjectId}
              disabled={fetchingProjects}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  fetchingProjects 
                    ? "Loading projects..." 
                    : projects.length === 0 
                      ? "No available projects" 
                      : "Choose a project"
                } />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.projectId} value={project.projectId}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedProject && (
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">{selectedProject.name}</h4>
                <div className="max-h-32 overflow-y-auto">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedProject.description}
                  </p>
                </div>
                <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                  <span>Created: {new Date(selectedProject.createdAt).toLocaleDateString()}</span>
                  <span>Template: {selectedProject.template}</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Project Role in Team</Label>
            <Select
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value as TeamRole)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_DESCRIPTIONS).map(([role, description]) => (
                  <SelectItem key={role} value={role}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{role}</Badge>
                      <span className="text-sm text-muted-foreground">{description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button
              type="submit"
              disabled={loading || !selectedProjectId || projects.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add to Team
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
