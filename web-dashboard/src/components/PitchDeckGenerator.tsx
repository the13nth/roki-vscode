'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertCircle, Presentation, Download, Copy, Save, Loader2, Eye, Edit3, Play, FileText } from 'lucide-react';

interface PitchDeckGeneratorProps {
  projectId: string;
  isOwned?: boolean;
}

interface Slide {
  title: string;
  type: 'title' | 'problem' | 'solution' | 'market' | 'business' | 'team' | 'financial' | 'ask' | 'overview' | 'features' | 'progress' | 'roadmap';
  content: {
    bulletPoints: string[];
    speakerNotes: string;
  };
  layout: 'title' | 'content' | 'split';
  order: number;
}

interface PitchDeckResult {
  slides: Slide[];
  metadata: {
    generationTime: number;
    model: string;
    tokenUsage: number;
    cost: number;
  };
  summary: string;
}

export function PitchDeckGenerator({ projectId, isOwned = true }: PitchDeckGeneratorProps) {
  const { user } = useUser();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pitchDeckResult, setPitchDeckResult] = useState<PitchDeckResult | null>(null);
  const [pitchTimestamp, setPitchTimestamp] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSlides, setEditedSlides] = useState<Slide[]>([]);

  // Configuration state
  const [audience, setAudience] = useState<'investor' | 'customer' | 'partner' | 'technical'>('investor');
  const [slideCount, setSlideCount] = useState(10);
  const [tone, setTone] = useState<'professional' | 'casual' | 'technical'>('professional');
  const [includeSections, setIncludeSections] = useState<string[]>([
    'overview', 'problem', 'solution', 'market', 'business', 'team', 'financial', 'ask'
  ]);
  
  // State to store project data
  const [projectData, setProjectData] = useState<{
    metadata?: any;
    analyses?: Record<string, any>;
    contextDocuments?: any[];
  } | null>(null);

  // Load saved pitch deck and project data
  useEffect(() => {
    loadSavedPitchDeck();
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      console.log('🔄 Loading project data for pitch deck generation...');
      
      // Load project metadata from the main project endpoint
      const metadataResponse = await fetch(`/api/projects/${projectId}`);
      if (metadataResponse.ok) {
        const metadataData = await metadataResponse.json();
        if (metadataData.success && metadataData.project) {
          console.log('✅ Loaded project metadata:', metadataData.project.name);
          setProjectData(prev => ({ ...prev, metadata: metadataData.project }));
        } else {
          console.warn('⚠️ No project metadata found in response');
        }
      } else {
        console.warn('⚠️ Failed to load project metadata:', metadataResponse.status);
      }
      
      // Load analysis results
      const analysesResponse = await fetch(`/api/projects/${projectId}/analyses`);
      if (analysesResponse.ok) {
        const analysesData = await analysesResponse.json();
        if (analysesData.success && analysesData.analyses) {
          console.log('✅ Loaded analysis results:', Object.keys(analysesData.analyses));
          setProjectData(prev => ({ ...prev, analyses: analysesData.analyses }));
        } else {
          console.warn('⚠️ No analysis results found in response');
        }
      } else {
        console.warn('⚠️ Failed to load analysis results:', analysesResponse.status);
      }
      
      // Load context documents
      const contextResponse = await fetch(`/api/projects/${projectId}/context`);
      if (contextResponse.ok) {
        const contextData = await contextResponse.json();
        if (contextData.contextDocs && Array.isArray(contextData.contextDocs)) {
          console.log('✅ Loaded context documents:', contextData.contextDocs.length);
          setProjectData(prev => ({ ...prev, contextDocuments: contextData.contextDocs }));
        } else {
          console.warn('⚠️ No context documents found in response');
        }
      } else {
        console.warn('⚠️ Failed to load context documents:', contextResponse.status);
      }
      
      // Also try to load from Pinecone as backup
      try {
        const pineconeResponse = await fetch(`/api/projects/${projectId}/sync/download`);
        if (pineconeResponse.ok) {
          const pineconeData = await pineconeResponse.json();
          if (pineconeData.success && pineconeData.data?.project) {
            console.log('✅ Loaded additional data from Pinecone:', pineconeData.data.project.name);
            setProjectData(prev => ({ 
              ...prev, 
              metadata: { ...prev?.metadata, ...pineconeData.data.project },
              analyses: { ...prev?.analyses, ...pineconeData.data.project.analyses },
              contextDocuments: [...(prev?.contextDocuments || []), ...(pineconeData.data.project.contextDocuments || [])]
            }));
          }
        }
      } catch (error) {
        console.warn('⚠️ Failed to load Pinecone backup data:', error);
      }
      
    } catch (error) {
      console.warn('Failed to load project data:', error);
    }
  };

  const loadSavedPitchDeck = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/pitch-deck`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.pitchDeck) {
          setPitchDeckResult(data.pitchDeck);
          setPitchTimestamp(data.timestamp);
          setIsSaved(true);
          setEditedSlides(data.pitchDeck.slides);
        }
      }
    } catch (error) {
      // Don't show error to user as this is optional
    }
  };

  const handleGeneratePitchDeck = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      setPitchDeckResult(null);

      console.log('🎯 Generating pitch deck...');
      console.log(`👥 Audience: ${audience}, 📊 Slides: ${slideCount}, 🎭 Tone: ${tone}`);

      // Create AbortController with timeout for pitch deck generation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 120000); // 2 minutes timeout for pitch deck generation

      const response = await fetch(`/api/projects/${projectId}/generate-pitch-deck`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audience,
          slideCount,
          tone,
          includeSections,
          projectData
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const result = await response.json();

      if (response.ok) {
        console.log('✅ Pitch deck generated successfully');
        console.log(`📊 Token usage: ${result.metadata.tokenUsage} tokens`);
        setPitchDeckResult(result);
        setEditedSlides(result.slides);
        setPitchTimestamp(new Date().toISOString());
        setCurrentSlide(0);
        
        // Mark as having unsaved changes if this pitch deck was previously saved
        if (isSaved) {
          setHasUnsavedChanges(true);
        }
        
        setSuccessMessage('Pitch deck generated successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        console.error('❌ Pitch deck generation failed:', result.error);
        setError(result.error || 'Failed to generate pitch deck');
      }
    } catch (error) {
      console.error('❌ Pitch deck generation error:', error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setError('Pitch deck generation timed out. Please try again.');
        } else {
          setError(error.message);
        }
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSavePitchDeck = async () => {
    if (!pitchDeckResult) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/pitch-deck`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pitchDeck: pitchDeckResult,
          timestamp: pitchTimestamp
        }),
      });

      if (response.ok) {
        setIsSaved(true);
        setHasUnsavedChanges(false);
        setSuccessMessage('Pitch deck saved successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to save pitch deck');
      }
    } catch (error) {
      setError('Failed to save pitch deck');
    }
  };

  const handleDownloadPowerPoint = async () => {
    if (!pitchDeckResult) return;

    try {
      setIsDownloading(true);
      
      const response = await fetch(`/api/projects/${projectId}/download-pitch-deck`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slides: editedSlides,
          projectName: pitchDeckResult.summary.split(' ')[0] || 'Project',
          audience
        }),
      });

      if (response.ok) {
        // Get the filename from the response headers
        const contentDisposition = response.headers.get('content-disposition');
        const filename = contentDisposition?.split('filename=')[1]?.replace(/"/g, '') || 'pitch-deck.pptx';
        
        // Create blob and download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setSuccessMessage('PowerPoint presentation downloaded successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to download PowerPoint');
      }
    } catch (error) {
      setError('Failed to download PowerPoint presentation');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleExportMarkdown = () => {
    if (!pitchDeckResult) return;

    const markdown = generateMarkdownFromSlides(pitchDeckResult.slides);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pitch-deck-${projectId}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateMarkdownFromSlides = (slides: Slide[]): string => {
    let markdown = `# Pitch Deck\n\n`;
    markdown += `Generated on: ${new Date().toLocaleString()}\n\n`;

    slides.forEach((slide, index) => {
      markdown += `## Slide ${index + 1}: ${slide.title}\n\n`;
      markdown += `**Type:** ${slide.type}\n`;
      markdown += `**Layout:** ${slide.layout}\n\n`;
      
      markdown += `### Key Points:\n`;
      slide.content.bulletPoints.forEach(point => {
        markdown += `- ${point}\n`;
      });
      markdown += `\n`;
      
      markdown += `### Speaker Notes:\n`;
      markdown += `${slide.content.speakerNotes}\n\n`;
      markdown += `---\n\n`;
    });

    return markdown;
  };

  const handleSectionToggle = (section: string) => {
    setIncludeSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleSlideEdit = (slideIndex: number, field: string, value: any) => {
    const updatedSlides = [...editedSlides];
    if (field === 'title') {
      updatedSlides[slideIndex].title = value;
    } else if (field === 'bulletPoints') {
      updatedSlides[slideIndex].content.bulletPoints = value;
    } else if (field === 'speakerNotes') {
      updatedSlides[slideIndex].content.speakerNotes = value;
    }
    setEditedSlides(updatedSlides);
    setHasUnsavedChanges(true);
  };

  const getSlideTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      title: 'bg-blue-100 text-blue-800',
      problem: 'bg-red-100 text-red-800',
      solution: 'bg-green-100 text-green-800',
      market: 'bg-purple-100 text-purple-800',
      business: 'bg-orange-100 text-orange-800',
      team: 'bg-indigo-100 text-indigo-800',
      financial: 'bg-emerald-100 text-emerald-800',
      ask: 'bg-pink-100 text-pink-800',
      overview: 'bg-gray-100 text-gray-800',
      features: 'bg-cyan-100 text-cyan-800',
      progress: 'bg-yellow-100 text-yellow-800',
      roadmap: 'bg-lime-100 text-lime-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getLayoutIcon = (layout: string) => {
    switch (layout) {
      case 'title': return '🎯';
      case 'content': return '📝';
      case 'split': return '📊';
      default: return '📄';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">🎯 Pitch Deck Generator</h2>
          <p className="text-gray-600">Create professional pitch decks using AI</p>
        </div>
        {pitchDeckResult && (
          <div className="flex gap-2">
            <Button
              onClick={handleSavePitchDeck}
              disabled={!hasUnsavedChanges}
              variant="outline"
              size="sm"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button
              onClick={handleDownloadPowerPoint}
              disabled={isDownloading}
              variant="outline"
              size="sm"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Download PPTX
            </Button>
            <Button
              onClick={handleExportMarkdown}
              variant="outline"
              size="sm"
            >
              <FileText className="w-4 h-4 mr-2" />
              Export MD
            </Button>
          </div>
        )}
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-400 rounded-full mr-3"></div>
            <span className="text-green-800">{successMessage}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {!pitchDeckResult ? (
        /* Configuration Panel */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Presentation className="w-5 h-5 mr-2" />
              Pitch Deck Configuration
            </CardTitle>
            <CardDescription>
              Configure your pitch deck settings before generation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="audience">Target Audience</Label>
                <Select value={audience} onValueChange={(value: any) => setAudience(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="investor">Investors</SelectItem>
                    <SelectItem value="customer">Customers</SelectItem>
                    <SelectItem value="partner">Partners</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="slideCount">Number of Slides</Label>
                <Select value={slideCount.toString()} onValueChange={(value) => setSlideCount(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 slides</SelectItem>
                    <SelectItem value="8">8 slides</SelectItem>
                    <SelectItem value="10">10 slides</SelectItem>
                    <SelectItem value="12">12 slides</SelectItem>
                    <SelectItem value="15">15 slides</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tone">Tone</Label>
                <Select value={tone} onValueChange={(value: any) => setTone(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Section Selection */}
            <div>
              <Label>Include Sections</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                {[
                  { key: 'overview', label: 'Overview' },
                  { key: 'problem', label: 'Problem' },
                  { key: 'solution', label: 'Solution' },
                  { key: 'market', label: 'Market' },
                  { key: 'business', label: 'Business Model' },
                  { key: 'team', label: 'Team' },
                  { key: 'financial', label: 'Financial' },
                  { key: 'ask', label: 'Ask' }
                ].map(section => (
                  <div key={section.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={section.key}
                      checked={includeSections.includes(section.key)}
                      onCheckedChange={() => handleSectionToggle(section.key)}
                    />
                    <Label htmlFor={section.key} className="text-sm">
                      {section.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGeneratePitchDeck}
              disabled={isGenerating || !isOwned}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Pitch Deck...
                </>
              ) : (
                <>
                  <Presentation className="w-4 h-4 mr-2" />
                  Generate Pitch Deck
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Pitch Deck Display */
        <div className="space-y-6">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Pitch Deck Summary</CardTitle>
              <CardDescription>
                {pitchDeckResult.summary}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center space-x-4">
                  <span>📊 {pitchDeckResult.slides.length} slides</span>
                  <span>⏱️ {Math.round(pitchDeckResult.metadata.generationTime / 1000)}s</span>
                  <span>🧠 {pitchDeckResult.metadata.tokenUsage} tokens</span>
                  <span>💰 ${pitchDeckResult.metadata.cost.toFixed(4)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => setPitchDeckResult(null)}
                    variant="outline"
                    size="sm"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Regenerate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Slides Display */}
          <Tabs value={currentSlide.toString()} onValueChange={(value) => setCurrentSlide(parseInt(value))}>
            <TabsList className="grid w-full grid-cols-5 md:grid-cols-10">
              {editedSlides.map((slide, index) => (
                <TabsTrigger key={index} value={index.toString()} className="text-xs">
                  {index + 1}
                </TabsTrigger>
              ))}
            </TabsList>

            {editedSlides.map((slide, index) => (
              <TabsContent key={index} value={index.toString()} className="mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getLayoutIcon(slide.layout)}</span>
                        <div>
                          <CardTitle className="text-xl">{slide.title}</CardTitle>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge className={getSlideTypeColor(slide.type)}>
                              {slide.type}
                            </Badge>
                            <Badge variant="outline">
                              {slide.layout}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => setIsEditing(!isEditing)}
                        variant="outline"
                        size="sm"
                      >
                        {isEditing ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      /* Edit Mode */
                      <div className="space-y-4">
                        <div>
                          <Label>Slide Title</Label>
                          <input
                            type="text"
                            value={slide.title}
                            onChange={(e) => handleSlideEdit(index, 'title', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div>
                          <Label>Key Points</Label>
                          <textarea
                            value={slide.content.bulletPoints.join('\n')}
                            onChange={(e) => handleSlideEdit(index, 'bulletPoints', e.target.value.split('\n').filter(Boolean))}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={4}
                            placeholder="One point per line"
                          />
                        </div>
                        
                        <div>
                          <Label>Speaker Notes</Label>
                          <textarea
                            value={slide.content.speakerNotes}
                            onChange={(e) => handleSlideEdit(index, 'speakerNotes', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                          />
                        </div>
                      </div>
                    ) : (
                      /* View Mode */
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Key Points:</h4>
                          <ul className="space-y-1">
                            {slide.content.bulletPoints.map((point, pointIndex) => (
                              <li key={pointIndex} className="flex items-start">
                                <span className="text-blue-600 mr-2">•</span>
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-gray-900 mb-2">Speaker Notes:</h4>
                          <p className="text-gray-700 text-sm">{slide.content.speakerNotes}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}
    </div>
  );
}
