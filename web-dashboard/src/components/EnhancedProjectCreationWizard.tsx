// Enhanced ProjectCreationWizard.tsx with improved output quality
'use client';

import { useState } from 'react';
import { ProjectListItem } from '@/types';

interface ProjectProfile {
  name: string;
  industry: string;
  customIndustry?: string;
  businessModel: string[];
  isPublic: boolean;
}

interface EnhancementStage {
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

interface EnhancedProjectCreationWizardProps {
  onClose: () => void;
  onProjectCreated: (project: ProjectListItem) => void;
}

const INDUSTRY_OPTIONS = [
  { value: 'fintech', label: 'Financial Technology', icon: '💰', description: 'Banking, payments, lending, insurance' },
  { value: 'healthtech', label: 'Healthcare Technology', icon: '🏥', description: 'Telemedicine, health records, medical devices' },
  { value: 'edtech', label: 'Education Technology', icon: '🎓', description: 'Learning platforms, online courses, educational tools' },
  { value: 'ecommerce', label: 'E-commerce', icon: '🛒', description: 'Online retail, marketplaces, digital commerce' },
  { value: 'saas', label: 'Software as a Service', icon: '☁️', description: 'Cloud software, business tools, productivity apps' },
  { value: 'marketplace', label: 'Marketplace Platform', icon: '🏪', description: 'Two-sided markets, peer-to-peer platforms' },
  { value: 'social', label: 'Social Platform', icon: '👥', description: 'Social networks, community platforms, messaging' },
  { value: 'iot', label: 'Internet of Things', icon: '🌐', description: 'Connected devices, smart home, industrial IoT' },
  { value: 'ai-ml', label: 'AI/Machine Learning', icon: '🤖', description: 'AI applications, data analytics, automation' },
  { value: 'blockchain', label: 'Blockchain/Web3', icon: '⛓️', description: 'Cryptocurrency, DeFi, NFTs, smart contracts' },
  { value: 'gaming', label: 'Gaming', icon: '🎮', description: 'Video games, mobile games, game platforms' },
  { value: 'productivity', label: 'Productivity Tools', icon: '⚡', description: 'Workflow tools, project management, collaboration' },
  { value: 'logistics', label: 'Logistics & Supply Chain', icon: '📦', description: 'Shipping, warehousing, supply chain management' },
  { value: 'ev', label: 'Electric Vehicles', icon: '🚗', description: 'EV manufacturing, charging infrastructure, battery tech' },
  { value: 'mobility', label: 'Mobility & Transportation', icon: '🚌', description: 'Ride-sharing, public transit, smart transportation' },
  { value: 'other', label: 'Other', icon: '📋', description: 'Custom or emerging industry' }
];

const BUSINESS_MODEL_OPTIONS = [
  { value: 'b2b-saas', label: 'B2B SaaS Subscription', description: 'Monthly/annual subscriptions for business software' },
  { value: 'b2c-freemium', label: 'B2C Freemium', description: 'Free tier with premium paid features' },
  { value: 'marketplace', label: 'Marketplace Commission', description: 'Commission on transactions between users' },
  { value: 'ecommerce', label: 'E-commerce Sales', description: 'Direct product sales online' },
  { value: 'advertising', label: 'Advertising Revenue', description: 'Revenue from ads and sponsored content' },
  { value: 'transaction', label: 'Transaction Fees', description: 'Fees on financial transactions or payments' },
  { value: 'licensing', label: 'Software Licensing', description: 'One-time or recurring software licenses' },
  { value: 'consulting', label: 'Consulting Services', description: 'Professional services and consulting' },
  { value: 'other', label: 'Other', description: 'Custom business model' },
  { value: 'unknown', label: "I don't know", description: 'Let AI analyze and suggest the best business models' }
];

const getIndustryTemplates = (industry: string) => {
  const industrySpecific: Record<string, Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    features: string[];
    requirements: string[];
  }>> = {
    'fintech': [
      {
        id: 'fintech-payment',
        name: 'Payment Platform',
        description: 'Digital payment processing with compliance',
        icon: '💳',
        features: ['PCI DSS compliance', 'Multi-currency support', 'Fraud detection', 'Banking API integration'],
        requirements: ['KYC/AML procedures', 'Real-time transaction processing', 'Regulatory reporting', 'Multi-factor authentication']
      },
      {
        id: 'fintech-lending',
        name: 'Digital Lending Platform',
        description: 'Online lending with automated risk assessment',
        icon: '🏦',
        features: ['Credit scoring algorithms', 'Automated underwriting', 'Loan management', 'Regulatory compliance'],
        requirements: ['Credit bureau integration', 'Risk assessment models', 'Loan origination system', 'Collections management']
      }
    ],
    'healthtech': [
      {
        id: 'healthtech-telemedicine',
        name: 'Telemedicine Platform',
        description: 'Remote healthcare consultation platform',
        icon: '👩‍⚕️',
        features: ['HIPAA compliance', 'Video consultations', 'EHR integration', 'Prescription management'],
        requirements: ['Patient data encryption', 'Provider credentialing', 'Insurance integration', 'Medical record management']
      },
      {
        id: 'healthtech-wellness',
        name: 'Digital Wellness Platform',
        description: 'Personal health and wellness tracking',
        icon: '💪',
        features: ['Health tracking', 'Wellness programs', 'Wearable integration', 'Progress analytics'],
        requirements: ['Device connectivity', 'Health data standards', 'Privacy controls', 'Gamification features']
      }
    ],
    'edtech': [
      {
        id: 'edtech-lms',
        name: 'Learning Management System',
        description: 'Comprehensive online learning platform',
        icon: '📚',
        features: ['Course management', 'Student tracking', 'Assessment tools', 'Content delivery'],
        requirements: ['FERPA compliance', 'Accessibility standards', 'Grade management', 'Parent/teacher communication']
      }
    ],
    'logistics': [
      {
        id: 'logistics-tms',
        name: 'Transportation Management System',
        description: 'End-to-end logistics and supply chain management',
        icon: '🚛',
        features: ['Route optimization', 'Fleet management', 'Real-time tracking', 'Inventory management'],
        requirements: ['GPS integration', 'API connectivity', 'Compliance reporting', 'Multi-carrier support']
      },
      {
        id: 'logistics-warehouse',
        name: 'Smart Warehouse Platform',
        description: 'Automated warehouse and fulfillment management',
        icon: '🏭',
        features: ['Inventory tracking', 'Automated picking', 'Quality control', 'Analytics dashboard'],
        requirements: ['IoT integration', 'Barcode scanning', 'Real-time updates', 'Scalable architecture']
      }
    ],
    'ev': [
      {
        id: 'ev-charging',
        name: 'EV Charging Network',
        description: 'Electric vehicle charging infrastructure and management',
        icon: '🔌',
        features: ['Charging station management', 'Payment processing', 'Network optimization', 'User app'],
        requirements: ['Hardware integration', 'Payment gateway', 'Real-time monitoring', 'Grid connectivity']
      },
      {
        id: 'ev-battery',
        name: 'Battery Management System',
        description: 'Advanced battery monitoring and optimization platform',
        icon: '🔋',
        features: ['Battery health monitoring', 'Performance optimization', 'Predictive maintenance', 'Data analytics'],
        requirements: ['IoT sensors', 'Machine learning', 'Real-time processing', 'Safety protocols']
      }
    ],
    'mobility': [
      {
        id: 'mobility-rideshare',
        name: 'Ride-Sharing Platform',
        description: 'On-demand transportation and mobility services',
        icon: '🚗',
        features: ['Driver matching', 'Route optimization', 'Payment processing', 'Safety features'],
        requirements: ['GPS tracking', 'Real-time matching', 'Payment integration', 'Background checks']
      },
      {
        id: 'mobility-transit',
        name: 'Smart Transit System',
        description: 'Public transportation optimization and management',
        icon: '🚌',
        features: ['Route planning', 'Real-time updates', 'Fare management', 'Analytics dashboard'],
        requirements: ['Transit APIs', 'Real-time data', 'Payment systems', 'Accessibility compliance']
      }
    ]
  };
  
