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
  Crosshair
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
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [roastData, setRoastData] = useState<RoastData | null>(null);
  const [existingAnalyses, setExistingAnalyses] = useState<any>({});
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Load questions and existing analyses
  useEffect(() => {
    loadQuestions();
    loadExistingAnalyses();
  }, [projectId]);

  const loadQuestions = async () => {
    try {
      setIsLoadingQuestions(true);
      const response = await fetch(`/api/projects/${projectId}/roast/questions`);
      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
      }
    } catch (error) {
      console.error('Error loading roast questions:', error);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const loadExistingAnalyses = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/analyses`);
      if (response.ok) {
        const responseData = await response.json();
        setExistingAnalyses(responseData.analyses || {});
      }
    } catch (error) {
      console.error('Error loading existing analyses:', error);
    }
  };

  const getCurrentStepQuestions = () => {
    const stepQuestions: Record<number, string[]> = {
      1: ['business_model_focus'],
      2: ['market_assumptions'],
      3: ['technical_complexity'],
      4: ['financial_projections'],
      5: ['competitive_landscape'],
      6: ['execution_plan'],
      7: ['regulatory_requirements'],
      8: ['overall_assessment']
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
    if (currentStep < RAP_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const generateRoastAnalysis = async () => {
    try {
      setIsGenerating(true);
      
      const response = await fetch(`/api/projects/${projectId}/roast/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers,
          existingAnalyses,
          step: currentStep
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate roast analysis');
      }

      const data = await response.json();
      setRoastData(data);
      setShowResults(true);
    } catch (error) {
      console.error('Error generating roast analysis:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper function to get tooltip content for each question
  const getTooltipContent = (questionId: string) => {
    const tooltips: Record<string, string> = {
      // Step 1: Business Model Critique
      'business_model_focus': 'Focus on the core business model flaws. What are the fundamental assumptions that could be wrong? What key components are missing or unrealistic?',
      
      // Step 2: Market Reality Check
      'market_assumptions': 'Challenge market assumptions. What evidence supports the market size claims? Are there hidden competitors or market barriers?',
      
      // Step 3: Technical Challenges
      'technical_complexity': 'Identify technical implementation risks. What technologies are being used that could fail? What are the integration challenges?',
      
      // Step 4: Financial Viability
      'financial_projections': 'Critique financial assumptions. Are revenue projections realistic? What costs are being underestimated?',
      
      // Step 5: Competitive Threats
      'competitive_landscape': 'Analyze competitive positioning. Who are the real competitors? What advantages do they have?',
      
      // Step 6: Execution Risks
      'execution_plan': 'Evaluate execution feasibility. Is the team capable? Are timelines realistic? What could go wrong?',
      
      // Step 7: Regulatory Hurdles
      'regulatory_requirements': 'Assess legal and regulatory risks. What compliance issues exist? What policies could change?',
      
      // Step 8: Overall Assessment
      'overall_assessment': 'Provide final brutal assessment. What are the biggest red flags? Is this project likely to succeed?'
    };

    return tooltips[questionId] || 'This field helps identify critical flaws and risks in the project.';
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

  const renderRoastResults = () => {
    if (!roastData) return null;

    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center text-red-800">
              <Flame className="w-5 h-5 mr-2" />
              Brutal Reality Check - Roast Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="border-red-300 bg-red-100 mb-4">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Warning:</strong> This analysis provides brutally honest feedback. Prepare for some tough love!
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
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {roastData.technicalChallenges || 'No data available'}
                      </ReactMarkdown>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-red-200">
                    <CardHeader>
                      <CardTitle className="text-lg text-red-800">Financial Viability</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {roastData.financialViability || 'No data available'}
                      </ReactMarkdown>
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
          <h2 className="text-2xl font-bold text-red-800">Roast Analysis Results</h2>
          <Button onClick={() => setShowResults(false)} variant="outline">
            Back to Analysis
          </Button>
        </div>
        {renderRoastResults()}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Warning Notice */}
      <Alert className="border-red-300 bg-red-100">
        <Flame className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <strong>Brutal Honesty Mode:</strong> This analysis will provide harsh, critical feedback to help you identify real problems and improve your project. No sugar-coating!
        </AlertDescription>
      </Alert>

      {/* Progress Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <h3 className="font-semibold">Progress</h3>
              <Tooltip content="Roast Analysis Process (RAP) - A systematic 8-step approach to brutally honest project critique. Each step focuses on a different aspect of potential failure to identify real problems and risks.">
                <HelpCircle className="w-4 h-4 ml-2 text-gray-400 hover:text-gray-600 cursor-help" />
              </Tooltip>
            </div>
            <span className="text-sm text-gray-600">
              Step {currentStep} of {RAP_STEPS.length}
            </span>
          </div>
          <div className="flex space-x-2">
            {RAP_STEPS.map((step) => (
              <Tooltip key={step.id} content={`${step.title}: ${step.description}`}>
                <div
                  className={`flex-1 h-2 rounded-full cursor-help ${
                    step.id <= currentStep 
                      ? 'bg-red-600' 
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
            <span className="bg-red-100 text-red-800 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">
              {currentStep}
            </span>
            <span className="flex-1">{RAP_STEPS[currentStep - 1]?.title}</span>
            <Tooltip content={`${RAP_STEPS[currentStep - 1]?.title}: ${RAP_STEPS[currentStep - 1]?.description}. This step helps identify critical flaws and risks in this specific area.`}>
              <HelpCircle className="w-4 h-4 ml-2 text-gray-400 hover:text-gray-600 cursor-help" />
            </Tooltip>
          </CardTitle>
          <p className="text-sm text-gray-600">
            {RAP_STEPS[currentStep - 1]?.description}
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
          {currentStep === RAP_STEPS.length ? (
            <Button
              onClick={generateRoastAnalysis}
              disabled={!canProceedToNext() || isGenerating}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Brutal Analysis...
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4 mr-2" />
                  Roast My Project
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

