'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CornerBrackets } from '@/components/ui/corner-brackets';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectPitch } from './ProjectPitch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Brain,
  Play,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileText,
  TrendingUp,
  Lightbulb,
  Target,
  Clock,
  Zap,
  Star,
  Rocket,
  DollarSign,
  Flame,
  Shield,
  Grid3X3,
  Expand,
  Eye,
  Presentation,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { JSX } from 'react/jsx-runtime';

interface AnalysisResult {
  summary: string;
  insights: string[];
  recommendations: string[];
  risks: string[];
  nextSteps: string[];
  marketAnalysis?: {
    title: string;
    content: string;
  };
  differentiationAnalysis?: {
    title: string;
    content: string;
  };
  financialProjections?: {
    title: string;
    content: string;
  };
  roastIdea?: {
    summary: string;
    brutallyCritical: string[];
    realityCheck: string[];
    improvements: string[];
    marketReality: string[];
    honestAdvice: string[];
  };
  businessModelCanvas?: {
    keyPartnerships: string;
    keyActivities: string;
    keyResources: string;
    valueProposition: string;
    customerRelationships: string;
    channels: string;
    customerSegments: string;
    costStructure: string;
    revenueStreams: string;
  };
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cumulative?: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      totalCost: number;
      sessionCount: number;
    };
    session?: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      totalCost: number;
      requestCount: number;
    };
    lastRequest?: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      cost: number;
      timestamp: string;
    };
  };
  timestamp: string;
}

interface ProjectAnalysisProps {
  projectId: string;
}

