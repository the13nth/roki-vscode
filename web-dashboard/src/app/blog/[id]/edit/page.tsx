'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  Save, 
  X,
  Loader2
} from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  authorId: string;
  authorName: string;
  projectId: string;
  projectName: string;
  tags: string[];
  fundingStatus: 'fully funded' | 'funding needed' | 'N/A';
  resourceNeeded: 'cofounder needed' | 'dev needed' | 'business manager needed' | 'N/A';
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  readTime: number;
  likes: number;
  views: number;
}

export default function EditBlogPostPage() {
  const { user, isSignedIn } = useUser();
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: [] as string[],
    tagInput: '',
    fundingStatus: 'N/A' as 'fully funded' | 'funding needed' | 'N/A',
    resourceNeeded: 'N/A' as 'cofounder needed' | 'dev needed' | 'business manager needed' | 'N/A'
  });

  useEffect(() => {
    if (params.id) {
      fetchPost(params.id as string);
    }
  }, [params.id]);

  const fetchPost = async (postId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/blog-posts/${postId}`);
      const data = await response.json();
      
      if (data.success) {
        const fetchedPost = data.post;
        
        // Check if user owns the post
        if (fetchedPost.authorId !== user?.id) {
          setError('You can only edit your own posts');
          return;
        }
        
        setPost(fetchedPost);
        setFormData({
          title: fetchedPost.title,
          content: fetchedPost.content,
          tags: fetchedPost.tags,
          tagInput: '',
          fundingStatus: fetchedPost.fundingStatus,
          resourceNeeded: fetchedPost.resourceNeeded
        });
      } else {
        setError(data.error || 'Post not found');
      }
    } catch (error) {
      console.error('Error fetching post:', error);
      setError('Failed to fetch blog post');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!post || !formData.title.trim() || !formData.content.trim()) {
      setError('Title and content are required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/blog-posts/${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          tags: formData.tags,
          fundingStatus: formData.fundingStatus,
          resourceNeeded: formData.resourceNeeded
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/blog/${post.id}`);
      } else {
        setError(data.error || 'Failed to update post');
      }
    } catch (error) {
      console.error('Error updating post:', error);
      setError('Failed to update post');
    } finally {
      setSaving(false);
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
          <p className="text-muted-foreground mb-6">You need to be signed in to edit blog posts.</p>
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading blog post...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-muted-foreground mb-6">{error || 'The blog post you are looking for does not exist.'}</p>
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
        <div className="flex items-center justify-between">
          <div>
            <Link href={`/blog/${post.id}`}>
              <Button variant="ghost" className="flex items-center gap-2 mb-4">
                <ArrowLeft className="h-4 w-4" />
                Back to Post
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Edit Blog Post</h1>
            <p className="text-muted-foreground mt-2">
              Update your blog post content and metadata
            </p>
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Edit Post</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter your post title..."
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
                placeholder="Write your blog post content..."
                rows={15}
                className="mt-1"
              />
            </div>
            
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

            {/* Project info (read-only) */}
            {post.projectName && (
              <div>
                <Label>Related Project</Label>
                <div className="mt-1 p-3 bg-muted rounded-md">
                  <Link href={`/project/${post.projectId}`} className="text-primary hover:underline font-medium">
                    {post.projectName}
                  </Link>
                  <p className="text-sm text-muted-foreground mt-1">
                    Project ID: {post.projectId}
                  </p>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Link href={`/blog/${post.id}`}>
                <Button variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Post Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Author:</span> {post.authorName}
              </div>
              <div>
                <span className="font-medium">Published:</span> {new Date(post.publishedAt).toLocaleDateString()}
              </div>
              <div>
                <span className="font-medium">Views:</span> {post.views}
              </div>
              <div>
                <span className="font-medium">Likes:</span> {post.likes}
              </div>
              <div>
                <span className="font-medium">Read Time:</span> {post.readTime} min
              </div>
              <div>
                <span className="font-medium">Last Updated:</span> {new Date(post.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
