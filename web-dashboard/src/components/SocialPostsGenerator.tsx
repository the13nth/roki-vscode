'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Share2,
  Hash,
  Smile,
  Loader2,
  CheckCircle,
  AlertCircle,
  Copy,
  Brain,
  Lightbulb,
  Edit3,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Save,
  BarChart3
} from 'lucide-react';

interface SocialPost {
  platform: string;
  content: string;
  hashtags?: string[];
  characterCount: number;
}

interface SavedPost {
  id: string;
  platform: string;
  content: string;
  hashtags?: string[];
  characterCount: number;
  status: 'posted' | 'not-yet-posted';
  createdAt: string;
  postedAt?: string;
  performance?: {
    likes?: number;
    shares?: number;
    comments?: number;
    views?: number;
    clicks?: number;
    engagement_rate?: number;
  };
}

interface SocialPostsResult {
  posts: SocialPost[];
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost: number;
  };
}

interface AnalysisResult {
  summary: string;
  insights: string[];
  timestamp: string;
}

interface SocialPostsGeneratorProps {
  projectId: string;
  isOwned?: boolean;
}

export function SocialPostsGenerator({ projectId, isOwned = true }: SocialPostsGeneratorProps) {
  // Social Posts state
  const [socialPostsResult, setSocialPostsResult] = useState<SocialPostsResult | null>(null);
  const [isGeneratingSocial, setIsGeneratingSocial] = useState(false);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [socialSuccessMessage, setSocialSuccessMessage] = useState<string | null>(null);
  
  // Configuration state
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['twitter', 'linkedin']);
  const [numberOfPosts, setNumberOfPosts] = useState(3);
  const [socialTone, setSocialTone] = useState<'professional' | 'casual' | 'enthusiastic' | 'technical'>('professional');
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeEmojis, setIncludeEmojis] = useState(false);
  const [postBackground, setPostBackground] = useState('');

  // Analysis data state
  const [analysisData, setAnalysisData] = useState<Record<string, AnalysisResult>>({});
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(true);

  // Improve post state
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [improvingPosts, setImprovingPosts] = useState<Set<string>>(new Set());
  const [improveDetails, setImproveDetails] = useState<Record<string, string>>({});
  const [improvedPosts, setImprovedPosts] = useState<Record<string, string>>({});

  // Save post state
  const [savingPosts, setSavingPosts] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [savedPostsList, setSavedPostsList] = useState<SavedPost[]>([]);
  const [showSavedPosts, setShowSavedPosts] = useState(false);

  // Platform options
  const platformOptions = [
    { id: 'twitter', name: 'Twitter/X', limit: '280 chars' },
    { id: 'linkedin', name: 'LinkedIn', limit: '3000 chars' },
    { id: 'instagram', name: 'Instagram', limit: '2200 chars' },
    { id: 'facebook', name: 'Facebook', limit: '63206 chars' },
    { id: 'tiktok', name: 'TikTok', limit: '2200 chars' },
    { id: 'youtube', name: 'YouTube', limit: '5000 chars' }
  ];

  // Load existing analysis data on component mount
  useEffect(() => {
    const loadAnalysisData = async () => {
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

    loadAnalysisData();
    loadSavedPosts();
  }, [projectId]);

  const handleGenerateSocialPosts = async () => {
    try {
      setIsGeneratingSocial(true);
      setSocialError(null);
      setSocialPostsResult(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 seconds timeout

      const response = await fetch(`/api/projects/${projectId}/generate-social-posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platforms: selectedPlatforms,
          numberOfPosts,
          tone: socialTone,
          includeHashtags,
          includeEmojis,
          postBackground
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate social posts');
      }

      const result = await response.json();
      setSocialPostsResult(result);
      setSocialSuccessMessage('Social media posts generated successfully!');
      setTimeout(() => setSocialSuccessMessage(null), 5000);
      
    } catch (error: any) {
      console.error('Social posts generation error:', error);
      if (error.name === 'AbortError') {
        setSocialError('Social posts generation timed out. Please try again.');
      } else {
        setSocialError(error.message || 'Failed to generate social posts');
      }
      setTimeout(() => setSocialError(null), 10000);
    } finally {
      setIsGeneratingSocial(false);
    }
  };

  const handleCopyPost = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setSocialSuccessMessage('Post copied to clipboard!');
      setTimeout(() => setSocialSuccessMessage(null), 3000);
    } catch (error) {
      setSocialError('Failed to copy post to clipboard');
      setTimeout(() => setSocialError(null), 3000);
    }
  };

  const handlePlatformToggle = (platformId: string, checked: boolean) => {
    if (checked) {
      setSelectedPlatforms([...selectedPlatforms, platformId]);
    } else {
      setSelectedPlatforms(selectedPlatforms.filter(id => id !== platformId));
    }
  };

  const getAnalysisCount = () => {
    return Object.keys(analysisData).length;
  };

  const getPostId = (platform: string, index: number) => {
    return `${platform}-${index}`;
  };

  const togglePostExpansion = (postId: string) => {
    const newExpanded = new Set(expandedPosts);
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId);
    } else {
      newExpanded.add(postId);
    }
    setExpandedPosts(newExpanded);
  };

  const handleImproveDetailsChange = (postId: string, details: string) => {
    setImproveDetails(prev => ({
      ...prev,
      [postId]: details
    }));
  };

  const handleImprovePost = async (platform: string, index: number, originalContent: string) => {
    const postId = getPostId(platform, index);
    const details = improveDetails[postId];
    
    if (!details?.trim()) {
      setSocialError('Please provide details on how to improve the post');
      setTimeout(() => setSocialError(null), 3000);
      return;
    }

    try {
      setImprovingPosts(prev => new Set([...prev, postId]));
      setSocialError(null);

      const response = await fetch(`/api/projects/${projectId}/enhance-social-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform,
          originalContent,
          improvementDetails: details,
          tone: socialTone,
          includeHashtags,
          includeEmojis
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to improve post');
      }

      const result = await response.json();
      
      // Update the improved posts
      setImprovedPosts(prev => ({
        ...prev,
        [postId]: result.improvedContent
      }));

      // Update the original posts result with the improved content
      if (socialPostsResult) {
        const updatedPosts = [...socialPostsResult.posts];
        const postIndex = updatedPosts.findIndex((post, idx) => 
          post.platform === platform && idx === socialPostsResult.posts.filter(p => p.platform === platform).indexOf(post) + socialPostsResult.posts.filter((p, i) => p.platform === platform && i < socialPostsResult.posts.indexOf(post)).length
        );
        
        // Find the correct post by platform and position
        let platformPostIndex = 0;
        let globalPostIndex = -1;
        for (let i = 0; i < updatedPosts.length; i++) {
          if (updatedPosts[i].platform === platform) {
            if (platformPostIndex === index) {
              globalPostIndex = i;
              break;
            }
            platformPostIndex++;
          }
        }

        if (globalPostIndex !== -1) {
          updatedPosts[globalPostIndex] = {
            ...updatedPosts[globalPostIndex],
            content: result.improvedContent,
            characterCount: result.improvedContent.length
          };

          setSocialPostsResult({
            ...socialPostsResult,
            posts: updatedPosts
          });
        }
      }

      setSocialSuccessMessage('Post improved successfully!');
      setTimeout(() => setSocialSuccessMessage(null), 3000);
      
      // Clear the improvement details and collapse
      setImproveDetails(prev => ({
        ...prev,
        [postId]: ''
      }));
      setExpandedPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });

    } catch (error: any) {
      console.error('Post improvement error:', error);
      setSocialError(error.message || 'Failed to improve post');
      setTimeout(() => setSocialError(null), 5000);
    } finally {
      setImprovingPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    }
  };

  const handleSavePost = async (platform: string, index: number, post: SocialPost, status: 'posted' | 'not-yet-posted') => {
    const postId = getPostId(platform, index);
    
    try {
      setSavingPosts(prev => new Set([...prev, postId]));
      setSocialError(null);

      const response = await fetch(`/api/projects/${projectId}/social-posts/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: post.platform,
          content: post.content,
          hashtags: post.hashtags,
          characterCount: post.characterCount,
          status,
          postedAt: status === 'posted' ? new Date().toISOString() : undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save post');
      }

      const result = await response.json();
      
      // Mark post as saved
      setSavedPosts(prev => new Set([...prev, postId]));
      
      // Add to saved posts list
      setSavedPostsList(prev => [result.savedPost, ...prev]);

      setSocialSuccessMessage(`Post saved as "${status}"!`);
      setTimeout(() => setSocialSuccessMessage(null), 3000);

    } catch (error: any) {
      console.error('Save post error:', error);
      setSocialError(error.message || 'Failed to save post');
      setTimeout(() => setSocialError(null), 5000);
    } finally {
      setSavingPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    }
  };

  const loadSavedPosts = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/social-posts/saved`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.savedPosts) {
          setSavedPostsList(data.savedPosts);
        }
      }
    } catch (error) {
      console.error('Failed to load saved posts:', error);
    }
  };

  const updatePostPerformance = async (postId: string, performance: SavedPost['performance']) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/social-posts/${postId}/performance`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ performance })
      });

      if (!response.ok) {
        throw new Error('Failed to update performance');
      }

      // Update local state
      setSavedPostsList(prev => 
        prev.map(post => 
          post.id === postId 
            ? { ...post, performance: { ...post.performance, ...performance } }
            : post
        )
      );

      setSocialSuccessMessage('Performance updated successfully!');
      setTimeout(() => setSocialSuccessMessage(null), 3000);

    } catch (error: any) {
      console.error('Update performance error:', error);
      setSocialError(error.message || 'Failed to update performance');
      setTimeout(() => setSocialError(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Read-only notice for non-owners */}
      {!isOwned && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <Share2 className="w-4 h-4" />
            <span>Read-only view: You can view existing social posts but cannot generate new ones.</span>
          </div>
        </div>
      )}
      
      {/* Analysis Data Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Brain className="w-5 h-5 mr-2" />
            Available Analysis Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingAnalysis ? (
            <div className="flex items-center">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading analysis data...
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Using insights from {getAnalysisCount()} completed analyses to generate personalized social media posts.
              </p>
              {getAnalysisCount() > 0 ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(analysisData).map((type) => {
                      const analysis = analysisData[type];
                      const getTypeColor = (analysisType: string) => {
                        switch (analysisType) {
                          case 'technical': return 'bg-blue-100 text-blue-800 border-blue-300';
                          case 'market': return 'bg-purple-100 text-purple-800 border-purple-300';
                          case 'differentiation': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
                          case 'financial': return 'bg-green-100 text-green-800 border-green-300';
                          case 'bmc': return 'bg-orange-100 text-orange-800 border-orange-300';
                          case 'roast': return 'bg-red-100 text-red-800 border-red-300';
                          default: return 'bg-gray-100 text-gray-800 border-gray-300';
                        }
                      };
                      
                      return (
                        <Badge 
                          key={type} 
                          variant="outline" 
                          className={`capitalize ${getTypeColor(type)} font-medium`}
                        >
                          <Lightbulb className="w-3 h-3 mr-1" />
                          {type.replace(/([A-Z])/g, ' $1').trim()}
                        </Badge>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500">
                    Saved analyses will provide richer context for social media content, including insights, recommendations, and market positioning.
                  </p>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No analysis data available. Run some analyses first to generate more personalized posts.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Share2 className="w-5 h-5 mr-2" />
            Social Media Posts Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Platform Selection */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Select Social Media Platforms</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {platformOptions.map((platform) => (
                <div key={platform.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    id={platform.id}
                    checked={selectedPlatforms.includes(platform.id)}
                    onCheckedChange={(checked) => handlePlatformToggle(platform.id, checked as boolean)}
                    disabled={!isOwned}
                  />
                  <div className="flex-1">
                    <Label htmlFor={platform.id} className="text-sm font-medium cursor-pointer">
                      {platform.name}
                    </Label>
                    <p className="text-xs text-gray-500">{platform.limit}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Post Background */}
          <div>
            <Label htmlFor="post-background" className="text-sm font-medium mb-2 block">
              Post Background / Starting Point
            </Label>
            <Textarea
              id="post-background"
              value={postBackground}
              onChange={(e) => setPostBackground(e.target.value)}
              placeholder="e.g., I remember when I needed to buy this and couldn't find it..."
              className="min-h-[80px]"
              disabled={!isOwned}
            />
            <p className="text-xs text-gray-500 mt-1">
              Provide context or a personal story that AI can use as inspiration for your posts
            </p>
          </div>

          {/* Configuration Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="posts-count" className="text-sm font-medium mb-2 block">Posts per Platform</Label>
              <Input
                id="posts-count"
                type="number"
                min="1"
                max="10"
                value={numberOfPosts}
                onChange={(e) => setNumberOfPosts(parseInt(e.target.value) || 1)}
                className="w-full"
                disabled={!isOwned}
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium mb-2 block">Tone</Label>
              <Select value={socialTone} onValueChange={(value: 'professional' | 'casual' | 'enthusiastic' | 'technical') => setSocialTone(value)} disabled={!isOwned}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-hashtags"
                  checked={includeHashtags}
                  onCheckedChange={(checked) => setIncludeHashtags(checked as boolean)}
                  disabled={!isOwned}
                />
                <Label htmlFor="include-hashtags" className="text-sm flex items-center">
                  <Hash className="w-3 h-3 mr-1" />
                  Include Hashtags
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-emojis"
                  checked={includeEmojis}
                  onCheckedChange={(checked) => setIncludeEmojis(checked as boolean)}
                  disabled={!isOwned}
                />
                <Label htmlFor="include-emojis" className="text-sm flex items-center">
                  <Smile className="w-3 h-3 mr-1" />
                  Include Emojis
                </Label>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <Button 
            onClick={handleGenerateSocialPosts} 
            disabled={!isOwned || isGeneratingSocial || selectedPlatforms.length === 0}
            className="w-full"
          >
            {isGeneratingSocial ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Social Posts...
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 mr-2" />
                Generate Social Posts
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error/Success Messages */}
      {socialError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{socialError}</AlertDescription>
        </Alert>
      )}

      {socialSuccessMessage && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{socialSuccessMessage}</AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {socialPostsResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Share2 className="w-5 h-5 mr-2" />
              Generated Social Media Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Group posts by platform */}
              {selectedPlatforms.map((platform) => {
                const platformPosts = socialPostsResult.posts.filter(post => post.platform === platform);
                if (platformPosts.length === 0) return null;

                const platformName = platformOptions.find(p => p.id === platform)?.name || platform;

                return (
                  <div key={platform} className="space-y-3">
                    <div className="flex items-center">
                      <Share2 className="w-4 h-4 mr-2" />
                      <h4 className="font-semibold text-md">{platformName}</h4>
                      <Badge variant="outline" className="ml-2">
                        {platformPosts.length} posts
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      {platformPosts.map((post, index) => {
                        const postId = getPostId(platform, index);
                        const isExpanded = expandedPosts.has(postId);
                        const isImproving = improvingPosts.has(postId);
                        const isSaving = savingPosts.has(postId);
                        const isSaved = savedPosts.has(postId);
                        const improveText = improveDetails[postId] || '';

                        return (
                          <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Post #{index + 1}</span>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-xs">
                                  {post.characterCount} chars
                                </Badge>
                                {!isSaved && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleSavePost(platform, index, post, 'not-yet-posted')}
                                      disabled={!isOwned || isSaving}
                                      className="flex items-center"
                                    >
                                      {isSaving ? (
                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                      ) : (
                                        <Save className="w-3 h-3 mr-1" />
                                      )}
                                      Save as Draft
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => handleSavePost(platform, index, post, 'posted')}
                                      disabled={!isOwned || isSaving}
                                      className="flex items-center"
                                    >
                                      {isSaving ? (
                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                      ) : (
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                      )}
                                      Mark as Posted
                                    </Button>
                                  </>
                                )}
                                {isSaved && (
                                  <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Saved
                                  </Badge>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => togglePostExpansion(postId)}
                                  disabled={!isOwned}
                                  className="flex items-center"
                                >
                                  <Edit3 className="w-3 h-3 mr-1" />
                                  Improve
                                  {isExpanded ? (
                                    <ChevronUp className="w-3 h-3 ml-1" />
                                  ) : (
                                    <ChevronDown className="w-3 h-3 ml-1" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCopyPost(post.content)}
                                >
                                  <Copy className="w-3 h-3 mr-1" />
                                  Copy
                                </Button>
                              </div>
                            </div>
                            
                            <div className="bg-white p-3 rounded border">
                              <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                            </div>
                            
                            {post.hashtags && post.hashtags.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {post.hashtags.map((hashtag, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    #{hashtag}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {/* Collapsible Improve Section */}
                            {isExpanded && (
                              <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                                <div className="flex items-center mb-2">
                                  <Sparkles className="w-4 h-4 mr-2 text-blue-600" />
                                  <span className="text-sm font-medium text-blue-800">
                                    Improve this post
                                  </span>
                                </div>
                                <div className="space-y-3">
                                  <div>
                                    <Label htmlFor={`improve-${postId}`} className="text-xs font-medium text-gray-700 mb-1 block">
                                      What would you like to improve or change about this post?
                                    </Label>
                                    <Textarea
                                      id={`improve-${postId}`}
                                      value={improveText}
                                      onChange={(e) => handleImproveDetailsChange(postId, e.target.value)}
                                      placeholder="e.g., Make it more engaging, add a call-to-action, focus on benefits, make it shorter, add more technical details..."
                                      className="min-h-[60px] text-xs"
                                      disabled={!isOwned || isImproving}
                                    />
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleImprovePost(platform, index, post.content)}
                                      disabled={!isOwned || isImproving || !improveText.trim()}
                                      className="flex items-center"
                                    >
                                      {isImproving ? (
                                        <>
                                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                          Improving...
                                        </>
                                      ) : (
                                        <>
                                          <Sparkles className="w-3 h-3 mr-1" />
                                          Improve Post
                                        </>
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => togglePostExpansion(postId)}
                                      disabled={isImproving}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                  <p className="text-xs text-gray-600">
                                    The AI will rewrite this post based on your feedback while maintaining the original tone and platform requirements.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Token Usage */}
              {/* {socialPostsResult.tokenUsage && (
                <div className="pt-4 border-t">
                  <h4 className="font-medium text-sm mb-2">Generation Stats</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Input Tokens:</span>
                      <span className="ml-1 font-medium">{socialPostsResult.tokenUsage.inputTokens.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Output Tokens:</span>
                      <span className="ml-1 font-medium">{socialPostsResult.tokenUsage.outputTokens.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Tokens:</span>
                      <span className="ml-1 font-medium">{socialPostsResult.tokenUsage.totalTokens.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Cost:</span>
                      <span className="ml-1 font-medium">${socialPostsResult.tokenUsage.cost.toFixed(4)}</span>
                    </div>
                  </div>
                </div>
              )} */}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved Posts */}
      {savedPostsList.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Saved Posts ({savedPostsList.length})
              </CardTitle>
              <Button
                variant="outline"
                onClick={() => setShowSavedPosts(!showSavedPosts)}
                className="flex items-center"
              >
                {showSavedPosts ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-1" />
                    Hide
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-1" />
                    Show
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          {showSavedPosts && (
            <CardContent>
              <div className="space-y-4">
                {savedPostsList.map((savedPost) => (
                  <SavedPostCard
                    key={savedPost.id}
                    post={savedPost}
                    onUpdatePerformance={updatePostPerformance}
                  />
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}

// SavedPostCard component for displaying saved posts with performance tracking
interface SavedPostCardProps {
  post: SavedPost;
  onUpdatePerformance: (postId: string, performance: SavedPost['performance']) => void;
}

function SavedPostCard({ post, onUpdatePerformance }: SavedPostCardProps) {
  const [isEditingPerformance, setIsEditingPerformance] = useState(false);
  const [performanceData, setPerformanceData] = useState(post.performance || {});

  const handleUpdatePerformance = () => {
    onUpdatePerformance(post.id, performanceData);
    setIsEditingPerformance(false);
  };

  const getStatusBadge = (status: 'posted' | 'not-yet-posted') => {
    if (status === 'posted') {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-300">
          <CheckCircle className="w-3 h-3 mr-1" />
          Posted
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
          <Save className="w-3 h-3 mr-1" />
          Draft
        </Badge>
      );
    }
  };

  const platformName = {
    twitter: 'Twitter/X',
    linkedin: 'LinkedIn',
    instagram: 'Instagram',
    facebook: 'Facebook',
    tiktok: 'TikTok',
    youtube: 'YouTube'
  }[post.platform] || post.platform;

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            {platformName}
          </Badge>
          {getStatusBadge(post.status)}
          <span className="text-xs text-gray-500">
            {new Date(post.createdAt).toLocaleDateString()}
          </span>
          {post.postedAt && (
            <span className="text-xs text-gray-500">
              • Posted {new Date(post.postedAt).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditingPerformance(!isEditingPerformance)}
            className="flex items-center"
          >
            <BarChart3 className="w-3 h-3 mr-1" />
            {isEditingPerformance ? 'Cancel' : 'Update Performance'}
          </Button>
        </div>
      </div>

      <div className="bg-gray-50 p-3 rounded border mb-3">
        <p className="text-sm whitespace-pre-wrap">{post.content}</p>
      </div>

      {post.hashtags && post.hashtags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {post.hashtags.map((hashtag, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              #{hashtag}
            </Badge>
          ))}
        </div>
      )}

      {/* Performance Metrics */}
      {(post.performance || isEditingPerformance) && (
        <div className="border-t pt-3">
          <h5 className="text-sm font-medium mb-2 flex items-center">
            <BarChart3 className="w-4 h-4 mr-1" />
            Performance Metrics
          </h5>

          {isEditingPerformance ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor={`likes-${post.id}`} className="text-xs">Likes</Label>
                  <Input
                    id={`likes-${post.id}`}
                    type="number"
                    value={performanceData.likes || ''}
                    onChange={(e) => setPerformanceData(prev => ({ ...prev, likes: parseInt(e.target.value) || 0 }))}
                    className="text-xs h-8"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor={`shares-${post.id}`} className="text-xs">Shares</Label>
                  <Input
                    id={`shares-${post.id}`}
                    type="number"
                    value={performanceData.shares || ''}
                    onChange={(e) => setPerformanceData(prev => ({ ...prev, shares: parseInt(e.target.value) || 0 }))}
                    className="text-xs h-8"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor={`comments-${post.id}`} className="text-xs">Comments</Label>
                  <Input
                    id={`comments-${post.id}`}
                    type="number"
                    value={performanceData.comments || ''}
                    onChange={(e) => setPerformanceData(prev => ({ ...prev, comments: parseInt(e.target.value) || 0 }))}
                    className="text-xs h-8"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor={`views-${post.id}`} className="text-xs">Views</Label>
                  <Input
                    id={`views-${post.id}`}
                    type="number"
                    value={performanceData.views || ''}
                    onChange={(e) => setPerformanceData(prev => ({ ...prev, views: parseInt(e.target.value) || 0 }))}
                    className="text-xs h-8"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor={`clicks-${post.id}`} className="text-xs">Clicks</Label>
                  <Input
                    id={`clicks-${post.id}`}
                    type="number"
                    value={performanceData.clicks || ''}
                    onChange={(e) => setPerformanceData(prev => ({ ...prev, clicks: parseInt(e.target.value) || 0 }))}
                    className="text-xs h-8"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor={`engagement-${post.id}`} className="text-xs">Engagement Rate (%)</Label>
                  <Input
                    id={`engagement-${post.id}`}
                    type="number"
                    step="0.1"
                    value={performanceData.engagement_rate || ''}
                    onChange={(e) => setPerformanceData(prev => ({ ...prev, engagement_rate: parseFloat(e.target.value) || 0 }))}
                    className="text-xs h-8"
                    placeholder="0.0"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button size="sm" onClick={handleUpdatePerformance}>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Save Performance
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditingPerformance(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Likes:</span>
                <span className="ml-1 font-medium">{post.performance?.likes?.toLocaleString() || '—'}</span>
              </div>
              <div>
                <span className="text-gray-600">Shares:</span>
                <span className="ml-1 font-medium">{post.performance?.shares?.toLocaleString() || '—'}</span>
              </div>
              <div>
                <span className="text-gray-600">Comments:</span>
                <span className="ml-1 font-medium">{post.performance?.comments?.toLocaleString() || '—'}</span>
              </div>
              <div>
                <span className="text-gray-600">Views:</span>
                <span className="ml-1 font-medium">{post.performance?.views?.toLocaleString() || '—'}</span>
              </div>
              <div>
                <span className="text-gray-600">Clicks:</span>
                <span className="ml-1 font-medium">{post.performance?.clicks?.toLocaleString() || '—'}</span>
              </div>
              <div>
                <span className="text-gray-600">Engagement:</span>
                <span className="ml-1 font-medium">
                  {post.performance?.engagement_rate ? `${post.performance.engagement_rate.toFixed(1)}%` : '—'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}