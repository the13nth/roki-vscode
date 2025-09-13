import React, { useState, useEffect } from 'react';
import { WizardStepProps } from './types';

const TECHNOLOGY_OPTIONS = [
  {
    id: 'web-app',
    label: 'Web Application',
    description: 'React, Vue, Angular, Next.js, etc.',
    technologies: ['React', 'Vue.js', 'Angular', 'Next.js', 'TypeScript', 'JavaScript', 'HTML/CSS']
  },
  {
    id: 'mobile-app',
    label: 'Mobile Application',
    description: 'React Native, Flutter, native iOS/Android',
    technologies: ['React Native', 'Flutter', 'Swift', 'Kotlin', 'Java', 'Dart']
  },
  {
    id: 'backend-api',
    label: 'Backend API',
    description: 'Node.js, Python, Java, .NET, etc.',
    technologies: ['Node.js', 'Python', 'Java', 'C#', 'Go', 'Rust', 'PHP', 'Ruby']
  },
  {
    id: 'database',
    label: 'Database',
    description: 'PostgreSQL, MongoDB, MySQL, etc.',
    technologies: ['PostgreSQL', 'MongoDB', 'MySQL', 'Redis', 'SQLite', 'Cassandra']
  },
  {
    id: 'cloud-infrastructure',
    label: 'Cloud Infrastructure',
    description: 'AWS, Azure, GCP, Docker, Kubernetes',
    technologies: ['AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Terraform']
  },
  {
    id: 'ai-ml',
    label: 'AI/ML',
    description: 'TensorFlow, PyTorch, OpenAI, etc.',
    technologies: ['TensorFlow', 'PyTorch', 'OpenAI', 'Hugging Face', 'Scikit-learn', 'Pandas']
  },
  {
    id: 'blockchain',
    label: 'Blockchain',
    description: 'Ethereum, Solana, Web3, etc.',
    technologies: ['Ethereum', 'Solana', 'Web3.js', 'Solidity', 'Rust', 'Go']
  },
  {
    id: 'iot',
    label: 'IoT',
    description: 'Arduino, Raspberry Pi, sensors, etc.',
    technologies: ['Arduino', 'Raspberry Pi', 'MQTT', 'LoRaWAN', 'Zigbee', 'Bluetooth']
  }
];

export function TechnologyStackStep({ onNext, onPrevious, data, errors, isLoading }: WizardStepProps) {
  const [selectedTechnologies, setSelectedTechnologies] = useState<string[]>(data?.technologyStack || []);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const handleTechnologyToggle = (techId: string) => {
    setSelectedTechnologies(prev => {
      if (prev.includes(techId)) {
        return prev.filter(id => id !== techId);
      } else {
        return [...prev, techId];
      }
    });
  };

  const handleNext = () => {
    const newErrors: Record<string, string> = {};
    
    if (selectedTechnologies.length === 0) {
      newErrors.technologyStack = 'Please select at least one technology category';
    }
    
    setLocalErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      onNext({ technologyStack: selectedTechnologies });
    }
  };

  const allErrors = { ...errors, ...localErrors };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Technology Stack Selection
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Select the technology categories that best describe your project's technical requirements.
          You can select multiple categories.
        </p>
      </div>

      {/* Technology Categories */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Technology Categories *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
          {TECHNOLOGY_OPTIONS.map((option) => (
            <div
              key={option.id}
              onClick={() => handleTechnologyToggle(option.id)}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                selectedTechnologies.includes(option.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start">
                <input
                  type="checkbox"
                  checked={selectedTechnologies.includes(option.id)}
                  onChange={() => {}} // Handled by onClick
                  className="mr-3 mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">{option.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {option.technologies.slice(0, 3).map((tech, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        {tech}
                      </span>
                    ))}
                    {option.technologies.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        +{option.technologies.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {allErrors.technologyStack && (
          <p className="mt-2 text-sm text-red-600">{allErrors.technologyStack}</p>
        )}
      </div>

      {/* Selected Technologies Summary */}
      {selectedTechnologies.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-green-900 mb-2">Selected Technologies</h4>
          <div className="flex flex-wrap gap-2">
            {selectedTechnologies.map((techId) => {
              const option = TECHNOLOGY_OPTIONS.find(opt => opt.id === techId);
              return (
                <span key={techId} className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                  {option?.label}
                </span>
              );
            })}
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
          ← Previous: Project Profile
        </button>
        
        <button
          onClick={handleNext}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing...' : 'Next: Regulatory Compliance →'}
        </button>
      </div>
    </div>
  );
}

