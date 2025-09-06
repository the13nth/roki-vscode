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
  Minus
} from 'lucide-react';

interface MarketAnalysisProps {
  projectId: string;
  isOwned?: boolean;
}

interface MarketData {
  targetMarket: any;
  customerPainPoints: any;
  competitiveAnalysis: any;
  productValidation: any;
  pricingStrategy: any;
  marketFeedback: any;
  marketDemand: any;
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

// Market Research Process (MRP) - 7 Steps
const MRP_STEPS = [
  {
    id: 1,
    title: 'Define Target Market',
    description: 'Identify and segment your target market based on demographics, psychographics, and behavior patterns.',
    icon: Target,
    color: 'bg-blue-500'
  },
  {
    id: 2,
    title: 'Identify Customer Pain Points',
    description: 'Discover and analyze the specific problems, frustrations, and unmet needs of your target customers.',
    icon: AlertTriangle,
    color: 'bg-red-500'
  },
  {
    id: 3,
    title: 'Analyze Competition',
    description: 'Evaluate direct and indirect competitors, their strengths, weaknesses, and market positioning.',
    icon: BarChart3,
    color: 'bg-orange-500'
  },
  {
    id: 4,
    title: 'Validate Product Features',
    description: 'Test and validate your product features against customer needs and market requirements.',
    icon: CheckCircle,
    color: 'bg-green-500'
  },
  {
    id: 5,
    title: 'Test Pricing',
    description: 'Analyze pricing strategies, test price sensitivity, and determine optimal pricing models.',
    icon: DollarSign,
    color: 'bg-purple-500'
  },
  {
    id: 6,
    title: 'Iterate Based on Feedback',
    description: 'Collect customer feedback and iterate on your product, pricing, and market approach.',
    icon: ArrowUpRight,
    color: 'bg-indigo-500'
  },
  {
    id: 7,
    title: 'Assess Market Demand',
    description: 'Evaluate market size, growth potential, and demand validation for your product or service.',
    icon: TrendingUp,
    color: 'bg-teal-500'
  }
];

export function MarketAnalysis({ projectId, isOwned = true }: MarketAnalysisProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [bmcDataLoaded, setBmcDataLoaded] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Load questions from API
  useEffect(() => {
    loadQuestions();
    loadBMCData();
  }, [projectId]);

  const loadQuestions = async () => {
    try {
      setIsLoadingQuestions(true);
      const response = await fetch(`/api/projects/${projectId}/market/questions`);
      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
      }
    } catch (error) {
      console.error('Error loading market questions:', error);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const loadBMCData = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/analyses`);
      if (response.ok) {
        const responseData = await response.json();
        const analyses = responseData.analyses;
        
        if (analyses.bmc && analyses.bmc.businessModelCanvas) {
          const bmc = analyses.bmc.businessModelCanvas;
          const prePopulatedAnswers: Record<string, string> = {};

          // Target Market from Customer Segments
          if (bmc.customerSegments) {
            prePopulatedAnswers.target_market = bmc.customerSegments;
          }

          // Customer Pain Points from Value Proposition
          if (bmc.valueProposition) {
            prePopulatedAnswers.customer_pain_points = bmc.valueProposition;
          }

          // Competitive Analysis from Key Partnerships
          if (bmc.keyPartnerships) {
            prePopulatedAnswers.competitive_analysis = bmc.keyPartnerships;
          }

          // Product Features from Key Activities
          if (bmc.keyActivities) {
            prePopulatedAnswers.product_features = bmc.keyActivities;
          }

          // Pricing Strategy from Revenue Streams
          if (bmc.revenueStreams) {
            prePopulatedAnswers.pricing_strategy = bmc.revenueStreams;
          }

          // Market Feedback from Customer Relationships
          if (bmc.customerRelationships) {
            prePopulatedAnswers.market_feedback = bmc.customerRelationships;
          }

          // Market Demand from Channels
          if (bmc.channels) {
            prePopulatedAnswers.market_demand = bmc.channels;
          }

          setAnswers(prePopulatedAnswers);
          setBmcDataLoaded(true);
        }
      }
    } catch (error) {
      console.error('Error loading BMC data:', error);
    }
  };

  const getCurrentStepQuestions = () => {
    const stepQuestions: Record<number, string[]> = {
      1: ['target_market'],
      2: ['customer_pain_points'],
      3: ['competitive_analysis'],
      4: ['product_features'],
      5: ['pricing_strategy'],
      6: ['market_feedback'],
      7: ['market_demand']
    };

    const currentStepQuestionIds = stepQuestions[currentStep] || [];
    return questions.filter(q => currentStepQuestionIds.includes(q.id));
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const canProceedToNext = () => {
    const currentQuestions = getCurrentStepQuestions();
    return currentQuestions.every(q => !q.required || answers[q.id]?.trim());
  };

  const nextStep = () => {
    if (currentStep < MRP_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const generateMarketAnalysis = async () => {
    try {
      setIsGenerating(true);
      
      const response = await fetch(`/api/projects/${projectId}/market/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers,
          step: currentStep
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate market analysis');
      }

      const data = await response.json();
      setMarketData(data);
      setShowResults(true);
    } catch (error) {
      console.error('Error generating market analysis:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper function to get tooltip content for each question
  const getTooltipContent = (questionId: string) => {
    const tooltips: Record<string, string> = {
      // Step 1: Target Market
      'target_market': 'Define your ideal customer segments based on demographics (age, gender, income), psychographics (interests, values, lifestyle), and behavior patterns (purchasing habits, technology usage). Be specific about who your product serves.',
      
      // Step 2: Customer Pain Points
      'customer_pain_points': 'Identify the specific problems, frustrations, and unmet needs your target customers experience. What challenges do they face that your product can solve? What are their biggest pain points?',
      
      // Step 3: Competitive Analysis
      'competitive_analysis': 'Analyze your direct and indirect competitors. Include their strengths, weaknesses, market share, pricing strategies, and positioning. Identify gaps in the market that you can exploit.',
      
      // Step 4: Product Features
      'product_features': 'List the key features and functionalities of your product. Explain how each feature addresses customer needs and differentiates you from competitors. Focus on core value propositions.',
      
      // Step 5: Pricing Strategy
      'pricing_strategy': 'Define your pricing model, price points, and pricing strategy. Consider value-based pricing, competitive pricing, cost-plus pricing, or freemium models. Test price sensitivity.',
      
      // Step 6: Market Feedback
      'market_feedback': 'Describe how you collect and analyze customer feedback. Include feedback channels, metrics you track, and how you iterate based on customer input. Show your feedback loop process.',
      
      // Step 7: Market Demand
      'market_demand': 'Assess the market size, growth potential, and demand for your product. Include TAM (Total Addressable Market), SAM (Serviceable Addressable Market), and SOM (Serviceable Obtainable Market) analysis.'
    };

    return tooltips[questionId] || 'This field helps analyze your market position and competitive landscape.';
  };

  const renderQuestion = (question: Question) => {
    const value = answers[question.id] || '';

    switch (question.type) {
      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder={question.placeholder}
            className="min-h-[120px]"
          />
        );
      case 'select':
        return (
          <Select value={value} onValueChange={(val) => handleAnswerChange(question.id, val)}>
            <SelectTrigger>
              <SelectValue placeholder={question.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder={question.placeholder}
          />
        );
      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder={question.placeholder}
          />
        );
    }
  };

  const renderMarketResults = () => {
    if (!marketData) return null;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
              Market Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="competition">Competition</TabsTrigger>
                <TabsTrigger value="demand">Market Demand</TabsTrigger>
                <TabsTrigger value="strategy">Strategy</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Target Market</CardTitle>
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
                          {marketData.targetMarket || 'No data available'}
                        </ReactMarkdown>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Customer Pain Points</CardTitle>
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
                          {marketData.customerPainPoints || 'No data available'}
                        </ReactMarkdown>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="competition" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Competitive Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {marketData.competitiveAnalysis || 'No data available'}
                    </ReactMarkdown>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="demand" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Market Demand Assessment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {marketData.marketDemand || 'No data available'}
                    </ReactMarkdown>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="strategy" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Pricing Strategy</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {marketData.pricingStrategy || 'No data available'}
                      </ReactMarkdown>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Product Validation</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {marketData.productValidation || 'No data available'}
                      </ReactMarkdown>
                    </CardContent>
                  </Card>
                </div>
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
          <h2 className="text-2xl font-bold">Market Analysis Results</h2>
          <Button onClick={() => setShowResults(false)} variant="outline">
            Back to Analysis
          </Button>
        </div>
        {renderMarketResults()}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* BMC Integration Notice */}
      {bmcDataLoaded && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>BMC Data Integrated!</strong> Your Business Model Canvas data has been used to pre-fill market analysis fields:
            <br />• Customer Segments → Target Market
            <br />• Value Proposition → Customer Pain Points  
            <br />• Key Partnerships → Competitive Analysis
            <br />• Key Activities → Product Features
            <br />• Revenue Streams → Pricing Strategy
            <br />• Customer Relationships → Market Feedback
            <br />• Channels → Market Demand Assessment
          </AlertDescription>
        </Alert>
      )}

