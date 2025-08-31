'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import RequirementApplicationModal from '@/components/RequirementApplicationModal';
import { 
  Search,
  Calendar,
  Users,
  Briefcase,
  Eye,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface ProjectWithRequirements {
  projectId: string;
  blogId: string;
  name: string;
  description: string;
  authorName: string;
  createdAt: string;
  lastModified: string;
  fundingStatus: 'fully funded' | 'funding needed' | 'N/A';
  resourceNeeded: 'cofounder needed' | 'dev needed' | 'business manager needed' | 'N/A';
  requirements: string[];
  tags: string[];
  isPublic: boolean;
}

export default function JobsPage() {
  const [projects, setProjects] = useState<ProjectWithRequirements[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequirementType, setSelectedRequirementType] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  useEffect(() => {
    fetchProjectsWithRequirements();
  }, []);

  const fetchProjectsWithRequirements = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/jobs');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch projects');
      }

      const data = await response.json();
      setProjects(data.projects || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };



  // Get all unique tags from projects
  const allTags = Array.from(new Set(projects.flatMap(project => project.tags))).sort();

  // Filter projects based on search and filters
  const filteredProjects = projects.filter(project => {
    const matchesSearch = searchTerm === '' || 
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.authorName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRequirementType = selectedRequirementType === 'all' || 
      project.fundingStatus === selectedRequirementType ||
      project.resourceNeeded === selectedRequirementType;

    const matchesTag = selectedTag === 'all' || project.tags.includes(selectedTag);

    return matchesSearch && matchesRequirementType && matchesTag;
  });

  // Get unique projects (no grouping by requirement type)
  const uniqueProjects = Array.from(
    new Map(filteredProjects.map(project => [project.projectId, project])).values()
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading opportunities...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Jobs</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchProjectsWithRequirements} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Job Opportunities</h1>
          <p className="text-muted-foreground">
            Discover projects looking for funding, cofounders, developers, and business managers
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search projects, descriptions, or authors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedRequirementType}
              onChange={(e) => setSelectedRequirementType(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background text-sm"
            >
              <option value="all">All Opportunities</option>
              <option value="funding needed">💰 Funding Needed</option>
              <option value="cofounder needed">👥 Cofounder Needed</option>
              <option value="dev needed">💻 Developer Needed</option>
              <option value="business manager needed">📊 Business Manager Needed</option>
            </select>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background text-sm"
            >
              <option value="all">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
            <Button 
              variant="outline" 
              onClick={fetchProjectsWithRequirements}
              disabled={loading}
              size="sm"
            >
              <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Projects */}
      {uniqueProjects.length === 0 ? (
        <div className="text-center py-12">
          <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No opportunities found</h3>
          <p className="text-muted-foreground">
            {searchTerm || selectedRequirementType !== 'all' || selectedTag !== 'all' 
              ? 'Try adjusting your search or filter criteria.' 
              : 'No projects are currently looking for contributors.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {uniqueProjects.map((project) => (
            <Card key={project.projectId} className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] min-w-[320px]">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="line-clamp-2 mb-2">
                      <Link href={`/project/${project.projectId}`} className="hover:text-primary transition-colors">
                        {project.name}
                      </Link>
                    </CardTitle>
                    <CardDescription className="line-clamp-3">
                      {project.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  {/* Meta information */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {project.authorName}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(project.lastModified)}
                    </div>
                  </div>

                  {/* Tags */}
                  {project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {project.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {project.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{project.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Requirements */}
                  <div className="flex flex-wrap gap-2">
                    {project.fundingStatus === 'funding needed' && (
                      <RequirementApplicationModal
                        projectId={project.projectId}
                        projectName={project.name}
                        requirementType="funding needed"
                      >
                        <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors">
                          💸 Funding Needed
                        </Badge>
                      </RequirementApplicationModal>
                    )}
                    {project.resourceNeeded !== 'N/A' && (
                      <RequirementApplicationModal
                        projectId={project.projectId}
                        projectName={project.name}
                        requirementType={project.resourceNeeded}
                      >
                        <Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent transition-colors">
                          {project.resourceNeeded === 'cofounder needed' ? '👥 Cofounder' :
                           project.resourceNeeded === 'dev needed' ? '💻 Developer' :
                           project.resourceNeeded === 'business manager needed' ? '📊 Business Manager' : project.resourceNeeded}
                        </Badge>
                      </RequirementApplicationModal>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 pt-2">
                    <Link href={`/blog/${project.blogId}`}>
                      <Button className="w-full" size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-2" />
                        View Project
                      </Button>
                    </Link>
                    {project.fundingStatus === 'funding needed' && (
                      <RequirementApplicationModal
                        projectId={project.projectId}
                        projectName={project.name}
                        requirementType="funding needed"
                      >
                        <Button className="w-full" size="sm" variant="default">
                          <Briefcase className="h-4 w-4 mr-2" />
                          Fund
                        </Button>
                      </RequirementApplicationModal>
                    )}
                    {project.resourceNeeded !== 'N/A' && (
                      <RequirementApplicationModal
                        projectId={project.projectId}
                        projectName={project.name}
                        requirementType={project.resourceNeeded as 'cofounder needed' | 'dev needed' | 'business manager needed'}
                      >
                        <Button className="w-full" size="sm" variant="default">
                          <Briefcase className="h-4 w-4 mr-2" />
                          Apply as {project.resourceNeeded === 'cofounder needed' ? 'Cofounder' :
                                   project.resourceNeeded === 'dev needed' ? 'Developer' :
                                   project.resourceNeeded === 'business manager needed' ? 'Business Manager' : 'Contributor'}
                        </Button>
                      </RequirementApplicationModal>
                    )}
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
