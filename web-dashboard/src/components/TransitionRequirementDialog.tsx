'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowRight, Sparkles, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Requirement {
  number: number;
  title: string;
  userStory: string;
}

interface TransitionRequirementDialogProps {
  projectId: string;
  isOwned?: boolean;
  onTaskAdded?: () => void;
}

export default function TransitionRequirementDialog({ projectId, isOwned = true, onTaskAdded }: TransitionRequirementDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingRequirements, setLoadingRequirements] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [selectedRequirement, setSelectedRequirement] = useState<string>('');
  const [transitionResult, setTransitionResult] = useState<{
    taskNumber: string;
    title: string;
    requirementNumber: number;
  } | null>(null);

  // Load requirements when dialog opens
  useEffect(() => {
    if (open) {
      loadRequirements();
    }
  }, [open, projectId]);

  const loadRequirements = async () => {
    setLoadingRequirements(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/requirements/list`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load requirements');
      }

      const result = await response.json();
      setRequirements(result.requirements || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requirements');
    } finally {
      setLoadingRequirements(false);
    }
  };

  const resetForm = () => {
    setSelectedRequirement('');
    setError(null);
    setSuccess(null);
    setTransitionResult(null);
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRequirement) {
      setError('Please select a requirement to transition');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/requirements/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requirementNumber: parseInt(selectedRequirement, 10),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to transition requirement');
      }

      const result = await response.json();
      setTransitionResult({
        taskNumber: result.taskNumber,
        title: result.title,
        requirementNumber: result.requirementNumber
      });
      setSuccess(result.message);

      // Call the callback to refresh the task list
      if (onTaskAdded) {
        onTaskAdded();
      }

      // Don't auto-close, let user close manually to see the success message

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transition requirement');
    } finally {
      setLoading(false);
    }
  };

  const selectedReq = requirements.find(req => req.number.toString() === selectedRequirement);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={!isOwned}>
          <ArrowRight className="h-4 w-4" />
          Transition
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
                            <ArrowRight className="h-5 w-5 text-gray-500" />
            Transition Requirement to Task
          </DialogTitle>
          <DialogDescription>
            Select a requirement to automatically generate an implementation task. The AI will analyze the requirement and create actionable development tasks.
          </DialogDescription>
        </DialogHeader>

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Requirement Selection */}
            <div className="space-y-2">
              <Label htmlFor="requirement">Select Requirement *</Label>
              {loadingRequirements ? (
                <div className="flex items-center justify-center py-4">
                  <Sparkles className="h-4 w-4 animate-spin mr-2" />
                  Loading requirements...
                </div>
              ) : requirements.length === 0 ? (
                <div className="text-sm text-gray-500 py-4 text-center">
                  No requirements found. Add some requirements first.
                </div>
              ) : (
                <Select value={selectedRequirement} onValueChange={setSelectedRequirement}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a requirement to transition..." />
                  </SelectTrigger>
                  <SelectContent className="max-w-2xl">
                    {requirements.map((req) => (
                      <SelectItem key={req.number} value={req.number.toString()}>
                        <div className="flex flex-col">
                          <span className="font-medium">Requirement {req.number}: {req.title}</span>
                          <span className="text-xs text-gray-500 truncate max-w-lg">
                            {req.userStory}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Preview Selected Requirement */}
            {selectedReq && (
              <div className="bg-gray-50 p-4 rounded-lg border">
                <h4 className="font-medium text-sm text-gray-700 mb-2">Selected Requirement:</h4>
                <div className="text-sm">
                  <div className="font-medium">Requirement {selectedReq.number}: {selectedReq.title}</div>
                  <div className="text-gray-600 mt-1">{selectedReq.userStory}</div>
                </div>
              </div>
            )}

            {/* Error Messages */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !selectedRequirement || requirements.length === 0}
              >
                {loading ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                    Transitioning...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Transition to Task
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          /* Success Modal */
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Transition Successful!
              </h3>
            </div>

            {transitionResult && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-800">From:</span>
                    <span className="text-sm text-green-700">Requirement {transitionResult.requirementNumber}</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <ArrowRight className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-800">To:</span>
                    <span className="text-sm text-green-700">Task {transitionResult.taskNumber}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <div className="text-sm font-medium text-green-800 mb-1">Generated Task:</div>
                    <div className="text-sm text-green-700">{transitionResult.title}</div>
                  </div>
                </div>
              </div>
            )}

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-green-600">
                {success}
              </AlertDescription>
            </Alert>

            <div className="text-center">
              <Button onClick={handleClose} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}