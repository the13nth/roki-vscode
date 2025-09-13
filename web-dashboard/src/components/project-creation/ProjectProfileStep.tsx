import React, { useState, useEffect } from 'react';
import { WizardStepProps, ProjectProfile, AnalysisData, TemplateData } from './types';
import { INDUSTRY_OPTIONS, BUSINESS_MODEL_OPTIONS } from './constants';

export function ProjectProfileStep({ onNext, onPrevious, data, errors, isLoading }: WizardStepProps) {
  const analysisData = data.analysis as AnalysisData;
  const templateData = data.template as TemplateData;
  
  const [projectProfile, setProjectProfile] = useState<ProjectProfile>({
    name: data?.name || '',
    industry: templateData?.industry || 'other',
    customIndustry: templateData?.customIndustry || '',
    businessModel: data?.businessModel || [],
    isPublic: data?.isPublic || false
  });
  
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  // Generate project name from analysis
  useEffect(() => {
    if (!projectProfile.name && analysisData?.enhancementStage?.content) {
      // Simple name generation - in a real app, you might want to use AI for this
      const content = analysisData.enhancementStage.content;
      const words = content.split(' ').slice(0, 3);
      const generatedName = words.map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ').replace(/[^a-zA-Z0-9\s]/g, '');
      
      if (generatedName.length > 0) {
        setProjectProfile(prev => ({ ...prev, name: generatedName }));
      }
    }
  }, [analysisData, projectProfile.name]);

  // Set suggested industry and business model from analysis
  useEffect(() => {
    if (analysisData?.businessModelSuggestions?.recommended || analysisData?.inferredIndustry) {
      setProjectProfile(prev => ({
        ...prev,
        industry: templateData?.industry || analysisData?.inferredIndustry || 'other',
        businessModel: analysisData.businessModelSuggestions?.recommended || prev.businessModel
      }));
    }
  }, [analysisData, templateData]);

  const handleBusinessModelChange = (model: string) => {
    setProjectProfile(prev => {
      if (prev.businessModel.includes(model)) {
        return {
          ...prev,
          businessModel: prev.businessModel.filter(m => m !== model)
        };
      } else {
        return {
          ...prev,
          businessModel: [...prev.businessModel, model]
        };
      }
    });
  };

  const handleNext = () => {
    const newErrors: Record<string, string> = {};
    
    if (!projectProfile.name.trim()) {
      newErrors.name = 'Project name is required';
    }
    
    
    if (projectProfile.businessModel.length === 0) {
      newErrors.businessModel = 'At least one business model must be selected';
    }

    if (Object.keys(newErrors).length > 0) {
      setLocalErrors(newErrors);
      return;
    }

    onNext(projectProfile);
  };

  const allErrors = { ...errors, ...localErrors };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Project Profile & Finalization
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Review and finalize your project details. The AI has suggested values based on your analysis, but you can modify them as needed.
        </p>
      </div>

      {/* AI Suggestions Summary */}
      {analysisData && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-medium text-green-900 mb-3">🤖 AI Suggestions</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-green-800">Generated Name:</span>
              <p className="text-green-700">{projectProfile.name || 'Generating...'}</p>
            </div>
            <div>
              <span className="font-medium text-green-800">Suggested Industry:</span>
              <p className="text-green-700">{templateData?.industry || 'Other'}</p>
            </div>
            <div>
              <span className="font-medium text-green-800">Recommended Business Models:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {(analysisData.businessModelSuggestions?.recommended || []).map((model: any, index: number) => (
                  <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                    {model}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Project Name *
        </label>
        <input
          type="text"
          value={projectProfile.name}
          onChange={(e) => setProjectProfile(prev => ({ ...prev, name: e.target.value }))}
          className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            allErrors.name ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Enter your project name"
        />
        {allErrors.name && <p className="mt-1 text-sm text-red-600">{allErrors.name}</p>}
      </div>

      {/* Industry Display (Read-only) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Selected Industry
        </label>
        <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
          <div className="flex items-center">
            <span className="text-lg mr-2">
              {INDUSTRY_OPTIONS.find(opt => opt.value === projectProfile.industry)?.icon || '🏢'}
            </span>
            <div>
              <div className="font-medium text-sm">
                {INDUSTRY_OPTIONS.find(opt => opt.value === projectProfile.industry)?.label || 'Other'}
              </div>
              {projectProfile.customIndustry && (
                <div className="text-xs text-gray-500 mt-1">{projectProfile.customIndustry}</div>
              )}
            </div>
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-500">Industry was selected in the previous step</p>
      </div>

      {/* Business Model Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Business Model(s) *
        </label>
        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
          {BUSINESS_MODEL_OPTIONS.map((model) => (
            <div
              key={model.value}
              onClick={() => handleBusinessModelChange(model.value)}
              className={`p-3 border rounded-lg cursor-pointer transition-all ${
                projectProfile.businessModel.includes(model.value)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={projectProfile.businessModel.includes(model.value)}
                  onChange={() => {}} // Handled by onClick
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div>
                  <div className="font-medium text-sm">{model.label}</div>
                  <div className="text-xs text-gray-500">{model.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {allErrors.businessModel && <p className="mt-1 text-sm text-red-600">{allErrors.businessModel}</p>}
        
        {/* Selected Business Models Summary */}
        {projectProfile.businessModel.length > 0 && (
          <div className="mt-3">
            <div className="text-sm font-medium text-gray-700 mb-2">Selected Models:</div>
            <div className="flex flex-wrap gap-2">
              {projectProfile.businessModel.map((model) => (
                <span key={model} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                  {BUSINESS_MODEL_OPTIONS.find(m => m.value === model)?.label || model}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Public/Private Setting */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Project Visibility
        </label>
        <div className="space-y-2">
          <div
            onClick={() => setProjectProfile(prev => ({ ...prev, isPublic: false }))}
            className={`p-3 border rounded-lg cursor-pointer transition-all ${
              !projectProfile.isPublic
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <input
                type="radio"
                checked={!projectProfile.isPublic}
                onChange={() => {}} // Handled by onClick
                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div>
                <div className="font-medium text-sm">Private</div>
                <div className="text-xs text-gray-500">Only you and your team can see this project</div>
              </div>
            </div>
          </div>
          
          <div
            onClick={() => setProjectProfile(prev => ({ ...prev, isPublic: true }))}
            className={`p-3 border rounded-lg cursor-pointer transition-all ${
              projectProfile.isPublic
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <input
                type="radio"
                checked={projectProfile.isPublic}
                onChange={() => {}} // Handled by onClick
                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div>
                <div className="font-medium text-sm">Public</div>
                <div className="text-xs text-gray-500">Anyone can discover and view this project</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onPrevious}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Previous: Template Selection
        </button>
        
        <button
          onClick={handleNext}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating Project...' : 'Create Project →'}
        </button>
      </div>
    </div>
  );
}

