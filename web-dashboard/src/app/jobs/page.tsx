'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  AlertCircle,
  Filter,
  X
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
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithRequirements[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequirementType, setSelectedRequirementType] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

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

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedRequirementType('all');
    setSelectedTag('all');
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

  const activeFiltersCount = [searchTerm, selectedRequirementType, selectedTag].filter(
    filter => filter !== 'all' && filter !== ''
  ).length;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground text-sm sm:text-base">Loading opportunities...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="text-center py-8 sm:py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Jobs</h3>
          <p className="text-muted-foreground mb-4 text-sm sm:text-base">{error}</p>
          <Button onClick={fetchProjectsWithRequirements} variant="outline" size="sm" className="sm:size-default">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Job Opportunities</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Discover projects looking for funding, cofounders, developers, and business managers
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search projects, descriptions, or authors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 sm:h-10"
          />
        </div>

        {/* Filter Toggle and Active Filters */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
          
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-muted/50 p-4 rounded-lg mb-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-2">Opportunity Type</label>
                <select
                  value={selectedRequirementType}
                  onChange={(e) => setSelectedRequirementType(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm h-10"
                >
                  <option value="all">All Opportunities</option>
                  <option value="funding needed">💰 Funding Needed</option>
                  <option value="cofounder needed">👥 Cofounder Needed</option>
                  <option value="dev needed">💻 Developer Needed</option>
                  <option value="business manager needed">📊 Business Manager Needed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tags</label>
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm h-10"
                >
                  <option value="all">All Tags</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                onClick={fetchProjectsWithRequirements}
                disabled={loading}
                size="sm"
                className="w-full sm:w-auto"
              >
                <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Projects */}
      {uniqueProjects.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No opportunities found</h3>
          <p className="text-muted-foreground text-sm sm:text-base">
            {searchTerm || selectedRequirementType !== 'all' || selectedTag !== 'all' 
              ? 'Try adjusting your search or filter criteria.' 
              : 'No projects are currently looking for contributors.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {uniqueProjects.map((project) => (
            <Card key={project.projectId} className="hover:shadow-lg transition-all duration-200 hover:scale-[1.01] sm:hover:scale-[1.02]">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="line-clamp-2 mb-2 text-base sm:text-lg">
                      <button 
                        onClick={() => router.push(`/blog/${project.blogId}`)} 
                        className="hover:text-primary transition-colors text-left w-full"
                      >
                        {project.name}
                      </button>
                    </CardTitle>
                    <CardDescription className="line-clamp-3 text-sm">
                      {project.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Meta information */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span className="truncate">{project.authorName}</span>
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
                        <Badge key={tag} variant="outline" className="text-xs px-2 py-1">
                          {tag}
                        </Badge>
                      ))}
                      {project.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs px-2 py-1">
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
                        <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors px-2 py-1">
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
                        <Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent transition-colors px-2 py-1">
                          {project.resourceNeeded === 'cofounder needed' ? '👥 Cofounder' :
                           project.resourceNeeded === 'dev needed' ? '💻 Developer' :
                           project.resourceNeeded === 'business manager needed' ? '📊 Business Manager' : project.resourceNeeded}
                        </Badge>
                      </RequirementApplicationModal>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 pt-2">
                    <Button 
                      className="w-full h-10" 
                      size="sm" 
                      variant="outline"
                      onClick={() => router.push(`/blog/${project.blogId}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Project
                    </Button>
                    {project.fundingStatus === 'funding needed' && (
                      <RequirementApplicationModal
                        projectId={project.projectId}
                        projectName={project.name}
                        requirementType="funding needed"
                      >
                        <Button className="w-full h-10" size="sm" variant="default">
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
                        <Button className="w-full h-10" size="sm" variant="default">
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
