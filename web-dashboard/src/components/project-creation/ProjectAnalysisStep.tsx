import React, { useState } from 'react';
import { WizardStepProps, AnalysisData, EnhancementStage } from './types';
import { AnalysisResults } from './AnalysisResults';

export function ProjectAnalysisStep({ onNext, data, errors, isLoading }: WizardStepProps) {
  const [description, setDescription] = useState(data?.description || '');
  const [optimizationInput, setOptimizationInput] = useState(data?.optimizationInput || '');
  const [enhancementStage, setEnhancementStage] = useState<EnhancementStage | null>(data?.enhancementStage || null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showOptimization, setShowOptimization] = useState(false);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [currentAnalysisStage, setCurrentAnalysisStage] = useState<string>('');
  const [failedAnalysisSteps, setFailedAnalysisSteps] = useState<string[]>([]);

  // Function to infer industry from project description
  const inferIndustryFromDescription = (desc: string): string => {
    const lowerDesc = desc.toLowerCase();
    
    // Define industry keywords
    const industryKeywords = {
      'fintech': ['finance', 'banking', 'payment', 'fintech', 'cryptocurrency', 'blockchain', 'trading', 'investment', 'lending', 'insurance'],
      'healthtech': ['health', 'medical', 'healthcare', 'telemedicine', 'patient', 'doctor', 'hospital', 'clinic', 'diagnosis', 'treatment'],
      'edtech': ['education', 'learning', 'school', 'university', 'student', 'teacher', 'course', 'training', 'skill', 'academic'],
      'ecommerce': ['ecommerce', 'e-commerce', 'online store', 'retail', 'shopping', 'marketplace', 'product', 'inventory', 'sales'],
      'saas': ['software', 'saas', 'platform', 'application', 'tool', 'service', 'subscription', 'cloud', 'enterprise'],
      'logistics': ['logistics', 'shipping', 'delivery', 'transportation', 'supply chain', 'warehouse', 'freight', 'cargo'],
      'ev': ['electric vehicle', 'ev', 'electric car', 'battery', 'charging', 'emobility', 'e-mobility', 'sustainable transport', '3wev', 'three-wheeled', 'electric tricycle'],
      'mobility': ['mobility', 'transportation', 'ride', 'taxi', 'uber', 'lyft', 'commute', 'public transport', 'vehicle sharing', 'fractional ownership', 'cooperative', 'driver', 'passenger', 'rwanda'],
      'gaming': ['game', 'gaming', 'player', 'entertainment', 'esports', 'virtual', 'arcade', 'console'],
      'social': ['social', 'community', 'network', 'chat', 'messaging', 'social media', 'connection', 'friends'],
      'ai-ml': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'neural', 'algorithm', 'automation', 'intelligent'],
      'iot': ['iot', 'internet of things', 'sensor', 'connected device', 'smart device', 'automation', 'monitoring']
    };

    // Count keyword matches for each industry
    const industryScores: Record<string, number> = {};
    
    for (const [industry, keywords] of Object.entries(industryKeywords)) {
      industryScores[industry] = keywords.reduce((score, keyword) => {
        return score + (lowerDesc.includes(keyword) ? 1 : 0);
      }, 0);
    }

    // Find the industry with the highest score
    const bestMatch = Object.entries(industryScores).reduce((best, [industry, score]) => {
      return score > best.score ? { industry, score } : best;
    }, { industry: 'other', score: 0 });

    return bestMatch.score > 0 ? bestMatch.industry : 'other';
  };

  // Define analysis stages
  const analysisStages = [
    { id: 'basic', name: 'Basic Enhancement', description: 'Problem statement, target market, value proposition' },
    { id: 'detailed', name: 'Detailed Analysis', description: 'Market analysis, technical assessment, business model' },
    { id: 'validation', name: 'Validation', description: 'Problem-solution fit, market validation, execution feasibility' }
  ];

  const handleCompleteAnalysis = async () => {
    if (!description.trim()) {
      setLocalErrors({ description: 'Project description is required' });
      return;
    }
    
    try {
      setIsEnhancing(true);
      setLocalErrors({});
      
      // Infer industry from description
      const inferredIndustry = inferIndustryFromDescription(description);
      console.log('🔍 Inferred industry from description:', inferredIndustry);
      
      let basicResult = null;
      let detailedResult = null;
      let validationResult = null;
      
      // Phase 1: Basic Enhancement
      setCurrentAnalysisStage('Phase 1: Basic Enhancement - Analyzing problem statement and target market...');
      const basicResponse = await fetch('/api/enhance-description-progressive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'basic',
          description: description,
          projectProfile: {
            name: 'Temporary',
            industry: inferredIndustry,
            businessModel: ['unknown']
          },
          template: 'standard',
          customTemplate: ''
        })
      });

      if (!basicResponse.ok) {
        const errorData = await basicResponse.json();
        setLocalErrors({ description: errorData.error || 'Failed to run basic enhancement' });
        return;
      }

      basicResult = await basicResponse.json();
      
      // Phase 2: Detailed Analysis
      setCurrentAnalysisStage('Phase 2: Detailed Analysis - Processing market and technical insights...');
      try {
        const detailedResponse = await fetch('/api/enhance-description-progressive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stage: 'detailed',
            description: basicResult.enhancedDescription || description,
            projectProfile: {
              name: 'Temporary',
              industry: inferredIndustry,
              businessModel: ['unknown']
            },
            template: 'standard',
            customTemplate: '',
            previousResults: basicResult
          })
        });

        if (detailedResponse.ok) {
          detailedResult = await detailedResponse.json();
        } else {
          console.warn('Detailed analysis failed, continuing with basic results only');
          detailedResult = null;
          setFailedAnalysisSteps(prev => [...prev, 'detailed']);
        }
      } catch (error) {
        console.warn('Detailed analysis failed with error:', error);
        detailedResult = null;
        setFailedAnalysisSteps(prev => [...prev, 'detailed']);
      }
      
      // Phase 3: Validation
      setCurrentAnalysisStage('Phase 3: Validation - Assessing market fit and execution feasibility...');
      try {
        const validationResponse = await fetch('/api/enhance-description-progressive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stage: 'validation',
            description: detailedResult?.enhancedDescription || basicResult.enhancedDescription || description,
            projectProfile: {
              name: 'Temporary',
              industry: inferredIndustry,
              businessModel: ['unknown']
            },
            template: 'standard',
            customTemplate: '',
            previousResults: { basic: basicResult, detailed: detailedResult }
          })
        });

        if (validationResponse.ok) {
          validationResult = await validationResponse.json();
        } else {
          console.warn('Validation failed, continuing with available results');
          validationResult = null;
          setFailedAnalysisSteps(prev => [...prev, 'validation']);
        }
      } catch (error) {
        console.warn('Validation failed with error:', error);
        validationResult = null;
        setFailedAnalysisSteps(prev => [...prev, 'validation']);
      }
      
      // Debug logging for business model suggestions
      console.log('Analysis Step - Basic Result Business Model Suggestions:', basicResult?.businessModelSuggestions);
      console.log('Analysis Step - Detailed Result Business Model Suggestions:', detailedResult?.businessModelSuggestions);
      console.log('Analysis Step - Validation Result Business Model Suggestions:', validationResult?.businessModelSuggestions);
      
      // Combine all results
      const comprehensiveResult = {
        basicEnhancement: basicResult,
        detailedAnalysis: detailedResult,
        validation: validationResult,
        // Include business model suggestions from any stage that has them
        businessModelSuggestions: basicResult?.businessModelSuggestions || 
                                 detailedResult?.businessModelSuggestions || 
                                 validationResult?.businessModelSuggestions
      };
      
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
      
      // Calculate weights based on available results
      let totalWeight = 0;
      let weightedScore = 0;
      
      if (basicScore > 0) {
        weightedScore += basicScore * 0.2;
        totalWeight += 0.2;
      }
      if (detailedScore > 0) {
        weightedScore += detailedScore * 0.3;
        totalWeight += 0.3;
      }
      if (validationScore > 0) {
        weightedScore += validationScore * 0.5;
        totalWeight += 0.5;
      }
      
      const overallScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : basicScore;

      // Show completion message based on what succeeded
      let completionMessage = 'Analysis complete! Processing results...';
      if (!detailedResult && !validationResult) {
        completionMessage = 'Basic analysis complete! Some advanced features may be limited.';
      } else if (!detailedResult || !validationResult) {
        completionMessage = 'Analysis mostly complete! Some sections may be limited.';
      }
      
      setCurrentAnalysisStage(completionMessage);
      
      // Show completion for a moment before hiding the progress
      setTimeout(() => {
        setCurrentAnalysisStage('');
      }, 2000);
      
      // Debug logging
      console.log('Analysis Step - Comprehensive Result:', comprehensiveResult);
      console.log('Analysis Step - Business Model Suggestions:', comprehensiveResult.businessModelSuggestions);
      
      // Ensure business model suggestions are always present
      if (!comprehensiveResult.businessModelSuggestions) {
        console.log('Analysis Step - No business model suggestions found, adding fallback');
        comprehensiveResult.businessModelSuggestions = {
          recommended: ['b2b-saas', 'marketplace'],
          alternatives: ['consulting', 'transaction'],
          reasoning: 'Based on the project analysis, these business models are most suitable for sustainable revenue generation.',
          revenueProjections: 'Expected revenue streams from subscription fees, transaction commissions, and service partnerships'
        };
      }
      
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

      setShowOptimization(true);
      
    } catch (error) {
      console.error('Failed to complete analysis:', error);
      setLocalErrors({ description: 'Failed to complete analysis. Please try again.' });
    } finally {
      setIsEnhancing(false);
      setCurrentAnalysisStage('');
    }
  };

  const handleOptimize = async () => {
    if (!enhancementStage) return;
    
    try {
      setIsEnhancing(true);
      setLocalErrors({});
      
      // Run optimization on the validated description
      const optimizedDescription = enhancementStage.validation?.enhancedDescription || enhancementStage.detailedAnalysis?.enhancedDescription || enhancementStage.basicEnhancement?.enhancedDescription || description;
      
      const optimizedResponse = await fetch('/api/enhance-description-progressive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'optimized',
          description: optimizedDescription,
          projectProfile: {
            name: 'Temporary',
            industry: 'other',
            businessModel: ['unknown']
          },
          template: 'standard',
          customTemplate: optimizationInput
        })
      });

      if (optimizedResponse.ok) {
        const optimizedResult = await optimizedResponse.json();
        
        // Update with optimized results
        setEnhancementStage({
          ...enhancementStage,
          stage: 'complete',
          content: optimizedResult.enhancedDescription,
          suggestions: optimizedResult.suggestions || enhancementStage.suggestions,
          score: optimizedResult.viabilityScore || enhancementStage.score,
          marketAnalysis: optimizedResult.marketAnalysis || enhancementStage.marketAnalysis,
          riskAssessment: optimizedResult.riskAssessment || enhancementStage.riskAssessment,
          targetSegments: optimizedResult.targetSegments || enhancementStage.targetSegments,
          businessModelSuggestions: optimizedResult.businessModelSuggestions || enhancementStage.businessModelSuggestions,
          // Add optimized data
          optimizations: optimizedResult.optimizations,
          competitiveStrategy: optimizedResult.competitiveStrategy,
          executionPlan: optimizedResult.executionPlan,
          successFactors: optimizedResult.successFactors,
          optimizationSummary: optimizedResult.optimizationSummary
        });
      }
      
    } catch (error) {
      console.error('Failed to optimize:', error);
      setLocalErrors({ optimization: 'Failed to optimize. Please try again.' });
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleNext = () => {
    if (!enhancementStage) {
      setLocalErrors({ description: 'Please run the analysis first' });
      return;
    }

    // Infer industry from the original description
    const inferredIndustry = inferIndustryFromDescription(description);

    const analysisData: AnalysisData = {
      description: enhancementStage.content,
      optimizationInput,
      enhancementStage: {
        ...enhancementStage,
        inferredIndustry // Add the inferred industry to the enhancement stage
      },
      targetSegments: enhancementStage.targetSegments,
      businessModelSuggestions: enhancementStage.businessModelSuggestions,
      inferredIndustry // Also add it to the analysis data
    };
    
    // Debug logging
    console.log('Analysis Step - handleNext - Enhancement Stage:', enhancementStage);
    console.log('Analysis Step - handleNext - Business Model Suggestions:', enhancementStage.businessModelSuggestions);
    console.log('Analysis Step - handleNext - Analysis Data:', analysisData);

    onNext(analysisData);
  };

  const allErrors = { ...errors, ...localErrors };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          AI-Powered Project Analysis
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Start by describing your startup idea. Our AI will analyze it comprehensively and provide insights to help you refine and optimize your concept.
        </p>
      </div>

      {/* Description Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Project Description *
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            allErrors.description ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Describe your startup idea in detail. Include the problem you're solving, your solution approach, target users, key features, and business goals. The more detail you provide, the better the AI can help enhance your project specifications."
        />
        {allErrors.description && <p className="mt-1 text-sm text-red-600">{allErrors.description}</p>}
        
        {/* Analysis Button - Below text area */}
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={handleCompleteAnalysis}
            disabled={!description.trim() || isEnhancing}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-600 border border-transparent rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEnhancing ? 'Analyzing...' : '🚀 Run Complete Analysis'}
          </button>
        </div>
      </div>

      {/* Analysis Progress */}
      {isEnhancing && currentAnalysisStage && (
        <div className={`mt-6 border rounded-lg p-4 ${
          currentAnalysisStage.includes('complete') 
            ? 'bg-green-50 border-green-200' 
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center space-x-3 mb-4">
            {currentAnalysisStage.includes('complete') ? (
              <div className="rounded-full h-5 w-5 bg-green-600 flex items-center justify-center">
                <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            )}
            <div className={`text-sm font-medium ${
              currentAnalysisStage.includes('complete') ? 'text-green-800' : 'text-blue-800'
            }`}>
              {currentAnalysisStage}
            </div>
          </div>
          
          {/* Analysis Stages Progress */}
          <div className="space-y-3">
            {analysisStages.map((stage, index) => {
              const isCompleted = currentAnalysisStage.includes('complete') || 
                (currentAnalysisStage.includes('Phase 2') && index < 1) ||
                (currentAnalysisStage.includes('Phase 3') && index < 2);
              const isCurrent = currentAnalysisStage.includes(`Phase ${index + 1}`) && !currentAnalysisStage.includes('complete');
              
              return (
                <div key={stage.id} className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    isCompleted 
                      ? 'bg-green-600 text-white' 
                      : isCurrent 
                        ? 'bg-blue-600 text-white animate-pulse' 
                        : 'bg-gray-200 text-gray-600'
                  }`}>
                    {isCompleted ? '✓' : index + 1}
                  </div>
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${
                      isCompleted ? 'text-green-800' : isCurrent ? 'text-blue-800' : 'text-gray-600'
                    }`}>
                      {stage.name}
                    </div>
                    <div className={`text-xs ${
                      isCompleted ? 'text-green-600' : isCurrent ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {stage.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className={`mt-3 text-xs ${
            currentAnalysisStage.includes('complete') ? 'text-green-600' : 'text-blue-600'
          }`}>
            {currentAnalysisStage.includes('complete') 
              ? 'Analysis completed successfully! Results are being processed...'
              : 'Please wait while our AI analyzes your startup idea...'
            }
          </div>
        </div>
      )}

      {/* Failed Analysis Steps Retry */}
      {failedAnalysisSteps.length > 0 && !isEnhancing && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="rounded-full h-5 w-5 bg-yellow-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-yellow-800">
                Some analysis steps failed
              </div>
              <div className="text-sm text-yellow-600 mt-1">
                The following steps failed but the analysis continued: {failedAnalysisSteps.join(', ')}. 
                You can retry the analysis to get complete results.
              </div>
              <div className="mt-3">
                <button
                  onClick={() => {
                    setFailedAnalysisSteps([]);
                    handleCompleteAnalysis();
                  }}
                  className="px-3 py-1 text-sm font-medium text-white bg-yellow-600 border border-transparent rounded-md hover:bg-yellow-700"
                >
                  Retry Analysis
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {enhancementStage && (
        <AnalysisResults enhancementStage={enhancementStage} />
      )}

      {/* Optimization Input */}
      {showOptimization && enhancementStage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-3">⚡ Optimization</h4>
          <p className="text-sm text-blue-800 mb-3">
            Based on the analysis above, you can now provide additional input to optimize your project description. 
            Mention any specific requirements, constraints, or areas you'd like the AI to focus on.
          </p>
          <textarea
            value={optimizationInput}
            onChange={(e) => setOptimizationInput(e.target.value)}
            rows={3}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
              allErrors.optimization ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Optional: Add specific requirements, constraints, or areas to focus on for optimization..."
          />
          {allErrors.optimization && <p className="mt-1 text-sm text-red-600">{allErrors.optimization}</p>}
          
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={handleOptimize}
              disabled={isEnhancing}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEnhancing ? 'Optimizing...' : '⚡ Optimize Project'}
            </button>
          </div>
        </div>
      )}

      {/* Next Button */}
      {enhancementStage && (
        <div className="flex justify-end">
          <button
            onClick={handleNext}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Loading...' : 'Next: Template Selection →'}
          </button>
        </div>
      )}
    </div>
  );
}

