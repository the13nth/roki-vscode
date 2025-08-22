'use client';

import { useState, useEffect } from 'react';
import { ProjectListItem } from '@/types';
import { ProjectCard } from './ProjectCard';
import { ProjectCreationWizard } from './ProjectCreationWizard';
import { SearchAndFilter } from './SearchAndFilter';

export function ProjectOverview() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ProjectListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showBrowseDialog, setShowBrowseDialog] = useState(false);
  const [showProjectChoice, setShowProjectChoice] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'lastModified' | 'progress'>('lastModified');
  const [filterBy, setFilterBy] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    filterAndSortProjects();
  }, [projects, searchQuery, sortBy, filterBy]);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/projects');
      if (response.ok) {
        const projectsData = await response.json();
        setProjects(projectsData);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortProjects = () => {
    let filtered = projects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           project.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter = filterBy === 'all' || 
                           (filterBy === 'completed' && project.progress === 100) ||
                           (filterBy === 'active' && project.progress < 100);
      
      return matchesSearch && matchesFilter;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'progress':
          return b.progress - a.progress;
        case 'lastModified':
        default:
          return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
      }
    });

    setFilteredProjects(filtered);
  };

  const handleProjectCreated = (newProject: ProjectListItem) => {
    setProjects(prev => [newProject, ...prev]);
    setShowCreateWizard(false);
    setShowProjectChoice(false);
  };

  const handleProjectDeleted = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
  };

  const handleBrowseFolder = () => {
    // Create a hidden file input with webkitdirectory attribute for folder selection
    if (typeof document === 'undefined') return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.multiple = true;
    input.style.display = 'none';
    
    // Add event listener for when files are selected
    input.addEventListener('change', async (event) => {
      const target = event.target as HTMLInputElement;
      const files = target.files;
      
      if (files && files.length > 0) {
        // Get the folder path from the first file
        const firstFile = files[0];
        const folderPath = firstFile.webkitRelativePath.split('/')[0];
        
        // Check if the selected folder contains project files
        let hasAiProject = false;
        let hasKiro = false;
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const relativePath = file.webkitRelativePath;
          
          if (relativePath.includes('.ai-project/')) {
            hasAiProject = true;
          }
          if (relativePath.includes('.kiro/')) {
            hasKiro = true;
          }
        }
        
        // Update the input field with the folder path
        if (typeof document !== 'undefined') {
          const inputElement = document.getElementById('folderPath') as HTMLInputElement;
          if (inputElement) {
          // Try to construct a reasonable full path
          // Note: We can't get the full system path from the file input, 
          // but we can use the folder name as a starting point
          inputElement.value = folderPath;
          
                      // If we found a valid project, read the files and create it
            if (hasAiProject || hasKiro) {
              // Get all the project files
              const projectFiles = new Map<string, string>();
              
              for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const relativePath = file.webkitRelativePath;
                
                // Only process files in the project directory
                if (hasAiProject && relativePath.includes('.ai-project/')) {
                  const reader = new FileReader();
                  await new Promise((resolve) => {
                    reader.onload = () => {
                      const content = reader.result as string;
                      const fileName = relativePath.split('.ai-project/')[1];
                      if (fileName) {
                        projectFiles.set(fileName, content);
                      }
                      resolve(null);
                    };
                    reader.readAsText(file);
                  });
                } else if (hasKiro && relativePath.includes('.kiro/specs/ai-project-manager/')) {
                  const reader = new FileReader();
                  await new Promise((resolve) => {
                    reader.onload = () => {
                      const content = reader.result as string;
                      const fileName = relativePath.split('ai-project-manager/')[1];
                      if (fileName) {
                        projectFiles.set(fileName, content);
                      }
                      resolve(null);
                    };
                    reader.readAsText(file);
                  });
                }
              }
              
              // Get the full system path from the user
              const fullPath = prompt(
                'Please confirm or modify the full system path to your project:',
                `/home/rwbts/Documents/roki/${folderPath}`
              );
              
              if (fullPath) {
                // Create the project using the scanned files
                await scanAndAddFolder(folderPath, fullPath, projectFiles);
                
                // Close the dialog
                setShowBrowseDialog(false);
                setShowProjectChoice(false);
              }
            } else {
              alert(`⚠️ The selected folder "${folderPath}" doesn't appear to contain a project.\n\nPlease select a folder that contains either:\n• .ai-project directory\n• .kiro directory`);
            }
          }
        }
        
        // Clean up the input element
        if (typeof document !== 'undefined') {
          document.body.removeChild(input);
        }
      }
    });
    
    // Add the input to the DOM and trigger the file picker
    if (typeof document !== 'undefined') {
      document.body.appendChild(input);
      input.click();
    }
  };



  const scanAndAddFolder = async (displayName: string, fullPath: string, projectFiles?: Map<string, string>) => {
    try {
      setIsLoading(true);
      
      // Scan the folder for existing projects
      const response = await fetch('/api/projects/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folderPath: fullPath,
          folderName: displayName,
          projectFiles: projectFiles ? Object.fromEntries(projectFiles) : undefined
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Show success message
          alert(`✅ Successfully imported ${result.project.type} project: ${result.project.name}`);
          // Reload projects to include the newly added one
          await loadProjects();
        }
      } else {
        const error = await response.json();
        alert(`Failed to scan folder: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to scan folder:', error);
      alert('Failed to scan folder. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualFolderPath = async (folderPath: string) => {
    if (folderPath.trim()) {
      const folderName = folderPath.split('/').pop() || 'Unknown';
      await scanAndAddFolder(folderName, folderPath.trim());
      setShowBrowseDialog(false);
      setShowProjectChoice(false);
    }
  };

  const handleCreateNew = () => {
    setShowProjectChoice(false);
    setShowCreateWizard(true);
  };

  const handleAddExisting = () => {
    setShowProjectChoice(false);
    setShowBrowseDialog(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/70 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-none h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">AI Project Manager</h1>
              <p className="mt-1 md:mt-2 text-sm md:text-base text-gray-600">
                Manage your development projects with AI-powered assistance
              </p>
            </div>
            <button
              onClick={() => setShowProjectChoice(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-2 md:py-3 rounded-none font-medium transition-colors duration-200 flex items-center gap-2 text-sm md:text-base self-start sm:self-auto"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">New Project</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <SearchAndFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
          filterBy={filterBy}
          onFilterChange={setFilterBy}
        />

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            {projects.length === 0 ? (
              <div>
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">No projects yet</h3>
                <p className="mt-2 text-gray-500">Get started by creating your first project.</p>
                <button
                  onClick={() => setShowCreateWizard(true)}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-none font-medium transition-colors duration-200"
                >
                  Create Project
                </button>
              </div>
            ) : (
              <div>
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">No projects found</h3>
                <p className="mt-2 text-gray-500">Try adjusting your search or filter criteria.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                onDelete={handleProjectDeleted}
              />
            ))}
          </div>
        )}

        {/* Project Choice Dialog */}
        {showProjectChoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 md:p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Add Project
              </h3>
              <p className="text-gray-600 mb-6">
                Choose how you want to add a project to your workspace.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={handleCreateNew}
                  className="w-full flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h4 className="font-medium text-gray-900">Create New Project</h4>
                    <p className="text-sm text-gray-600">Start a fresh project with guided setup</p>
                  </div>
                </button>
                
                <button
                  onClick={handleAddExisting}
                  className="w-full flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h4 className="font-medium text-gray-900">Add Existing Project</h4>
                    <p className="text-sm text-gray-600">Import from existing .ai-project or .kiro folder</p>
                  </div>
                </button>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowProjectChoice(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Project Creation Wizard Modal */}
        {showCreateWizard && (
          <ProjectCreationWizard 
            onClose={() => setShowCreateWizard(false)}
            onProjectCreated={handleProjectCreated}
          />
        )}

      {/* Browse Folder Dialog */}
      {showBrowseDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Browse for Existing Project
            </h3>
            <p className="text-gray-600 mb-4">
              Click "Browse" to select a project folder. The folder will be automatically scanned for .ai-project or .kiro directories and imported if valid.
            </p>
            
            <div className="mb-4">
              <label htmlFor="folderPath" className="block text-sm font-medium text-gray-700 mb-2">
                Folder Path
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  id="folderPath"
                  name="folderPath"
                  placeholder="/home/user/my-project"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  readOnly
                />
                <button
                  type="button"
                  onClick={handleBrowseFolder}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span>Browse</span>
                </button>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowBrowseDialog(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}