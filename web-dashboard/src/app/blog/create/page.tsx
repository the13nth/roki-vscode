'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Save, 
  X,
  Loader2,
  Brain,
  Edit3,
  Sparkles,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

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

interface BlogPostResult {
  title: string;
  content: string;
  excerpt: string;
  tags: string[];
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost: number;
  };
}

export default function CreateBlogPostPage() {
  const { user, isSignedIn } = useUser();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    projectId: '',
    tags: [] as string[],
    tagInput: '',
    fundingStatus: 'N/A' as 'fully funded' | 'funding needed' | 'N/A',
    resourceNeeded: 'N/A' as 'cofounder needed' | 'dev needed' | 'business manager needed' | 'N/A',
    description: '',
    preset: 'custom' as 'linkedin' | 'launch' | 'investors' | 'custom'
  });

  // User projects and analysis data
  const [userProjects, setUserProjects] = useState<UserProject[]>([]);
  const [analysisData, setAnalysisData] = useState<Record<string, any>>({});
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [hasAnalyses, setHasAnalyses] = useState(false);

  // Generated content
  const [generatedPost, setGeneratedPost] = useState<BlogPostResult | null>(null);
  const [improvedContent, setImprovedContent] = useState<string>('');
  const [improveDetails, setImproveDetails] = useState<string>('');

  // Helper functions for presets
  const getPresetDescription = (preset: string): string => {
    switch (preset) {
      case 'linkedin':
        return 'Write a professional LinkedIn blog post that showcases the project\'s technical achievements, challenges overcome, and lessons learned. Focus on professional growth, technical insights, and industry impact.';
      case 'launch':
        return 'Create an exciting launch announcement post that introduces the project to the world. Highlight key features, the problem it solves, and what makes it unique. Include a call-to-action for early users.';
      case 'investors':
        return 'Write a comprehensive investors newsletter that covers project progress, key milestones achieved, market opportunities, financial projections, and future roadmap. Focus on business value and growth potential.';
      case 'custom':
      default:
        return '';
    }
  };

  const getPresetPlaceholder = (preset: string): string => {
    switch (preset) {
      case 'linkedin':
        return 'Describe the technical challenges, solutions, or insights you want to highlight for your professional network...';
      case 'launch':
        return 'Describe the key features, benefits, or unique aspects you want to emphasize in your launch announcement...';
      case 'investors':
        return 'Describe the business metrics, market opportunities, or strategic insights you want to communicate to investors...';
      case 'custom':
      default:
        return 'Describe the topic, focus, or angle you want for your blog post...';
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      fetchUserProjects();
    }
  }, [isSignedIn]);

  const fetchUserProjects = async () => {
    try {
      const response = await fetch('/api/user/projects');
      const data = await response.json();
      
      if (data.success) {
        setUserProjects(data.projects);
      }
    } catch (error) {
      console.error('Error fetching user projects:', error);
    }
  };

  const loadProjectAnalysis = async (projectId: string) => {
    try {
      setIsLoadingAnalysis(true);
      setError(null);
      const response = await fetch(`/api/projects/${projectId}/analyses`);
      
      if (response.ok) {
        const responseData = await response.json();
        const analyses = responseData.analyses || {};
        setAnalysisData(analyses);
        
        // Check if we have any analyses
        const analysisTypes = Object.keys(analyses);
        setHasAnalyses(analysisTypes.length > 0);
        
        if (analysisTypes.length === 0) {
          setError('No analyses found. Please complete other analyses first before generating a blog post.');
        } else {
          console.log(`✅ Found ${analysisTypes.length} analyses for blog generation:`, analysisTypes);
        }
      } else {
        setError('Failed to load project analyses');
      }
    } catch (error) {
      console.error('Failed to load analysis data:', error);
      setError('Failed to load project analyses');
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  const handleProjectChange = (projectId: string) => {
    setFormData(prev => ({ ...prev, projectId }));
    if (projectId) {
      loadProjectAnalysis(projectId);
    } else {
      setAnalysisData({});
      setHasAnalyses(false);
    }
  };

  const handleGeneratePost = async () => {
    if (!formData.projectId) {
      setError('Please select a project first');
      return;
    }

    if (!formData.description.trim()) {
      setError('Please describe what you want to write about');
      return;
    }

    // Check if we have analysis data for the selected project
    if (!hasAnalyses || Object.keys(analysisData).length === 0) {
      setError('No project analysis data available. Please ensure the project has been analyzed or try selecting a different project.');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      setGeneratedPost(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout

      const response = await fetch(`/api/projects/${formData.projectId}/generate-blog-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: formData.description,
          fundingStatus: formData.fundingStatus,
          resourceNeeded: formData.resourceNeeded,
          tags: formData.tags,
          preset: formData.preset,
          analysisData: analysisData // Pass the already-loaded analyses
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate blog post');
      }

      const result = await response.json();
      setGeneratedPost(result);
      setFormData(prev => ({
        ...prev,
        title: result.title,
        content: result.content
      }));
      setSuccessMessage('Blog post generated successfully!');
      setTimeout(() => setSuccessMessage(null), 5000);
      
    } catch (error: any) {
      console.error('Blog post generation error:', error);
      if (error.name === 'AbortError') {
        setError('Blog post generation timed out. Please try again.');
      } else {
        setError(error.message || 'Failed to generate blog post');
      }
      setTimeout(() => setError(null), 10000);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImprovePost = async () => {
    if (!formData.projectId || !generatedPost) {
      setError('No post to improve');
      return;
    }

    if (!improveDetails.trim()) {
      setError('Please provide details on how to improve the post');
      return;
    }

    try {
      setIsImproving(true);
      setError(null);

      const response = await fetch(`/api/projects/${formData.projectId}/improve-blog-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalContent: generatedPost.content,
          improvementDetails: improveDetails,
          fundingStatus: formData.fundingStatus,
          resourceNeeded: formData.resourceNeeded
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to improve post');
      }

      const result = await response.json();
      setImprovedContent(result.improvedContent);
      setFormData(prev => ({
        ...prev,
        content: result.improvedContent
      }));
      setSuccessMessage('Blog post improved successfully!');
      setTimeout(() => setSuccessMessage(null), 5000);
      
    } catch (error: any) {
      console.error('Blog post improvement error:', error);
      setError(error.message || 'Failed to improve blog post');
      setTimeout(() => setError(null), 10000);
    } finally {
      setIsImproving(false);
    }
  };

  const handleCreatePost = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Title and content are required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch('/api/blog-posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          projectId: formData.projectId || undefined,
          tags: formData.tags,
          fundingStatus: formData.fundingStatus,
          resourceNeeded: formData.resourceNeeded
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/blog/${data.post.id}`);
      } else {
        setError(data.error || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setError('Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTag = () => {
    if (formData.tagInput.trim() && !formData.tags.includes(formData.tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, formData.tagInput.trim()],
        tagInput: ''
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  if (!isSignedIn) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-muted-foreground mb-6">You need to be signed in to create blog posts.</p>
          <Link href="/blog">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Blog
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
        <Link href="/blog">
          <Button variant="ghost" className="flex items-center gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Create New Blog Post</h1>
        <p className="text-muted-foreground mt-2">
          Share your project insights and experiences with the community
        </p>
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
        {/* Project Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Select Project & Generate Content
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Project Selection */}
            <div>
              <Label htmlFor="projectId">Related Project</Label>
              <select
                id="projectId"
                value={formData.projectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm mt-1"
              >
                <option value="">Select a project...</option>
                {userProjects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Analysis Data Display */}
            {formData.projectId && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Project Analysis Available:</h4>
                {isLoadingAnalysis ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading analysis...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {hasAnalyses && Object.keys(analysisData).length > 0 ? (
                      Object.entries(analysisData).map(([type, analysis]) => {
                        // Get summary or first part of content for display
                        let summary = '';
                        if (analysis && typeof analysis === 'object') {
                          if (analysis.summary) {
                            summary = analysis.summary;
                          } else if (analysis.content) {
                            summary = analysis.content;
                          } else if (typeof analysis === 'string') {
                            summary = analysis;
                          } else {
                            // For complex objects like roast analysis, try to get a meaningful summary
                            const keys = Object.keys(analysis);
                            if (keys.length > 0) {
                              const firstKey = keys[0];
                              const firstValue = analysis[firstKey];
                              if (typeof firstValue === 'string') {
                                summary = firstValue;
                              } else {
                                summary = `${type} analysis with ${keys.length} sections`;
                              }
                            }
                          }
                        }
                        
                        return (
                          <div key={type} className="text-sm border-l-2 border-blue-200 pl-3">
                            <span className="font-medium capitalize text-blue-700">{type}:</span> 
                            <span className="ml-2 text-gray-700">
                              {summary ? summary.substring(0, 120) + (summary.length > 120 ? '...' : '') : 'No summary available'}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No analysis data available for this project
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Blog Preset Selection */}
            <div>
              <Label htmlFor="preset">Blog Post Type</Label>
              <select
                id="preset"
                value={formData.preset}
                onChange={(e) => {
                  const preset = e.target.value as 'linkedin' | 'launch' | 'investors' | 'custom';
                  setFormData(prev => ({ 
                    ...prev, 
                    preset,
                    description: getPresetDescription(preset)
                  }));
                }}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm mt-1"
              >
                <option value="linkedin">LinkedIn Blog Post</option>
                <option value="launch">Launch Post</option>
                <option value="investors">Investors Newsletter</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {/* Description Input */}
            <div>
              <Label htmlFor="description">What do you want to write about?</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={getPresetPlaceholder(formData.preset)}
                rows={4}
                className="mt-1"
              />
            </div>

            {/* Generate Button */}
            <Button 
              onClick={handleGeneratePost} 
              disabled={isGenerating || !formData.projectId || !formData.description.trim() || !hasAnalyses}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Blog Post...
                </>
              ) : !hasAnalyses ? (
                <>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  No Project Data Available
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Blog Post with AI
                </>
              )}
            </Button>
            
            {!hasAnalyses && formData.projectId && !isLoadingAnalysis && (
              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                <AlertCircle className="h-4 w-4 inline mr-2" />
                No analysis data found for this project. Please ensure the project has been analyzed or try selecting a different project.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generated Content */}
        {generatedPost && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Generated Blog Post
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="mt-1"
                />
              </div>

              {/* Content */}
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  rows={15}
                  className="mt-1"
                />
              </div>

              {/* Token Usage */}
              <div className="bg-muted/50 p-3 rounded-lg">
                <h4 className="font-medium mb-2">Generation Stats:</h4>
                <div className="text-sm space-y-1">
                  <div>Input Tokens: {generatedPost.tokenUsage.inputTokens.toLocaleString()}</div>
                  <div>Output Tokens: {generatedPost.tokenUsage.outputTokens.toLocaleString()}</div>
                  <div>Total Tokens: {generatedPost.tokenUsage.totalTokens.toLocaleString()}</div>
                  <div>Cost: ${generatedPost.tokenUsage.cost.toFixed(4)}</div>
                </div>
              </div>

              {/* Improve Post */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Improve This Post</h4>
                <Textarea
                  value={improveDetails}
                  onChange={(e) => setImproveDetails(e.target.value)}
                  placeholder="Describe how you'd like to improve the post (e.g., make it more technical, add more examples, change the tone...)"
                  rows={3}
                  className="mb-2"
                />
                <Button 
                  onClick={handleImprovePost} 
                  disabled={isImproving || !improveDetails.trim()}
                  variant="outline"
                >
                  {isImproving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Improving...
                    </>
                  ) : (
                    <>
                      <Edit3 className="h-4 w-4 mr-2" />
                      Improve Post
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Additional Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tags */}
            <div>
              <Label>Tags</Label>
              <div className="flex gap-2 mt-1 mb-2">
                <Input
                  value={formData.tagInput}
                  onChange={(e) => setFormData(prev => ({ ...prev, tagInput: e.target.value }))}
                  placeholder="Add a tag..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" onClick={addTag} variant="outline">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                    {tag} <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            </div>

            {/* Funding Status */}
            <div>
              <Label htmlFor="fundingStatus">Funding Status</Label>
              <select
                id="fundingStatus"
                value={formData.fundingStatus}
                onChange={(e) => setFormData(prev => ({ ...prev, fundingStatus: e.target.value as 'fully funded' | 'funding needed' | 'N/A' }))}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm mt-1"
              >
                <option value="N/A">N/A</option>
                <option value="fully funded">Fully Funded</option>
                <option value="funding needed">Funding Needed</option>
              </select>
            </div>

            {/* Resource Needed */}
            <div>
              <Label htmlFor="resourceNeeded">Resource Needed</Label>
              <select
                id="resourceNeeded"
                value={formData.resourceNeeded}
                onChange={(e) => setFormData(prev => ({ ...prev, resourceNeeded: e.target.value as 'cofounder needed' | 'dev needed' | 'business manager needed' | 'N/A' }))}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm mt-1"
              >
                <option value="N/A">N/A</option>
                <option value="cofounder needed">Cofounder Needed</option>
                <option value="dev needed">Developer Needed</option>
                <option value="business manager needed">Business Manager Needed</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex justify-end gap-3">
          <Link href="/blog">
            <Button variant="outline">
              Cancel
            </Button>
          </Link>
          <Button onClick={handleCreatePost} disabled={isSubmitting || !formData.title || !formData.content}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Post
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
