'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Copy,
  Loader2,
  Brain,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  Target,
  Plus,
  Calendar,
  Award,
  ExternalLink,
  Building,
  MessageSquare,
  Edit,
  Edit3,
  Trash2,
  Save,
  X,
  ChevronUp,
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { Application, ApplicationQuestion, ApplicationResponse } from '@/types/applications';

interface UserProject {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  lastModified: string;
}

interface AnalysisResult {
  summary: string;
  insights: string[];
  timestamp: string;
}

export default function ApplicationDetailPage() {
  const { user, isSignedIn } = useUser();
  const router = useRouter();
  const params = useParams();
  const applicationId = params.id as string;

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [isLoadingApplication, setIsLoadingApplication] = useState(false);
  const [isCompletingApplication, setIsCompletingApplication] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Application state
  const [application, setApplication] = useState<Application | null>(null);

  // Question response form state
  const [questionData, setQuestionData] = useState({
    question: '',
    applicationContext: '',
    wordLimit: '',
    characterLimit: ''
  });

  // Questions state
  const [questions, setQuestions] = useState<ApplicationQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // User projects and analysis data
  const [userProjects, setUserProjects] = useState<UserProject[]>([]);
  const [analysisData, setAnalysisData] = useState<Record<string, AnalysisResult>>({});
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);

  // Generated response
  const [generatedResponse, setGeneratedResponse] = useState<ApplicationResponse | null>(null);

  // Improve response state
  const [isImproving, setIsImproving] = useState(false);
  const [improveDetails, setImproveDetails] = useState<string>('');
  const [improvedResponse, setImprovedResponse] = useState<ApplicationResponse | null>(null);
  const [showImproveSection, setShowImproveSection] = useState(false);

  // Edit application state
  const [showEditModal, setShowEditModal] = useState(false);
  const [isUpdatingApplication, setIsUpdatingApplication] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    deadline: '',
    prizeType: 'funding' as Application['prizeType'],
    prizeDetails: '',
    applicationUrl: '',
    organizationName: '',
    requirements: '',
    notes: ''
  });

  // Resume application state
  const [isResumingApplication, setIsResumingApplication] = useState(false);

  // Edit question state
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editQuestionData, setEditQuestionData] = useState({
    question: '',
    wordLimit: '',
    characterLimit: ''
  });

  useEffect(() => {
    if (isSignedIn && applicationId) {
      loadApplication();
      loadQuestions();
    }
  }, [isSignedIn, applicationId]);

  const loadApplication = async () => {
    try {
      setIsLoadingApplication(true);
      const response = await fetch(`/api/applications/${applicationId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setApplication(data.application);
          loadProjectAnalysis(data.application.projectId);
        }
      } else {
        setError('Application not found');
      }
    } catch (error) {
      console.error('Failed to load application:', error);
      setError('Failed to load application');
    } finally {
      setIsLoadingApplication(false);
    }
  };

  const loadQuestions = async () => {
    try {
      setIsLoadingQuestions(true);
      const response = await fetch(`/api/applications/${applicationId}/questions`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Sort by order
          const sortedQuestions = data.questions.sort((a: ApplicationQuestion, b: ApplicationQuestion) => a.order - b.order);
          setQuestions(sortedQuestions);
          setCurrentQuestionIndex(0);
        }
      }
    } catch (error) {
      console.error('Failed to load questions:', error);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const loadProjectAnalysis = async (projectId: string) => {
    try {
      setIsLoadingAnalysis(true);
      const response = await fetch(`/api/projects/${projectId}/analyses`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.analyses) {
          setAnalysisData(data.analyses);
        }
      }
    } catch (error) {
      console.error('Failed to load analysis data:', error);
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!application || !questionData.question.trim()) {
      setError('Please enter a question');
      return;
    }

    try {
      setIsSavingQuestion(true);
      setError(null);

      const response = await fetch(`/api/applications/${applicationId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: questionData.question,
          wordLimit: questionData.wordLimit ? parseInt(questionData.wordLimit) : undefined,
          characterLimit: questionData.characterLimit ? parseInt(questionData.characterLimit) : undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add question');
      }

      const result = await response.json();
      setQuestions(prev => [...prev, result.question]);
      setCurrentQuestionIndex(questions.length); // Move to the new question
      
      // Reset form
      setQuestionData({
        question: '',
        applicationContext: '',
        wordLimit: '',
        characterLimit: ''
      });
      
      setSuccessMessage('Question added successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (error: any) {
      console.error('Add question error:', error);
      setError(error.message || 'Failed to add question');
      setTimeout(() => setError(null), 10000);
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handleGenerateResponse = async () => {
    if (!application) {
      setError('Application not loaded');
      return;
    }

    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) {
      setError('No question selected');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      setGeneratedResponse(null);
      setImprovedResponse(null);
      setImproveDetails('');

      // Get previous responses for context
      const previousResponses = questions
        .slice(0, currentQuestionIndex)
        .filter(q => q.response)
        .map(q => ({
          question: q.question,
          response: q.response!
        }));
      
      const response = await fetch(`/api/projects/${application.projectId}/generate-application-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: currentQuestion.question,
          applicationId: application.id,
          applicationContext: questionData.applicationContext,
          analysisData: analysisData,
          wordLimit: currentQuestion.wordLimit,
          characterLimit: currentQuestion.characterLimit,
          previousResponses
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate application response');
      }

      const result = await response.json();
      setGeneratedResponse(result);
      setSuccessMessage('Application response generated successfully!');
      setTimeout(() => setSuccessMessage(null), 5000);
      
    } catch (error: any) {
      console.error('Application response generation error:', error);
      setError(error.message || 'Failed to generate application response');
      setTimeout(() => setError(null), 10000);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveResponse = async (response: string) => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion || !application) {
      setError('No question selected');
      return;
    }

    try {
      setIsSavingQuestion(true);
      setError(null);

      const updateResponse = await fetch(`/api/applications/${applicationId}/questions/${currentQuestion.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          response,
          generatedResponse: generatedResponse?.response,
          keyPoints: generatedResponse?.keyPoints,
          suggestedImprovements: generatedResponse?.suggestedImprovements
        })
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.error || 'Failed to save response');
      }

      const result = await updateResponse.json();
      
      // Update the questions array
      setQuestions(prev => prev.map(q => 
        q.id === currentQuestion.id ? result.question : q
      ));
      
      setSuccessMessage('Response saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (error: any) {
      console.error('Save response error:', error);
      setError(error.message || 'Failed to save response');
      setTimeout(() => setError(null), 10000);
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const toggleImproveSection = () => {
    setShowImproveSection(!showImproveSection);
  };

  const handleImproveResponse = async () => {
    if (!application) {
      setError('Application not loaded');
      return;
    }

    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) {
      setError('No question selected');
      return;
    }

    // Use existing response or generated response
    const responseToImprove = currentQuestion.response || generatedResponse?.response;
    if (!responseToImprove) {
      setError('No response to improve');
      return;
    }

    if (!improveDetails.trim()) {
      setError('Please provide details on how to improve the response');
      return;
    }

    try {
      setIsImproving(true);
      setError(null);

      const response = await fetch(`/api/projects/${application.projectId}/improve-application-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalResponse: responseToImprove,
          improvementDetails: improveDetails,
          question: currentQuestion.question,
          applicationContext: questionData.applicationContext,
          wordLimit: currentQuestion.wordLimit,
          characterLimit: currentQuestion.characterLimit
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to improve response');
      }

      const result = await response.json();
      
      // Create improved response object
      const improvedResponseObj: ApplicationResponse = {
        response: result.improvedResponse,
        keyPoints: result.keyPoints,
        suggestedImprovements: result.suggestedImprovements,
        tokenUsage: result.tokenUsage
      };
      
      setImprovedResponse(improvedResponseObj);
      setSuccessMessage('Response improved successfully!');
      setTimeout(() => setSuccessMessage(null), 5000);
      
    } catch (error: any) {
      console.error('Response improvement error:', error);
      setError(error.message || 'Failed to improve response');
      setTimeout(() => setError(null), 10000);
    } finally {
      setIsImproving(false);
    }
  };

  const handleOpenEditModal = () => {
    if (!application) return;
    
    // Pre-populate the form with current application data
    setEditFormData({
      name: application.name,
      description: application.description,
      deadline: application.deadline.split('T')[0], // Convert to date format for input
      prizeType: application.prizeType,
      prizeDetails: application.prizeDetails,
      applicationUrl: application.applicationUrl || '',
      organizationName: application.organizationName || '',
      requirements: application.requirements || '',
      notes: application.notes || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateApplication = async () => {
    if (!application) {
      setError('Application not loaded');
      return;
    }

    if (!editFormData.name.trim()) {
      setError('Application name is required');
      return;
    }

    if (!editFormData.deadline) {
      setError('Deadline is required');
      return;
    }

    try {
      setIsUpdatingApplication(true);
      setError(null);

      const response = await fetch(`/api/applications/${applicationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editFormData.name,
          description: editFormData.description,
          deadline: editFormData.deadline,
          prizeType: editFormData.prizeType,
          prizeDetails: editFormData.prizeDetails,
          applicationUrl: editFormData.applicationUrl,
          organizationName: editFormData.organizationName,
          requirements: editFormData.requirements,
          notes: editFormData.notes
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update application');
      }

      const result = await response.json();
      
      // Update the application state
      setApplication(result.application);
      setShowEditModal(false);
      setSuccessMessage('Application updated successfully!');
      setTimeout(() => setSuccessMessage(null), 5000);
      
    } catch (error: any) {
      console.error('Update application error:', error);
      setError(error.message || 'Failed to update application');
      setTimeout(() => setError(null), 10000);
    } finally {
      setIsUpdatingApplication(false);
    }
  };



  const handleResumeApplication = async () => {
    if (!application) {
      setError('Application not loaded');
      return;
    }

    try {
      setIsResumingApplication(true);
      setError(null);

      const response = await fetch(`/api/applications/${applicationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'in_progress'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to resume application');
      }

      const result = await response.json();
      
      // Update the application state
      setApplication(result.application);
      setSuccessMessage('Application resumed! You can now continue working on it.');
      setTimeout(() => setSuccessMessage(null), 5000);
      
    } catch (error: any) {
      console.error('Resume application error:', error);
      setError(error.message || 'Failed to resume application');
      setTimeout(() => setError(null), 10000);
    } finally {
      setIsResumingApplication(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setGeneratedResponse(null);
      setImprovedResponse(null);
      setImproveDetails('');
      setShowImproveSection(false);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setGeneratedResponse(null);
      setImprovedResponse(null);
      setImproveDetails('');
      setShowImproveSection(false);
    }
  };

  const handleEditQuestion = async (questionId: string, updatedQuestion: string, wordLimit?: number, characterLimit?: number) => {
    if (!application) {
      setError('Application not loaded');
      return;
    }

    try {
      setIsSavingQuestion(true);
      setError(null);

      const response = await fetch(`/api/applications/${applicationId}/questions/${questionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: updatedQuestion,
          wordLimit,
          characterLimit
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update question');
      }

      const result = await response.json();
      
      // Update the questions array
      setQuestions(prev => prev.map(q => 
        q.id === questionId ? result.question : q
      ));
      
      setSuccessMessage('Question updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (error: any) {
      console.error('Update question error:', error);
      setError(error.message || 'Failed to update question');
      setTimeout(() => setError(null), 10000);
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!application) {
      setError('Application not loaded');
      return;
    }

    if (!confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      return;
    }

    try {
      setIsSavingQuestion(true);
      setError(null);

      const response = await fetch(`/api/applications/${applicationId}/questions/${questionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete question');
      }

      // Remove the question from the array
      setQuestions(prev => {
        const newQuestions = prev.filter(q => q.id !== questionId);
        // Adjust current question index if necessary
        if (currentQuestionIndex >= newQuestions.length && newQuestions.length > 0) {
          setCurrentQuestionIndex(newQuestions.length - 1);
        } else if (newQuestions.length === 0) {
          setCurrentQuestionIndex(0);
        }
        return newQuestions;
      });
      
      setGeneratedResponse(null);
      setImprovedResponse(null);
      setImproveDetails('');
      setShowImproveSection(false);
      setSuccessMessage('Question deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (error: any) {
      console.error('Delete question error:', error);
      setError(error.message || 'Failed to delete question');
      setTimeout(() => setError(null), 10000);
    } finally {
      setIsSavingQuestion(false);
    }
  };

  const startEditingQuestion = (question: ApplicationQuestion) => {
    setEditingQuestionId(question.id);
    setEditQuestionData({
      question: question.question,
      wordLimit: question.wordLimit?.toString() || '',
      characterLimit: question.characterLimit?.toString() || ''
    });
  };

  const cancelEditingQuestion = () => {
    setEditingQuestionId(null);
    setEditQuestionData({
      question: '',
      wordLimit: '',
      characterLimit: ''
    });
  };

  const saveEditedQuestion = async () => {
    if (!editingQuestionId || !editQuestionData.question.trim()) {
      setError('Question text is required');
      return;
    }

    await handleEditQuestion(
      editingQuestionId,
      editQuestionData.question,
      editQuestionData.wordLimit ? parseInt(editQuestionData.wordLimit) : undefined,
      editQuestionData.characterLimit ? parseInt(editQuestionData.characterLimit) : undefined
    );

    setEditingQuestionId(null);
    setEditQuestionData({
      question: '',
      wordLimit: '',
      characterLimit: ''
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccessMessage('Copied to clipboard!');
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (error) {
      setError('Failed to copy to clipboard');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleCompleteApplication = async () => {
    if (!application) {
      setError('Application not loaded');
      return;
    }

    // Check if there are any unanswered questions
    const unansweredQuestions = questions.filter(q => !q.response);
    if (unansweredQuestions.length > 0) {
      const proceed = confirm(
        `You have ${unansweredQuestions.length} unanswered question(s). Are you sure you want to mark this application as complete?`
      );
      if (!proceed) return;
    }

    try {
      setIsCompletingApplication(true);
      setError(null);

      const response = await fetch(`/api/applications/${applicationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'submitted'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete application');
      }

      setSuccessMessage('Application marked as complete! Redirecting...');
      
      // Redirect to applications page after a short delay
      setTimeout(() => {
        router.push('/applications');
      }, 2000);
      
    } catch (error: any) {
      console.error('Complete application error:', error);
      setError(error.message || 'Failed to complete application');
      setTimeout(() => setError(null), 10000);
    } finally {
      setIsCompletingApplication(false);
    }
  };

  const getPrizeIcon = (prizeType: Application['prizeType']) => {
    switch (prizeType) {
      case 'funding': return '💰';
      case 'residency': return '🏢';
      case 'training': return '🎓';
      default: return '🏆';
    }
  };

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else {
      return `${diffDays} days left`;
    }
  };

  if (!isSignedIn) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-muted-foreground mb-6">You need to be signed in to view this application.</p>
          <Link href="/applications">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Applications
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoadingApplication) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading application...</span>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Application Not Found</h1>
          <p className="text-muted-foreground mb-6">The application you're looking for doesn't exist or you don't have access to it.</p>
          <Link href="/applications">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Applications
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href="/applications">
          <Button variant="ghost" className="flex items-center gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Applications
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{application.name}</h1>
            <p className="text-muted-foreground mt-2">
              Manage questions and generate responses for this application
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleOpenEditModal}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Application
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Application</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-name">Application Name *</Label>
                      <Input
                        id="edit-name"
                        value={editFormData.name}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter application name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-organization">Organization</Label>
                      <Input
                        id="edit-organization"
                        value={editFormData.organizationName}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, organizationName: e.target.value }))}
                        placeholder="Organization name"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                      id="edit-description"
                      value={editFormData.description}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the application opportunity"
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit-deadline">Deadline *</Label>
                      <Input
                        id="edit-deadline"
                        type="date"
                        value={editFormData.deadline}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, deadline: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-prize-type">Prize Type</Label>
                      <Select
                        value={editFormData.prizeType}
                        onValueChange={(value: Application['prizeType']) => 
                          setEditFormData(prev => ({ ...prev, prizeType: value }))
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select prize type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="funding">💰 Funding</SelectItem>
                          <SelectItem value="residency">🏢 Residency</SelectItem>
                          <SelectItem value="training">🎓 Training</SelectItem>
                          <SelectItem value="other">🏆 Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="edit-prize-details">Prize Details</Label>
                    <Textarea
                      id="edit-prize-details"
                      value={editFormData.prizeDetails}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, prizeDetails: e.target.value }))}
                      placeholder="Details about the prize or opportunity"
                      rows={2}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-application-url">Application URL</Label>
                    <Input
                      id="edit-application-url"
                      type="url"
                      value={editFormData.applicationUrl}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, applicationUrl: e.target.value }))}
                      placeholder="https://example.com/application"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-requirements">Requirements</Label>
                    <Textarea
                      id="edit-requirements"
                      value={editFormData.requirements}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, requirements: e.target.value }))}
                      placeholder="Application requirements and criteria"
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-notes">Notes</Label>
                    <Textarea
                      id="edit-notes"
                      value={editFormData.notes}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes or reminders"
                      rows={2}
                      className="mt-1"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowEditModal(false)}
                      disabled={isUpdatingApplication}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUpdateApplication}
                      disabled={isUpdatingApplication || !editFormData.name.trim() || !editFormData.deadline}
                    >
                      {isUpdatingApplication ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        'Update Application'
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            {application.status === 'submitted' ? (
              <div className="flex items-center gap-2">
                <Button 
                  disabled
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Completed
                </Button>
                <Button 
                  onClick={handleResumeApplication}
                  disabled={isResumingApplication}
                  variant="outline"
                  size="sm"
                >
                  {isResumingApplication ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Resuming...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Resume
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Button 
                onClick={handleCompleteApplication}
                disabled={isCompletingApplication}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                {isCompletingApplication ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Application
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <Alert className="mb-6">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="mb-6" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Application Info */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span>{application.organizationName || 'Organization not specified'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatDeadline(application.deadline)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-muted-foreground" />
                <span>{getPrizeIcon(application.prizeType)} {application.prizeType}</span>
              </div>
            </div>
            {application.description && (
              <p className="text-muted-foreground">{application.description}</p>
            )}
            {application.applicationUrl && (
              <div className="mt-3">
                <a 
                  href={application.applicationUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Application
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Application Progress Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Application Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{questions.length}</div>
                <div className="text-sm text-muted-foreground">Total Questions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {questions.filter(q => q.response).length}
                </div>
                <div className="text-sm text-muted-foreground">Answered</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {questions.filter(q => !q.response).length}
                </div>
                <div className="text-sm text-muted-foreground">Remaining</div>
              </div>
            </div>
            {questions.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Completion Progress</span>
                  <span>{Math.round((questions.filter(q => q.response).length / questions.length) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${(questions.filter(q => q.response).length / questions.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analysis Data Display */}
        {Object.keys(analysisData).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Project Analysis Available</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingAnalysis ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading analysis...
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(analysisData).map(([type, analysis]) => (
                    <div key={type} className="text-sm">
                      <span className="font-medium capitalize">{type}:</span> {analysis && analysis.summary ? analysis.summary.substring(0, 100) : 'No summary available'}...
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Questions Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Application Questions
              {questions.length > 0 && (
                <Badge variant="secondary">{questions.length} questions</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add New Question */}
            <div className="border rounded-lg p-4 bg-muted/20">
              <h4 className="font-medium mb-3">Add New Question</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="question">Question *</Label>
                  <Textarea
                    id="question"
                    value={questionData.question}
                    onChange={(e) => setQuestionData(prev => ({ ...prev, question: e.target.value }))}
                    placeholder="Paste the application question here..."
                    rows={3}
                    className="mt-1"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="wordLimit">Word Limit (Optional)</Label>
                    <Input
                      id="wordLimit"
                      type="number"
                      value={questionData.wordLimit}
                      onChange={(e) => setQuestionData(prev => ({ ...prev, wordLimit: e.target.value }))}
                      placeholder="e.g., 250"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="characterLimit">Character Limit (Optional)</Label>
                    <Input
                      id="characterLimit"
                      type="number"
                      value={questionData.characterLimit}
                      onChange={(e) => setQuestionData(prev => ({ ...prev, characterLimit: e.target.value }))}
                      placeholder="e.g., 1500"
                      className="mt-1"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleAddQuestion}
                  disabled={isSavingQuestion || !questionData.question.trim()}
                  size="sm"
                >
                  {isSavingQuestion ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Question
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Questions List */}
            {isLoadingQuestions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading questions...</span>
              </div>
            ) : questions.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Questions ({questions.length})</h4>
                  {questions.length > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousQuestion}
                        disabled={currentQuestionIndex === 0}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        {currentQuestionIndex + 1} of {questions.length}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextQuestion}
                        disabled={currentQuestionIndex === questions.length - 1}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>

                {/* Current Question */}
                {questions[currentQuestionIndex] && (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">Question {currentQuestionIndex + 1}</Badge>
                          {questions[currentQuestionIndex].wordLimit && (
                            <Badge variant="secondary">
                              {questions[currentQuestionIndex].wordLimit} words max
                            </Badge>
                          )}
                          {questions[currentQuestionIndex].characterLimit && (
                            <Badge variant="secondary">
                              {questions[currentQuestionIndex].characterLimit} chars max
                            </Badge>
                          )}
                          {questions[currentQuestionIndex].response && (
                            <Badge className="bg-green-100 text-green-800">
                              Answered
                            </Badge>
                          )}
                        </div>
                        
                        {editingQuestionId === questions[currentQuestionIndex].id ? (
                          // Edit Mode
                          <div className="space-y-3">
                            <div>
                              <Label>Question Text</Label>
                              <Textarea
                                value={editQuestionData.question}
                                onChange={(e) => setEditQuestionData(prev => ({ ...prev, question: e.target.value }))}
                                rows={3}
                                className="mt-1"
                              />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <Label>Word Limit</Label>
                                <Input
                                  type="number"
                                  value={editQuestionData.wordLimit}
                                  onChange={(e) => setEditQuestionData(prev => ({ ...prev, wordLimit: e.target.value }))}
                                  placeholder="e.g., 250"
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label>Character Limit</Label>
                                <Input
                                  type="number"
                                  value={editQuestionData.characterLimit}
                                  onChange={(e) => setEditQuestionData(prev => ({ ...prev, characterLimit: e.target.value }))}
                                  placeholder="e.g., 1500"
                                  className="mt-1"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={saveEditedQuestion}
                                disabled={isSavingQuestion || !editQuestionData.question.trim()}
                                size="sm"
                              >
                                {isSavingQuestion ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save
                                  </>
                                )}
                              </Button>
                              <Button
                                onClick={cancelEditingQuestion}
                                variant="outline"
                                size="sm"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          // View Mode
                          <>
                            <p className="text-sm font-medium mb-2">
                              {questions[currentQuestionIndex].question}
                            </p>
                            {questions[currentQuestionIndex].response && (
                              <div className="bg-muted/50 p-3 rounded text-sm">
                                <strong>Saved Response:</strong>
                                <div className="mt-1 whitespace-pre-wrap">
                                  {questions[currentQuestionIndex].response}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      
                      {editingQuestionId !== questions[currentQuestionIndex].id && (
                        <div className="flex items-center gap-1 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditingQuestion(questions[currentQuestionIndex])}
                            title="Edit question"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteQuestion(questions[currentQuestionIndex].id)}
                            title="Delete question"
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          
                        </div>
                      )}
                    </div>

                    {/* Generate Response Button */}
                    {!questions[currentQuestionIndex]?.response && (
                      <Button
                        onClick={handleGenerateResponse}
                        disabled={isGenerating}
                        className="w-full"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating Response...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate Response for Question {currentQuestionIndex + 1}
                          </>
                        )}
                      </Button>
                    )}

                    {/* Improve Answer Button - only show if there's a saved response */}
                    {questions[currentQuestionIndex]?.response && (
                      <Button
                        onClick={toggleImproveSection}
                        disabled={isImproving}
                        className="w-full"
                        variant="outline"
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Improve Answer
                        {showImproveSection ? (
                          <ChevronUp className="h-4 w-4 ml-2" />
                        ) : (
                          <ChevronDown className="h-4 w-4 ml-2" />
                        )}
                      </Button>
                    )}

                    {/* Collapsible Improve Section */}
                    {questions[currentQuestionIndex]?.response && showImproveSection && (
                      <div className="mt-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center mb-3">
                          <Edit3 className="h-4 w-4 mr-2 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800">
                            Improve this answer
                          </span>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="improve-details" className="text-xs font-medium text-gray-700 mb-1 block">
                              What would you like to improve or change about this response?
                            </Label>
                            <Textarea
                              id="improve-details"
                              value={improveDetails}
                              onChange={(e) => setImproveDetails(e.target.value)}
                              placeholder="e.g., Make it more specific, add more examples, change the tone, make it shorter, add more technical details..."
                              className="min-h-[80px] text-sm"
                              disabled={isImproving}
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              onClick={handleImproveResponse}
                              disabled={isImproving || !improveDetails.trim()}
                              className="flex items-center"
                            >
                              {isImproving ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Improving...
                                </>
                              ) : (
                                <>
                                  <Edit3 className="h-4 w-4 mr-2" />
                                  Improve Answer
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={toggleImproveSection}
                              disabled={isImproving}
                            >
                              Cancel
                            </Button>
                          </div>
                          <p className="text-xs text-gray-600">
                            The AI will rewrite this response based on your feedback while maintaining the original key points and staying within any word/character limits.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No questions added yet. Add your first question above.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Response Display - Shows either generated or improved response */}
        {(generatedResponse || improvedResponse) && (
          <div className="space-y-6">
            {/* Main Response */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {improvedResponse ? (
                    <>
                      <Edit3 className="h-5 w-5 text-blue-600" />
                      Improved Response
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Generated Response
                    </>
                  )}
                  {questions[currentQuestionIndex]?.wordLimit && (
                    <Badge variant="secondary">
                      Target: {questions[currentQuestionIndex].wordLimit} words
                    </Badge>
                  )}
                  {questions[currentQuestionIndex]?.characterLimit && (
                    <Badge variant="secondary">
                      Target: {questions[currentQuestionIndex].characterLimit} chars
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`p-4 rounded-lg ${improvedResponse ? 'bg-blue-50 border-l-4 border-blue-500' : 'bg-muted/50'}`}>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {improvedResponse ? improvedResponse.response : generatedResponse?.response}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Words: {(improvedResponse ? improvedResponse.response : generatedResponse?.response || '').split(/\s+/).length} | 
                    Characters: {(improvedResponse ? improvedResponse.response : generatedResponse?.response || '').length}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => copyToClipboard(improvedResponse ? improvedResponse.response : generatedResponse?.response || '')}
                    variant="outline"
                    className="flex-1"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy {improvedResponse ? 'Improved ' : ''}Response
                  </Button>
                  <Button
                    onClick={() => handleSaveResponse(improvedResponse ? improvedResponse.response : generatedResponse?.response || '')}
                    disabled={isSavingQuestion}
                    className="flex-1"
                  >
                    {isSavingQuestion ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Save {improvedResponse ? 'Improved Response' : '& Continue'}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Key Points */}
            {(improvedResponse ? improvedResponse.keyPoints : generatedResponse?.keyPoints || []).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    Key Points Highlighted
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {(improvedResponse ? improvedResponse.keyPoints : generatedResponse?.keyPoints || []).map((point, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Suggested Improvements */}
            {(improvedResponse ? improvedResponse.suggestedImprovements : generatedResponse?.suggestedImprovements || []).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-amber-600" />
                    {improvedResponse ? 'Additional Suggestions' : 'Suggested Improvements'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {(improvedResponse ? improvedResponse.suggestedImprovements : generatedResponse?.suggestedImprovements || []).map((suggestion, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Token Usage */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{improvedResponse ? 'Improvement Stats' : 'Generation Stats'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Input Tokens</div>
                    <div className="text-muted-foreground">{(improvedResponse ? improvedResponse.tokenUsage : generatedResponse?.tokenUsage)?.inputTokens.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="font-medium">Output Tokens</div>
                    <div className="text-muted-foreground">{(improvedResponse ? improvedResponse.tokenUsage : generatedResponse?.tokenUsage)?.outputTokens.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="font-medium">Total Tokens</div>
                    <div className="text-muted-foreground">{(improvedResponse ? improvedResponse.tokenUsage : generatedResponse?.tokenUsage)?.totalTokens.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="font-medium">Cost</div>
                    <div className="text-muted-foreground">${(improvedResponse ? improvedResponse.tokenUsage : generatedResponse?.tokenUsage)?.cost.toFixed(4)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}


      </div>
    </div>
  );
}