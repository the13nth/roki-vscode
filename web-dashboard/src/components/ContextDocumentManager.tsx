'use client';

import React, { useState, useEffect } from 'react';
import { ContextDocument } from '@/types';
import { MarkdownEditor } from './MarkdownEditor';
import { DeleteConfirmationModal } from '@/components/ui/delete-confirmation-modal';

interface ContextDocumentManagerProps {
  projectId: string;
}

interface ContextDocumentFormData {
  title: string;
  content: string;
  tags: string[];
  category: 'api' | 'design' | 'research' | 'requirements' | 'meeting-minutes' | 'news-article' | 'social-media-post' | 'contract' | 'invoice' | 'other';
  url?: string;
}

export function ContextDocumentManager({ projectId }: ContextDocumentManagerProps) {
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
  
  const [formData, setFormData] = useState<ContextDocumentFormData>({
    title: '',
    content: '',
    tags: [],
    category: 'other',
    url: ''
  });

  // Load context documents
  useEffect(() => {
    loadDocuments();
  }, [projectId, searchTerm, selectedCategory, selectedTags]);

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
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setIsCreating(false);
    setFormData({ title: '', content: '', tags: [], category: 'other', url: '' });
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

  const handleUrlPreview = async (url: string) => {
    if (!url || (!formData.category.includes('news-article') && !formData.category.includes('social-media-post'))) {
      return;
    }

    try {
      setUrlLoading(true);
      
      const response = await fetch(`/api/url-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch URL content');
      }

      const data = await response.json();
      
      // Auto-fill title and content from the URL preview
      setFormData(prev => ({
        ...prev,
        title: prev.title || data.title || '',
        content: data.content || data.description || ''
      }));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load URL preview');
    } finally {
      setUrlLoading(false);
    }
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

        const response = await fetch(`/api/projects/${projectId}/context`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
            content,
            tags: [],
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
    <div className="h-full flex">
      {/* Sidebar */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Context Documents</h2>
            <div className="flex gap-2">
              <label className="px-3 py-1 bg-green-600 text-white rounded-none text-sm hover:bg-green-700 cursor-pointer">
                Upload File
                <input
                  type="file"
                  multiple
                  accept=".md,.txt,.json"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                />
              </label>
              <button
                onClick={startCreating}
                className="px-3 py-1 bg-blue-600 text-white rounded-none text-sm hover:bg-blue-700"
              >
                New Document
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            />
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="">All Categories</option>
              <option value="api">API</option>
              <option value="design">Design</option>
              <option value="research">Research</option>
              <option value="requirements">Requirements</option>
              <option value="meeting-minutes">Meeting Minutes</option>
              <option value="news-article">News Article</option>
              <option value="social-media-post">Social Media Post</option>
              <option value="contract">Contract</option>
              <option value="invoice">Invoice</option>
              <option value="other">Other</option>
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
            <div className="p-4 bg-red-50 border-b border-red-200">
              <div className="text-red-800 text-sm">{error}</div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 text-xs underline mt-1"
              >
                Dismiss
              </button>
            </div>
          )}

          {documents.length === 0 ? (
            <div className="p-4 text-gray-500 text-sm text-center">
              <div className="mb-2">No context documents found.</div>
              <div className="text-xs">
                Create a new document or drag & drop .md, .txt, or .json files here to upload.
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${
                    selectedDoc?.id === doc.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                  }`}
                  onClick={() => setSelectedDoc(doc)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{doc.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-1 text-xs rounded ${
                          doc.category === 'api' ? 'bg-green-100 text-green-800' :
                          doc.category === 'design' ? 'bg-purple-100 text-purple-800' :
                          doc.category === 'research' ? 'bg-yellow-100 text-yellow-800' :
                          doc.category === 'requirements' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {doc.category}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(doc.lastModified).toLocaleDateString()}
                        </span>
                      </div>
                      {doc.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {doc.tags.map(tag => (
                            <span key={tag} className="px-1 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDocument(doc.id);
                      }}
                      className="text-red-500 hover:text-red-700 text-xs ml-2"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {isCreating || isEditing ? (
          /* Edit/Create Form */
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {isCreating ? 'Create New Document' : 'Edit Document'}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={cancelEditing}
                    className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={isCreating ? handleCreateDocument : handleUpdateDocument}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    {isCreating ? 'Create' : 'Save'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="Document title"
                />
              </div>

              {/* URL field for news articles and social media posts */}
              {(formData.category === 'news-article' || formData.category === 'social-media-post') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded"
                      placeholder={formData.category === 'news-article' ? 'News article URL' : 'Social media post URL'}
                    />
                    <button
                      type="button"
                      onClick={() => formData.url && handleUrlPreview(formData.url)}
                      disabled={!formData.url || urlLoading}
                      className="px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {urlLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        'Load Preview'
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  >
                    <option value="other">Other</option>
                    <option value="api">API</option>
                    <option value="design">Design</option>
                    <option value="research">Research</option>
                    <option value="requirements">Requirements</option>
                    <option value="meeting-minutes">Meeting Minutes</option>
                    <option value="news-article">News Article</option>
                    <option value="social-media-post">Social Media Post</option>
                    <option value="contract">Contract</option>
                    <option value="invoice">Invoice</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.tags.join(', ')}
                    onChange={(e) => handleTagInput(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="tag1, tag2, tag3"
                  />
                </div>
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content
                </label>
                <div className="h-96">
                  <MarkdownEditor
                    content={formData.content}
                    onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                    language="markdown"
                    onImproveWithAI={handleImproveCurrentDocument}
                    isImprovingWithAI={improvementInProgress}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : selectedDoc ? (
          /* Document Preview */
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selectedDoc.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-1 text-xs rounded ${
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
                    <span className="text-sm text-gray-500">
                      Last modified: {new Date(selectedDoc.lastModified).toLocaleString()}
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
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Edit
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {selectedDoc.content}
                </pre>
              </div>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-lg mb-2">No document selected</div>
              <div className="text-sm">
                Select a document from the sidebar or create a new one to get started.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Document"
        message={`Are you sure you want to delete "${documents.find(doc => doc.id === documentToDelete)?.title || 'this document'}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDeleting={deleteInProgress}
      />
    </div>
  );
}