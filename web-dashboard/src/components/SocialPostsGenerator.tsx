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
  Lightbulb
} from 'lucide-react';

interface SocialPost {
  platform: string;
  content: string;
  hashtags?: string[];
  characterCount: number;
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
}

export function SocialPostsGenerator({ projectId }: SocialPostsGeneratorProps) {
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

  return (
    <div className="space-y-6">
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
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium mb-2 block">Tone</Label>
              <Select value={socialTone} onValueChange={(value: 'professional' | 'casual' | 'enthusiastic' | 'technical') => setSocialTone(value)}>
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
            disabled={isGeneratingSocial || selectedPlatforms.length === 0}
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
                      {platformPosts.map((post, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Post #{index + 1}</span>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-xs">
                                {post.characterCount} chars
                              </Badge>
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
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Token Usage */}
              {socialPostsResult.tokenUsage && (
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
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}