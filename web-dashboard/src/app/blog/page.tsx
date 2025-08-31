'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import RequirementApplicationModal from '@/components/RequirementApplicationModal';
import { 
  Plus, 
  Eye, 
  Clock, 
  User, 
  Tag, 
  Edit, 
  Trash2, 
  Search,
  Filter,
  Calendar,
  BookOpen
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

export default function BlogPage() {
  const { user, isSignedIn } = useUser();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');

  


  // Get all unique tags from posts
  const allTags = Array.from(new Set(posts.flatMap(post => post.tags)));

  // Filter posts based on search and tag
  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.authorName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = !selectedTag || post.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/blog-posts');
      const data = await response.json();
      
      if (data.success) {
        setPosts(data.posts);
      } else {
        setError('Failed to fetch blog posts');
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setError('Failed to fetch blog posts');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      const response = await fetch(`/api/blog-posts/${postId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setPosts(prev => prev.filter(post => post.id !== postId));
      } else {
        setError(data.error || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      setError('Failed to delete post');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading blog posts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Blog</h1>
            <p className="text-muted-foreground">
              Discover insights and stories from our community of developers
            </p>
          </div>
          {isSignedIn && (
            <Link href="/blog/create">
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Write Post
              </Button>
            </Link>
          )}
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background text-sm"
            >
              <option value="">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Posts Grid */}
      {error && (
        <div className="text-red-600 text-center mb-6">{error}</div>
      )}

      {filteredPosts.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No posts found</h3>
          <p className="text-muted-foreground">
            {searchTerm || selectedTag ? 'Try adjusting your search or filter criteria.' : 'Be the first to share your insights!'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPosts.map((post) => (
            <Card key={post.id} className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="line-clamp-2 mb-2">
                      <Link href={`/blog/${post.id}`} className="hover:text-primary transition-colors">
                        {post.title}
                      </Link>
                    </CardTitle>
                    <CardDescription className="line-clamp-3">
                      {post.excerpt}
                    </CardDescription>
                  </div>
                  {isSignedIn && post.authorId === user?.id && (
                    <div className="flex gap-1 ml-2">
                      <Link href={`/blog/${post.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-3 w-3" />
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeletePost(post.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  {/* Meta information */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {post.authorName}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(post.publishedAt)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {post.readTime} min read
                    </div>
                  </div>

                  {/* Project link */}
                  {post.projectName && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Project: </span>
                      <Link href={`/project/${post.projectId}`} className="text-primary hover:underline">
                        {post.projectName}
                      </Link>
                    </div>
                  )}

                  {/* Tags */}
                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {post.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {post.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{post.tags.length - 3}
                        </Badge>
                      )}
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
                          <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors">
                            💸 Funding Needed
                          </Badge>
                        </RequirementApplicationModal>
                      ) : (
                        <Badge variant="default" className="text-xs">
                          💰 Funded
                        </Badge>
                      )
                    )}
                    {post.resourceNeeded !== 'N/A' && (
                      <RequirementApplicationModal
                        projectId={post.projectId}
                        projectName={post.projectName}
                        requirementType={post.resourceNeeded}
                      >
                        <Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent transition-colors">
                          {post.resourceNeeded === 'cofounder needed' ? '👥 Cofounder' :
                           post.resourceNeeded === 'dev needed' ? '💻 Developer' :
                           post.resourceNeeded === 'business manager needed' ? '📊 Business Manager' : post.resourceNeeded}
                        </Badge>
                      </RequirementApplicationModal>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {post.views} views
                    </div>
                  </div>

                  {/* Read Button */}
                  <div className="pt-2">
                    <Link href={`/blog/${post.id}`}>
                      <Button className="w-full" size="sm" variant="default">
                        <BookOpen className="h-4 w-4 mr-2" />
                        Read Post
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