export function ProjectAnalysis({ projectId }: ProjectAnalysisProps) {
  const [context, setContext] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<Record<string, AnalysisResult>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [projectTemplate, setProjectTemplate] = useState<string>('web-app');
  const [mitigations, setMitigations] = useState<Record<string, { content: string; isGenerating: boolean }>>({});
  const [mitigationTokens, setMitigationTokens] = useState<Array<{ inputTokens: number; outputTokens: number; totalTokens: number; cost: number; timestamp: string; criticism: string }>>([]);
  const [analysisProgress, setAnalysisProgress] = useState<{ stage: string; progress: number }>({ stage: '', progress: 0 });
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<string>('comprehensive');
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>([]);
  const [selectedBmcSection, setSelectedBmcSection] = useState<{ title: string, content: string, color: string } | null>(null);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<string>('overview');
  const [showPitchModal, setShowPitchModal] = useState(false);
  const [savedAnalyses, setSavedAnalyses] = useState<Record<string, boolean>>({});
  const [savingAnalyses, setSavingAnalyses] = useState<Record<string, boolean>>({});



  // Define all available analysis types
  const allAnalysisTypes = ['technical', 'market', 'differentiation', 'financial', 'bmc', 'roast'];

  // Define required analyses for roast (exclude roast itself)
  const requiredForRoast = ['technical', 'market', 'differentiation', 'financial', 'bmc'];

  // Check if all analyses are complete
  const allAnalysesComplete = allAnalysisTypes.every(type => analysisResults[type]);

  // Check if all required analyses for roast are complete
  const roastAnalysesComplete = requiredForRoast.every(type => analysisResults[type]);

  // Get remaining analyses
  const remainingAnalyses = allAnalysisTypes.filter(type => !analysisResults[type]);

  // Get remaining analyses for roast (excluding roast itself)
  const remainingForRoast = requiredForRoast.filter(type => !analysisResults[type]);

  // BMC Card Component
  const BMCCard = ({ title, content, colorClass, borderClass, textClass }: {
    title: string;
    content: string;
    colorClass: string;
    borderClass: string;
    textClass: string;
  }) => (
    <Dialog>
      <DialogTrigger asChild>
        <div className={`${colorClass} ${borderClass} rounded-lg p-4 min-h-[120px] cursor-pointer hover:shadow-md transition-all duration-200 group`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className={`text-sm font-bold ${textClass} group-hover:text-opacity-80`}>
              {title}
            </h4>
            <Eye className={`w-4 h-4 ${textClass} opacity-50 group-hover:opacity-100 transition-opacity`} />
          </div>
          <div className={`text-xs ${textClass} opacity-70`}>
            {content ? 'Click to view details' : 'No content available'}
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Grid3X3 className="w-5 h-5 mr-2" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Business Model Canvas - {title} section details
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          {content ? (
            <div className="prose prose-sm max-w-none">
              {renderMarkdown(content)}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Grid3X3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No content available for this section</p>
              <p className="text-sm mt-2">This section was not populated during the analysis</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  // Helper function to render markdown content with proper styling
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

  // New state for documents
  const [projectDocuments, setProjectDocuments] = useState<any[]>([]);
  const [contextDocuments, setContextDocuments] = useState<any[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  
  // Collapsible state for document sections
  const [projectDocsExpanded, setProjectDocsExpanded] = useState(false);
  const [contextDocsExpanded, setContextDocsExpanded] = useState(false);

  useEffect(() => {
    loadProjectContext();
    loadProjectConfig();
    loadSavedAnalyses();
  }, [projectId]);

  const loadProjectConfig = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const projectData = await response.json();
        setProjectTemplate(projectData.template || 'web-app');
      }
    } catch (error) {
      console.error('Failed to load project config:', error);
      // Default to web-app if config loading fails
      setProjectTemplate('web-app');
    }
  };

  const loadProjectContext = async () => {
    try {
      setIsLoadingContext(true);
      setIsLoadingDocuments(true);
      console.log('📚 Loading project documents from Pinecone...');

      // Fetch documents from Pinecone
      const response = await fetch(`/api/projects/${projectId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisType: 'comprehensive',
          fetchOnly: true // New flag to just fetch documents without analysis
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('📊 Documents loaded from Pinecone:', result);

        if (result.projectDocuments) {
          setProjectDocuments(result.projectDocuments);
          console.log(`📋 Loaded ${result.projectDocuments.length} project documents`);
        }

        if (result.contextDocuments) {
          setContextDocuments(result.contextDocuments);
          console.log(`📚 Loaded ${result.contextDocuments.length} context documents`);
        }

        setContext('Documents loaded from cloud storage');
        console.log('✅ Documents ready for analysis');
      } else {
        const errorData = await response.json();
        console.error('Failed to load documents:', errorData);
        setError(`Failed to load documents: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to load project context:', error);
      setError('Failed to load project context');
    } finally {
      setIsLoadingContext(false);
      setIsLoadingDocuments(false);
    }
  };

  const loadSavedAnalyses = async () => {
    try {
      console.log('📚 Loading saved analyses from Pinecone...');
      const response = await fetch(`/api/projects/${projectId}/analyses`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const savedData = await response.json();
        console.log('📊 Saved analyses loaded:', savedData);
        
        if (savedData.analyses) {
          setAnalysisResults(savedData.analyses);
          // Mark all loaded analyses as saved
          const savedStatus: Record<string, boolean> = {};
          Object.keys(savedData.analyses).forEach(type => {
            savedStatus[type] = true;
          });
          setSavedAnalyses(savedStatus);
          console.log(`✅ Loaded ${Object.keys(savedData.analyses).length} saved analyses`);
        }
      } else {
        console.log('No saved analyses found or failed to load');
      }
    } catch (error) {
      console.error('Failed to load saved analyses:', error);
      // Don't show error to user as this is optional
    }
  };

  const saveAnalysis = async (analysisType: string) => {
    if (!analysisResults[analysisType]) {
      setError('No analysis data to save');
      return;
    }

    try {
      setSavingAnalyses(prev => ({ ...prev, [analysisType]: true }));
      console.log(`💾 Saving ${analysisType} analysis to Pinecone...`);

      const response = await fetch(`/api/projects/${projectId}/analyses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisType,
          analysisData: analysisResults[analysisType],
        }),
      });

      if (response.ok) {
        setSavedAnalyses(prev => ({ ...prev, [analysisType]: true }));
        setSuccessMessage(`${getAnalysisTypeLabel(analysisType)} saved successfully!`);
        setTimeout(() => setSuccessMessage(null), 3000);
        console.log(`✅ ${analysisType} analysis saved to Pinecone`);
      } else {
        const errorData = await response.json();
        setError(`Failed to save analysis: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`Failed to save ${analysisType} analysis:`, error);
      setError('Error saving analysis');
    } finally {
      setSavingAnalyses(prev => ({ ...prev, [analysisType]: false }));
    }
  };

  const handleAnalyze = async (analysisType: string) => {
    try {
      setIsAnalyzing(true);
      setError(null);

      console.log(`🔍 Starting ${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)} Analysis`);
      console.log('📚 Analysis will fetch documents from Pinecone cloud storage');
      console.log('🚀 Sending analysis request...');

      const response = await fetch(`/api/projects/${projectId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisType
        }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log(`✅ ${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)} analysis completed successfully`);
        console.log(`📈 Analysis summary: ${result.summary?.substring(0, 100)}...`);
        console.log(`💡 Insights generated: ${result.insights?.length || 0}`);
        console.log(`🎯 Recommendations: ${result.recommendations?.length || 0}`);

        // Store the result for this specific analysis type
        setAnalysisResults(prev => ({
          ...prev,
          [analysisType]: result
        }));

        // Switch to the appropriate tab
        setActiveAnalysisTab(analysisType);
      } else {
        console.error(`❌ ${analysisType} analysis failed:`, result.error);
        setError(result.error || 'Analysis failed');
      }
    } catch (error) {
      console.error(`❌ ${analysisType} analysis error:`, error);
      setError('Error performing analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Remove handleQuickAnalysis as it's now handled by handleAnalyze

  const handleGenerateMitigation = async (criticism: string, criticismType: string) => {
    const mitigationKey = `${criticismType}-${criticism.substring(0, 50)}`;

    setMitigations(prev => ({
      ...prev,
      [mitigationKey]: { content: '', isGenerating: true }
    }));

    try {
      const response = await fetch(`/api/projects/${projectId}/generate-mitigation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context,
          criticism,
          criticismType,
          projectTemplate,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate mitigation');
      }

      const result = await response.json();

      setMitigations(prev => ({
        ...prev,
        [mitigationKey]: { content: result.mitigation, isGenerating: false }
      }));

      // Track mitigation tokens
      if (result.tokenUsage) {
        setMitigationTokens(prev => [...prev, {
          inputTokens: result.tokenUsage.inputTokens,
          outputTokens: result.tokenUsage.outputTokens,
          totalTokens: result.tokenUsage.totalTokens,
          cost: result.tokenUsage.cost,
          timestamp: new Date().toISOString(),
          criticism: criticism.substring(0, 100) + (criticism.length > 100 ? '...' : '')
        }]);
      }

    } catch (err) {
      setMitigations(prev => ({
        ...prev,
        [mitigationKey]: { content: 'Failed to generate mitigation. Please try again.', isGenerating: false }
      }));
      console.error('Mitigation generation failed:', err);
    }
  };

  const handleAddToTasks = async (feature: any) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: feature.name,
          description: feature.description,
          priority: feature.priority === 'high' ? 'high' : feature.priority === 'medium' ? 'medium' : 'low',
          status: 'pending'
        }),
      });

      if (response.ok) {
        setSuccessMessage(`"${feature.name}" added to tasks successfully!`);
        setTimeout(() => setSuccessMessage(null), 3000); // Clear after 3 seconds
      } else {
        const errorData = await response.json();
        setError(`Failed to add feature to tasks: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      setError('Error adding feature to tasks');
    }
  };

  const handlePitchClick = () => {
    if (allAnalysesComplete) {
      setActiveAnalysisTab('pitch');
    } else {
      setShowPitchModal(true);
    }
  };

  const handleRoastClick = () => {
    if (roastAnalysesComplete) {
      handleAnalyze('roast');
    } else {
      // Show a modal or alert that all analyses need to be completed first
      setError(`Please complete all other analyses before running the roast analysis. The roast needs comprehensive project context to provide meaningful criticism. Missing: ${remainingForRoast.join(', ')}`);
    }
  };

  const getAnalysisTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      technical: 'Technical Analysis',
      market: 'Market Analysis',
      differentiation: 'Competitive Differentiation',
      financial: 'Cost & Revenue Analysis',
      bmc: 'Business Model Canvas',
      roast: 'Roast My Idea'
    };
    return labels[type] || type;
  };

  const getAnalysisTypeIcon = (type: string) => {
    const icons: Record<string, JSX.Element> = {
      technical: <Lightbulb className="w-4 h-4" />,
      market: <TrendingUp className="w-4 h-4" />,
      differentiation: <Zap className="w-4 h-4" />,
      financial: <DollarSign className="w-4 h-4" />,
      bmc: <Grid3X3 className="w-4 h-4" />,
      roast: <Flame className="w-4 h-4" />
    };
    return icons[type] || <Brain className="w-4 h-4" />;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b bg-white">
        <h1 className="text-2xl font-bold mb-2">Project Analysis</h1>
        <p className="text-muted-foreground">
          {projectTemplate === 'business'
            ? 'AI-powered business analysis to provide strategic insights, regulatory guidance, and operational recommendations.'
            : 'AI-powered analysis of your project context to provide technical insights, recommendations, and identify potential improvements.'
          }
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Context Input - Left Panel */}
        <div className="w-1/4 border-r bg-gray-50 flex flex-col">
          <div className="flex-shrink-0 p-4 border-b bg-white">
            <h2 className="font-semibold flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              Project Context
            </h2>
          </div>

          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          <div className="space-y-3">
              {/* Analysis Options */}
              <div>
                <Label className="text-sm font-medium mb-3 block">
                  Choose Analysis Type
                </Label>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAnalyze('technical')}
                    disabled={isAnalyzing || (projectDocuments.length === 0 && contextDocuments.length === 0)}
                    className="justify-start rounded-none border-gray-300 hover:border-blue-300 hover:bg-blue-50"
                  >
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Technical Analysis
                    {analysisResults.technical && <CheckCircle className="w-3 h-3 ml-auto text-green-600" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAnalyze('market')}
                    disabled={isAnalyzing || (projectDocuments.length === 0 && contextDocuments.length === 0)}
                    className="justify-start rounded-none border-gray-300 hover:border-purple-300 hover:bg-purple-50"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Market Analysis
                    {analysisResults.market && <CheckCircle className="w-3 h-3 ml-auto text-green-600" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAnalyze('differentiation')}
                    disabled={isAnalyzing || (projectDocuments.length === 0 && contextDocuments.length === 0)}
                    className="justify-start rounded-none border-gray-300 hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Competitive Differentiation
                    {analysisResults.differentiation && <CheckCircle className="w-3 h-3 ml-auto text-green-600" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAnalyze('financial')}
                    disabled={isAnalyzing || (projectDocuments.length === 0 && contextDocuments.length === 0)}
                    className="justify-start rounded-none border-gray-300 hover:border-yellow-300 hover:bg-yellow-50"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Cost & Revenue Analysis
                    {analysisResults.financial && <CheckCircle className="w-3 h-3 ml-auto text-green-600" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAnalyze('bmc')}
                    disabled={isAnalyzing || (projectDocuments.length === 0 && contextDocuments.length === 0)}
                    className="justify-start rounded-none border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    <Grid3X3 className="w-4 h-4 mr-2" />
                    Business Model Canvas
                    {analysisResults.bmc && <CheckCircle className="w-3 h-3 ml-auto text-green-600" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRoastClick()}
                    disabled={isAnalyzing || !roastAnalysesComplete}
                    className="justify-start rounded-none border-red-200 text-red-700 hover:bg-red-50"
                  >
                    <Flame className="w-4 h-4 mr-2" />
                    Roast My Idea
                    {analysisResults.roast && <CheckCircle className="w-3 h-3 ml-auto text-green-600" />}
                    {!roastAnalysesComplete && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {remainingForRoast.length}
                      </Badge>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPitchModal(true)}
                    disabled={isAnalyzing || !allAnalysesComplete}
                    className="justify-start rounded-none border-purple-200 text-purple-700 hover:bg-purple-50"
                  >
                    <Presentation className="w-4 h-4 mr-2" />
                    Generate Pitch
                    {allAnalysesComplete && <CheckCircle className="w-3 h-3 ml-auto text-green-600" />}
                    {!allAnalysesComplete && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {remainingAnalyses.length}
                      </Badge>
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Documents for Analysis</Label>

              {isLoadingDocuments && (
                <div className="flex items-center text-sm text-muted-foreground mt-2">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading documents from cloud storage...
                </div>
              )}

              {!isLoadingDocuments && (
                <div className="mt-2 space-y-4">
                  {/* Project Documents */}
                  {projectDocuments.length > 0 && (
                    <div>
                      <button
                        onClick={() => setProjectDocsExpanded(!projectDocsExpanded)}
                        className="w-full text-left text-sm font-medium text-muted-foreground mb-2 flex items-center hover:text-foreground transition-colors"
                      >
                        {projectDocsExpanded ? (
                          <ChevronDown className="w-4 h-4 mr-2" />
                        ) : (
                          <ChevronRight className="w-4 h-4 mr-2" />
                        )}
                        <FileText className="w-4 h-4 mr-2" />
                        Project Documents ({projectDocuments.length})
                      </button>
                      
                      {projectDocsExpanded && (
                        <div className="grid grid-cols-1 gap-3 ml-6">
                          {projectDocuments.map((doc, index) => (
                            <Card key={index} className="border-l-4 border-l-blue-500 overflow-hidden">
                              <CardHeader className="pb-3">
                                <div className="space-y-1">
                                  <CardTitle className="text-sm font-medium truncate">
                                    {doc.title || doc.filename}
                                  </CardTitle>
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs text-muted-foreground">
                                      Document Type
                                    </p>
                                    <Badge variant="secondary" className="text-xs">
                                      {doc.documentType || 'document'}
                                    </Badge>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="space-y-2">
                                  <p className="text-xs text-muted-foreground line-clamp-3">
                                    {doc.content?.substring(0, 120) || 'No content preview available'}
                                    {doc.content && doc.content.length > 120 && '...'}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Context Documents */}
                  {contextDocuments.length > 0 && (
                    <div>
                      <button
                        onClick={() => setContextDocsExpanded(!contextDocsExpanded)}
                        className="w-full text-left text-sm font-medium text-muted-foreground mb-2 flex items-center hover:text-foreground transition-colors"
                      >
                        {contextDocsExpanded ? (
                          <ChevronDown className="w-4 h-4 mr-2" />
                        ) : (
                          <ChevronRight className="w-4 h-4 mr-2" />
                        )}
                        <FileText className="w-4 h-4 mr-2" />
                        Context Documents ({contextDocuments.length})
                      </button>
                      
                      {contextDocsExpanded && (
                        <div className="grid grid-cols-1 gap-3 ml-6">
                          {contextDocuments.map((doc, index) => (
                            <Card key={index} className="border-l-4 border-l-green-500 overflow-hidden">
                              <CardHeader className="pb-3">
                                <div className="space-y-1">
                                  <CardTitle className="text-sm font-medium truncate">
                                    {doc.title || doc.filename}
                                  </CardTitle>
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs text-muted-foreground">
                                      Category
                                    </p>
                                    <Badge variant="outline" className="text-xs">
                                      {doc.category || 'context'}
                                    </Badge>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="space-y-2">
                                  <p className="text-xs text-muted-foreground line-clamp-3">
                                    {doc.content?.substring(0, 120) || 'No content preview available'}
                                    {doc.content && doc.content.length > 120 && '...'}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* No Documents */}
                  {projectDocuments.length === 0 && contextDocuments.length === 0 && !isLoadingDocuments && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No documents found for analysis</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            
          </div>
        </div>

        {/* Analysis Results - Right Panel */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-shrink-0 p-4 border-b bg-white">
            <h2 className="font-semibold flex items-center">
              <Brain className="w-4 h-4 mr-2" />
              Analysis Results
            </h2>
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {successMessage && (
              <Alert className="mb-4 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
              </Alert>
            )}

            {isAnalyzing && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Analyzing project context...</p>
                </div>
              </div>
            )}

            {(Object.keys(analysisResults).length > 0 || true) && (
              <Tabs value={activeAnalysisTab} onValueChange={setActiveAnalysisTab} className="w-full">
                <div className="overflow-x-auto">
                  <TabsList className="flex gap-1 p-1 min-w-max">
                    {Object.keys(analysisResults).length > 0 && (
                      <TabsTrigger value="overview" className="text-xs whitespace-nowrap">Overview</TabsTrigger>
                    )}
                    {analysisResults.technical && (
                      <TabsTrigger value="technical" className="text-xs whitespace-nowrap">
                        <Lightbulb className="w-3 h-3 mr-1" />
                        Technical
                      </TabsTrigger>
                    )}
                    {analysisResults.market && (
                      <TabsTrigger value="market" className="text-xs whitespace-nowrap">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Market
                      </TabsTrigger>
                    )}
                    {analysisResults.differentiation && (
                      <TabsTrigger value="differentiation" className="text-xs whitespace-nowrap">
                        <Zap className="w-3 h-3 mr-1" />
                        Differentiation
                      </TabsTrigger>
                    )}
                    {analysisResults.financial && (
                      <TabsTrigger value="financial" className="text-xs whitespace-nowrap">
                        <DollarSign className="w-3 h-3 mr-1" />
                        Financial
                      </TabsTrigger>
                    )}
                    {analysisResults.bmc && (
                      <TabsTrigger value="bmc" className="text-xs whitespace-nowrap text-blue-700">
                        <Grid3X3 className="w-3 h-3 mr-1" />
                        BMC
                      </TabsTrigger>
                    )}
                    {analysisResults.roast && (
                      <TabsTrigger value="roast" className="text-xs whitespace-nowrap text-red-700">
                        <Flame className="w-3 h-3 mr-1" />
                        Roast
                      </TabsTrigger>
                    )}
                    <TabsTrigger
                      value="pitch"
                      className="text-xs whitespace-nowrap text-purple-700"
                      onClick={(e) => {
                        if (!allAnalysesComplete) {
                          e.preventDefault();
                          handlePitchClick();
                        }
                      }}
                    >
                      <Presentation className="w-3 h-3 mr-1" />
                      Pitch
                      {!allAnalysesComplete && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {remainingAnalyses.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </div>

                {Object.keys(analysisResults).length > 0 && (
                  <TabsContent value="overview" className="space-y-4">
                    <div className="text-center py-8">
                      <Brain className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-xl font-semibold mb-2">Project Analysis Dashboard</h3>
                      <p className="text-muted-foreground mb-6">
                        Run different types of analysis to get specialized insights about your project.
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                        {Object.entries(analysisResults).map(([type, result]) => (
                          <Card key={type} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveAnalysisTab(type)}>
                            <CardContent className="p-4 text-center">
                              <div className="flex items-center justify-center mb-2">
                                {type === 'technical' && <Lightbulb className="w-6 h-6 text-blue-600" />}
                                {type === 'market' && <TrendingUp className="w-6 h-6 text-purple-600" />}
                                {type === 'differentiation' && <Zap className="w-6 h-6 text-indigo-600" />}
                                {type === 'financial' && <DollarSign className="w-6 h-6 text-green-600" />}
                                {type === 'bmc' && <Grid3X3 className="w-6 h-6 text-blue-600" />}
                                {type === 'roast' && <Flame className="w-6 h-6 text-red-600" />}
                              </div>
                              <h4 className="font-medium text-sm capitalize">{type} Analysis</h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(result.timestamp).toLocaleDateString()}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                )}

                {/* Technical Analysis Tab */}
                {analysisResults.technical && (
                  <TabsContent value="technical" className="space-y-4">
                    <Card className="analysis-card">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold flex items-center">
                          <Lightbulb className="w-5 h-5 mr-2 text-blue-600" />
                          Technical Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-blue-50 rounded-lg p-4">
                          {renderMarkdown(analysisResults.technical.summary)}
                        </div>
                      </CardContent>
                    </Card>

                    {analysisResults.technical.insights && analysisResults.technical.insights.length > 0 && (
                      <Card className="analysis-card">
                        <CardHeader>
                          <CardTitle className="text-base">Technical Insights</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {analysisResults.technical.insights.map((insight: any, index) => (
                              <div key={index} className="bg-blue-50 rounded-lg p-3">
                                {renderMarkdown(typeof insight === 'object' ? insight.content : insight)}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {analysisResults.technical.recommendations && analysisResults.technical.recommendations.length > 0 && (
                      <Card className="analysis-card">
                        <CardHeader>
                          <CardTitle className="text-base">Technical Recommendations</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {analysisResults.technical.recommendations.map((rec: any, index) => (
                              <div key={index} className="bg-green-50 rounded-lg p-3">
                                {renderMarkdown(typeof rec === 'object' ? rec.content : rec)}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 mr-2" />
                      Analysis completed at {new Date(analysisResults.technical.timestamp).toLocaleString()}
                    </div>
                  </TabsContent>
                )}

                {/* Market Analysis Tab */}
                {analysisResults.market && (
                  <TabsContent value="market" className="space-y-4">
                    <Card className="analysis-card">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold flex items-center">
                          <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
                          Market Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-purple-50 rounded-lg p-4">
                          {analysisResults.market.marketAnalysis ?
                            renderMarkdown(analysisResults.market.marketAnalysis.content) :
                            renderMarkdown(analysisResults.market.summary)
                          }
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 mr-2" />
                      Analysis completed at {new Date(analysisResults.market.timestamp).toLocaleString()}
                    </div>
                  </TabsContent>
                )}

                {/* Differentiation Analysis Tab */}
                {analysisResults.differentiation && (
                  <TabsContent value="differentiation" className="space-y-4">
                    <Card className="analysis-card">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold flex items-center">
                          <Zap className="w-5 h-5 mr-2 text-indigo-600" />
                          Competitive Differentiation
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-indigo-50 rounded-lg p-4">
                          {analysisResults.differentiation.differentiationAnalysis ?
                            renderMarkdown(analysisResults.differentiation.differentiationAnalysis.content) :
                            renderMarkdown(analysisResults.differentiation.summary)
                          }
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 mr-2" />
                      Analysis completed at {new Date(analysisResults.differentiation.timestamp).toLocaleString()}
                    </div>
                  </TabsContent>
                )}

                {/* Financial Analysis Tab */}
                {analysisResults.financial && (
                  <TabsContent value="financial" className="space-y-4">
                    <Card className="analysis-card">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold flex items-center">
                          <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                          Financial Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-green-50 rounded-lg p-4">
                          {analysisResults.financial.financialProjections ?
                            renderMarkdown(analysisResults.financial.financialProjections.content) :
                            renderMarkdown(analysisResults.financial.summary)
                          }
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 mr-2" />
                      Analysis completed at {new Date(analysisResults.financial.timestamp).toLocaleString()}
                    </div>
                  </TabsContent>
                )}

                {/* Business Model Canvas Tab */}
                {analysisResults.bmc && (
                  <TabsContent value="bmc" className="space-y-6">
                    {analysisResults.bmc.businessModelCanvas ? (
                      <div className="w-full max-w-none">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-6 rounded-lg mb-6">
                          <div className="flex items-center mb-3">
                            <Grid3X3 className="w-6 h-6 text-blue-600 mr-3" />
                            <h3 className="text-2xl font-bold text-blue-800">Business Model Canvas</h3>
                          </div>
                          <p className="text-blue-700 mb-2">
                            AI-generated Business Model Canvas based on your project details and requirements
                          </p>
                          <div className="flex items-center text-sm text-blue-600 bg-blue-100 rounded-lg p-3">
                            <Eye className="w-4 h-4 mr-2" />
                            <span>Click on any section below to view detailed content in a modal</span>
                          </div>
                        </div>

                        {/* BMC Grid - Compact Layout with Modal Expansion */}
                        <div className="w-full bg-white border-2 border-gray-200 rounded-lg p-6">
                          {/* Top Row */}
                          <div className="grid grid-cols-5 gap-4 mb-4">
                            <BMCCard
                              title="Key Partnerships"
                              content={analysisResults.bmc.businessModelCanvas.keyPartnerships || ''}
                              colorClass="bg-gradient-to-br from-orange-50 to-orange-100"
                              borderClass="border-2 border-orange-300"
                              textClass="text-orange-800"
                            />
                            <BMCCard
                              title="Key Activities"
                              content={analysisResults.bmc.businessModelCanvas.keyActivities || ''}
                              colorClass="bg-gradient-to-br from-orange-50 to-orange-100"
                              borderClass="border-2 border-orange-300"
                              textClass="text-orange-800"
                            />
                            <BMCCard
                              title="Value Proposition"
                              content={analysisResults.bmc.businessModelCanvas.valueProposition || ''}
                              colorClass="bg-gradient-to-br from-blue-50 to-blue-100"
                              borderClass="border-2 border-blue-400"
                              textClass="text-blue-800"
                            />
                            <BMCCard
                              title="Customer Relationships"
                              content={analysisResults.bmc.businessModelCanvas.customerRelationships || ''}
                              colorClass="bg-gradient-to-br from-red-50 to-red-100"
                              borderClass="border-2 border-red-300"
                              textClass="text-red-800"
                            />
                            <BMCCard
                              title="Customer Segments"
                              content={analysisResults.bmc.businessModelCanvas.customerSegments || ''}
                              colorClass="bg-gradient-to-br from-red-50 to-red-100"
                              borderClass="border-2 border-red-300"
                              textClass="text-red-800"
                            />
                          </div>

                          {/* Middle Row */}
                          <div className="grid grid-cols-5 gap-4 mb-4">
                            <BMCCard
                              title="Key Resources"
                              content={analysisResults.bmc.businessModelCanvas.keyResources || ''}
                              colorClass="bg-gradient-to-br from-orange-50 to-orange-100"
                              borderClass="border-2 border-orange-300"
                              textClass="text-orange-800"
                            />
                            {/* Empty space for visual balance */}
                            <div className="col-span-2"></div>
                            <div className="col-span-2">
                              <BMCCard
                                title="Channels"
                                content={analysisResults.bmc.businessModelCanvas.channels || ''}
                                colorClass="bg-gradient-to-br from-red-50 to-red-100"
                                borderClass="border-2 border-red-300"
                                textClass="text-red-800"
                              />
                            </div>
                          </div>

                          {/* Bottom Row */}
                          <div className="grid grid-cols-2 gap-4">
                            <BMCCard
                              title="Cost Structure"
                              content={analysisResults.bmc.businessModelCanvas.costStructure || ''}
                              colorClass="bg-gradient-to-br from-green-50 to-green-100"
                              borderClass="border-2 border-green-300"
                              textClass="text-green-800"
                            />
                            <BMCCard
                              title="Revenue Streams"
                              content={analysisResults.bmc.businessModelCanvas.revenueStreams || ''}
                              colorClass="bg-gradient-to-br from-green-50 to-green-100"
                              borderClass="border-2 border-green-300"
                              textClass="text-green-800"
                            />
                          </div>
                        </div>

                        {/* Legend */}
                        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-gray-800 mb-3">Business Model Canvas Legend</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div className="flex items-center">
                              <div className="w-4 h-4 bg-orange-200 border border-orange-300 rounded mr-2"></div>
                              <span className="text-gray-700">Infrastructure</span>
                            </div>
                            <div className="flex items-center">
                              <div className="w-4 h-4 bg-blue-200 border border-blue-400 rounded mr-2"></div>
                              <span className="text-gray-700">Value Proposition</span>
                            </div>
                            <div className="flex items-center">
                              <div className="w-4 h-4 bg-red-200 border border-red-300 rounded mr-2"></div>
                              <span className="text-gray-700">Customer Interface</span>
                            </div>
                            <div className="flex items-center">
                              <div className="w-4 h-4 bg-green-200 border border-green-300 rounded mr-2"></div>
                              <span className="text-gray-700">Financial Viability</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center text-sm text-muted-foreground mt-4">
                          <Clock className="w-4 h-4 mr-2" />
                          Analysis completed at {new Date(analysisResults.bmc.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-16 text-muted-foreground">
                        <Grid3X3 className="w-16 h-16 mx-auto mb-6 opacity-50" />
                        <h3 className="text-xl font-semibold mb-2">Business Model Canvas</h3>
                        <p className="text-lg mb-4">Run a Business Model Canvas analysis to see the 9 building blocks of your business model</p>
                        <p className="text-sm">This will analyze your project and generate a comprehensive business model framework</p>
                      </div>
                    )}
                  </TabsContent>
                )}

                {/* Roast Analysis Tab */}
                {analysisResults.roast && analysisResults.roast.roastIdea && (
                  <TabsContent value="roast" className="space-y-4">
                    <div className="space-y-6">
                      <div className="bg-red-50 border border-red-200 p-4 rounded-none">
                        <div className="flex items-center mb-2">
                          <Flame className="w-5 h-5 text-red-600 mr-2" />
                          <h3 className="text-lg font-semibold text-red-800">Honest Reality Check</h3>
                        </div>
                        <p className="text-red-700 text-sm">
                          ⚠️ Warning: This analysis provides brutally honest feedback. Prepare for some tough love!
                        </p>
                      </div>

                      {/* Summary */}
                      <div className="bg-gray-50 p-4 rounded-none border">
                        <h4 className="font-medium text-base mb-3">The Harsh Truth</h4>
                        <p className="text-gray-700 whitespace-pre-wrap">{analysisResults.roast.roastIdea.summary}</p>
                      </div>

                      {/* Brutally Critical */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-base text-foreground">🔥 What's Wrong With This Idea</h4>
                        <div className="space-y-2">
                          {analysisResults.roast.roastIdea.brutallyCritical.map((criticism, index) => {
                            const mitigationKey = `brutallyCritical-${criticism.substring(0, 50)}`;
                            const mitigation = mitigations[mitigationKey];
                            return (
                              <div key={index} className="bg-muted/50 border border-muted rounded-none">
                                <div className="flex items-start justify-between p-3">
                                  <div className="flex items-start space-x-3 flex-1">
                                    <Flame className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                                    <p className="text-sm text-foreground">{criticism}</p>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleGenerateMitigation(criticism, 'brutallyCritical')}
                                    disabled={mitigation?.isGenerating}
                                    className="ml-3 text-xs px-2 py-1 h-auto border-gray-300 text-gray-700 hover:bg-gray-50"
                                  >
                                    {mitigation?.isGenerating ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Shield className="w-3 h-3 mr-1" />
                                    )}
                                    {mitigation?.isGenerating ? 'Generating...' : 'Fix This'}
                                  </Button>
                                </div>
                                {mitigation?.content && (
                                  <div className="mx-3 mb-3 p-3 bg-muted/50 border border-muted rounded-none">
                                    <div className="flex items-center mb-2">
                                      <Shield className="w-4 h-4 text-muted-foreground mr-2" />
                                      <span className="text-sm font-medium text-foreground">Mitigation Strategy</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{mitigation.content}</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Other roast sections would go here... */}

                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="w-4 h-4 mr-2" />
                        Analysis completed at {new Date(analysisResults.roast.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </TabsContent>
                )}

                <TabsContent value="pitch" className="space-y-6">
                  {allAnalysesComplete ? (
                    <ProjectPitch projectId={projectId} />
                  ) : (
                    <div className="text-center py-12">
                      <Presentation className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-xl font-semibold mb-2">Pitch Generation</h3>
                      <p className="text-muted-foreground mb-6">
                        Complete all analyses to generate your project pitch
                      </p>
                      <div className="max-w-md mx-auto">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                          <div className="flex items-center mb-2">
                            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                            <span className="font-medium text-yellow-800">
                              {remainingAnalyses.length} analyses remaining
                            </span>
                          </div>
                          <p className="text-sm text-yellow-700">
                            Run all analysis types to unlock pitch generation
                          </p>
                        </div>
                        <Button
                          onClick={() => setShowPitchModal(true)}
                          variant="outline"
                          className="w-full"
                        >
                          View Required Analyses
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>

              </Tabs>
            )}

            {Object.keys(analysisResults).length === 0 && !isAnalyzing && !error && (
              <div className="text-center py-12 text-muted-foreground">
                <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Run an analysis to see AI-powered insights about your project</p>
              </div>
            )}

            {/* Modal for showing remaining analyses */}
            <Dialog open={showPitchModal} onOpenChange={setShowPitchModal}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center">
                    <Presentation className="w-5 h-5 mr-2 text-purple-600" />
                    Pitch Generation Requirements
                  </DialogTitle>
                  <DialogDescription>
                    Complete all analyses to generate your comprehensive project pitch
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-purple-800">Progress</span>
                      <span className="text-sm text-purple-600">
                        {Object.keys(analysisResults).length} / {allAnalysisTypes.length}
                      </span>
                    </div>
                    <div className="w-full bg-purple-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(Object.keys(analysisResults).length / allAnalysisTypes.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3 text-foreground">Completed Analyses</h4>
                    <div className="space-y-2">
                      {Object.keys(analysisResults).map(type => (
                        <div key={type} className="flex items-center text-sm">
                          <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                          <span className="text-green-700">{getAnalysisTypeLabel(type)}</span>
                        </div>
                      ))}
                      {Object.keys(analysisResults).length === 0 && (
                        <p className="text-sm text-muted-foreground">No analyses completed yet</p>
                      )}
                    </div>
                  </div>

                  {remainingAnalyses.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3 text-foreground">Remaining Analyses</h4>
                      <div className="space-y-2">
                        {remainingAnalyses.map(type => (
                          <div key={type} className="flex items-center justify-between text-sm">
                            <div className="flex items-center">
                              <div className="w-4 h-4 border-2 border-gray-300 rounded-full mr-2" />
                              <span className="text-muted-foreground">{getAnalysisTypeLabel(type)}</span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setShowPitchModal(false);
                                handleAnalyze(type);
                              }}
                              disabled={isAnalyzing || (projectDocuments.length === 0 && contextDocuments.length === 0)}
                              className="text-xs h-6 px-2"
                            >
                              {getAnalysisTypeIcon(type)}
                              <span className="ml-1">Run</span>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {allAnalysesComplete && (
                    <div className="text-center">
                      <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                      <p className="text-green-700 font-medium">All analyses complete!</p>
                      <Button
                        onClick={() => {
                          setShowPitchModal(false);
                          setActiveAnalysisTab('pitch');
                        }}
                        className="mt-3 w-full bg-purple-600 hover:bg-purple-700"
                      >
                        <Presentation className="w-4 h-4 mr-2" />
                        Generate Pitch
                      </Button>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