  const industryTemplates = industrySpecific[industry] || [];
  
  // Add "Other" option for all industries
  industryTemplates.push({
    id: 'other',
    name: 'Custom Template',
    description: 'Create a custom project template tailored to your specific needs',
    icon: '🔧',
    features: ['Custom features', 'Flexible architecture', 'Tailored requirements', 'Scalable design'],
    requirements: ['Custom requirements', 'Flexible implementation', 'Adaptable to your needs']
  });
  
  return industryTemplates;
};

export function EnhancedProjectCreationWizard({ onClose, onProjectCreated }: EnhancedProjectCreationWizardProps) {
  const [step, setStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  const [projectProfile, setProjectProfile] = useState<ProjectProfile>({
    name: '',
    industry: '',
    customIndustry: '',
    businessModel: [],
    isPublic: false
  });
  
  const [formData, setFormData] = useState({
    template: '',
    customTemplate: '',
    description: '',
    aiModel: 'gpt-4'
  });
  
  const [enhancementStage, setEnhancementStage] = useState<EnhancementStage | null>(null);
  const [validationFeedback, setValidationFeedback] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Complete analysis and optimization in sequence
  const handleCompleteAnalysis = async () => {
    if (!formData.description.trim()) return;
    
    try {
      setIsEnhancing(true);
      setErrors({});
      
      // First run comprehensive analysis
      const comprehensiveResponse = await fetch('/api/enhance-description-progressive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'comprehensive',
          description: formData.description,
          projectProfile,
          template: formData.template,
          customTemplate: formData.customTemplate
        })
      });

      if (!comprehensiveResponse.ok) {
        const errorData = await comprehensiveResponse.json();
        setErrors({ description: errorData.error || 'Failed to run comprehensive analysis' });
        return;
      }

      const comprehensiveResult = await comprehensiveResponse.json();
      
      // Generate target segments from existing data if not provided
      const targetSegments = comprehensiveResult.targetSegments || (comprehensiveResult.detailedAnalysis?.marketAnalysis?.targetCustomers ? {
        primary: comprehensiveResult.detailedAnalysis.marketAnalysis.targetCustomers,
        secondary: [],
        demographics: 'Generated from market analysis',
        psychographics: 'Generated from market analysis',
        painPoints: ['Generated from problem statement']
      } : undefined);

      // Calculate overall score as weighted average (validation is most important)
      const basicScore = comprehensiveResult.basicEnhancement?.viabilityScore || 0;
      const detailedScore = comprehensiveResult.detailedAnalysis?.viabilityScore || 0;
      const validationScore = comprehensiveResult.validation?.viabilityScore || 0;
      const overallScore = Math.round((basicScore * 0.2 + detailedScore * 0.3 + validationScore * 0.5));

      // Set comprehensive results first
      setEnhancementStage({
        stage: 'comprehensive',
        content: comprehensiveResult.validation?.enhancedDescription || comprehensiveResult.detailedAnalysis?.enhancedDescription || comprehensiveResult.basicEnhancement?.enhancedDescription || 'Analysis completed',
        suggestions: comprehensiveResult.basicEnhancement?.suggestions || [],
        score: overallScore,
        marketAnalysis: comprehensiveResult.detailedAnalysis?.marketAnalysis,
        riskAssessment: comprehensiveResult.detailedAnalysis?.riskAssessment,
        targetSegments: targetSegments,
        businessModelSuggestions: comprehensiveResult.businessModelSuggestions,
        // Store all three stages for display
        basicEnhancement: comprehensiveResult.basicEnhancement,
        detailedAnalysis: comprehensiveResult.detailedAnalysis,
        validation: comprehensiveResult.validation
      });

      // Show validation feedback
      if (comprehensiveResult.validation?.validationFeedback) {
        setValidationFeedback(comprehensiveResult.validation.validationFeedback);
      }

      // Now run optimization on the validated description
      const optimizedDescription = comprehensiveResult.validation?.enhancedDescription || comprehensiveResult.detailedAnalysis?.enhancedDescription || comprehensiveResult.basicEnhancement?.enhancedDescription || formData.description;
      
      const optimizedResponse = await fetch('/api/enhance-description-progressive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'optimized',
          description: optimizedDescription,
          projectProfile,
          template: formData.template,
          customTemplate: formData.customTemplate
        })
      });

      if (optimizedResponse.ok) {
        const optimizedResult = await optimizedResponse.json();
        
        // Update with optimized results
        const optimizedTargetSegments = optimizedResult.targetSegments || targetSegments;
        
        setEnhancementStage({
          stage: 'complete',
          content: optimizedResult.enhancedDescription,
          suggestions: optimizedResult.suggestions || [],
          score: optimizedResult.viabilityScore || overallScore,
          marketAnalysis: optimizedResult.marketAnalysis || comprehensiveResult.detailedAnalysis?.marketAnalysis,
          riskAssessment: optimizedResult.riskAssessment || comprehensiveResult.detailedAnalysis?.riskAssessment,
          targetSegments: optimizedTargetSegments,
          businessModelSuggestions: optimizedResult.businessModelSuggestions || comprehensiveResult.businessModelSuggestions,
          // Keep comprehensive data for display
          basicEnhancement: comprehensiveResult.basicEnhancement,
          detailedAnalysis: comprehensiveResult.detailedAnalysis,
          validation: comprehensiveResult.validation,
          // Add optimized data
          optimizations: optimizedResult.optimizations,
          competitiveStrategy: optimizedResult.competitiveStrategy,
          executionPlan: optimizedResult.executionPlan,
          successFactors: optimizedResult.successFactors,
          optimizationSummary: optimizedResult.optimizationSummary
        });
        
        setFormData(prev => ({ 
          ...prev, 
          description: optimizedResult.enhancedDescription 
        }));
      } else {
        // If optimization fails, keep comprehensive results
        setFormData(prev => ({ 
          ...prev, 
          description: optimizedDescription
        }));
      }
      
    } catch (error) {
      console.error('Failed to complete analysis:', error);
      setErrors({ description: 'Failed to complete analysis. Please try again.' });
    } finally {
      setIsEnhancing(false);
    }
  };

  // Enhanced description expansion with comprehensive analysis
  const handleEnhanceDescription = async (targetStage: 'comprehensive' | 'optimized') => {
    if (!formData.description.trim()) return;
    
    try {
      setIsEnhancing(true);
      setErrors({});
      
      const response = await fetch('/api/enhance-description-progressive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: targetStage,
          description: formData.description,
          projectProfile,
          template: formData.template,
          customTemplate: formData.customTemplate
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        if (targetStage === 'comprehensive') {
          // Handle consolidated comprehensive analysis
          const comprehensiveData = result;
          
          // Generate target segments from existing data if not provided
          const targetSegments = comprehensiveData.targetSegments || (comprehensiveData.detailedAnalysis?.marketAnalysis?.targetCustomers ? {
            primary: comprehensiveData.detailedAnalysis.marketAnalysis.targetCustomers,
            secondary: [],
            demographics: 'Generated from market analysis',
            psychographics: 'Generated from market analysis',
            painPoints: ['Generated from problem statement']
          } : undefined);

          // Calculate overall score as weighted average (validation is most important)
          const basicScore = comprehensiveData.basicEnhancement?.viabilityScore || 0;
          const detailedScore = comprehensiveData.detailedAnalysis?.viabilityScore || 0;
          const validationScore = comprehensiveData.validation?.viabilityScore || 0;
          const overallScore = Math.round((basicScore * 0.2 + detailedScore * 0.3 + validationScore * 0.5));
        
        setEnhancementStage({
            stage: 'comprehensive',
            content: comprehensiveData.validation?.enhancedDescription || comprehensiveData.detailedAnalysis?.enhancedDescription || comprehensiveData.basicEnhancement?.enhancedDescription || 'Analysis completed',
            suggestions: comprehensiveData.basicEnhancement?.suggestions || [],
            score: overallScore,
            marketAnalysis: comprehensiveData.detailedAnalysis?.marketAnalysis,
            riskAssessment: comprehensiveData.detailedAnalysis?.riskAssessment,
            targetSegments: targetSegments,
            businessModelSuggestions: comprehensiveData.businessModelSuggestions,
            // Store all three stages for display
            basicEnhancement: comprehensiveData.basicEnhancement,
            detailedAnalysis: comprehensiveData.detailedAnalysis,
            validation: comprehensiveData.validation
          });
          
          setFormData(prev => ({ 
            ...prev, 
            description: comprehensiveData.validation?.enhancedDescription || comprehensiveData.detailedAnalysis?.enhancedDescription || comprehensiveData.basicEnhancement?.enhancedDescription || formData.description
          }));
          
          // Show validation feedback
          if (comprehensiveData.validation?.validationFeedback) {
            setValidationFeedback(comprehensiveData.validation.validationFeedback);
          }
        } else {
          // Handle optimized stage (unchanged)
          const targetSegments = result.targetSegments || (result.marketAnalysis?.targetCustomers ? {
            primary: result.marketAnalysis.targetCustomers,
            secondary: [],
            demographics: 'Generated from market analysis',
            psychographics: 'Generated from market analysis',
            painPoints: ['Generated from problem statement']
          } : undefined);

          setEnhancementStage({
            stage: 'optimized',
          content: result.enhancedDescription,
          suggestions: result.suggestions || [],
          score: result.viabilityScore || 0,
          marketAnalysis: result.marketAnalysis,
            riskAssessment: result.riskAssessment,
            targetSegments: targetSegments,
            businessModelSuggestions: result.businessModelSuggestions
        });
        
        setFormData(prev => ({ 
          ...prev, 
          description: result.enhancedDescription 
        }));
        }
      } else {
        const errorData = await response.json();
        setErrors({ description: errorData.error || 'Failed to enhance description' });
      }
    } catch (error) {
      console.error('Failed to enhance description:', error);
      setErrors({ description: 'Failed to enhance description. Please try again.' });
    } finally {
      setIsEnhancing(false);
    }
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    
    if (!projectProfile.name.trim()) {
      newErrors.name = 'Project name is required';
    }
    if (!projectProfile.industry) {
      newErrors.industry = 'Please select an industry';
    }
    if (projectProfile.industry === 'other' && !projectProfile.customIndustry?.trim()) {
      newErrors.customIndustry = 'Please specify your custom industry';
    }
    if (!projectProfile.businessModel || projectProfile.businessModel.length === 0) {
      newErrors.businessModel = 'Please select at least one business model or choose "I don\'t know"';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.template) {
      newErrors.template = 'Please select a project template';
    }
    
    if (formData.template === 'other' && !formData.customTemplate.trim()) {
      newErrors.customTemplate = 'Please describe your custom template';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.description.trim()) {
      newErrors.description = 'Project description is required';
    } else if (formData.description.length < 50) {
      newErrors.description = 'Description should be at least 50 characters for better AI analysis';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleCreate = async () => {
    if (!validateStep3()) return;
    
    try {
      setIsCreating(true);
      setErrors({});

      // Create project with enhanced data
      const projectData = {
        ...projectProfile,
        description: formData.description,
        template: formData.template,
        customTemplate: formData.customTemplate,
        aiModel: formData.aiModel,
        enhancementData: enhancementStage,
        validationFeedback
      };

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create project');
      }

      const newProject = await response.json();
      
      // Generate enhanced specifications
      const specsResponse = await fetch(`/api/projects/${newProject.id}/generate-enhanced-specs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enhancementData: enhancementStage,
          projectProfile
        })
      });

      if (specsResponse.ok) {
        console.log('✅ Enhanced specifications generated successfully');
      }

      onProjectCreated(newProject);
    } catch (error) {
      console.error('Failed to create project:', error);
      setErrors({ general: error instanceof Error ? error.message : 'Failed to create project' });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Create New Startup Project</h2>
            <p className="text-sm text-gray-500 mt-1">Step {step} of 3 - Enhanced AI-Assisted Creation</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-gray-50">
          <div className="flex items-center">
            {[1, 2, 3].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  stepNumber <= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {stepNumber}
                </div>
                {stepNumber < 3 && (
                  <div className={`w-12 h-1 mx-2 ${stepNumber < step ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {step === 1 && "Define your startup's core identity and market positioning"}
            {step === 2 && "Choose the most suitable project template for your industry"}
            {step === 3 && "Create comprehensive project specifications with AI assistance"}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Startup Profile & Market Positioning</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Project Name */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Startup Name *
                    </label>
                    <input
                      type="text"
                      value={projectProfile.name}
                      onChange={(e) => setProjectProfile(prev => ({ ...prev, name: e.target.value }))}
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        errors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter your startup name"
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                  </div>

                  {/* Industry Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Industry *
                    </label>
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                      {INDUSTRY_OPTIONS.map((industry) => (
                        <div
                          key={industry.value}
                          onClick={() => setProjectProfile(prev => ({ ...prev, industry: industry.value }))}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            projectProfile.industry === industry.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center">
                            <span className="text-lg mr-2">{industry.icon}</span>
                            <div>
                              <div className="font-medium text-sm">{industry.label}</div>
                              <div className="text-xs text-gray-500">{industry.description}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {errors.industry && <p className="mt-1 text-sm text-red-600">{errors.industry}</p>}
                    
                    {/* Custom Industry Input */}
                    {projectProfile.industry === 'other' && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Custom Industry *
                        </label>
                        <input
                          type="text"
                          value={projectProfile.customIndustry || ''}
                          onChange={(e) => setProjectProfile(prev => ({ ...prev, customIndustry: e.target.value }))}
                          className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            errors.customIndustry ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="Enter your custom industry (e.g., Space Technology, Quantum Computing, etc.)"
                        />
                        {errors.customIndustry && <p className="mt-1 text-sm text-red-600">{errors.customIndustry}</p>}
                      </div>
                    )}
                  </div>

                  {/* Business Model */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Model * (Select one or more)
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {BUSINESS_MODEL_OPTIONS.map((model) => (
                        <div
                          key={model.value}
                          onClick={() => {
                            setProjectProfile(prev => {
                              const currentModels = prev.businessModel;
                              const isSelected = currentModels.includes(model.value);
                              
                              if (isSelected) {
                                // Remove from selection
                                return { ...prev, businessModel: currentModels.filter(m => m !== model.value) };
                              } else {
                                // Add to selection
                                return { ...prev, businessModel: [...currentModels, model.value] };
                              }
                            });
                          }}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            projectProfile.businessModel.includes(model.value)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center">
                            <div className={`w-4 h-4 border-2 rounded mr-3 flex items-center justify-center ${
                              projectProfile.businessModel.includes(model.value)
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-300'
                            }`}>
                              {projectProfile.businessModel.includes(model.value) && (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1">
                          <div className="font-medium text-sm">{model.label}</div>
                          <div className="text-xs text-gray-500">{model.description}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {errors.businessModel && <p className="mt-1 text-sm text-red-600">{errors.businessModel}</p>}
                    {projectProfile.businessModel.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-600">
                          Selected: {projectProfile.businessModel.map(model => 
                            BUSINESS_MODEL_OPTIONS.find(m => m.value === model)?.label
                          ).join(', ')}
                        </p>
                  </div>
                    )}
                  </div>

                </div>

                {/* Visibility */}
                <div className="mt-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={projectProfile.isPublic}
                      onChange={(e) => setProjectProfile(prev => ({ ...prev, isPublic: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">Make this project public (visible to other users)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Choose Project Template
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Based on your industry ({INDUSTRY_OPTIONS.find(i => i.value === projectProfile.industry)?.label}), 
                  here are recommended templates with industry-specific features and requirements.
                </p>
                
                {/* Industry-Specific Templates */}
                {getIndustryTemplates(projectProfile.industry).length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-800 mb-3">
                      Recommended for {INDUSTRY_OPTIONS.find(i => i.value === projectProfile.industry)?.label}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {getIndustryTemplates(projectProfile.industry).map((template) => (
                        <div
                          key={template.id}
                          onClick={() => setFormData(prev => ({ ...prev, template: template.id }))}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            formData.template === template.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start">
                            <div className="text-2xl mr-3">{template.icon}</div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{template.name}</h4>
                              <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                              <div className="mt-2">
                                <div className="text-xs font-medium text-gray-700 mb-1">Key Features:</div>
                                <ul className="space-y-1">
                                  {template.features.map((feature: string, index: number) => (
                                    <li key={index} className="text-xs text-gray-500 flex items-center">
                                      <svg className="w-3 h-3 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      {feature}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Custom Template Input */}
                {formData.template === 'other' && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Template Description *
                    </label>
                    <textarea
                      value={formData.customTemplate}
                      onChange={(e) => setFormData(prev => ({ ...prev, customTemplate: e.target.value }))}
                      rows={4}
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        errors.customTemplate ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Describe your custom project template. Include key features, requirements, and any specific needs for your startup..."
                    />
                    {errors.customTemplate && <p className="mt-1 text-sm text-red-600">{errors.customTemplate}</p>}
                  </div>
                )}
                
                {errors.template && <p className="mt-2 text-sm text-red-600">{errors.template}</p>}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  AI-Enhanced Project Specification
                </h3>
                
                <div className="space-y-6">
                  {/* Description Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Project Description *
                      </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={6}
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        errors.description ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Describe your startup idea in detail. Include the problem you're solving, your solution approach, target users, key features, and business goals. The more detail you provide, the better the AI can help enhance your project specifications."
                    />
                    {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
                    
                    {/* Analysis Button - Below text area */}
                    <div className="mt-4 flex justify-center">
                      <button
                        type="button"
                        onClick={() => handleCompleteAnalysis()}
                        disabled={!formData.description.trim() || isEnhancing}
                        className="px-4 py-2 text-sm font-medium text-white bg-gray-600 border border-transparent rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isEnhancing ? 'Analyzing & Optimizing...' : '🚀 Run Complete Analysis'}
                      </button>
                    </div>
                  </div>

                  {/* Enhancement Results */}
                  {enhancementStage && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">
                          AI Enhancement Results ({enhancementStage.stage})
                        </h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">Overall Score:</span>
                          <span className={`px-2 py-1 rounded text-sm font-medium ${
                            enhancementStage.score >= 70 ? 'bg-green-100 text-green-800' :
                            enhancementStage.score >= 55 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {enhancementStage.score}/100
                          </span>
                          <span className="text-xs text-gray-500">
                            (weighted: Basic 20% + Detailed 30% + Validation 50%)
                          </span>
                        </div>
                      </div>
                      
                      {/* Comprehensive Analysis Results */}
                      {(enhancementStage.stage === 'comprehensive' || enhancementStage.stage === 'complete') && enhancementStage.basicEnhancement && (
                        <div className="space-y-6">
                          {/* Basic Enhancement Section */}
                          <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-medium text-gray-900 flex items-center">
                                <span className="text-blue-500 mr-2">✨</span>
                                Basic Enhancement
                              </h5>
                              <span className={`px-2 py-1 rounded text-sm font-medium ${
                                enhancementStage.basicEnhancement.viabilityScore >= 80 ? 'bg-green-100 text-green-800' :
                                enhancementStage.basicEnhancement.viabilityScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {enhancementStage.basicEnhancement.viabilityScore}/100
                              </span>
                            </div>
                            
                            {enhancementStage.basicEnhancement.suggestions.length > 0 && (
                        <div className="mb-4">
                                <h6 className="text-sm font-medium text-gray-700 mb-2">Key Suggestions:</h6>
                          <ul className="space-y-1">
                                  {enhancementStage.basicEnhancement.suggestions.map((suggestion, index) => (
                              <li key={index} className="text-sm text-gray-600 flex items-start">
                                <span className="text-blue-500 mr-2">•</span>
                                {suggestion}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                            {enhancementStage.basicEnhancement.keyInsights && enhancementStage.basicEnhancement.keyInsights.length > 0 && (
                              <div className="mb-4">
                                <h6 className="text-sm font-medium text-gray-700 mb-2">Key Insights:</h6>
                                <ul className="space-y-1">
                                  {enhancementStage.basicEnhancement.keyInsights.map((insight, index) => (
                                    <li key={index} className="text-sm text-gray-600 flex items-start">
                                      <span className="text-green-500 mr-2">💡</span>
                                      {insight}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {enhancementStage.basicEnhancement.nextSteps && enhancementStage.basicEnhancement.nextSteps.length > 0 && (
                              <div>
                                <h6 className="text-sm font-medium text-gray-700 mb-2">Next Steps:</h6>
                                <ul className="space-y-1">
                                  {enhancementStage.basicEnhancement.nextSteps.map((step, index) => (
                                    <li key={index} className="text-sm text-gray-600 flex items-start">
                                      <span className="text-orange-500 mr-2">→</span>
                                      {step}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* Detailed Analysis Section */}
                          {enhancementStage.detailedAnalysis && (
                            <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="font-medium text-gray-900 flex items-center">
                                  <span className="text-green-500 mr-2">🚀</span>
                                  Detailed Analysis
                                </h5>
                                <span className={`px-2 py-1 rounded text-sm font-medium ${
                                  enhancementStage.detailedAnalysis.viabilityScore >= 80 ? 'bg-green-100 text-green-800' :
                                  enhancementStage.detailedAnalysis.viabilityScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {enhancementStage.detailedAnalysis.viabilityScore}/100
                                </span>
                              </div>

                              {enhancementStage.detailedAnalysis.marketAnalysis && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                  <div className="bg-gray-50 p-3 rounded">
                            <h6 className="text-xs font-medium text-gray-500 uppercase">Market Size</h6>
                                    <p className="text-sm text-gray-800">{enhancementStage.detailedAnalysis.marketAnalysis.marketSize}</p>
                          </div>
                                  <div className="bg-gray-50 p-3 rounded">
                            <h6 className="text-xs font-medium text-gray-500 uppercase">Competitive Advantage</h6>
                                    <p className="text-sm text-gray-800">{enhancementStage.detailedAnalysis.marketAnalysis.competitiveAdvantage}</p>
                          </div>
                                  <div className="bg-gray-50 p-3 rounded">
                            <h6 className="text-xs font-medium text-gray-500 uppercase">Target Customers</h6>
                                    <p className="text-sm text-gray-800">{enhancementStage.detailedAnalysis.marketAnalysis.targetCustomers}</p>
                          </div>
                        </div>
                      )}

                              {enhancementStage.detailedAnalysis.riskAssessment && (
                                <div className="bg-gray-50 p-3 rounded mb-4">
                                  <h6 className="text-xs font-medium text-gray-500 uppercase mb-2">Risk Assessment</h6>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <h6 className="font-medium text-gray-700 mb-1">Technical Risks:</h6>
                                      <ul className="space-y-1">
                                        {enhancementStage.detailedAnalysis.riskAssessment.technicalRisks?.map((risk: string, index: number) => (
                                          <li key={index} className="text-gray-600">• {risk}</li>
                                        ))}
                                      </ul>
                                    </div>
                                    <div>
                                      <h6 className="font-medium text-gray-700 mb-1">Market Risks:</h6>
                                      <ul className="space-y-1">
                                        {enhancementStage.detailedAnalysis.riskAssessment.marketRisks?.map((risk: string, index: number) => (
                                          <li key={index} className="text-gray-600">• {risk}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {enhancementStage.detailedAnalysis.suggestions && enhancementStage.detailedAnalysis.suggestions.length > 0 && (
                                <div>
                                  <h6 className="text-sm font-medium text-gray-700 mb-2">Detailed Recommendations:</h6>
                                  <ul className="space-y-1">
                                    {enhancementStage.detailedAnalysis.suggestions.map((suggestion, index) => (
                                      <li key={index} className="text-sm text-gray-600 flex items-start">
                                        <span className="text-green-500 mr-2">•</span>
                                        {suggestion}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Validation Section */}
                          {enhancementStage.validation && (
                            <div className="bg-white rounded-lg p-4 border-l-4 border-purple-500">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="font-medium text-gray-900 flex items-center">
                                  <span className="text-purple-500 mr-2">✅</span>
                                  Validation Results
                                </h5>
                                <span className={`px-2 py-1 rounded text-sm font-medium ${
                                  enhancementStage.validation.viabilityScore >= 80 ? 'bg-green-100 text-green-800' :
                                  enhancementStage.validation.viabilityScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {enhancementStage.validation.viabilityScore}/100
                                </span>
                              </div>

                              {enhancementStage.validation.validationResults && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                  <div className="bg-gray-50 p-3 rounded">
                                    <h6 className="text-xs font-medium text-gray-500 uppercase">Problem-Solution Fit</h6>
                                    <p className="text-sm text-gray-800">{enhancementStage.validation.validationResults.problemSolutionFit}</p>
                                  </div>
                                  <div className="bg-gray-50 p-3 rounded">
                                    <h6 className="text-xs font-medium text-gray-500 uppercase">Market Demand</h6>
                                    <p className="text-sm text-gray-800">{enhancementStage.validation.validationResults.marketDemand}</p>
                                  </div>
                                  <div className="bg-gray-50 p-3 rounded">
                                    <h6 className="text-xs font-medium text-gray-500 uppercase">Business Model Viability</h6>
                                    <p className="text-sm text-gray-800">{enhancementStage.validation.validationResults.businessModelViability}</p>
                                  </div>
                                  <div className="bg-gray-50 p-3 rounded">
                                    <h6 className="text-xs font-medium text-gray-500 uppercase">Execution Feasibility</h6>
                                    <p className="text-sm text-gray-800">{enhancementStage.validation.validationResults.executionFeasibility}</p>
                                  </div>
                                </div>
                              )}

                              {enhancementStage.validation.criticalIssues && enhancementStage.validation.criticalIssues.length > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                                  <h6 className="text-sm font-medium text-red-800 mb-2">⚠️ Critical Issues:</h6>
                                  <ul className="space-y-1">
                                    {enhancementStage.validation.criticalIssues.map((issue, index) => (
                                      <li key={index} className="text-sm text-red-700 flex items-start">
                                        <span className="text-red-500 mr-2">•</span>
                                        {issue}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {enhancementStage.validation.strengthsAndWeaknesses && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                    <h6 className="text-sm font-medium text-green-800 mb-2">✅ Strengths:</h6>
                                    <ul className="space-y-1">
                                      {enhancementStage.validation.strengthsAndWeaknesses.strengths?.map((strength: string, index: number) => (
                                        <li key={index} className="text-sm text-green-700 flex items-start">
                                          <span className="text-green-500 mr-2">•</span>
                                          {strength}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                    <h6 className="text-sm font-medium text-yellow-800 mb-2">⚠️ Areas for Improvement:</h6>
                                    <ul className="space-y-1">
                                      {enhancementStage.validation.strengthsAndWeaknesses.weaknesses?.map((weakness: string, index: number) => (
                                        <li key={index} className="text-sm text-yellow-700 flex items-start">
                                          <span className="text-yellow-500 mr-2">•</span>
                                          {weakness}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              )}

                              {enhancementStage.validation.honestAssessment && (
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                  <h6 className="text-sm font-medium text-gray-800 mb-2">🎯 Honest Assessment:</h6>
                                  <p className="text-sm text-gray-700">{enhancementStage.validation.honestAssessment}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Optimization Section - Show when complete */}
                          {enhancementStage.stage === 'complete' && enhancementStage.optimizations && (
                            <div className="bg-white rounded-lg p-4 border-l-4 border-purple-500">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="font-medium text-gray-900 flex items-center">
                                  <span className="text-purple-500 mr-2">⚡</span>
                                  Optimization Results
                                </h5>
                                <span className={`px-2 py-1 rounded text-sm font-medium ${
                                  enhancementStage.score >= 80 ? 'bg-green-100 text-green-800' :
                                  enhancementStage.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {enhancementStage.score}/100
                                </span>
                              </div>

                              {enhancementStage.optimizations && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                  <div className="bg-gray-50 p-3 rounded">
                                    <h6 className="text-xs font-medium text-gray-500 uppercase">Value Proposition</h6>
                                    <p className="text-sm text-gray-800">{enhancementStage.optimizations.valueProposition}</p>
                                  </div>
                                  <div className="bg-gray-50 p-3 rounded">
                                    <h6 className="text-xs font-medium text-gray-500 uppercase">Market Strategy</h6>
                                    <p className="text-sm text-gray-800">{enhancementStage.optimizations.marketStrategy}</p>
                                  </div>
                                  <div className="bg-gray-50 p-3 rounded">
                                    <h6 className="text-xs font-medium text-gray-500 uppercase">Product Strategy</h6>
                                    <p className="text-sm text-gray-800">{enhancementStage.optimizations.productStrategy}</p>
                                  </div>
                                  <div className="bg-gray-50 p-3 rounded">
                                    <h6 className="text-xs font-medium text-gray-500 uppercase">Business Model</h6>
                                    <p className="text-sm text-gray-800">{enhancementStage.optimizations.businessModel}</p>
                                  </div>
                                </div>
                              )}

                              {enhancementStage.competitiveStrategy && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                  <h6 className="text-sm font-medium text-blue-800 mb-2">🎯 Competitive Strategy</h6>
                                  <div className="space-y-2">
                                    <div>
                                      <h6 className="text-xs font-medium text-blue-700 uppercase">Differentiation</h6>
                                      <p className="text-sm text-blue-800">{enhancementStage.competitiveStrategy.differentiation}</p>
                                    </div>
                                    <div>
                                      <h6 className="text-xs font-medium text-blue-700 uppercase">Positioning</h6>
                                      <p className="text-sm text-blue-800">{enhancementStage.competitiveStrategy.positioning}</p>
                                    </div>
                                    <div>
                                      <h6 className="text-xs font-medium text-blue-700 uppercase">Defensibility</h6>
                                      <p className="text-sm text-blue-800">{enhancementStage.competitiveStrategy.defensibility}</p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {enhancementStage.executionPlan && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                                  <h6 className="text-sm font-medium text-green-800 mb-2">📋 Execution Plan</h6>
                                  <div className="space-y-2">
                                    <div>
                                      <h6 className="text-xs font-medium text-green-700 uppercase">MVP Definition</h6>
                                      <p className="text-sm text-green-800">{enhancementStage.executionPlan.mvpDefinition}</p>
                                    </div>
                                    <div>
                                      <h6 className="text-xs font-medium text-green-700 uppercase">Roadmap</h6>
                                      <p className="text-sm text-green-800">{enhancementStage.executionPlan.roadmap}</p>
                                    </div>
                                    <div>
                                      <h6 className="text-xs font-medium text-green-700 uppercase">Key Milestones</h6>
                                      <p className="text-sm text-green-800">{enhancementStage.executionPlan.milestones}</p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {enhancementStage.successFactors && enhancementStage.successFactors.length > 0 && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                                  <h6 className="text-sm font-medium text-yellow-800 mb-2">🏆 Critical Success Factors</h6>
                                  <ul className="space-y-1">
                                    {enhancementStage.successFactors.map((factor, index) => (
                                      <li key={index} className="text-sm text-yellow-700 flex items-start">
                                        <span className="text-yellow-500 mr-2">•</span>
                                        {factor}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {enhancementStage.optimizationSummary && (
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                  <h6 className="text-sm font-medium text-gray-800 mb-2">📊 Optimization Summary</h6>
                                  <p className="text-sm text-gray-700">{enhancementStage.optimizationSummary}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Target Segments - Show for both comprehensive and optimized */}
                      {enhancementStage.targetSegments && (
                        <div className="bg-white p-4 rounded-lg mb-4">
                          <h5 className="text-sm font-medium text-gray-700 mb-3">🎯 Target Segments</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h6 className="text-xs font-medium text-gray-500 uppercase mb-2">Primary Segment</h6>
                              <p className="text-sm text-gray-800 font-medium">{enhancementStage.targetSegments.primary}</p>
                            </div>
                            {enhancementStage.targetSegments.secondary && enhancementStage.targetSegments.secondary.length > 0 && (
                              <div>
                                <h6 className="text-xs font-medium text-gray-500 uppercase mb-2">Secondary Segments</h6>
                                <ul className="space-y-1">
                                  {enhancementStage.targetSegments.secondary.map((segment, index) => (
                                    <li key={index} className="text-sm text-gray-600">• {segment}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            {enhancementStage.targetSegments.demographics && (
                              <div>
                                <h6 className="text-xs font-medium text-gray-500 uppercase mb-2">Demographics</h6>
                                <p className="text-sm text-gray-800">{enhancementStage.targetSegments.demographics}</p>
                              </div>
                            )}
                            {enhancementStage.targetSegments.psychographics && (
                              <div>
                                <h6 className="text-xs font-medium text-gray-500 uppercase mb-2">Psychographics</h6>
                                <p className="text-sm text-gray-800">{enhancementStage.targetSegments.psychographics}</p>
                              </div>
                            )}
                          </div>

                          {enhancementStage.targetSegments.painPoints && enhancementStage.targetSegments.painPoints.length > 0 && (
                            <div className="mt-4">
                              <h6 className="text-xs font-medium text-gray-500 uppercase mb-2">Key Pain Points</h6>
                              <ul className="space-y-1">
                                {enhancementStage.targetSegments.painPoints.map((painPoint, index) => (
                                  <li key={index} className="text-sm text-gray-600 flex items-start">
                                    <span className="text-red-500 mr-2">•</span>
                                    {painPoint}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Business Model Suggestions - Show for both comprehensive and optimized */}
                      {enhancementStage.businessModelSuggestions && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                          <h5 className="text-sm font-medium text-blue-900 mb-3">💡 AI Business Model Suggestions</h5>
                          <div className="space-y-4">
                            <div>
                              <h6 className="text-xs font-medium text-blue-700 uppercase mb-2">Recommended Models</h6>
                              <div className="flex flex-wrap gap-2">
                                {enhancementStage.businessModelSuggestions.recommended.map((model, index) => (
                                  <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                                    {BUSINESS_MODEL_OPTIONS.find(m => m.value === model)?.label || model}
                                  </span>
                                ))}
                              </div>
                            </div>
                            
                            {enhancementStage.businessModelSuggestions.alternatives && enhancementStage.businessModelSuggestions.alternatives.length > 0 && (
                              <div>
                                <h6 className="text-xs font-medium text-blue-700 uppercase mb-2">Alternative Models</h6>
                                <div className="flex flex-wrap gap-2">
                                  {enhancementStage.businessModelSuggestions.alternatives.map((model, index) => (
                                    <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                                      {BUSINESS_MODEL_OPTIONS.find(m => m.value === model)?.label || model}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <div>
                              <h6 className="text-xs font-medium text-blue-700 uppercase mb-2">Reasoning</h6>
                              <p className="text-sm text-blue-800">{enhancementStage.businessModelSuggestions.reasoning}</p>
                            </div>
                            
                            {enhancementStage.businessModelSuggestions.revenueProjections && (
                              <div>
                                <h6 className="text-xs font-medium text-blue-700 uppercase mb-2">Revenue Projections</h6>
                                <p className="text-sm text-blue-800">{enhancementStage.businessModelSuggestions.revenueProjections}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Legacy suggestions for optimized stage */}
                      {enhancementStage.stage === 'optimized' && enhancementStage.suggestions.length > 0 && (
                        <div className="mb-4">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">AI Suggestions:</h5>
                          <ul className="space-y-1">
                            {enhancementStage.suggestions.map((suggestion, index) => (
                              <li key={index} className="text-sm text-gray-600 flex items-start">
                                <span className="text-blue-500 mr-2">•</span>
                                {suggestion}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}


                      {enhancementStage.riskAssessment && (
                        <div className="bg-white p-3 rounded">
                          <h6 className="text-xs font-medium text-gray-500 uppercase mb-2">Risk Assessment</h6>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-red-600">Technical Risks:</span>
                              <ul className="mt-1 space-y-1">
                                {enhancementStage.riskAssessment.technicalRisks.map((risk, index) => (
                                  <li key={index} className="text-gray-600">• {risk}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <span className="font-medium text-orange-600">Market Risks:</span>
                              <ul className="mt-1 space-y-1">
                                {enhancementStage.riskAssessment.marketRisks.map((risk, index) => (
                                  <li key={index} className="text-gray-600">• {risk}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Validation Feedback */}
                  {validationFeedback && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">Market Validation Insights</h4>
                      <div className="text-sm text-blue-800">
                        {validationFeedback.insights && (
                          <ul className="space-y-1">
                            {validationFeedback.insights.map((insight: string, index: number) => (
                              <li key={index}>• {insight}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-6 border-t border-gray-200">
            <button
              onClick={step > 1 ? () => setStep(step - 1) : onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {step > 1 ? 'Back' : 'Cancel'}
            </button>
            
            {step < 3 ? (
              <button
                onClick={handleNext}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={isCreating}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating Project...' : 'Create Startup Project'}
              </button>
            )}
          </div>

          {/* Error Display */}
          {errors.general && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}