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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tooltip } from '@/components/ui/tooltip';
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
  ChevronRight,
  Sparkles,
  Calculator,
  BarChart3,
  PieChart,
  LineChart,
  Building2,
  Users,
  CreditCard,
  TrendingDown,
  Activity,
  HelpCircle,
  Search,
  Globe,
  MapPin,
  UserCheck,
  Award,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  X,
  AlertOctagon,
  Skull,
  Bomb,
  Target as TargetIcon,
  Crosshair,
  Save,
  Download
} from 'lucide-react';

interface RoastAnalysisProps {
  projectId: string;
  isOwned?: boolean;
}

interface RoastData {
  businessModelCritique: any;
  marketReality: any;
  technicalChallenges: any;
  financialViability: any;
  competitiveThreats: any;
  executionRisks: any;
  regulatoryHurdles: any;
  overallVerdict: any;
  timestamp: string;
}

interface Question {
  id: string;
  question: string;
  type: 'text' | 'textarea' | 'select' | 'number';
  required: boolean;
  options?: string[];
  placeholder?: string;
}

// Roast Analysis Process (RAP) - 8 Steps
const RAP_STEPS = [
  {
    id: 1,
    title: 'Business Model Critique',
    description: 'Analyze the business model for fundamental flaws, unrealistic assumptions, and missing components.',
    icon: TargetIcon,
    color: 'bg-red-500'
  },
  {
    id: 2,
    title: 'Market Reality Check',
    description: 'Examine market assumptions, competitive landscape, and demand validation.',
    icon: AlertTriangle,
    color: 'bg-orange-500'
  },
  {
    id: 3,
    title: 'Technical Challenges',
    description: 'Identify technical implementation risks, complexity, and resource requirements.',
    icon: AlertOctagon,
    color: 'bg-yellow-500'
  },
  {
    id: 4,
    title: 'Financial Viability',
    description: 'Critique financial projections, cost assumptions, and revenue models.',
    icon: DollarSign,
    color: 'bg-red-600'
  },
  {
    id: 5,
    title: 'Competitive Threats',
    description: 'Analyze competitive positioning, differentiation, and market entry barriers.',
    icon: Skull,
    color: 'bg-purple-500'
  },
  {
    id: 6,
    title: 'Execution Risks',
    description: 'Evaluate team capabilities, timeline feasibility, and operational challenges.',
    icon: Bomb,
    color: 'bg-pink-500'
  },
  {
    id: 7,
    title: 'Regulatory Hurdles',
    description: 'Assess legal compliance, regulatory requirements, and policy risks.',
    icon: Shield,
    color: 'bg-indigo-500'
  },
  {
    id: 8,
    title: 'Overall Verdict',
    description: 'Provide final brutal assessment and reality check on project viability.',
    icon: Crosshair,
    color: 'bg-gray-800'
  }
];

