'use client';

import React, { useState, useEffect } from 'react';
import { ContextDocument } from '@/types';
import { MarkdownEditor } from './MarkdownEditor';
import { DeleteConfirmationModal } from '@/components/ui/delete-confirmation-modal';

interface ContextDocumentManagerProps {
  projectId: string;
  isOwned?: boolean;
}

interface ContextDocumentFormData {
  title: string;
  content: string;
  tags: string[];
  category: 'api' | 'design' | 'research' | 'requirements' | 'meeting-minutes' | 'news-article' | 'social-media-post' | 'contract' | 'invoice' | 'other';
  url?: string;
}

export function ContextDocumentManager({ projectId, isOwned = true }: ContextDocumentManagerProps) {
  const [documents, setDocuments] = useState<ContextDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<ContextDocument | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [improvementInProgress, setImprovementInProgress] = useState(false);
  const [urlLoading, setUrlLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  
  const [previewData, setPreviewData] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  
  const [formData, setFormData] = useState<ContextDocumentFormData>({
    title: '',
    content: '',
    tags: [],
    category: 'other',
    url: ''
  });

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobile && sidebarOpen) {
        const sidebar = document.querySelector('.sidebar-container');
        if (sidebar && !sidebar.contains(event.target as Node)) {
          setSidebarOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, sidebarOpen]);

  // Load context documents
  useEffect(() => {
    loadDocuments();
  }, [projectId, searchTerm, selectedCategory, selectedTags]);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedTags.length > 0) params.append('tags', selectedTags.join(','));

      const response = await fetch(`/api/projects/${projectId}/context?${params}`);
      if (!response.ok) {
        throw new Error('Failed to load context documents');
      }
      
      const data = await response.json();
      setDocuments(data.contextDocs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/context`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create document');
      }

      const data = await response.json();
      setDocuments(prev => [data.contextDoc, ...prev]);
      setIsCreating(false);
      setFormData({ title: '', content: '', tags: [], category: 'other' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create document');
    }
  };

  const handleUpdateDocument = async () => {
    if (!selectedDoc) return;

    try {
      // Try to update the existing document
      let response = await fetch(`/api/projects/${projectId}/context/${selectedDoc.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      // If document not found, try to create it instead
      if (response.status === 404) {
        response = await fetch(`/api/projects/${projectId}/context`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            filename: `${selectedDoc.id}.md` // Use the docId as filename
          }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save document');
      }

      const data = await response.json();
      
      // Update the documents list
      if (response.status === 201) {
        // Document was created
        setDocuments(prev => {
          const existing = prev.find(doc => doc.id === selectedDoc.id);
          if (existing) {
            return prev.map(doc => doc.id === selectedDoc.id ? data.contextDoc : doc);
          } else {
            return [data.contextDoc, ...prev];
          }
        });
      } else {
        // Document was updated
        setDocuments(prev => prev.map(doc => 
          doc.id === selectedDoc.id ? data.contextDoc : doc
        ));
      }
      
      setIsEditing(false);
      setSelectedDoc(data.contextDoc);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save document');
    }
  };

  const handleDeleteDocument = (docId: string) => {
    setDocumentToDelete(docId);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!documentToDelete) return;

    try {
      setDeleteInProgress(true);
      
      const response = await fetch(`/api/projects/${projectId}/context/${documentToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete document');
      }

      const data = await response.json();
      
      // Show success message with Pinecone sync status
      if (data.pineconeSync) {
        if (data.pineconeSync.success) {
          console.log('✅ Document embeddings deleted successfully from Pinecone');
        } else {
          console.warn('⚠️ Failed to delete embeddings from Pinecone:', data.pineconeSync.message);
        }
      }

      setDocuments(prev => prev.filter(doc => doc.id !== documentToDelete));
      
      // Clear selection if deleted document was selected
      if (selectedDoc?.id === documentToDelete) {
        setSelectedDoc(null);
        setIsEditing(false);
        setIsCreating(false);
      }

      // Close modal and reset state
      setDeleteModalOpen(false);
      setDocumentToDelete(null);
      
      // Show brief success message
      setError(null); // Clear any previous errors
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
    } finally {
      setDeleteInProgress(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalOpen(false);
    setDocumentToDelete(null);
  };

  const startEditing = (doc: ContextDocument) => {
    setFormData({
      title: doc.title,
      content: doc.content,
      tags: doc.tags,
      category: doc.category,
      url: (doc as any).url || ''
    });
    setSelectedDoc(doc);
    setIsEditing(true);
  };

  const startCreating = () => {
    setFormData({ title: '', content: '', tags: [], category: 'other', url: '' });
    setIsCreating(true);
    setSelectedDoc(null);
    setSuggestedTags([]);
    setPreviewData(null);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setIsCreating(false);
    setFormData({ title: '', content: '', tags: [], category: 'other', url: '' });
    setSuggestedTags([]);
    setPreviewData(null);
  };

  const handleImproveCurrentDocument = async () => {
    if ((!selectedDoc || !isEditing) && !isCreating) return;
    
    try {
      setImprovementInProgress(true);
      
      const docId = selectedDoc?.id || 'new-document';
      const response = await fetch(`/api/projects/${projectId}/context/${docId}/improve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          category: formData.category,
          tags: formData.tags
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to improve document');
      }

      const data = await response.json();
      
      // Update the form data with the improved content
      setFormData(prev => ({
        ...prev,
        content: data.improvedContent
      }));
      
      // Generate tags for the improved content
      handleGenerateTags(data.improvedContent, formData.title);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to improve document');
    } finally {
      setImprovementInProgress(false);
    }
  };

  const handleTagInput = (tagString: string) => {
    const tags = tagString.split(',').map(tag => tag.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, tags }));
  };

  const handleUrlPreview = async (url: string, previewOnly = false) => {
    if (!url) {
      return;
    }

    try {
      setUrlLoading(true);
      
      // Try the new URL context feature first (Google Gemini)
      let response = await fetch(`/api/url-context`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url,
          analysisType: 'summary',
          includeMetadata: true 
        }),
      });

      let data;
      let useUrlContext = false;

      if (response.ok) {
        // URL context feature worked
        data = await response.json();
        useUrlContext = true;
        console.log('✅ Used Google Gemini URL context feature');
      } else {
        // Fallback to traditional URL preview
        console.log('⚠️ URL context feature failed, falling back to traditional preview');
        
        // Only restrict to news/social categories for traditional preview
        if (!formData.category.includes('news-article') && !formData.category.includes('social-media-post')) {
          // For other categories, just show an error message instead of throwing
          setError('URL preview is only available for news articles and social media posts with traditional preview. Try using AI analysis instead.');
          return;
        }

        response = await fetch(`/api/url-preview`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            url,
            includeMetadata: true 
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch URL content');
        }

        data = await response.json();
        useUrlContext = false;
      }
      
      if (previewOnly) {
        setPreviewData({
          ...data,
          useUrlContext,
          source: useUrlContext ? 'Google Gemini URL Context' : 'Traditional Web Scraping'
        });
      } else {
        // Auto-fill title and content from the URL preview
        setFormData(prev => ({
          ...prev,
          title: prev.title || data.title || '',
          content: useUrlContext ? data.content : (data.content || data.description || '')
        }));
        setPreviewData(null);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load URL preview');
    } finally {
      setUrlLoading(false);
    }
  };

  const handleLoadArticleWithAnalysis = async (url: string) => {
    if (!url) {
      return;
    }

    try {
      setUrlLoading(true);
      
      // First, get the article content
      const articleResponse = await fetch(`/api/url-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url,
          includeMetadata: true 
        }),
      });

      if (!articleResponse.ok) {
        throw new Error('Failed to fetch article content');
      }

      const articleData = await articleResponse.json();
      
      // Now get AI analysis
      const analysisResponse = await fetch(`/api/url-context`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url,
          analysisType: 'summary',
          includeMetadata: true 
        }),
      });

      let analysisContent = '';
      let analysisSource = 'Traditional Web Scraping';
      
      if (analysisResponse.ok) {
        const analysisData = await analysisResponse.json();
        analysisContent = analysisData.content;
        analysisSource = 'Google Gemini AI Analysis';
      } else {
        console.warn('AI analysis failed, using fallback');
        analysisContent = 'AI analysis was not available for this URL.';
      }

      // Combine article content with analysis
      const combinedContent = `${articleData.content || articleData.description || ''}

---

## 🤖 AI Analysis

**Source:** ${analysisSource}

${analysisContent}`;

      // Update form with combined content
      setFormData(prev => ({
        ...prev,
        title: prev.title || articleData.title || '',
        content: combinedContent
      }));

      // Generate tags for the content
      handleGenerateTags(combinedContent, articleData.title);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load article with analysis');
    } finally {
      setUrlLoading(false);
    }
  };

  const handleApplyPreview = () => {
    if (previewData) {
      setFormData(prev => ({
        ...prev,
        title: prev.title || previewData.title || '',
        content: previewData.content || ''
      }));
      setPreviewData(null);
      // Generate tags after applying preview content
      handleGenerateTags(previewData.content, previewData.title);
    }
  };



  const handleGenerateTags = async (content?: string, title?: string) => {
    const textContent = content || formData.content;
    const docTitle = title || formData.title;
    
    if (!textContent || textContent.trim().length < 50) {
      return;
    }

    try {
      setIsGeneratingTags(true);
      
      const response = await fetch('/api/generate-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: textContent,
          title: docTitle,
          category: formData.category,
          url: formData.url
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate tags');
      }

      const data = await response.json();
      setSuggestedTags(data.tags || []);
      
    } catch (err) {
      console.error('Tag generation error:', err);
      setError('Failed to generate tags');
    } finally {
      setIsGeneratingTags(false);
    }
  };

  const handleApplySuggestedTag = (tag: string) => {
    if (!formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const handleApplyAllSuggestedTags = () => {
    const newTags = suggestedTags.filter(tag => !formData.tags.includes(tag));
    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, ...newTags]
    }));
    setSuggestedTags([]);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return;

    setIsUploading(true);
    const results: ContextDocument[] = [];

    for (const file of Array.from(files)) {
      try {
        const content = await file.text();
        const title = file.name.replace(/\.(md|txt|json)$/, '');
        
        // Determine category based on filename
        let category = 'other';
        const filename = file.name.toLowerCase();
        if (filename.includes('api') || filename.includes('spec')) category = 'api';
        else if (filename.includes('design') || filename.includes('ui')) category = 'design';
        else if (filename.includes('research') || filename.includes('user')) category = 'research';
        else if (filename.includes('requirement')) category = 'requirements';

        // Generate tags for the file content
        let autoTags: string[] = [];
        try {
          const tagResponse = await fetch('/api/generate-tags', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content,
              title,
              category
            }),
          });
          
          if (tagResponse.ok) {
            const tagData = await tagResponse.json();
            autoTags = tagData.tags || [];
          }
        } catch (err) {
          console.log('Failed to generate tags for uploaded file:', err);
        }

        const response = await fetch(`/api/projects/${projectId}/context`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
            content,
            tags: autoTags,
            category,
            filename: file.name
          }),
        });

        if (response.ok) {
          const data = await response.json();
          results.push(data.contextDoc);
        } else {
          const errorData = await response.json();
          console.error(`Failed to upload ${file.name}:`, errorData.error);
        }
      } catch (err) {
        console.error(`Failed to process ${file.name}:`, err);
      }
    }

    if (results.length > 0) {
      setDocuments(prev => [...results, ...prev]);
    }
    
    setIsUploading(false);
    await loadDocuments(); // Refresh to ensure consistency
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files) {
      handleFileUpload(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  // Get all unique tags from documents
  const allTags = Array.from(new Set(documents.flatMap(doc => doc.tags)));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading context documents...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Mobile Header */}
      {isMobile && (
        <div className="bg-white border-b border-gray-200 p-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Context Documents</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                startCreating();
              }}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              New
            </button>
            {/* <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button> */}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar */}
        <div className={`${
          isMobile 
            ? `fixed inset-y-0 left-0 z-50 w-full max-w-sm bg-white shadow-xl transform transition-transform duration-300 ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`
            : 'w-1/3 min-w-0'
        } border-r border-gray-200 flex flex-col`}>
          {/* Mobile overlay */}
          {/* {isMobile && sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setSidebarOpen(false)}
            />
          )} */}
          
          {/* Sidebar Header */}
          <div className={`border-b border-gray-200 relative z-50 ${isMobile ? 'p-3' : 'p-4'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {!isMobile && <h2 className="text-lg font-semibold">Context Documents</h2>}
                {isMobile && (
                  <>
                    <h2 className="text-lg font-semibold">Documents</h2>
                    <button
                      onClick={() => setSidebarOpen(false)}
                      className="p-1 text-gray-600 hover:text-gray-900"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className={`flex gap-2 ${isMobile ? 'flex-col' : 'flex-row'}`}>
              <label className={`px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 cursor-pointer text-center ${isMobile ? 'w-full' : 'flex-1'} ${!isOwned ? 'opacity-50 cursor-not-allowed' : ''}`}>
                📁 Upload File
                <input
                  type="file"
                  multiple
                  accept=".md,.txt,.json"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                  disabled={!isOwned}
                />
              </label>
              <button
                onClick={() => {
                  if (isOwned) {
                    startCreating();
                    if (isMobile) setSidebarOpen(false);
                  }
                }}
                disabled={!isOwned}
                className={`px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 ${isMobile ? 'w-full' : 'flex-1'} ${!isOwned ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                ✏️ New Document
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className={`space-y-3 ${isMobile ? 'p-3' : 'px-4'}`}>
            <input
              type="text"
              placeholder="🔍 Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">📁 All Categories</option>
              <option value="api">🔧 API</option>
              <option value="design">🎨 Design</option>
              <option value="research">🔬 Research</option>
              <option value="requirements">📋 Requirements</option>
              <option value="meeting-minutes">📝 Meeting Minutes</option>
              <option value="news-article">📰 News Article</option>
              <option value="social-media-post">📱 Social Media Post</option>
              <option value="contract">📄 Contract</option>
              <option value="invoice">🧾 Invoice</option>
              <option value="other">📂 Other</option>
            </select>

            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSelectedTags(prev => 
                        prev.includes(tag) 
                          ? prev.filter(t => t !== tag)
                          : [...prev, tag]
                      );
                    }}
                    className={`px-2 py-1 text-xs rounded ${
                      selectedTags.includes(tag)
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upload Drop Zone */}
        {isUploading && (
          <div className="p-4 bg-blue-50 border-b border-blue-200">
            <div className="text-blue-800 text-sm">Uploading files...</div>
          </div>
        )}

        {/* Document List */}
        <div 
          className={`flex-1 overflow-y-auto ${dragActive ? 'bg-blue-50' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {error && (
            <div className={`bg-red-50 border-b border-red-200 ${isMobile ? 'p-3' : 'p-4'}`}>
              <div className="text-red-800 text-sm">❌ {error}</div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 text-xs underline mt-1"
              >
                Dismiss
              </button>
            </div>
          )}

          {documents.length === 0 ? (
            <div className={`text-gray-500 text-sm text-center ${isMobile ? 'p-6' : 'p-8'}`}>
              <svg className={`mx-auto mb-3 text-gray-300 ${isMobile ? 'w-8 h-8' : 'w-12 h-12'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="mb-2">📄 No documents found</div>
              <div className="text-xs text-gray-400">
                {searchTerm || selectedCategory ? 'Try adjusting filters' : 'Create a new document or upload files'}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {documents.map((doc: ContextDocument) => (
                <div
                  key={doc.id}
                  className={`cursor-pointer hover:bg-gray-50 transition-colors ${isMobile ? 'p-3' : 'p-4'} ${
                    selectedDoc?.id === doc.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                  }`}
                  onClick={() => {
                    setSelectedDoc(doc);
                    setIsCreating(false);
                    setIsEditing(false);
                    if (isMobile) setSidebarOpen(false);
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium truncate ${isMobile ? 'text-sm' : 'text-base'}`}>
                        {doc.title}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className={`px-1.5 py-0.5 text-xs rounded whitespace-nowrap ${
                          doc.category === 'api' ? 'bg-green-100 text-green-800' :
                          doc.category === 'design' ? 'bg-purple-100 text-purple-800' :
                          doc.category === 'research' ? 'bg-yellow-100 text-yellow-800' :
                          doc.category === 'requirements' ? 'bg-blue-100 text-blue-800' :
                          doc.category === 'meeting-minutes' ? 'bg-indigo-100 text-indigo-800' :
                          doc.category === 'news-article' ? 'bg-red-100 text-red-800' :
                          doc.category === 'social-media-post' ? 'bg-pink-100 text-pink-800' :
                          doc.category === 'contract' ? 'bg-orange-100 text-orange-800' :
                          doc.category === 'invoice' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {doc.category}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(doc.lastModified).toLocaleDateString()}
                        </span>
                      </div>
                      {doc.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {doc.tags.slice(0, isMobile ? 2 : 4).map((tag: string) => (
                            <span key={tag} className="px-1 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                              {tag}
                            </span>
                          ))}
                          {doc.tags.length > (isMobile ? 2 : 4) && (
                            <span className="text-xs text-gray-500">+{doc.tags.length - (isMobile ? 2 : 4)}</span>
                          )}
                        </div>
                      )}
                      {!isMobile && (
                        <p className="text-xs text-gray-600 mt-1.5 line-clamp-1">
                          {doc.content ? doc.content.substring(0, 80) : 'No content available'}...
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDocument(doc.id);
                      }}
                      className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded"
                      title="Delete document"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {isEditing ? (
          /* Edit Form */
          <div className="flex-1 flex flex-col bg-white">
            <div className={`border-b border-gray-200 ${isMobile ? 'p-3' : 'p-4'}`}>
              <div className={`flex items-center justify-between ${isMobile ? 'flex-col gap-3' : 'flex-row'}`}>
                <div className="flex items-center gap-2">
                  {isMobile && (
                    <button
                      onClick={() => {
                        setSelectedDoc(null);
                        setSidebarOpen(true);
                      }}
                      className="p-2 text-gray-600 hover:text-gray-900"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  <h3 className={`font-semibold ${isMobile ? 'text-base' : 'text-lg'}`}>
                    📝 Edit Document
                </h3>
                </div>
                <div className={`flex gap-2 ${isMobile ? 'w-full' : ''}`}>
                  <button
                    onClick={cancelEditing}
                    className={`px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 ${isMobile ? 'flex-1' : ''}`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateDocument}
                    className={`px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 ${isMobile ? 'flex-1' : ''}`}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>

            <div className={`flex-1 flex items-center justify-center ${isMobile ? 'p-6' : 'p-8'}`}>
              <div className="text-center text-gray-500">
                <p className="text-lg font-medium mb-2">✏️ Edit Mode</p>
                <p className="text-sm">The edit form will also be converted to a modal...</p>
              </div>
            </div>
          </div>
        ) : selectedDoc ? (
          /* Document Preview */
          <div className="flex-1 flex flex-col">
            <div className={`border-b border-gray-200 ${isMobile ? 'p-3' : 'p-4'}`}>
              <div className={`flex ${isMobile ? 'flex-col gap-3' : 'flex-col md:flex-row md:items-center'} justify-between gap-4`}>
                <div className="flex-1 min-w-0">
                 
                  <h3 className={`font-semibold break-words ${isMobile ? 'text-base' : 'text-lg'}`}>
                    📄 {selectedDoc.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className={`px-2 py-1 text-xs rounded whitespace-nowrap ${
                      selectedDoc.category === 'api' ? 'bg-green-100 text-green-800' :
                      selectedDoc.category === 'design' ? 'bg-purple-100 text-purple-800' :
                      selectedDoc.category === 'research' ? 'bg-yellow-100 text-yellow-800' :
                      selectedDoc.category === 'requirements' ? 'bg-blue-100 text-blue-800' :
                      selectedDoc.category === 'meeting-minutes' ? 'bg-indigo-100 text-indigo-800' :
                      selectedDoc.category === 'news-article' ? 'bg-red-100 text-red-800' :
                      selectedDoc.category === 'social-media-post' ? 'bg-pink-100 text-pink-800' :
                      selectedDoc.category === 'contract' ? 'bg-orange-100 text-orange-800' :
                      selectedDoc.category === 'invoice' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedDoc.category}
                    </span>
                    <span className="text-xs md:text-sm text-gray-500">
                      {new Date(selectedDoc.lastModified).toLocaleDateString()}
                      {!isMobile && ` ${new Date(selectedDoc.lastModified).toLocaleTimeString()}`}
                    </span>
                  </div>
                  {selectedDoc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedDoc.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => startEditing(selectedDoc)}
                  className={`px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 whitespace-nowrap ${isMobile ? 'w-full' : ''}`}
                >
                  ✏️ Edit
                </button>
              </div>
            </div>

            <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-3' : 'p-4'}`}>
              <div className="prose max-w-none">
                <div className={`whitespace-pre-wrap font-sans leading-relaxed ${
                  isMobile ? 'text-sm' : 'text-base'
                }`}>
                  {selectedDoc.content}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className={`flex-1 flex items-center justify-center ${isMobile ? 'p-6' : 'p-8'}`}>
            <div className="text-center text-gray-500 max-w-md">
            
              <svg className={`mx-auto mb-4 text-gray-300 ${isMobile ? 'w-16 h-16' : 'w-20 h-20'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className={`font-medium mb-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
                📄 No document selected
              </div>
              <div className={`text-gray-400 ${isMobile ? 'text-sm' : 'text-base'}`}>
                {isMobile 
                  ? 'Browse documents or create a new one'
                  : 'Select a document from the sidebar or create a new one to get started.'
                }
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Document Modal */}
      {(isCreating || isEditing) && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={cancelEditing}></div>
          
          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className={`relative bg-white rounded-lg shadow-xl w-full ${isMobile ? 'max-w-lg' : 'max-w-4xl'} max-h-[90vh] flex flex-col`}>
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {isCreating ? '✏️ Create New Document' : '📝 Edit Document'}
                </h3>
                <button
                  onClick={cancelEditing}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    📝 Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Document title"
                />
              </div>

              {/* URL field for news articles and social media posts */}
              {(formData.category === 'news-article' || formData.category === 'social-media-post') && (
                  <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                      🔗 URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={formData.category === 'news-article' ? 'News article URL' : 'Social media post URL'}
                    />
                    </div>
                    
                    {/* URL Analysis Options */}
                    <div className="space-y-2">
                      <div className="text-xs text-gray-600 font-medium">🤖 AI-Powered URL Analysis (Google Gemini)</div>
                      
                      {/* Quick Actions */}
                      <div className="flex gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => formData.url && handleUrlPreview(formData.url, true)}
                          disabled={!formData.url || urlLoading}
                          className="px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {urlLoading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            '👁️ Preview'
                          )}
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => formData.url && handleLoadArticleWithAnalysis(formData.url)}
                          disabled={!formData.url || urlLoading}
                          className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          📰 Load Article + AI Analysis
                        </button>
                      </div>
                    </div>
                  </div>
              )}

              {/* URL field for any category (enhanced with AI analysis) */}
              {formData.category !== 'news-article' && formData.category !== 'social-media-post' && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🔗 URL (Optional - AI Analysis Available)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Any URL for AI analysis"
                    />
                  </div>
                  
                  {formData.url && (
                    <div className="space-y-2">
                      <div className="text-xs text-gray-600 font-medium">🤖 AI-Powered URL Analysis</div>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => formData.url && handleLoadArticleWithAnalysis(formData.url)}
                          disabled={!formData.url || urlLoading}
                          className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          📰 Load Content + AI Analysis
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

                <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}`}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                      📁 Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="other">📂 Other</option>
                      <option value="api">🔧 API</option>
                      <option value="design">🎨 Design</option>
                      <option value="research">🔬 Research</option>
                      <option value="requirements">📋 Requirements</option>
                      <option value="meeting-minutes">📝 Meeting Minutes</option>
                      <option value="news-article">📰 News Article</option>
                      <option value="social-media-post">📱 Social Media Post</option>
                      <option value="contract">📄 Contract</option>
                      <option value="invoice">🧾 Invoice</option>
                  </select>
                </div>

                <div>
                    <div className={`flex items-center ${isMobile ? 'justify-between' : 'justify-between'} mb-1`}>
                      <label className="block text-sm font-medium text-gray-700">
                        🏷️ Tags
                  </label>
                      <button
                        type="button"
                        onClick={() => handleGenerateTags()}
                        disabled={!formData.content || formData.content.trim().length < 50 || isGeneratingTags}
                        className={`px-2 py-1 bg-gray-900 text-white rounded text-xs hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed ${isMobile ? 'text-xs' : ''}`}
                      >
                        {isGeneratingTags ? (
                          <div className="flex items-center">
                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                            {isMobile ? 'Gen...' : 'Generating...'}
                          </div>
                        ) : (
                          isMobile ? 'Generate' : 'Generate Tags'
                        )}
                      </button>
                    </div>
                    
                    {/* Current Tags */}
                    {formData.tags.length > 0 && (
                      <div className="mb-2">
                        <div className="flex flex-wrap gap-1">
                          {formData.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(tag)}
                                className="ml-1 text-blue-600 hover:text-blue-800"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Suggested Tags */}
                    {suggestedTags.length > 0 && (
                      <div className="mb-2 p-3 bg-green-50 border border-green-200 rounded">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-green-800">
                            Suggested Tags ({suggestedTags.length})
                            {isGeneratingTags && <span className="ml-1 text-xs">(AI-powered)</span>}
                          </span>
                          <button
                            type="button"
                            onClick={handleApplyAllSuggestedTags}
                            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                          >
                            Apply All
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {suggestedTags.map((tag, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleApplySuggestedTag(tag)}
                              disabled={formData.tags.includes(tag)}
                              className={`px-2 py-1 text-xs rounded border ${
                                formData.tags.includes(tag)
                                  ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed'
                                  : 'bg-white text-green-700 border-green-300 hover:bg-green-100'
                              }`}
                            >
                              + {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Manual Tag Input */}
                  <input
                    type="text"
                    value={formData.tags.join(', ')}
                    onChange={(e) => handleTagInput(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Type tags manually (comma-separated)"
                  />
                </div>
              </div>

                {/* Preview Panel */}
                {previewData && (
                  <div className={`bg-gray-50 border border-gray-200 rounded ${isMobile ? 'p-3' : 'p-4'}`}>
                    <div className={`flex items-center justify-between mb-3 ${isMobile ? 'flex-col gap-2' : 'flex-row'}`}>
                      <h4 className={`font-medium text-gray-900 ${isMobile ? 'text-sm' : 'text-base'}`}>
                        📄 Content Preview
                        {previewData.useUrlContext && (
                          <span className="ml-2 inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            🤖 AI-Powered
                          </span>
                        )}
                      </h4>
                      <div className={`flex gap-2 ${isMobile ? 'w-full' : ''}`}>
                        <button
                          onClick={handleApplyPreview}
                          className={`px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 ${isMobile ? 'flex-1' : ''}`}
                        >
                          ✅ Apply
                        </button>
                        <button
                          onClick={() => setPreviewData(null)}
                          className={`px-3 py-1.5 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 ${isMobile ? 'flex-1' : ''}`}
                        >
                          ❌ Cancel
                        </button>
                      </div>
                    </div>
                    
                    {/* Source Information */}
                    <div className={`text-gray-600 mb-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="font-medium">
                          {previewData.useUrlContext ? '🤖 Google Gemini URL Context' : '🌐 Traditional Web Scraping'}
                        </span>
                        <span>•</span>
                        <span>📊 {previewData.contentLength || previewData.content?.length || 0} chars</span>
                        
                        {!previewData.useUrlContext && (
                          <>
                            <span>•</span>
                            <span>📖 Full Article</span>
                            {previewData.author && (
                              <>
                                <span>•</span>
                                <span>✍️ {previewData.author}</span>
                              </>
                            )}
                            {previewData.published && (
                              <>
                                <span>•</span>
                                <span>📅 {new Date(previewData.published).toLocaleDateString()}</span>
                              </>
                            )}
                            {previewData.ttr > 0 && (
                              <>
                                <span>•</span>
                                <span>⏱️ {Math.ceil(previewData.ttr / 60)} min</span>
                              </>
                            )}
                          </>
                        )}
                        
                        {previewData.useUrlContext && previewData.tokenUsage && (
                          <>
                            <span>•</span>
                            <span>🧠 {previewData.tokenUsage.totalTokenCount || 0} tokens</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className={`overflow-y-auto ${isMobile ? 'max-h-24 text-xs' : 'max-h-32 text-sm'}`}>
                      <pre className="whitespace-pre-wrap font-sans">
                        {previewData.content ? previewData.content.substring(0, isMobile ? 300 : 500) : 'No content available'}
                        {previewData.content && previewData.content.length > (isMobile ? 300 : 500) && '...'}
                      </pre>
                    </div>
                  </div>
                )}

                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    📝 Content
                </label>
                  <div className={`${isMobile ? 'h-64' : 'h-80'} border border-gray-300 rounded`}>
                  <MarkdownEditor
                    content={formData.content}
                    onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                    language="markdown"
                    onImproveWithAI={handleImproveCurrentDocument}
                    isImprovingWithAI={improvementInProgress}
                    isOwned={isOwned}
                  />
                </div>
              </div>
            </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={cancelEditing}
                  className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={isCreating ? handleCreateDocument : handleUpdateDocument}
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  {isCreating ? '✏️ Create Document' : '💾 Save Changes'}
                </button>
              </div>
              </div>
            </div>
          </div>
        )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Document"
        message={`Are you sure you want to delete "${documents.find(doc => doc.id === documentToDelete)?.title || 'this document'}"? This will permanently remove the document embeddings from the vector database. This action cannot be undone.`}
        confirmText="Delete from Pinecone"
        cancelText="Cancel"
        isDeleting={deleteInProgress}
      />
    </div>
  );
}