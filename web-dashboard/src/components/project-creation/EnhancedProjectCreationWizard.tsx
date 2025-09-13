import React, { useState } from 'react';
import { ProjectListItem } from './types';
import { ProjectAnalysisStep } from './ProjectAnalysisStep';
import { TemplateSelectionStep } from './TemplateSelectionStep';
import { ProjectProfileStep } from './ProjectProfileStep';
import { TechnologyStackStep } from './TechnologyStackStep';
import { RegulatoryComplianceStep } from './RegulatoryComplianceStep';

interface EnhancedProjectCreationWizardProps {
  onClose: () => void;
  onProjectCreated: (project: ProjectListItem) => void;
}

export function EnhancedProjectCreationWizard({ onClose, onProjectCreated }: EnhancedProjectCreationWizardProps) {
  const [step, setStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [creationStage, setCreationStage] = useState<string>('');
  const [failedStep, setFailedStep] = useState<string | null>(null);
  const [retryStep, setRetryStep] = useState<string | null>(null);
  const [createdProject, setCreatedProject] = useState<any>(null);
  
  // Store data from each step
  const [wizardData, setWizardData] = useState({
    analysis: null,
    template: null,
    profile: null,
    technologyStack: null,
    regulatoryCompliance: null
  });

  const handleStepNext = (stepData: any) => {
    setErrors({});
    
    if (step === 1) {
      // Analysis step
      setWizardData(prev => ({ ...prev, analysis: stepData }));
      setStep(2);
    } else if (step === 2) {
      // Template step
      setWizardData(prev => ({ ...prev, template: stepData }));
      setStep(3);
    } else if (step === 3) {
      // Profile step
      setWizardData(prev => ({ ...prev, profile: stepData }));
      setStep(4);
    } else if (step === 4) {
      // Technology Stack step
      setWizardData(prev => ({ ...prev, technologyStack: stepData }));
      setStep(5);
    } else if (step === 5) {
      // Regulatory Compliance step - create project
      setWizardData(prev => ({ ...prev, regulatoryCompliance: stepData }));
      handleCreateProject(stepData);
    }
  };

  const handleStepPrevious = () => {
    setErrors({});
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleRetryStep = async (stepToRetry: string) => {
    setRetryStep(stepToRetry);
    setErrors({});
    setFailedStep(null);
    
    try {
      if (stepToRetry === 'specs' && createdProject) {
        setCreationStage('Retrying enhanced specifications generation...');
        
        const profileData = wizardData.profile;
        const specsResponse = await fetch(`/api/projects/${createdProject.id}/generate-enhanced-specs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enhancementData: wizardData.analysis,
            projectProfile: {
              name: profileData.name,
              industry: profileData.industry,
              businessModel: Array.isArray(profileData.businessModel) 
                ? profileData.businessModel.join(', ') 
                : profileData.businessModel,
              targetMarket: wizardData.analysis?.targetSegments?.primary || 'General market',
              problemStatement: wizardData.analysis?.description || profileData.name
            }
          })
        });

        if (!specsResponse.ok) {
          const errorData = await specsResponse.json().catch(() => ({ error: 'Unknown error occurred' }));
          throw new Error(errorData.error || `HTTP ${specsResponse.status}: Failed to generate enhanced specifications`);
        }

        setCreationStage('Saving specifications to database...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setCreationStage('Generating embeddings for search...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setCreationStage('Project setup complete!');
        console.log('✅ Enhanced specifications generated successfully on retry');
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        onProjectCreated(createdProject);
      }
    } catch (error) {
      console.error('Retry failed:', error);
      setFailedStep(stepToRetry);
      setErrors({ 
        [stepToRetry]: error instanceof Error ? error.message : `Failed to retry ${stepToRetry} step` 
      });
    } finally {
      setRetryStep(null);
      setCreationStage('');
    }
  };

  const handleCreateProject = async (profileData: any) => {
    try {
      setIsCreating(true);
      setErrors({});
      setCreationStage('Creating project...');

      // Create project with all collected data
      const projectData = {
        name: profileData.name,
        description: wizardData.analysis?.description || '',
        industry: wizardData.template?.industry || profileData.industry,
        customIndustry: wizardData.template?.customIndustry || profileData.customIndustry,
        businessModel: profileData.businessModel,
        isPublic: profileData.isPublic,
        template: wizardData.template?.selectedTemplate || 'standard',
        customTemplate: wizardData.template?.customTemplate,
        technologyStack: wizardData.technologyStack?.technologyStack || [],
        regulatoryCompliance: wizardData.regulatoryCompliance?.regulatoryCompliance || [],
        // Include analysis data for enhanced project creation
        analysisData: wizardData.analysis
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
      setCreatedProject(newProject);
      setCreationStage('Project created successfully!');

      // Generate enhanced specifications if analysis data is available
      if (wizardData.analysis?.enhancementStage) {
        try {
          setCreationStage('Generating enhanced specifications...');
          
          const specsResponse = await fetch(`/api/projects/${newProject.id}/generate-enhanced-specs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              enhancementData: wizardData.analysis,
              projectProfile: {
                name: profileData.name,
                industry: profileData.industry,
                businessModel: Array.isArray(profileData.businessModel) 
                  ? profileData.businessModel.join(', ') 
                  : profileData.businessModel,
                targetMarket: wizardData.analysis?.targetSegments?.primary || 'General market',
                problemStatement: wizardData.analysis?.description || profileData.name
              }
            })
          });

          if (!specsResponse.ok) {
            const errorData = await specsResponse.json().catch(() => ({ error: 'Unknown error occurred' }));
            throw new Error(errorData.error || `HTTP ${specsResponse.status}: Failed to generate enhanced specifications`);
          }

          setCreationStage('Saving specifications to database...');
          
          // Wait a moment to show the saving stage
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          setCreationStage('Generating embeddings for search...');
          
          // Wait a moment to show the vectorizing stage
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          setCreationStage('Project setup complete!');
          
          console.log('✅ Enhanced specifications generated successfully');
          
          // Wait a moment to show completion before redirecting
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Only redirect to project if everything succeeded
          onProjectCreated(newProject);
          
        } catch (specsError) {
          console.error('Failed to generate enhanced specifications:', specsError);
          setFailedStep('specs');
          setErrors({ 
            specs: `Enhanced specifications generation failed: ${specsError.message || specsError}. Please retry this step.` 
          });
          // Don't delete the project - let user choose to retry or continue
        }
      } else {
        setCreationStage('Project setup complete!');
        
        // Wait a moment to show completion before redirecting
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Only redirect to project if everything succeeded
        onProjectCreated(newProject);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      setErrors({ general: error instanceof Error ? error.message : 'Failed to create project' });
    } finally {
      setIsCreating(false);
      setCreationStage('');
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return 'AI-Powered Project Analysis';
      case 2:
        return 'Smart Template Selection';
      case 3:
        return 'Project Profile & Finalization';
      default:
        return 'Create New Startup Project';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 1:
        return 'Describe your startup idea and let AI analyze it comprehensively';
      case 2:
        return 'Choose the most suitable template based on AI analysis';
      case 3:
        return 'Review and finalize your project details';
      default:
        return 'Enhanced AI-Assisted Creation';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{getStepTitle()}</h2>
            <p className="text-sm text-gray-500 mt-1">Step {step} of 3 - {getStepDescription()}</p>
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
            {[1, 2, 3, 4, 5].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  stepNumber <= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {stepNumber}
                </div>
                {stepNumber < 5 && (
                  <div className={`w-12 h-1 mx-2 ${stepNumber < step ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {step === 1 && "Describe your startup idea and get comprehensive AI analysis"}
            {step === 2 && "Choose the most suitable template based on AI insights"}
            {step === 3 && "Review and finalize your project with AI-suggested details"}
            {step === 4 && "Select the technology stack for your project"}
            {step === 5 && "Choose applicable regulatory compliance requirements"}
          </div>
        </div>

        {/* Creation Progress */}
        {isCreating && creationStage && (
          <div className={`px-6 py-4 border-t ${
            creationStage.includes('complete') || creationStage.includes('success') 
              ? 'bg-green-50 border-green-200' 
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center space-x-3">
              {creationStage.includes('complete') || creationStage.includes('success') ? (
                <div className="rounded-full h-5 w-5 bg-green-600 flex items-center justify-center">
                  <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              )}
              <div className={`text-sm font-medium ${
                creationStage.includes('complete') || creationStage.includes('success')
                  ? 'text-green-800'
                  : 'text-blue-800'
              }`}>
                {creationStage}
              </div>
            </div>
            <div className={`mt-2 text-xs ${
              creationStage.includes('complete') || creationStage.includes('success')
                ? 'text-green-600'
                : 'text-blue-600'
            }`}>
              {creationStage.includes('complete') || creationStage.includes('success')
                ? 'Redirecting to your project...'
                : 'Please wait while we set up your project...'
              }
            </div>
          </div>
        )}

        {/* Failed Step Retry UI */}
        {failedStep && !isCreating && (
          <div className="px-6 py-4 border-t bg-red-50 border-red-200">
            <div className="flex items-start space-x-3">
              <div className="rounded-full h-5 w-5 bg-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-red-800">
                  {failedStep === 'specs' ? 'Enhanced Specifications Generation Failed' : 'Step Failed'}
                </div>
                <div className="text-sm text-red-600 mt-1">
                  {errors[failedStep]}
                </div>
                <div className="flex space-x-3 mt-3">
                  <button
                    onClick={() => handleRetryStep(failedStep)}
                    disabled={retryStep === failedStep}
                    className="px-3 py-1 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {retryStep === failedStep ? 'Retrying...' : 'Retry Step'}
                  </button>
                  <button
                    onClick={() => {
                      setFailedStep(null);
                      setErrors({});
                      setCreatedProject(null);
                    }}
                    className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Start Over
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <ProjectAnalysisStep
              onNext={handleStepNext}
              onPrevious={handleStepPrevious}
              data={wizardData.analysis}
              errors={errors}
              isLoading={isCreating}
            />
          )}
          
          {step === 2 && (
            <TemplateSelectionStep
              onNext={handleStepNext}
              onPrevious={handleStepPrevious}
              data={wizardData}
              errors={errors}
              isLoading={isCreating}
            />
          )}
          
          {step === 3 && (
            <ProjectProfileStep
              onNext={handleStepNext}
              onPrevious={handleStepPrevious}
              data={wizardData}
              errors={errors}
              isLoading={isCreating}
            />
          )}
          
          {step === 4 && (
            <TechnologyStackStep
              onNext={handleStepNext}
              onPrevious={handleStepPrevious}
              data={wizardData.technologyStack}
              errors={errors}
              isLoading={isCreating}
            />
          )}
          
          {step === 5 && (
            <RegulatoryComplianceStep
              onNext={handleStepNext}
              onPrevious={handleStepPrevious}
              data={wizardData.regulatoryCompliance}
              errors={errors}
              isLoading={isCreating}
            />
          )}
        </div>

        {/* Error Display */}
        {errors.general && (
          <div className="px-6 pb-4">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{errors.general}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

