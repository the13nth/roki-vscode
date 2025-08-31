'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Mail, 
  MessageSquare, 
  Send,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface RequirementApplicationModalProps {
  projectId: string;
  projectName: string;
  requirementType: 'funding needed' | 'cofounder needed' | 'dev needed' | 'business manager needed';
  children: React.ReactNode;
}

interface ApplicationForm {
  name: string;
  email: string;
  message: string;
  experience: string;
  availability: string;
  contribution: string;
}

export default function RequirementApplicationModal({ 
  projectId, 
  projectName, 
  requirementType, 
  children 
}: RequirementApplicationModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<ApplicationForm>({
    name: '',
    email: '',
    message: '',
    experience: '',
    availability: '',
    contribution: ''
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      message: '',
      experience: '',
      availability: '',
      contribution: ''
    });
    setError(null);
    setSuccess(null);
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requirementType,
          ...formData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit application');
      }

      const result = await response.json();
      setSuccess('Your application has been submitted successfully! The project owner will be notified.');
      
      setTimeout(() => {
        handleClose();
      }, 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  const getRequirementIcon = () => {
    switch (requirementType) {
      case 'funding needed':
        return '💸';
      case 'cofounder needed':
        return '👥';
      case 'dev needed':
        return '💻';
      case 'business manager needed':
        return '📊';
      default:
        return '🎯';
    }
  };

  const getRequirementTitle = () => {
    switch (requirementType) {
      case 'funding needed':
        return 'Funding Application';
      case 'cofounder needed':
        return 'Cofounder Application';
      case 'dev needed':
        return 'Developer Application';
      case 'business manager needed':
        return 'Business Manager Application';
      default:
        return 'Application';
    }
  };

  const getRequirementDescription = () => {
    switch (requirementType) {
      case 'funding needed':
        return 'Apply to provide funding for this project. Please share your investment criteria and how you can help grow this project.';
      case 'cofounder needed':
        return 'Apply to join as a cofounder. Share your background, skills, and vision for how you can contribute to this project.';
      case 'dev needed':
        return 'Apply to join as a developer. Share your technical skills, experience, and how you can contribute to the development.';
      case 'business manager needed':
        return 'Apply to join as a business manager. Share your business experience and how you can help grow this project.';
      default:
        return 'Apply to contribute to this project.';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{getRequirementIcon()}</span>
            {getRequirementTitle()}
          </DialogTitle>
          <DialogDescription>
            {getRequirementDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4">
          <Badge variant="outline" className="mb-2">
            Project: {projectName}
          </Badge>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Your full name"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="your.email@example.com"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="experience">Relevant Experience *</Label>
            <Textarea
              id="experience"
              value={formData.experience}
              onChange={(e) => setFormData(prev => ({ ...prev, experience: e.target.value }))}
              placeholder="Describe your relevant experience, skills, and background..."
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="availability">Availability & Commitment *</Label>
            <Textarea
              id="availability"
              value={formData.availability}
              onChange={(e) => setFormData(prev => ({ ...prev, availability: e.target.value }))}
              placeholder="How much time can you commit? What's your availability?"
              rows={2}
              required
            />
          </div>

          <div>
            <Label htmlFor="contribution">How You Can Contribute *</Label>
            <Textarea
              id="contribution"
              value={formData.contribution}
              onChange={(e) => setFormData(prev => ({ ...prev, contribution: e.target.value }))}
              placeholder="Explain how you can contribute to this project's success..."
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="message">Additional Message</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Any additional information you'd like to share..."
              rows={2}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Application
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
