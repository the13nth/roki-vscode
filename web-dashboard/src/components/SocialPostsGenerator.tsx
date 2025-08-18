'use client';

import { useState } from 'react';
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
  ChevronDown,
  ChevronUp,
  Sparkles
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

interface SocialPostsGeneratorProps {
  projectId: string;
}

export function SocialPostsGenerator({ projectId }: SocialPostsGeneratorProps) {
  // Social Posts state
  const [socialPostsResult, setSocialPostsResult] = useState<SocialPostsResult | null>(null);
  const [isGeneratingSocial, setIsGeneratingSocial] = useState(false);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [socialSuccessMessage, setSocialSuccessMessage] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['twitter', 'linkedin']);
  const [numberOfPosts, setNumberOfPosts] = useState(3);
  const [socialTone, setSocialTone] = useState<'professional' | 'casual' | 'enthusiastic' | 'technical'>('professional');
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeEmojis, setIncludeEmojis] = useState(false);
  const [postBackground, setPostBackground] = useState('');
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});
  const [enhanceText, setEnhanceText] = useState<Record<string, string>>({});
  const [enhancePostType, setEnhancePostType] = useState<Record<string, string>>({});
  const [enhancingPosts, setEnhancingPosts] = useState<Record<string, boolean>>({});

  const handleGenerateSocialPosts = async () => {
    try {
      setIsGeneratingSocial(true);
      setSocialError(null);
      setSocialPostsResult(null);

      console.log('📱 Generating social posts...');
      console.log(`🎯 Platforms: ${selectedPlatforms.join(', ')}, Posts: ${numberOfPosts}, Tone: ${socialTone}`);

      // Create AbortController with timeout for social posts generation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 90000); // 90 seconds timeout

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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const result = await response.json();

      if (response.ok) {
        console.log('✅ Social posts generated successfully');
        console.log(`📊 Token usage: ${result.tokenUsage.totalTokens} tokens`);
        setSocialPostsResult(result);
        setSocialSuccessMessage('Social posts generated successfully!');
        setTimeout(() => setSocialSuccessMessage(null), 3000);
      } else {
        console.error('❌ Social posts generation failed:', result.error);
        setSocialError(result.error || 'Failed to generate social posts');
      }
    } catch (error) {
      console.error('❌ Social posts generation error:', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setSocialError('Social posts generation timed out after 90 seconds. Please try again or check your internet connection.');
        } else {
          setSocialError(`Error generating social posts: ${error.message}`);
        }
      } else {
        setSocialError('Error generating social posts');
      }
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

  const handleEnhancePost = async (postKey: string, originalContent: string, platform: string) => {
    const enhanceAdditions = enhanceText[postKey];
    const postType = enhancePostType[postKey] || 'promotional';
    
    if (!enhanceAdditions?.trim()) {
      setSocialError('Please provide enhancement text');
      setTimeout(() => setSocialError(null), 3000);
      return;
    }

    try {
      setEnhancingPosts(prev => ({ ...prev, [postKey]: true }));
      setSocialError(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const response = await fetch(`/api/projects/${projectId}/enhance-social-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalContent,
          platform,
          enhanceAdditions,
          postType,
          tone: socialTone,
          includeHashtags,
          includeEmojis,
          postBackground
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `Failed to enhance post: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Update the post in the results
        setSocialPostsResult(prev => {
          if (!prev) return prev;
          
          const updatedPosts = prev.posts.map(post => {
            const currentPostKey = `${post.platform}-${prev.posts.filter(p => p.platform === post.platform).indexOf(post)}`;
            if (currentPostKey === postKey) {
              return { ...post, content: result.enhancedContent };
            }
            return post;
          });
          
          return { ...prev, posts: updatedPosts };
        });
        
        setSocialSuccessMessage('Post enhanced successfully!');
        setTimeout(() => setSocialSuccessMessage(null), 3000);
        
        // Clear the enhancement text
        setEnhanceText(prev => ({ ...prev, [postKey]: '' }));
        setExpandedPosts(prev => ({ ...prev, [postKey]: false }));
      } else {
        throw new Error(result.message || 'Failed to enhance post');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setSocialError('Enhancement request timed out. Please try again.');
      } else {
        setSocialError(error.message || 'Failed to enhance post');
      }
      setTimeout(() => setSocialError(null), 5000);
    } finally {
      setEnhancingPosts(prev => ({ ...prev, [postKey]: false }));
    }
  };

  const togglePostExpansion = (postKey: string) => {
    setExpandedPosts(prev => ({ ...prev, [postKey]: !prev[postKey] }));
  };

  return (
    <div className="space-y-6">
      {/* Social Error */}
      {socialError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{socialError}</AlertDescription>
        </Alert>
      )}

      {/* Social Success */}
      {socialSuccessMessage && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{socialSuccessMessage}</AlertDescription>
        </Alert>
      )}

      {/* Social Posts Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Share2 className="w-5 h-5 mr-2" />
            Social Media Posts Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Platform Selection */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Select Platforms</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {['twitter', 'linkedin', 'facebook', 'instagram', 'tiktok', 'youtube'].map((platform) => (
                <div key={platform} className="flex items-center space-x-2">
                  <Checkbox
                    id={`platform-${platform}`}
                    checked={selectedPlatforms.includes(platform)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedPlatforms([...selectedPlatforms, platform]);
                      } else {
                        setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform));
                      }
                    }}
                  />
                  <Label htmlFor={`platform-${platform}`} className="text-sm capitalize">
                    {platform}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Post Background/Context */}
          <div>
            <Label htmlFor="post-background" className="text-sm font-medium mb-2 block">
              Post Background or Starting Point (Optional)
            </Label>
            <Input
              id="post-background"
              type="text"
              placeholder="e.g., I remember when I needed to buy this and couldn't find it..."
              value={postBackground}
              onChange={(e) => setPostBackground(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Provide a personal story, experience, or starting point for your posts. AI will build on this context.
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
                  <SelectValue placeholder="Select tone" />
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
              <Label className="text-sm font-medium block">Options</Label>
              <div className="space-y-2">
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
          </div>

          {/* Generate Social Posts Button */}
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

      {/* Social Posts Results */}
      {socialPostsResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Generated Social Posts</CardTitle>
              <Badge variant="outline">
                {socialPostsResult.tokenUsage.totalTokens} tokens • ${socialPostsResult.tokenUsage.cost.toFixed(4)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedPlatforms.map((platform) => {
                const platformPosts = socialPostsResult.posts.filter(post => post.platform === platform);
                if (platformPosts.length === 0) return null;
                
                return (
                  <Card key={platform} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span className="capitalize">{platform} Posts</span>
                        <Badge variant="secondary">{platformPosts.length} posts</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {platformPosts.map((post, index) => {
                          const postKey = `${platform}-${index}`;
                          const isExpanded = expandedPosts[postKey];
                          const isEnhancing = enhancingPosts[postKey];
                          
                          return (
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
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => togglePostExpansion(postKey)}
                                  >
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    Enhance
                                    {isExpanded ? (
                                      <ChevronUp className="w-3 h-3 ml-1" />
                                    ) : (
                                      <ChevronDown className="w-3 h-3 ml-1" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="whitespace-pre-wrap text-sm bg-white p-3 rounded border">
                                {post.content}
                              </div>
                              
                              {post.hashtags && post.hashtags.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {post.hashtags.map((hashtag, hashIndex) => (
                                    <Badge key={hashIndex} variant="secondary" className="text-xs">
                                      {hashtag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              
                              {/* Enhancement Section */}
                              {isExpanded && (
                                <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200">
                                  <div className="space-y-3">
                                    <div className="flex items-center">
                                      <Sparkles className="w-4 h-4 mr-2 text-blue-600" />
                                      <span className="text-sm font-medium">Enhance Post</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div>
                                        <Label htmlFor={`post-type-${postKey}`} className="text-xs font-medium mb-1 block">
                                          Post Type
                                        </Label>
                                        <Select 
                                          value={enhancePostType[postKey] || 'promotional'} 
                                          onValueChange={(value) => setEnhancePostType(prev => ({ ...prev, [postKey]: value }))}
                                        >
                                          <SelectTrigger className="w-full text-xs">
                                            <SelectValue placeholder="Select post type" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="promotional">Promotional</SelectItem>
                                            <SelectItem value="story">Story/Personal</SelectItem>
                                            <SelectItem value="educational">Educational</SelectItem>
                                            <SelectItem value="announcement">Announcement</SelectItem>
                                            <SelectItem value="behind-the-scenes">Behind the Scenes</SelectItem>
                                            <SelectItem value="testimonial">Testimonial</SelectItem>
                                            <SelectItem value="question">Question/Poll</SelectItem>
                                            <SelectItem value="inspirational">Inspirational</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <Label htmlFor={`enhance-text-${postKey}`} className="text-xs font-medium mb-1 block">
                                        Enhancement Instructions
                                      </Label>
                                      <Textarea
                                        id={`enhance-text-${postKey}`}
                                        placeholder="e.g., Add more emotional appeal, include a call to action, make it more personal..."
                                        value={enhanceText[postKey] || ''}
                                        onChange={(e) => setEnhanceText(prev => ({ ...prev, [postKey]: e.target.value }))}
                                        className="text-xs"
                                        rows={3}
                                      />
                                    </div>
                                    
                                    <Button
                                      size="sm"
                                      onClick={() => handleEnhancePost(postKey, post.content, platform)}
                                      disabled={isEnhancing || !enhanceText[postKey]?.trim()}
                                      className="w-full"
                                    >
                                      {isEnhancing ? (
                                        <>
                                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                          Enhancing...
                                        </>
                                      ) : (
                                        <>
                                          <Sparkles className="w-3 h-3 mr-1" />
                                          Enhance Post
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