export function RoastAnalysis({ projectId, isOwned = true }: RoastAnalysisProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [roastData, setRoastData] = useState<RoastData | null>(null);
  const [existingAnalyses, setExistingAnalyses] = useState<any>({});
  const [hasAnalyses, setHasAnalyses] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [savedAnalysis, setSavedAnalysis] = useState<RoastData | null>(null);
  const [hasSavedAnalysis, setHasSavedAnalysis] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing analyses and saved analysis
  useEffect(() => {
    loadExistingAnalyses();
    loadSavedAnalysis();
  }, [projectId]);

  const loadExistingAnalyses = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/analyses`);
      if (response.ok) {
        const responseData = await response.json();
        const analyses = responseData.analyses || {};
        setExistingAnalyses(analyses);
        
        // Check if we have any analyses to roast
        const analysisTypes = Object.keys(analyses);
        setHasAnalyses(analysisTypes.length > 0);
        
        if (analysisTypes.length === 0) {
          setError('No analyses found. Please complete other analyses first before running the critical analysis.');
        } else {
          console.log(`✅ Found ${analysisTypes.length} analyses for critical review:`, analysisTypes);
        }
      }
    } catch (error) {
      console.error('Error loading existing analyses:', error);
      setError('Failed to load existing analyses');
    }
  };

  const loadSavedAnalysis = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/analyses`);
      if (response.ok) {
        const responseData = await response.json();
        const analyses = responseData.analyses || {};
        
        // Check if we have a saved roast analysis
        if (analyses.roast) {
          setSavedAnalysis(analyses.roast);
          setHasSavedAnalysis(true);
        }
      }
    } catch (error) {
      console.error('Error loading saved analysis:', error);
    }
  };

  const generateRoastAnalysis = async () => {
    if (!hasAnalyses) {
      setError('No analyses available for critical review. Please complete other analyses first.');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      
      const response = await fetch(`/api/projects/${projectId}/roast/auto-analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate roast analysis');
      }

      const data = await response.json();
      setRoastData(data);
      setShowResults(true);
      setSuccessMessage('Critical analysis completed successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error('Error generating roast analysis:', error);
      setError(error.message || 'Failed to generate roast analysis');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAnalysis = async () => {
    if (!roastData) return;

    try {
      setIsSaving(true);
      setError(null);
      
      const response = await fetch(`/api/projects/${projectId}/analyses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisType: 'roast',
          analysisData: roastData,
        }),
      });

      if (response.ok) {
        setSuccessMessage('Critical analysis saved successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
        loadSavedAnalysis(); // Reload saved analysis
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save analysis');
      }
    } catch (error: any) {
      console.error('Error saving analysis:', error);
      setError(error.message || 'Failed to save analysis');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewSavedAnalysis = () => {
    if (savedAnalysis) {
      setRoastData(savedAnalysis);
      setShowResults(true);
    }
  };

  const handleStartNewAnalysis = () => {
    setRoastData(null);
    setShowResults(false);
    setError(null);
    setSuccessMessage(null);
  };


  const renderRoastResults = () => {
    if (!roastData) return null;

    return (
      <div className="space-y-6">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-800">
              <Flame className="w-5 h-5 mr-2" />
              Professional Critical Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="border-blue-300 bg-blue-100 mb-4">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Professional Assessment:</strong> This analysis provides honest, constructive feedback to help identify areas for improvement and strategic opportunities.
              </AlertDescription>
            </Alert>
            
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="critiques">Critiques</TabsTrigger>
                <TabsTrigger value="risks">Risks</TabsTrigger>
                <TabsTrigger value="verdict">Verdict</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-red-200">
                    <CardHeader>
                      <CardTitle className="text-lg text-red-800">Business Model Flaws</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {roastData.businessModelCritique || 'No data available'}
                      </ReactMarkdown>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-orange-200">
                    <CardHeader>
                      <CardTitle className="text-lg text-orange-800">Market Reality</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {roastData.marketReality || 'No data available'}
                      </ReactMarkdown>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="critiques" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-yellow-200">
                    <CardHeader>
                      <CardTitle className="text-lg text-yellow-800">Technical Challenges</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({ children }) => <h1 className="text-xl font-bold mb-3 text-gray-900">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 text-gray-800">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-base font-medium mb-2 text-gray-700">{children}</h3>,
                            p: ({ children }) => <p className="text-sm text-gray-700 mb-2 leading-relaxed">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3 text-sm text-gray-700">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3 text-sm text-gray-700">{children}</ol>,
                            li: ({ children }) => <li className="text-sm text-gray-700">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                            code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono text-gray-800">{children}</code>,
                          }}
                        >
                          {roastData.technicalChallenges || 'No data available'}
                        </ReactMarkdown>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-red-200">
                    <CardHeader>
                      <CardTitle className="text-lg text-red-800">Financial Viability</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({ children }) => <h1 className="text-xl font-bold mb-3 text-gray-900">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 text-gray-800">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-base font-medium mb-2 text-gray-700">{children}</h3>,
                            p: ({ children }) => <p className="text-sm text-gray-700 mb-2 leading-relaxed">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3 text-sm text-gray-700">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3 text-sm text-gray-700">{children}</ol>,
                            li: ({ children }) => <li className="text-sm text-gray-700">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                            code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono text-gray-800">{children}</code>,
                          }}
                        >
                          {roastData.financialViability || 'No data available'}
                        </ReactMarkdown>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="risks" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-purple-200">
                    <CardHeader>
                      <CardTitle className="text-lg text-purple-800">Competitive Threats</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {roastData.competitiveThreats || 'No data available'}
                      </ReactMarkdown>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-pink-200">
                    <CardHeader>
                      <CardTitle className="text-lg text-pink-800">Execution Risks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {roastData.executionRisks || 'No data available'}
                      </ReactMarkdown>
                    </CardContent>
                  </Card>
                </div>
                
                <Card className="border-indigo-200">
                  <CardHeader>
                    <CardTitle className="text-lg text-indigo-800">Regulatory Hurdles</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {roastData.regulatoryHurdles || 'No data available'}
                    </ReactMarkdown>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="verdict" className="space-y-4">
                <Card className="border-gray-800 bg-gray-900 text-white">
                  <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center">
                      <Crosshair className="w-5 h-5 mr-2" />
                      Final Verdict
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {roastData.overallVerdict || 'No data available'}
                    </ReactMarkdown>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (showResults) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-blue-800">Critical Analysis Results</h2>
          <div className="flex space-x-2">
            <Button 
              onClick={handleSaveAnalysis} 
              variant="outline" 
              size="sm"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Analysis
                </>
              )}
            </Button>
            <Button onClick={handleStartNewAnalysis} variant="outline" size="sm">
              <Brain className="w-4 h-4 mr-2" />
              Start New Analysis
            </Button>
            <Button onClick={() => setShowResults(false)} variant="outline">
              Back to Analysis
            </Button>
          </div>
        </div>
        {renderRoastResults()}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center">
          <Flame className="w-6 h-6 mr-2 text-red-600" />
          Critical Analysis - Professional Assessment
        </h2>
        <div className="flex items-center space-x-2">
          {hasSavedAnalysis && (
            <Button onClick={handleViewSavedAnalysis} variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              View Saved Analysis
            </Button>
          )}
          {isGenerating && (
            <Badge variant="secondary" className="flex items-center">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Roast...
            </Badge>
          )}
        </div>
      </div>

      {/* Error and Success Messages */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}
      {successMessage && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Saved Analysis Alert */}
      {hasSavedAnalysis && savedAnalysis && (
        <Alert className="border-blue-200 bg-blue-50">
          <CheckCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Saved Critical Analysis Available!</strong> You have a previously saved critical analysis from{' '}
            {new Date(savedAnalysis.timestamp).toLocaleDateString()}. Click "View Saved Analysis" to review it.
          </AlertDescription>
        </Alert>
      )}

      {/* Professional Notice */}
      <Alert className="border-blue-300 bg-blue-100">
        <Flame className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Professional Critical Analysis:</strong> This analysis will automatically examine all your project analyses and provide honest, constructive feedback to help you identify potential issues and opportunities for improvement.
        </AlertDescription>
      </Alert>

      {/* Available Analyses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Available Analyses for Critical Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasAnalyses ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 mb-3">
                The critical analysis will examine the following completed analyses:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(existingAnalyses).map((analysisType) => (
                  <div key={analysisType} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium capitalize">
                      {analysisType.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                No analyses found. Please complete other analyses first before running the critical analysis.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Roast Process Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Critical Analysis Process (CAP)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {RAP_STEPS.map((step) => (
              <div key={step.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="bg-red-100 text-red-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {step.id}
                </div>
                <div>
                  <h4 className="font-medium text-sm">{step.title}</h4>
                  <p className="text-xs text-gray-600 mt-1">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Generate Roast Button */}
      <div className="flex justify-center">
        <Button
          onClick={generateRoastAnalysis}
          disabled={!hasAnalyses || isGenerating}
          variant="outline"
          size="lg"
          className="border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generating Critical Analysis...
            </>
          ) : (
            <>
              <Flame className="w-5 h-5 mr-2" />
              Analyze My Project
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

