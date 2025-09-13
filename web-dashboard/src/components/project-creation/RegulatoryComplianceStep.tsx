import React, { useState, useEffect } from 'react';
import { WizardStepProps } from './types';

const REGULATORY_OPTIONS = [
  {
    id: 'gdpr',
    label: 'GDPR (General Data Protection Regulation)',
    description: 'EU data protection and privacy regulation',
    requirements: ['Data minimization', 'Consent management', 'Right to be forgotten', 'Data portability']
  },
  {
    id: 'ccpa',
    label: 'CCPA (California Consumer Privacy Act)',
    description: 'California state privacy law',
    requirements: ['Consumer rights', 'Data disclosure', 'Opt-out mechanisms', 'Privacy notices']
  },
  {
    id: 'hipaa',
    label: 'HIPAA (Health Insurance Portability and Accountability Act)',
    description: 'US healthcare data protection',
    requirements: ['Administrative safeguards', 'Physical safeguards', 'Technical safeguards', 'Business associate agreements']
  },
  {
    id: 'sox',
    label: 'SOX (Sarbanes-Oxley Act)',
    description: 'US financial reporting and corporate governance',
    requirements: ['Internal controls', 'Audit trails', 'Financial reporting', 'Executive accountability']
  },
  {
    id: 'pci-dss',
    label: 'PCI DSS (Payment Card Industry Data Security Standard)',
    description: 'Credit card data security standards',
    requirements: ['Secure networks', 'Cardholder data protection', 'Vulnerability management', 'Access control']
  },
  {
    id: 'iso27001',
    label: 'ISO 27001',
    description: 'International information security management',
    requirements: ['Information security policies', 'Risk assessment', 'Security controls', 'Continuous improvement']
  },
  {
    id: 'fintech',
    label: 'Fintech Regulations',
    description: 'Financial technology compliance requirements',
    requirements: ['Anti-money laundering', 'Know your customer', 'Financial reporting', 'Consumer protection']
  },
  {
    id: 'healthcare',
    label: 'Healthcare Regulations',
    description: 'Medical device and healthcare software compliance',
    requirements: ['FDA approval', 'Medical device classification', 'Quality management', 'Clinical validation']
  },
  {
    id: 'education',
    label: 'Education (FERPA/COPPA)',
    description: 'Educational data and children\'s privacy protection',
    requirements: ['Student privacy', 'Parental consent', 'Data security', 'Access controls']
  },
  {
    id: 'transportation',
    label: 'Transportation Regulations',
    description: 'Transportation and mobility compliance',
    requirements: ['Safety standards', 'Driver licensing', 'Vehicle regulations', 'Insurance requirements']
  },
  {
    id: 'energy',
    label: 'Energy Regulations',
    description: 'Energy sector compliance requirements',
    requirements: ['Grid compliance', 'Renewable energy standards', 'Environmental regulations', 'Safety protocols']
  },
  {
    id: 'telecommunications',
    label: 'Telecommunications',
    description: 'Telecom and communication regulations',
    requirements: ['Spectrum licensing', 'Network security', 'Data retention', 'Emergency services']
  }
];

export function RegulatoryComplianceStep({ onNext, onPrevious, data, errors, isLoading }: WizardStepProps) {
  const [selectedRegulations, setSelectedRegulations] = useState<string[]>(data?.regulatoryCompliance || []);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const handleRegulationToggle = (regId: string) => {
    setSelectedRegulations(prev => {
      if (prev.includes(regId)) {
        return prev.filter(id => id !== regId);
      } else {
        return [...prev, regId];
      }
    });
  };

  const handleNext = () => {
    const newErrors: Record<string, string> = {};
    
    // Regulatory compliance is optional, so no validation required
    // But we'll still allow users to proceed even if they select none
    
    setLocalErrors(newErrors);
    onNext({ regulatoryCompliance: selectedRegulations });
  };

  const allErrors = { ...errors, ...localErrors };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Regulatory Compliance
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Select the regulatory frameworks that may apply to your project. This helps ensure compliance
          and provides guidance for legal requirements. You can select multiple regulations or none if not applicable.
        </p>
      </div>

      {/* Regulatory Options */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Applicable Regulations
        </label>
        <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
          {REGULATORY_OPTIONS.map((option) => (
            <div
              key={option.id}
              onClick={() => handleRegulationToggle(option.id)}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                selectedRegulations.includes(option.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start">
                <input
                  type="checkbox"
                  checked={selectedRegulations.includes(option.id)}
                  onChange={() => {}} // Handled by onClick
                  className="mr-3 mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">{option.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {option.requirements.map((req, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        {req}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {allErrors.regulatoryCompliance && (
          <p className="mt-2 text-sm text-red-600">{allErrors.regulatoryCompliance}</p>
        )}
      </div>

      {/* Selected Regulations Summary */}
      {selectedRegulations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Selected Regulations</h4>
          <div className="flex flex-wrap gap-2">
            {selectedRegulations.map((regId) => {
              const option = REGULATORY_OPTIONS.find(opt => opt.id === regId);
              return (
                <span key={regId} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                  {option?.label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* No Regulations Selected */}
      {selectedRegulations.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">
                No regulations selected. You can proceed without selecting any regulations if they don't apply to your project.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onPrevious}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Previous: Technology Stack
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

