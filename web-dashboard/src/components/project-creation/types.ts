export interface ProjectProfile {
  name: string;
  industry: string;
  customIndustry?: string;
  businessModel: string[];
  isPublic: boolean;
}

export interface EnhancementStage {
  stage: 'comprehensive' | 'optimized' | 'complete';
  content: string;
  suggestions: string[];
  score: number;
  marketAnalysis?: {
    marketSize: string;
    competitiveAdvantage: string;
    targetCustomers: string;
  };
  riskAssessment?: {
    technicalRisks: string[];
    marketRisks: string[];
    mitigationStrategies: string[];
  };
  targetSegments?: {
    primary: string;
    secondary: string[];
    demographics: string;
    psychographics: string;
    painPoints: string[];
  };
  businessModelSuggestions?: {
    recommended: string[];
    alternatives: string[];
    reasoning: string;
    revenueProjections: string;
  };
  // New fields for consolidated analysis
  basicEnhancement?: {
    enhancedDescription: string;
    suggestions: string[];
    viabilityScore: number;
    keyInsights: string[];
    nextSteps: string[];
  };
  detailedAnalysis?: {
    enhancedDescription: string;
    marketAnalysis: any;
    technicalRecommendations: any;
    businessModel: any;
    riskAssessment: any;
    viabilityScore: number;
    suggestions: string[];
  };
  validation?: {
    enhancedDescription: string;
    validationResults: any;
    criticalIssues: string[];
    strengthsAndWeaknesses: any;
    validationFeedback: any;
    viabilityScore: number;
    honestAssessment: string;
  };
  // Optimization fields
  optimizations?: {
    valueProposition: string;
    marketStrategy: string;
    productStrategy: string;
    businessModel: string;
  };
  competitiveStrategy?: {
    differentiation: string;
    positioning: string;
    defensibility: string;
  };
  executionPlan?: {
    mvpDefinition: string;
    roadmap: string;
    milestones: string;
  };
  successFactors?: string[];
  optimizationSummary?: string;
}

export interface ProjectListItem {
  id: string;
  name: string;
  description: string;
  lastModified: Date;
  progress: number;
  isPublic?: boolean;
  isShared?: boolean;
  sharedRole?: string;
  isOwned?: boolean;
}

export interface WizardStepProps {
  onNext: (data: any) => void;
  onPrevious: () => void;
  data: any;
  errors: Record<string, string>;
  isLoading: boolean;
}

export interface AnalysisData {
  description: string;
  optimizationInput?: string;
  enhancementStage?: EnhancementStage;
  targetSegments?: any;
  businessModelSuggestions?: any;
  inferredIndustry?: string;
}

export interface TemplateData {
  selectedTemplate: string;
  customTemplate?: string;
  industry: string;
  customIndustry?: string;
  businessModel: string[];
}

export interface TechnologyStackData {
  technologyStack: string[];
}

export interface RegulatoryComplianceData {
  regulatoryCompliance: string[];
}

export interface ProjectCreationData {
  analysis: AnalysisData;
  template: TemplateData;
  profile: ProjectProfile;
  technologyStack: TechnologyStackData;
  regulatoryCompliance: RegulatoryComplianceData;
}
