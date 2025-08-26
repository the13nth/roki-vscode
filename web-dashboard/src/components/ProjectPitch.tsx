'use client';

import { useState, useEffect } from 'react';
import { useUser, useOrganization } from '@clerk/nextjs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Presentation,
  Download,
  Copy,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileText,
  Target,
  TrendingUp,
  Rocket,
  DollarSign,
  Code,
  Users,
  Settings,
  Share2,
  Brain,
  Sparkles,
  Clock

} from 'lucide-react';

interface PitchResult {
  pitch: string;
  sections: {
    overview: string;
    keyFeatures: string;
    progress: string;
    futurePlans: string;
    marketOpportunity?: string;
    technicalHighlights?: string;
    businessModel?: string;
  };
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost: number;
  };
}



interface ProjectPitchProps {
  projectId: string;
  isOwned?: boolean;
}

export function ProjectPitch({ projectId, isOwned = true }: ProjectPitchProps) {
  const { user } = useUser();
  const { organization } = useOrganization();
  
  // Check if user is admin
  const isAdmin = organization?.slug === 'binghi_admins' || 
                 organization?.name === 'binghi_admins' ||
                 (user?.organizationMemberships?.some((membership: any) => 
                   membership.organization?.slug === 'binghi_admins' || 
                   membership.organization?.name === 'binghi_admins'
                 ));

  const [pitchResult, setPitchResult] = useState<PitchResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<'structured' | 'markdown' | 'plain'>('structured');
  const [selectedSections, setSelectedSections] = useState({
    overview: true,
    keyFeatures: true,
    progress: true,
    futurePlans: true,
    marketOpportunity: false,
    technicalHighlights: false,
    businessModel: false
  });

  // Save and improve state
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [improveDetails, setImproveDetails] = useState('');
  const [showImproveDialog, setShowImproveDialog] = useState(false);
  const [pitchTimestamp, setPitchTimestamp] = useState<string | null>(null);

  useEffect(() => {
    loadSavedPitch();
  }, [projectId]);

  const loadSavedPitch = async () => {
    try {
      console.log('📚 Loading saved pitch from Pinecone...');
      const response = await fetch(`/api/projects/${projectId}/analyses`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const savedData = await response.json();
        console.log('📊 Saved analyses loaded:', savedData);
        
        if (savedData.analyses && savedData.analyses.pitch) {
          const pitchData = savedData.analyses.pitch;
          setPitchResult(pitchData);
          setPitchTimestamp(pitchData.timestamp);
          setIsSaved(true);
          setHasUnsavedChanges(false);
          
          // Restore configuration if available
          if (pitchData.format) {
            setSelectedFormat(pitchData.format);
          }
          if (pitchData.sections) {
            setSelectedSections(pitchData.sections);
          }
          
          console.log('✅ Loaded saved pitch');
        }
      } else {
        console.log('No saved pitch found');
      }
    } catch (error) {
      console.error('Failed to load saved pitch:', error);
      // Don't show error to user as this is optional
    }
  };

  const handleGeneratePitch = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      setPitchResult(null);

      const sections = Object.entries(selectedSections)
        .filter(([_, selected]) => selected)
        .map(([section, _]) => section);

      console.log('🎯 Generating project pitch...');
      console.log(`📝 Format: ${selectedFormat}, Sections: ${sections.join(', ')}`);

      // Create AbortController with timeout for pitch generation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 90000); // 90 seconds timeout for pitch generation

      const response = await fetch(`/api/projects/${projectId}/generate-pitch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: selectedFormat,
          sections
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const result = await response.json();

      if (response.ok) {
        console.log('✅ Pitch generated successfully');
        console.log(`📊 Token usage: ${result.tokenUsage.totalTokens} tokens`);
        setPitchResult(result);
        setPitchTimestamp(new Date().toISOString());
        
        // Mark as having unsaved changes if this pitch was previously saved
        if (isSaved) {
          setHasUnsavedChanges(true);
        }
        
        setSuccessMessage('Pitch generated successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        console.error('❌ Pitch generation failed:', result.error);
        setError(result.error || 'Failed to generate pitch');
      }
    } catch (error) {
      console.error('❌ Pitch generation error:', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setError('Pitch generation timed out after 90 seconds. Please try again or check your internet connection.');
        } else {
          setError(`Error generating pitch: ${error.message}`);
        }
      } else {
        setError('Error generating pitch');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSavePitch = async () => {
    if (!pitchResult) {
      setError('No pitch data to save');
      return;
    }

    try {
      setIsSaving(true);
      const isUpdate = isSaved;
      console.log(`💾 ${isUpdate ? 'Updating' : 'Saving'} pitch to Pinecone...`);

      const response = await fetch(`/api/projects/${projectId}/analyses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisType: 'pitch',
          analysisData: {
            ...pitchResult,
            timestamp: pitchTimestamp || new Date().toISOString(),
            format: selectedFormat,
            sections: selectedSections
          },
        }),
      });

      if (response.ok) {
        setIsSaved(true);
        setHasUnsavedChanges(false);
        setSuccessMessage(`Pitch ${isUpdate ? 'updated' : 'saved'} successfully!`);
        setTimeout(() => setSuccessMessage(null), 3000);
        console.log(`✅ Pitch ${isUpdate ? 'updated' : 'saved'} to Pinecone`);
      } else {
        const errorData = await response.json();
        setError(`Failed to ${isUpdate ? 'update' : 'save'} pitch: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`Failed to ${isSaved ? 'update' : 'save'} pitch:`, error);
      setError(`Error ${isSaved ? 'updating' : 'saving'} pitch`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImprovePitch = async () => {
    if (!improveDetails?.trim()) {
      setError('Please provide details on how to improve the pitch');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (!pitchResult) {
      setError('No pitch found to improve');
      return;
    }

    try {
      setIsImproving(true);
      setError(null);

      // Convert pitch result to string format for improvement
      const originalPitch = JSON.stringify(pitchResult, null, 2);

      const response = await fetch(`/api/projects/${projectId}/improve-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisType: 'pitch',
          originalAnalysis: originalPitch,
          improvementDetails: improveDetails,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to improve pitch');
      }

      const result = await response.json();
      
      // Try to parse the improved pitch back to the expected format
      let improvedPitchData;
      try {
        improvedPitchData = JSON.parse(result.improvedAnalysis);
      } catch {
        // If parsing fails, create a new pitch object with the improved content
        improvedPitchData = {
          ...pitchResult,
          pitch: result.improvedAnalysis,
          timestamp: new Date().toISOString()
        };
      }

      // Update the pitch results with the improved version
      setPitchResult(improvedPitchData);
      setPitchTimestamp(new Date().toISOString());

      // Mark as having unsaved changes
      setHasUnsavedChanges(true);

      // Clear the improvement details and close dialog
      setImproveDetails('');
      setShowImproveDialog(false);

      setSuccessMessage('Pitch improved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (error: any) {
      console.error('Pitch improvement error:', error);
      setError(error.message || 'Failed to improve pitch');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsImproving(false);
    }
  };



  const handleCopyPitch = async () => {
    if (pitchResult) {
      try {
        await navigator.clipboard.writeText(pitchResult.pitch);
        setSuccessMessage('Pitch copied to clipboard!');
        setTimeout(() => setSuccessMessage(null), 2000);
      } catch (error) {
        setError('Failed to copy to clipboard');
      }
    }
  };

  const handleDownloadPitch = () => {
    if (pitchResult) {
      const blob = new Blob([pitchResult.pitch], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `project-pitch-${projectId}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccessMessage('Pitch downloaded!');
      setTimeout(() => setSuccessMessage(null), 2000);
    }
  };

  const renderMarkdown = (content: string) => (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-xl font-bold mb-3 text-foreground">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 text-foreground">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-medium mb-2 text-foreground">{children}</h3>,
          h4: ({ children }) => <h4 className="text-sm font-medium mb-1 text-foreground">{children}</h4>,
          p: ({ children }) => <p className="text-sm text-muted-foreground mb-2 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3 text-sm text-muted-foreground">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3 text-sm text-muted-foreground">{children}</ol>,
          li: ({ children }) => <li className="text-sm text-muted-foreground">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic text-muted-foreground">{children}</em>,
          code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono text-foreground">{children}</code>,
          pre: ({ children }) => <pre className="bg-muted p-3 rounded text-xs font-mono text-foreground overflow-x-auto">{children}</pre>,
          blockquote: ({ children }) => <blockquote className="border-l-4 border-primary/20 pl-4 italic text-muted-foreground">{children}</blockquote>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );

  const getSectionIcon = (section: string) => {
    switch (section) {
      case 'overview': return <FileText className="w-4 h-4" />;
      case 'keyFeatures': return <Target className="w-4 h-4" />;
      case 'progress': return <TrendingUp className="w-4 h-4" />;
      case 'futurePlans': return <Rocket className="w-4 h-4" />;
      case 'marketOpportunity': return <DollarSign className="w-4 h-4" />;
      case 'technicalHighlights': return <Code className="w-4 h-4" />;
      case 'businessModel': return <Users className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getSectionTitle = (section: string) => {
    switch (section) {
      case 'overview': return 'Project Overview';
      case 'keyFeatures': return 'Key Features';
      case 'progress': return 'Current Progress';
      case 'futurePlans': return 'Future Plans';
      case 'marketOpportunity': return 'Market Opportunity';
      case 'technicalHighlights': return 'Technical Highlights';
      case 'businessModel': return 'Business Model';
      default: return section;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Presentation className="w-6 h-6 mr-2 text-primary" />
            Project Pitch Generator
          </h2>
          <p className="text-muted-foreground mt-1">
            Generate a professional pitch presentation based on your project data
          </p>
        </div>
        
        {pitchResult && (
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleSavePitch}
              disabled={isSaving || (isSaved && !hasUnsavedChanges)}
              variant="outline"
              size="sm"
              className="flex items-center"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {hasUnsavedChanges ? 'Updating...' : 'Saving...'}
                </>
              ) : isSaved && !hasUnsavedChanges ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                  Saved
                </>
              ) : hasUnsavedChanges ? (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Update Pitch
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Save Pitch
                </>
              )}
            </Button>
            
            <Dialog open={showImproveDialog} onOpenChange={setShowImproveDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!isOwned}
                  className="flex items-center"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Improve Pitch
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center">
                    <Sparkles className="w-5 h-5 mr-2" />
                    Improve Project Pitch
                  </DialogTitle>
                  <DialogDescription>
                    Describe how you'd like to improve this pitch. Be specific about what aspects you want enhanced.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="improve-pitch" className="text-sm font-medium">
                      What would you like to improve or enhance?
                    </Label>
                    <Textarea
                      id="improve-pitch"
                      value={improveDetails}
                      onChange={(e) => setImproveDetails(e.target.value)}
                      placeholder="e.g., Make it more compelling, add stronger value propositions, improve the flow, add more specific metrics, make it shorter and punchier..."
                      className="min-h-[100px] mt-2"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowImproveDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleImprovePitch}
                      disabled={!isOwned || isImproving || !improveDetails?.trim()}
                      className="flex items-center"
                    >
                      {isImproving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Improving...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Improve Pitch
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyPitch}
              className="flex items-center"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPitch}
              className="flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}



      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Pitch Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Format Selection */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Output Format</Label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="structured"
                  checked={selectedFormat === 'structured'}
                  onChange={(e) => setSelectedFormat(e.target.value as any)}
                  className="text-primary"
                />
                <span className="text-sm">Structured</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="markdown"
                  checked={selectedFormat === 'markdown'}
                  onChange={(e) => setSelectedFormat(e.target.value as any)}
                  className="text-primary"
                />
                <span className="text-sm">Markdown</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="plain"
                  checked={selectedFormat === 'plain'}
                  onChange={(e) => setSelectedFormat(e.target.value as any)}
                  className="text-primary"
                />
                <span className="text-sm">Plain Text</span>
              </label>
            </div>
          </div>

          {/* Section Selection */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Include Sections</Label>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(selectedSections).map(([section, selected]) => (
                <div key={section} className="flex items-center space-x-2">
                  <Checkbox
                    id={section}
                    checked={selected}
                    onCheckedChange={(checked) =>
                      setSelectedSections(prev => ({ ...prev, [section]: !!checked }))
                    }
                  />
                  <Label htmlFor={section} className="text-sm flex items-center">
                    {getSectionIcon(section)}
                    <span className="ml-2">{getSectionTitle(section)}</span>
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGeneratePitch}
            disabled={isGenerating || Object.values(selectedSections).every(v => !v)}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Pitch...
              </>
            ) : (
              <>
                <Presentation className="w-4 h-4 mr-2" />
                Generate Pitch
              </>
            )}
          </Button>
        </CardContent>
      </Card>



      {/* Results */}
      {pitchResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center">
                <Presentation className="w-5 h-5 mr-2" />
                Generated Pitch
              </CardTitle>
              <div className="flex items-center space-x-3">
                {pitchTimestamp && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 mr-2" />
                    Generated at {new Date(pitchTimestamp).toLocaleString()}
                  </div>
                )}
                {isAdmin && (
                  <Badge variant="secondary" className="text-xs">
                    {pitchResult.tokenUsage.totalTokens} tokens • ${pitchResult.tokenUsage.cost.toFixed(4)}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="full" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="full">Full Pitch</TabsTrigger>
                <TabsTrigger value="sections">By Sections</TabsTrigger>
              </TabsList>
              
              <TabsContent value="full" className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-6 max-h-96 overflow-y-auto">
                  {renderMarkdown(pitchResult.pitch)}
                </div>
              </TabsContent>
              
              <TabsContent value="sections" className="space-y-4">
                <div className="space-y-4">
                  {Object.entries(pitchResult.sections).map(([section, content]) => {
                    if (!content) return null;
                    return (
                      <Card key={section} className="border-l-4 border-l-primary/20">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center">
                            {getSectionIcon(section)}
                            <span className="ml-2">{getSectionTitle(section)}</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="bg-gray-50 rounded-lg p-4">
                            {renderMarkdown(content)}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>


            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}