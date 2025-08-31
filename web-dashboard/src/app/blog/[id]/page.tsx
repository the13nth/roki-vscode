'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import RequirementApplicationModal from '@/components/RequirementApplicationModal';
import { 
  ArrowLeft, 
  Eye, 
  Clock, 
  User, 
  Calendar, 
  Edit, 
  Trash2,
  Share2
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
  views: number;
}

export default function BlogPostPage() {
  const { user, isSignedIn } = useUser();
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
        setPost(data.post);
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

  const handleDeletePost = async () => {
    if (!post || !confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/blog-posts/${post.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        router.push('/blog');
      } else {
        setError(data.error || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      setError('Failed to delete post');
    } finally {
      setIsDeleting(false);
    }
  };



  const handleShare = async () => {
    if (!post) return;
    
    const shareData = {
      title: post.title,
      text: post.excerpt,
      url: window.location.href,
    };
    
    try {
      // Try native sharing first (mobile devices)
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      // If native sharing fails or is cancelled, try clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      } catch (clipboardError) {
        console.error('Failed to copy to clipboard:', clipboardError);
        alert('Failed to share. Please copy the URL manually.');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
          <h1 className="text-2xl font-bold mb-4">Post Not Found</h1>
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
      {/* Back button */}
      <div className="mb-6">
        <Link href="/blog">
          <Button variant="ghost" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Button>
        </Link>
      </div>

      {/* Post content */}
      <div className="max-w-4xl mx-auto">
        <Card className="mb-8">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-3xl font-bold mb-4">{post.title}</CardTitle>
                
                {/* Meta information */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {post.authorName}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(post.publishedAt)} at {formatTime(post.publishedAt)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {post.readTime} min read
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {post.views} views
                  </div>
                </div>

                {/* Project link */}
                {post.projectName && (
                  <div className="mb-4">
                    <span className="text-muted-foreground">Related Project: </span>
                    <Link href={`/project/${post.projectId}`} className="text-primary hover:underline font-medium">
                      {post.projectName}
                    </Link>
                  </div>
                )}

                {/* Tags */}
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map(tag => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Funding and Resource Status */}
                <div className="flex flex-wrap gap-2">
                  {post.fundingStatus !== 'N/A' && (
                    post.fundingStatus === 'funding needed' ? (
                      <RequirementApplicationModal
                        projectId={post.projectId}
                        projectName={post.projectName}
                        requirementType="funding needed"
                      >
                        <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80 transition-colors">
                          💸 Funding Needed
                        </Badge>
                      </RequirementApplicationModal>
                    ) : (
                      <Badge variant="default">
                        💰 Fully Funded
                      </Badge>
                    )
                  )}
                  {post.resourceNeeded !== 'N/A' && (
                    <RequirementApplicationModal
                      projectId={post.projectId}
                      projectName={post.projectName}
                      requirementType={post.resourceNeeded}
                    >
                      <Badge variant="outline" className="cursor-pointer hover:bg-accent transition-colors">
                        {post.resourceNeeded === 'cofounder needed' ? '👥 Cofounder Needed' :
                         post.resourceNeeded === 'dev needed' ? '💻 Developer Needed' :
                         post.resourceNeeded === 'business manager needed' ? '📊 Business Manager Needed' : post.resourceNeeded}
                      </Badge>
                    </RequirementApplicationModal>
                  )}
                </div>
              </div>

              {/* Action buttons for post owner */}
              {isSignedIn && post.authorId === user?.id && (
                <div className="flex gap-2 ml-4">
                  <Link href={`/blog/${post.id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDeletePost}
                    disabled={isDeleting}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {/* Content */}
            <div className="prose prose-lg max-w-none">
              <div className="whitespace-pre-wrap leading-relaxed">
                {post.content}
              </div>
            </div>

            {/* Engagement section */}
            <div className="border-t mt-8 pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleShare}
                    className="flex items-center gap-2"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground">
                  Last updated: {formatDate(post.updatedAt)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Author info */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{post.authorName}</h3>
                <p className="text-sm text-muted-foreground">
                  Author • Published on {formatDate(post.publishedAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
