import React, { useState, useEffect } from 'react';
import { WizardStepProps, TemplateData, AnalysisData } from './types';
import { getIndustryTemplates, INDUSTRY_OPTIONS } from './constants';

export function TemplateSelectionStep({ onNext, onPrevious, data, errors, isLoading }: WizardStepProps) {
  const analysisData = data.analysis as AnalysisData;
  const [selectedTemplate, setSelectedTemplate] = useState(data?.selectedTemplate || '');
  const [customTemplate, setCustomTemplate] = useState(data?.customTemplate || '');
  const [selectedIndustry, setSelectedIndustry] = useState(data?.industry || '');
  const [customIndustry, setCustomIndustry] = useState(data?.customIndustry || '');
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  // Extract suggested industry and business model from analysis
  const suggestedIndustry = analysisData?.inferredIndustry || 'other';
  
  const suggestedBusinessModels = analysisData?.businessModelSuggestions?.recommended || ['unknown'];
  
  // Debug logging
  console.log('Template Selection - Analysis Data:', analysisData);
  console.log('Template Selection - Business Model Suggestions:', analysisData?.businessModelSuggestions);
  console.log('Template Selection - Suggested Business Models:', suggestedBusinessModels);
  
  // Ensure we always have business model suggestions
  if (!analysisData?.businessModelSuggestions?.recommended || analysisData.businessModelSuggestions.recommended.length === 0) {
    console.log('Template Selection - No business model suggestions, using fallback');
    // This will be handled by the fallback in the analysis step, but just in case
  }

  // Get templates based on suggested industry
  const availableTemplates = getIndustryTemplates(suggestedIndustry);

  // Auto-select the first template if none selected
  useEffect(() => {
    if (!selectedTemplate && availableTemplates.length > 0) {
      setSelectedTemplate(availableTemplates[0].id);
    }
  }, [selectedTemplate, availableTemplates]);

  // Preselect the inferred industry
  useEffect(() => {
    if (!selectedIndustry && suggestedIndustry && suggestedIndustry !== 'other') {
      setSelectedIndustry(suggestedIndustry);
    }
  }, [selectedIndustry, suggestedIndustry]);

  const handleNext = () => {
    if (!selectedTemplate) {
      setLocalErrors({ template: 'Please select a template' });
      return;
    }

    if (selectedTemplate === 'other' && !customTemplate.trim()) {
      setLocalErrors({ customTemplate: 'Please provide a custom template description' });
      return;
    }

    if (!selectedIndustry) {
      setLocalErrors({ industry: 'Please select an industry' });
      return;
    }

    if (selectedIndustry === 'other' && !customIndustry.trim()) {
      setLocalErrors({ customIndustry: 'Please provide a custom industry description' });
      return;
    }

    const templateData: TemplateData = {
      selectedTemplate,
      customTemplate: selectedTemplate === 'other' ? customTemplate : undefined,
      industry: selectedIndustry,
      customIndustry: selectedIndustry === 'other' ? customIndustry : undefined,
      businessModel: suggestedBusinessModels
    };

    onNext(templateData);
  };

  const allErrors = { ...errors, ...localErrors };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Smart Template Selection
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Based on your project analysis, we've identified the most suitable industry and business model. 
          Choose a template that best fits your project requirements.
        </p>
      </div>

      {/* AI Suggestions Summary */}
      {analysisData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-medium text-blue-900 mb-3">🤖 AI Analysis Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-800">Suggested Industry:</span>
              <p className="text-blue-700">{suggestedIndustry}</p>
            </div>
            <div>
              <span className="font-medium text-blue-800">Recommended Business Models:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {suggestedBusinessModels.map((model, index) => (
                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    {model}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {analysisData.businessModelSuggestions?.reasoning && (
            <div className="mt-3">
              <span className="font-medium text-blue-800">Reasoning:</span>
              <p className="text-blue-700 text-sm mt-1">{analysisData.businessModelSuggestions.reasoning}</p>
            </div>
          )}
        </div>
      )}

      {/* Industry Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select Industry *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
          {INDUSTRY_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedIndustry === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="industry"
                value={option.value}
                checked={selectedIndustry === option.value}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                className="sr-only"
              />
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                  selectedIndustry === option.value
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }`}>
                  {selectedIndustry === option.value && (
                    <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                  )}
                </div>
                <div>
                  <div className="font-medium text-sm">{option.label}</div>
                  {option.description && (
                    <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                  )}
                </div>
              </div>
            </label>
          ))}
        </div>
        {allErrors.industry && (
          <p className="mt-2 text-sm text-red-600">{allErrors.industry}</p>
        )}
        
        {/* Custom Industry Input */}
        {selectedIndustry === 'other' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Industry Description *
            </label>
            <input
              type="text"
              value={customIndustry}
              onChange={(e) => setCustomIndustry(e.target.value)}
              placeholder="Describe your industry..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {allErrors.customIndustry && (
              <p className="mt-2 text-sm text-red-600">{allErrors.customIndustry}</p>
            )}
          </div>
        )}
      </div>

      {/* Template Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Choose Project Template *
        </label>
        <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
          {availableTemplates.map((template) => (
            <div
              key={template.id}
              onClick={() => setSelectedTemplate(template.id)}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                selectedTemplate === template.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start">
                <span className="text-2xl mr-3">{template.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">{template.name}</h4>
                    {selectedTemplate === template.id && (
                      <span className="text-blue-600 text-sm">✓ Selected</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                  
                  <div className="mt-3">
                    <h5 className="text-xs font-medium text-gray-500 uppercase mb-2">Key Features</h5>
                    <div className="flex flex-wrap gap-1">
                      {template.features.map((feature, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <h5 className="text-xs font-medium text-gray-500 uppercase mb-2">Requirements</h5>
                    <div className="flex flex-wrap gap-1">
                      {template.requirements.map((requirement, index) => (
                        <span key={index} className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                          {requirement}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {allErrors.template && <p className="mt-2 text-sm text-red-600">{allErrors.template}</p>}
      </div>

      {/* Custom Template Input */}
      {selectedTemplate === 'other' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Template Description *
          </label>
          <textarea
            value={customTemplate}
            onChange={(e) => setCustomTemplate(e.target.value)}
            rows={4}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
              allErrors.customTemplate ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Describe your custom project template. Include the key features, technical requirements, and any specific considerations for your project..."
          />
          {allErrors.customTemplate && <p className="mt-1 text-sm text-red-600">{allErrors.customTemplate}</p>}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onPrevious}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Previous: Project Analysis
        </button>
        
        <button
          onClick={handleNext}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading...' : 'Next: Project Profile →'}
        </button>
      </div>
    </div>
  );
}

