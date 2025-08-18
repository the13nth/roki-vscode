'use client';

import { useState } from 'react';
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
}

export function ProjectPitch({ projectId }: ProjectPitchProps) {
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
              <Badge variant="secondary" className="text-xs">
                {pitchResult.tokenUsage.totalTokens} tokens • ${pitchResult.tokenUsage.cost.toFixed(4)}
              </Badge>
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