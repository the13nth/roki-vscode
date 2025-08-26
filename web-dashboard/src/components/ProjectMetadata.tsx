'use client';

import { useState } from 'react';
import { ProjectDashboard } from '@/types';
import VSCodeConnectionStatus from './VSCodeConnectionStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Edit2, X, Check, Globe, Lock } from 'lucide-react';

interface ProjectMetadataProps {
  project: ProjectDashboard;
  onUpdate: (updatedProject: Partial<ProjectDashboard>) => void;
}

export function ProjectMetadata({ project, onUpdate }: ProjectMetadataProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: ''
  });
  const [isPublic, setIsPublic] = useState(false);
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);

  const handleEditStart = () => {
    // Initialize form with current project data
    // For now, we'll use projectId as name since we don't have the full config loaded
    setEditForm({
      name: project.projectId,
      description: 'Project description'
    });
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditForm({ name: '', description: '' });
  };

  const handleEditSave = async () => {
    try {
      const response = await fetch(`/api/projects/${project.projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description
        }),
      });

      if (response.ok) {
        const updatedProject = await response.json();
        onUpdate(updatedProject);
        setIsEditing(false);
      } else {
        console.error('Failed to update project');
      }
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  const handleToggleVisibility = async () => {
    try {
      setIsTogglingVisibility(true);
      const newVisibility = !isPublic;
      
      const response = await fetch(`/api/projects/${project.projectId}/visibility`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isPublic: newVisibility
        }),
      });

      if (response.ok) {
        setIsPublic(newVisibility);
        // Show success message
        console.log(`Project is now ${newVisibility ? 'public' : 'private'}`);
      } else {
        console.error('Failed to update project visibility');
      }
    } catch (error) {
      console.error('Failed to update project visibility:', error);
    } finally {
      setIsTogglingVisibility(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  };

  return (
    <Card className="rounded-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Project Info</CardTitle>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEditStart}
              className="h-8 w-8 p-0"
              title="Edit project info"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="edit-name" className="block text-sm font-medium mb-2">
                Project Name
              </label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div>
              <label htmlFor="edit-description" className="block text-sm font-medium mb-2">
                Description
              </label>
              <Textarea
                id="edit-description"
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            
            <div className="flex items-center justify-end space-x-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditCancel}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleEditSave}
              >
                <Check className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Name</dt>
                <dd className="text-sm font-medium">{project.name}</dd>
              </div>
              
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Status</dt>
                <dd className="mt-1">
                  <Badge variant={
                    project.progress.percentage === 100 
                      ? 'default'
                      : project.progress.percentage > 0 
                      ? 'secondary'
                      : 'outline'
                  }>
                    {project.progress.percentage === 100 
                      ? 'Completed' 
                      : project.progress.percentage > 0 
                      ? 'In Progress' 
                      : 'Not Started'
                    }
                  </Badge>
                </dd>
              </div>
            </div>
            
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Visibility</dt>
              <dd className="mt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleVisibility}
                  disabled={isTogglingVisibility}
                  className="flex items-center gap-2"
                >
                  {isTogglingVisibility ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  ) : isPublic ? (
                    <Globe className="h-4 w-4" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  {isPublic ? 'Public' : 'Private'}
                </Button>
              </dd>
            </div>
            
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Path</dt>
              <dd className="text-xs font-mono break-all bg-muted p-2 rounded-none">{project.projectPath}</dd>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Last Updated</dt>
                <dd className="text-sm">
                  {formatDate(project.progress.lastUpdated)}
                </dd>
              </div>
              
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Tasks</dt>
                <dd className="text-sm font-medium">
                  {project.progress.completedTasks} / {project.progress.totalTasks}
                </dd>
              </div>
            </div>
            
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Context Docs</dt>
              <dd className="text-sm font-medium">
                {project.contextDocs.length}
              </dd>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}