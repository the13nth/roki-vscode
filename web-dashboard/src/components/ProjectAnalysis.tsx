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
  Eye
} from 'lucide-react';

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
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [projectTemplate, setProjectTemplate] = useState<string>('web-app');
  const [mitigations, setMitigations] = useState<Record<string, { content: string; isGenerating: boolean }>>({});
  const [mitigationTokens, setMitigationTokens] = useState<Array<{ inputTokens: number; outputTokens: number; totalTokens: number; cost: number; timestamp: string; criticism: string }>>([]);
  const [analysisProgress, setAnalysisProgress] = useState<{ stage: string; progress: number }>({ stage: '', progress: 0 });
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<string>('comprehensive');
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>([]);
  const [selectedBmcSection, setSelectedBmcSection] = useState<{title: string, content: string, color: string} | null>(null);

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

  useEffect(() => {
    loadProjectContext();
    loadProjectConfig();
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



  const handleAnalyze = async () => {
    try {
      setIsAnalyzing(true);
      setError(null);
      setAnalysisResult(null);

      console.log('🔍 Starting Comprehensive Analysis');
      console.log('📚 Analysis will fetch documents from Pinecone cloud storage');
      console.log('🚀 Sending analysis request...');

      const response = await fetch(`/api/projects/${projectId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisType: 'comprehensive'
        }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ Analysis completed successfully');
        console.log(`📈 Analysis summary: ${result.summary?.substring(0, 100)}...`);
        console.log(`💡 Insights generated: ${result.insights?.length || 0}`);
        console.log(`🎯 Recommendations: ${result.recommendations?.length || 0}`);
        setAnalysisResult(result);
      } else {
        console.error('❌ Analysis failed:', result.error);
        setError(result.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('❌ Analysis error:', error);
      setError('Error performing analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleQuickAnalysis = async (type: string) => {
    try {
      setIsAnalyzing(true);
      setError(null);
      setAnalysisResult(null);

      console.log(`🔍 Starting ${type.charAt(0).toUpperCase() + type.slice(1)} Analysis`);
      console.log('📚 Analysis will fetch documents from Pinecone cloud storage');
      console.log(`🚀 Sending ${type} analysis request...`);

      const response = await fetch(`/api/projects/${projectId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisType: type
        }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log(`✅ ${type.charAt(0).toUpperCase() + type.slice(1)} analysis completed successfully`);
        console.log(`📈 Analysis summary: ${result.summary?.substring(0, 100)}...`);
        console.log(`💡 Insights generated: ${result.insights?.length || 0}`);
        console.log(`🎯 Recommendations: ${result.recommendations?.length || 0}`);
        setAnalysisResult(result);
      } else {
        console.error(`❌ ${type} analysis failed:`, result.error);
        setError(result.error || 'Analysis failed');
      }
    } catch (error) {
      console.error(`❌ ${type} analysis error:`, error);
      setError('Error performing analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

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
                      <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        Project Documents ({projectDocuments.length})
                      </h3>
                      <div className="grid grid-cols-1 gap-3">
                        {projectDocuments.map((doc, index) => (
                          <Card key={index} className="border-l-4 border-l-blue-500">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center justify-between">
                                <span className="truncate">{doc.title || doc.filename}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {doc.documentType || 'document'}
                                </Badge>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <p className="text-xs text-muted-foreground">
                                {doc.content?.substring(0, 150)}...
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Context Documents */}
                  {contextDocuments.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        Context Documents ({contextDocuments.length})
                      </h3>
                      <div className="grid grid-cols-1 gap-3">
                        {contextDocuments.map((doc, index) => (
                          <Card key={index} className="border-l-4 border-l-green-500">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center justify-between">
                                <span className="truncate">{doc.title || doc.filename}</span>
                                <Badge variant="outline" className="text-xs">
                                  {doc.category || 'context'}
                                </Badge>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <p className="text-xs text-muted-foreground">
                                {doc.content?.substring(0, 150)}...
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
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
                    onClick={() => handleQuickAnalysis('technical')}
                    disabled={isAnalyzing || (projectDocuments.length === 0 && contextDocuments.length === 0)}
                    className="justify-start rounded-none border-gray-300 hover:border-blue-300 hover:bg-blue-50"
                  >
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Technical Analysis
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAnalysis('market')}
                    disabled={isAnalyzing || (projectDocuments.length === 0 && contextDocuments.length === 0)}
                    className="justify-start rounded-none border-gray-300 hover:border-purple-300 hover:bg-purple-50"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Market Analysis
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAnalysis('differentiation')}
                    disabled={isAnalyzing || (projectDocuments.length === 0 && contextDocuments.length === 0)}
                    className="justify-start rounded-none border-gray-300 hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Competitive Differentiation
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAnalysis('financial')}
                    disabled={isAnalyzing || (projectDocuments.length === 0 && contextDocuments.length === 0)}
                    className="justify-start rounded-none border-gray-300 hover:border-yellow-300 hover:bg-yellow-50"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Cost & Revenue Analysis
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAnalysis('bmc')}
                    disabled={isAnalyzing || (projectDocuments.length === 0 && contextDocuments.length === 0)}
                    className="justify-start rounded-none border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    <Grid3X3 className="w-4 h-4 mr-2" />
                    Business Model Canvas
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAnalysis('roast')}
                    disabled={isAnalyzing || (projectDocuments.length === 0 && contextDocuments.length === 0)}
                    className="justify-start rounded-none border-red-200 text-red-700 hover:bg-red-50"
                  >
                    <Flame className="w-4 h-4 mr-2" />
                    Roast My Idea
                  </Button>
                </div>
              </div>
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

            {analysisResult && (
              <Tabs defaultValue="summary" className="w-full">
                <div className="overflow-x-auto">
                  <TabsList className="flex gap-1 p-1 min-w-max">
                    <TabsTrigger value="summary" className="text-xs whitespace-nowrap">Summary</TabsTrigger>
                    <TabsTrigger value="insights" className="text-xs whitespace-nowrap">Insights</TabsTrigger>
                    <TabsTrigger value="recommendations" className="text-xs whitespace-nowrap">Recommendations</TabsTrigger>
                    <TabsTrigger value="risks" className="text-xs whitespace-nowrap">Risks</TabsTrigger>
                    {analysisResult.marketAnalysis && (
                      <TabsTrigger value="market" className="text-xs whitespace-nowrap">Market</TabsTrigger>
                    )}
                    {analysisResult.differentiationAnalysis && (
                      <TabsTrigger value="differentiation" className="text-xs whitespace-nowrap">Differentiation</TabsTrigger>
                    )}
                    {analysisResult.financialProjections && (
                      <TabsTrigger value="financial" className="text-xs whitespace-nowrap">Financial</TabsTrigger>
                    )}
                    {analysisResult.businessModelCanvas && (
                      <TabsTrigger value="bmc" className="text-xs whitespace-nowrap text-blue-700">📊 BMC</TabsTrigger>
                    )}
                    {analysisResult.roastIdea && (
                      <TabsTrigger value="roast" className="text-xs whitespace-nowrap text-red-700">🔥 Roast</TabsTrigger>
                    )}
                    <TabsTrigger value="next-steps" className="text-xs whitespace-nowrap">Next Steps</TabsTrigger>
                    <TabsTrigger value="tokens" className="text-xs whitespace-nowrap">Tokens</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="summary" className="space-y-4">
                  <Card className="analysis-card">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-primary" />
                        Project Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-50 rounded-lg p-4">
                        {renderMarkdown(analysisResult.summary)}
                      </div>
                    </CardContent>
                  </Card>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 mr-2" />
                    Analysis completed at {analysisResult.timestamp ? new Date(analysisResult.timestamp).toLocaleString() : new Date().toLocaleString()}
                  </div>
                </TabsContent>

                <TabsContent value="insights" className="space-y-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Lightbulb className="w-5 h-5 mr-2 text-primary" />
                    Key Insights
                  </h3>
                  <div className="space-y-4">
                    {analysisResult.insights.map((insight: any, index) => (
                      <Card key={index} className="analysis-card border-l-4 border-l-primary/20">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center">
                            <Lightbulb className="w-4 h-4 mr-2 text-primary" />
                            {typeof insight === 'object' && insight.title ? insight.title : `Insight ${index + 1}`}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="bg-blue-50 rounded-lg p-4">
                            {renderMarkdown(typeof insight === 'object' ? insight.content : insight)}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="recommendations" className="space-y-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Target className="w-5 h-5 mr-2 text-primary" />
                    Recommendations
                  </h3>
                  <div className="space-y-4">
                    {analysisResult.recommendations.map((recommendation: any, index) => (
                      <Card key={index} className="analysis-card border-l-4 border-l-green-500/20">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center">
                            <Target className="w-4 h-4 mr-2 text-green-600" />
                            {typeof recommendation === 'object' && recommendation.title ? recommendation.title : `Recommendation ${index + 1}`}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="bg-green-50 rounded-lg p-4">
                            {renderMarkdown(typeof recommendation === 'object' ? recommendation.content : recommendation)}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="risks" className="space-y-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2 text-destructive" />
                    Risk Assessment
                  </h3>
                  {analysisResult.risks && analysisResult.risks.length > 0 ? (
                    <div className="space-y-4">
                      {analysisResult.risks.map((risk: any, index) => (
                        <Card key={index} className="analysis-card border-l-4 border-l-destructive/20">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center">
                              <AlertCircle className="w-4 h-4 mr-2 text-destructive" />
                              {typeof risk === 'object' && risk.title ? risk.title : `Risk ${index + 1}`}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="bg-red-50 rounded-lg p-4">
                              {renderMarkdown(typeof risk === 'object' ? risk.content : risk)}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Run a risk analysis to see potential challenges</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="market" className="space-y-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                    Market Analysis
                  </h3>
                  {analysisResult.marketAnalysis ? (
                    <Card className="analysis-card border-l-4 border-l-blue-500/20">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center">
                          <TrendingUp className="w-4 h-4 mr-2 text-blue-600" />
                          {analysisResult.marketAnalysis.title || 'Market Analysis'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="bg-blue-50 rounded-lg p-4">
                          {renderMarkdown(analysisResult.marketAnalysis.content)}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Run a market analysis to see competitive insights</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="differentiation" className="space-y-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Star className="w-5 h-5 mr-2 text-yellow-600" />
                    Differentiation Analysis
                  </h3>
                  {analysisResult.differentiationAnalysis ? (
                    <Card className="analysis-card border-l-4 border-l-yellow-500/20">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center">
                          <Star className="w-4 h-4 mr-2 text-yellow-600" />
                          {analysisResult.differentiationAnalysis.title || 'Differentiation Analysis'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="bg-yellow-50 rounded-lg p-4">
                          {renderMarkdown(analysisResult.differentiationAnalysis.content)}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Run a differentiation analysis to see competitive advantages</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="financial" className="space-y-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                    Financial Projections
                  </h3>
                  {analysisResult.financialProjections ? (
                    <Card className="analysis-card border-l-4 border-l-green-500/20">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center">
                          <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                          {analysisResult.financialProjections.title || 'Financial Projections'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="bg-green-50 rounded-lg p-4">
                          {renderMarkdown(analysisResult.financialProjections.content)}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Run a financial analysis to see cost estimates, revenue projections, and funding requirements</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="bmc" className="space-y-6">
                  {analysisResult.businessModelCanvas ? (
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
                            content={analysisResult.businessModelCanvas.keyPartnerships || ''}
                            colorClass="bg-gradient-to-br from-orange-50 to-orange-100"
                            borderClass="border-2 border-orange-300"
                            textClass="text-orange-800"
                          />
                          <BMCCard
                            title="Key Activities"
                            content={analysisResult.businessModelCanvas.keyActivities || ''}
                            colorClass="bg-gradient-to-br from-orange-50 to-orange-100"
                            borderClass="border-2 border-orange-300"
                            textClass="text-orange-800"
                          />
                          <BMCCard
                            title="Value Proposition"
                            content={analysisResult.businessModelCanvas.valueProposition || ''}
                            colorClass="bg-gradient-to-br from-blue-50 to-blue-100"
                            borderClass="border-2 border-blue-400"
                            textClass="text-blue-800"
                          />
                          <BMCCard
                            title="Customer Relationships"
                            content={analysisResult.businessModelCanvas.customerRelationships || ''}
                            colorClass="bg-gradient-to-br from-red-50 to-red-100"
                            borderClass="border-2 border-red-300"
                            textClass="text-red-800"
                          />
                          <BMCCard
                            title="Customer Segments"
                            content={analysisResult.businessModelCanvas.customerSegments || ''}
                            colorClass="bg-gradient-to-br from-red-50 to-red-100"
                            borderClass="border-2 border-red-300"
                            textClass="text-red-800"
                          />
                        </div>

                        {/* Middle Row */}
                        <div className="grid grid-cols-5 gap-4 mb-4">
                          <BMCCard
                            title="Key Resources"
                            content={analysisResult.businessModelCanvas.keyResources || ''}
                            colorClass="bg-gradient-to-br from-orange-50 to-orange-100"
                            borderClass="border-2 border-orange-300"
                            textClass="text-orange-800"
                          />
                          {/* Empty space for visual balance */}
                          <div className="col-span-2"></div>
                          <div className="col-span-2">
                            <BMCCard
                              title="Channels"
                              content={analysisResult.businessModelCanvas.channels || ''}
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
                            content={analysisResult.businessModelCanvas.costStructure || ''}
                            colorClass="bg-gradient-to-br from-green-50 to-green-100"
                            borderClass="border-2 border-green-300"
                            textClass="text-green-800"
                          />
                          <BMCCard
                            title="Revenue Streams"
                            content={analysisResult.businessModelCanvas.revenueStreams || ''}
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

                <TabsContent value="roast" className="space-y-4">
                  {analysisResult.roastIdea ? (
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
                        <p className="text-gray-700 whitespace-pre-wrap">{analysisResult.roastIdea.summary}</p>
                      </div>

                      {/* Brutally Critical */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-base text-foreground">🔥 What's Wrong With This Idea</h4>
                        <div className="space-y-2">
                          {analysisResult.roastIdea.brutallyCritical.map((criticism, index) => {
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

                      {/* Reality Check */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-base text-foreground">📊 Market Reality Check</h4>
                        <div className="space-y-2">
                          {analysisResult.roastIdea.realityCheck.map((reality, index) => {
                            const mitigationKey = `realityCheck-${reality.substring(0, 50)}`;
                            const mitigation = mitigations[mitigationKey];
                            return (
                              <div key={index} className="bg-muted/50 border border-muted rounded-none">
                                <div className="flex items-start justify-between p-3">
                                  <div className="flex items-start space-x-3 flex-1">
                                    <AlertCircle className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                                    <p className="text-sm text-foreground">{reality}</p>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleGenerateMitigation(reality, 'realityCheck')}
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

                      {/* Market Reality */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-base text-foreground">💰 Financial Reality</h4>
                        <div className="space-y-2">
                          {analysisResult.roastIdea.marketReality.map((market, index) => {
                            const mitigationKey = `marketReality-${market.substring(0, 50)}`;
                            const mitigation = mitigations[mitigationKey];
                            return (
                              <div key={index} className="bg-muted/50 border border-muted rounded-none">
                                <div className="flex items-start justify-between p-3">
                                  <div className="flex items-start space-x-3 flex-1">
                                    <DollarSign className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                                    <p className="text-sm text-foreground">{market}</p>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleGenerateMitigation(market, 'marketReality')}
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

                      {/* Improvements */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-base text-foreground">🛠️ How to Actually Make This Work</h4>
                        <div className="space-y-2">
                          {analysisResult.roastIdea.improvements.map((improvement, index) => (
                            <div key={index} className="flex items-start space-x-3 p-3 bg-muted/50 border border-muted rounded-none">
                              <Target className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                              <p className="text-sm text-foreground">{improvement}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Honest Advice */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-base text-foreground">💡 Honest Advice</h4>
                        <div className="space-y-2">
                          {analysisResult.roastIdea.honestAdvice.map((advice, index) => (
                            <div key={index} className="flex items-start space-x-3 p-3 bg-muted/50 border border-muted rounded-none">
                              <Lightbulb className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                              <p className="text-sm text-foreground">{advice}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Flame className="w-12 h-12 mx-auto mb-4 opacity-50 text-red-400" />
                      <p className="text-red-600">Ready for some tough love? Run a roast analysis to get brutally honest feedback about your idea.</p>
                      <p className="text-sm text-gray-500 mt-2">Warning: This will provide unfiltered criticism and reality checks!</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="next-steps" className="space-y-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
                    Recommended Next Steps
                  </h3>
                  {analysisResult.nextSteps && analysisResult.nextSteps.length > 0 ? (
                    <div className="space-y-4">
                      {analysisResult.nextSteps.map((step: any, index) => (
                        <Card key={index} className="analysis-card border-l-4 border-l-purple-500/20">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center">
                              <TrendingUp className="w-4 h-4 mr-2 text-purple-600" />
                              {typeof step === 'object' && step.title ? step.title : `Step ${index + 1}`}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="bg-purple-50 rounded-lg p-4">
                              {renderMarkdown(typeof step === 'object' ? step.content : step)}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Next steps will be generated based on analysis results</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="tokens" className="space-y-6">
                  <h3 className="text-lg font-semibold mb-4">Token Usage & Pricing</h3>
                  {analysisResult.tokenUsage ? (
                    <div className="space-y-6">
                      {/* Current Request */}
                      <div>
                        <h4 className="font-medium mb-3">Current Request</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-blue-50 p-4 rounded-none text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {analysisResult.tokenUsage.inputTokens.toLocaleString()}
                            </div>
                            <p className="text-sm text-blue-700">Input Tokens</p>
                          </div>
                          <div className="bg-green-50 p-4 rounded-none text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {analysisResult.tokenUsage.outputTokens.toLocaleString()}
                            </div>
                            <p className="text-sm text-green-700">Output Tokens</p>
                          </div>
                          <div className="bg-purple-50 p-4 rounded-none text-center">
                            <div className="text-2xl font-bold text-purple-600">
                              {analysisResult.tokenUsage.totalTokens.toLocaleString()}
                            </div>
                            <p className="text-sm text-purple-700">Total Tokens</p>
                          </div>
                        </div>
                      </div>

                      {/* Session Summary */}
                      {analysisResult.tokenUsage.session && (
                        <div>
                          <h4 className="font-medium mb-3">This Session</h4>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-indigo-50 p-4 rounded-none text-center">
                              <div className="text-xl font-bold text-indigo-600">
                                {analysisResult.tokenUsage.session.totalTokens.toLocaleString()}
                              </div>
                              <p className="text-sm text-indigo-700">Total Tokens</p>
                            </div>
                            <div className="bg-orange-50 p-4 rounded-none text-center">
                              <div className="text-xl font-bold text-orange-600">
                                ${analysisResult.tokenUsage.session.totalCost.toFixed(6)}
                              </div>
                              <p className="text-sm text-orange-700">Total Cost</p>
                            </div>
                            <div className="bg-teal-50 p-4 rounded-none text-center">
                              <div className="text-xl font-bold text-teal-600">
                                {analysisResult.tokenUsage.session.requestCount}
                              </div>
                              <p className="text-sm text-teal-700">Requests</p>
                            </div>
                            <div className="bg-pink-50 p-4 rounded-none text-center">
                              <div className="text-xl font-bold text-pink-600">
                                ${(analysisResult.tokenUsage.session.totalCost / analysisResult.tokenUsage.session.requestCount).toFixed(6)}
                              </div>
                              <p className="text-sm text-pink-700">Avg/Request</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Cumulative Summary */}
                      {analysisResult.tokenUsage.cumulative && (
                        <div>
                          <h4 className="font-medium mb-3">All Time</h4>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-slate-50 p-4 rounded-none text-center">
                              <div className="text-xl font-bold text-slate-600">
                                {analysisResult.tokenUsage.cumulative.totalTokens.toLocaleString()}
                              </div>
                              <p className="text-sm text-slate-700">Total Tokens</p>
                            </div>
                            <div className="bg-emerald-50 p-4 rounded-none text-center border-2 border-emerald-200">
                              <div className="text-2xl font-bold text-emerald-600">
                                ${analysisResult.tokenUsage.cumulative.totalCost.toFixed(6)}
                              </div>
                              <p className="text-sm text-emerald-700 font-medium">Total Cost</p>
                            </div>
                            <div className="bg-amber-50 p-4 rounded-none text-center">
                              <div className="text-xl font-bold text-amber-600">
                                {analysisResult.tokenUsage.cumulative.sessionCount}
                              </div>
                              <p className="text-sm text-amber-700">Sessions</p>
                            </div>
                            <div className="bg-rose-50 p-4 rounded-none text-center">
                              <div className="text-xl font-bold text-rose-600">
                                ${(analysisResult.tokenUsage.cumulative.totalCost / analysisResult.tokenUsage.cumulative.sessionCount).toFixed(6)}
                              </div>
                              <p className="text-sm text-rose-700">Avg/Session</p>
                            </div>
                          </div>

                          {/* All Time Cost Breakdown */}
                          <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-none border border-emerald-200">
                            <h5 className="font-semibold text-emerald-800 mb-3">All Time Cost Breakdown</h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="text-center">
                                <div className="text-lg font-bold text-emerald-700">
                                  {analysisResult.tokenUsage.cumulative.inputTokens.toLocaleString()}
                                </div>
                                <p className="text-sm text-emerald-600">Total Input Tokens</p>
                                <div className="text-xs text-emerald-500 mt-1">
                                  ${((analysisResult.tokenUsage.cumulative.inputTokens / 1000) * 0.000125).toFixed(6)}
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-bold text-teal-700">
                                  {analysisResult.tokenUsage.cumulative.outputTokens.toLocaleString()}
                                </div>
                                <p className="text-sm text-teal-600">Total Output Tokens</p>
                                <div className="text-xs text-teal-500 mt-1">
                                  ${((analysisResult.tokenUsage.cumulative.outputTokens / 1000) * 0.000375).toFixed(6)}
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-bold text-emerald-800">
                                  ${analysisResult.tokenUsage.cumulative.totalCost.toFixed(6)}
                                </div>
                                <p className="text-sm text-emerald-700">Total All Time Cost</p>
                                <div className="text-xs text-emerald-600 mt-1">
                                  {analysisResult.tokenUsage.cumulative.sessionCount} sessions
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}


                      {/* Current Request Pricing */}
                      <div className="space-y-4">
                        <h4 className="font-medium">Current Request Cost (Gemini Pricing)</h4>

                        {/* Input Cost */}
                        <div className="flex justify-between items-center p-4 bg-blue-50 rounded-none">
                          <div>
                            <p className="font-medium text-blue-900">Input Tokens Cost</p>
                            <p className="text-sm text-blue-700">
                              {analysisResult.tokenUsage.inputTokens.toLocaleString()} tokens × $0.000125 per 1K tokens
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-blue-900">
                              ${((analysisResult.tokenUsage.inputTokens / 1000) * 0.000125).toFixed(6)}
                            </p>
                          </div>
                        </div>

                        {/* Output Cost */}
                        <div className="flex justify-between items-center p-4 bg-green-50 rounded-none">
                          <div>
                            <p className="font-medium text-green-900">Output Tokens Cost</p>
                            <p className="text-sm text-green-700">
                              {analysisResult.tokenUsage.outputTokens.toLocaleString()} tokens × $0.000375 per 1K tokens
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-900">
                              ${((analysisResult.tokenUsage.outputTokens / 1000) * 0.000375).toFixed(6)}
                            </p>
                          </div>
                        </div>

                        {/* Total Cost */}
                        <div className="flex justify-between items-center p-4 bg-purple-50 rounded-none border-2 border-purple-200">
                          <div>
                            <p className="font-bold text-purple-900 text-lg">Request Cost</p>
                            <p className="text-sm text-purple-700">Gemini 1.5 Flash pricing</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-purple-900">
                              ${(
                                (analysisResult.tokenUsage.inputTokens / 1000) * 0.000125 +
                                (analysisResult.tokenUsage.outputTokens / 1000) * 0.000375
                              ).toFixed(6)}
                            </p>
                          </div>
                        </div>

                        {/* Pricing Note */}
                        <div className="p-3 bg-gray-50 rounded-none">
                          <p className="text-sm text-gray-600">
                            <strong>Note:</strong> Pricing based on Gemini 1.5 Flash model rates:
                            Input tokens at $0.000125 per 1K tokens, Output tokens at $0.000375 per 1K tokens.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Token usage and pricing information will appear here after analysis</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}

            {!analysisResult && !isAnalyzing && !error && (
              <div className="text-center py-12 text-muted-foreground">
                <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Run an analysis to see AI-powered insights about your project</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