      {/* Progress Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <h3 className="font-semibold">Progress</h3>
              <Tooltip content="Market Research Process (MRP) - A systematic 7-step approach to understanding your market, customers, and competitive landscape. Each step builds upon the previous one to create a comprehensive market analysis.">
                <HelpCircle className="w-4 h-4 ml-2 text-gray-400 hover:text-gray-600 cursor-help" />
              </Tooltip>
            </div>
            <span className="text-sm text-gray-600">
              Step {currentStep} of {MRP_STEPS.length}
            </span>
          </div>
          <div className="flex space-x-2">
            {MRP_STEPS.map((step) => (
              <Tooltip key={step.id} content={`${step.title}: ${step.description}`}>
                <div
                  className={`flex-1 h-2 rounded-full cursor-help ${
                    step.id <= currentStep 
                      ? 'bg-gray-600' 
                      : 'bg-gray-200'
                  }`}
                />
              </Tooltip>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Step */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <span className="bg-gray-100 text-gray-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
              {currentStep}
            </span>
            <span className="flex-1">{MRP_STEPS[currentStep - 1]?.title}</span>
            <Tooltip content={`${MRP_STEPS[currentStep - 1]?.title}: ${MRP_STEPS[currentStep - 1]?.description}. This step helps you analyze your market position and competitive landscape.`}>
              <HelpCircle className="w-4 h-4 ml-2 text-gray-400 hover:text-gray-600 cursor-help" />
            </Tooltip>
          </CardTitle>
          <p className="text-sm text-gray-600">
            {MRP_STEPS[currentStep - 1]?.description}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {getCurrentStepQuestions().map((question) => (
            <div key={question.id} className="space-y-2">
              <Label className="flex items-center">
                <span className="flex-1">{question.question}</span>
                {question.required && <span className="text-red-500 ml-1">*</span>}
                <Tooltip content={getTooltipContent(question.id)}>
                  <HelpCircle className="w-4 h-4 ml-2 text-gray-400 hover:text-gray-600 cursor-help" />
                </Tooltip>
              </Label>
              {renderQuestion(question)}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          onClick={prevStep}
          disabled={currentStep === 1}
          variant="outline"
        >
          Previous
        </Button>
        
        <div className="flex items-center space-x-2">
          {currentStep === MRP_STEPS.length ? (
            <Button
              onClick={generateMarketAnalysis}
              disabled={!canProceedToNext() || isGenerating}
              variant="outline"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Analysis...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Generate Market Analysis
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              disabled={!canProceedToNext()}
              variant="outline"
            >
              Next Step
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
