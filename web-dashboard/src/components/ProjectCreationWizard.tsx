'use client';

import { useState } from 'react';
import { ProjectListItem, ProjectConfiguration } from '@/types';

interface ProjectCreationWizardProps {
  onClose: () => void;
  onProjectCreated: (project: ProjectListItem) => void;
}

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  features: string[];
}

const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'web-app',
    name: 'Web Application',
    description: 'Modern web application with React/Next.js',
    icon: '🌐',
    features: ['Frontend components', 'API integration', 'State management', 'Responsive design']
  },
  {
    id: 'api',
    name: 'REST API',
    description: 'RESTful API with Node.js/Express',
    icon: '🔌',
    features: ['API endpoints', 'Authentication', 'Database integration', 'Documentation']
  },
  {
    id: 'mobile',
    name: 'Mobile App',
    description: 'Cross-platform mobile application',
    icon: '📱',
    features: ['Mobile UI', 'Native features', 'Offline support', 'Push notifications']
  },
  {
    id: 'desktop',
    name: 'Desktop Application',
    description: 'Cross-platform desktop application',
    icon: '💻',
    features: ['Native UI', 'File system access', 'System integration', 'Auto-updates']
  },
  {
    id: 'library',
    name: 'Library/Package',
    description: 'Reusable library or npm package',
    icon: '📦',
    features: ['TypeScript support', 'Testing framework', 'Documentation', 'CI/CD pipeline']
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Business-focused project with regulatory considerations',
    icon: '🏢',
    features: ['Regulatory compliance', 'Business processes', 'Risk management', 'Stakeholder alignment']
  },
  {
    id: 'custom',
    name: 'Custom Project',
    description: 'Start with a blank template',
    icon: '⚡',
    features: ['Flexible structure', 'Custom requirements', 'Tailored workflow', 'Open-ended']
  }
];

const BACKEND_OPTIONS = [
  { value: 'node-express', label: 'Node.js + Express' },
  { value: 'python-django', label: 'Python + Django' },
  { value: 'python-flask', label: 'Python + Flask' },
  { value: 'java-spring', label: 'Java + Spring Boot' },
  { value: 'csharp-dotnet', label: 'C# + .NET' },
  { value: 'go-gin', label: 'Go + Gin' },
  { value: 'php-laravel', label: 'PHP + Laravel' },
  { value: 'ruby-rails', label: 'Ruby + Rails' },
  { value: 'none', label: 'No Backend' }
];

const FRONTEND_OPTIONS = [
  { value: 'react', label: 'React' },
  { value: 'nextjs', label: 'Next.js' },
  { value: 'vue', label: 'Vue.js' },
  { value: 'angular', label: 'Angular' },
  { value: 'svelte', label: 'Svelte' },
  { value: 'vanilla', label: 'Vanilla JavaScript' },
  { value: 'none', label: 'No Frontend' }
];

const UI_FRAMEWORK_OPTIONS = [
  { value: 'tailwind', label: 'Tailwind CSS' },
  { value: 'material-ui', label: 'Material-UI' },
  { value: 'chakra-ui', label: 'Chakra UI' },
  { value: 'ant-design', label: 'Ant Design' },
  { value: 'bootstrap', label: 'Bootstrap' },
  { value: 'shadcn-ui', label: 'shadcn/ui' },
  { value: 'none', label: 'No UI Framework' }
];

const AUTH_OPTIONS = [
  { value: 'jwt', label: 'JWT Tokens' },
  { value: 'oauth', label: 'OAuth 2.0' },
  { value: 'firebase-auth', label: 'Firebase Auth' },
  { value: 'auth0', label: 'Auth0' },
  { value: 'supabase-auth', label: 'Supabase Auth' },
  { value: 'none', label: 'No Authentication' }
];

const HOSTING_OPTIONS = [
  { value: 'aws', label: 'AWS' },
  { value: 'netlify', label: 'Netlify' },
  { value: 'vercel', label: 'Vercel' },
  { value: 'google-cloud', label: 'Google Cloud' },
  { value: 'azure', label: 'Microsoft Azure' },
  { value: 'heroku', label: 'Heroku' },
  { value: 'digitalocean', label: 'DigitalOcean' },
  { value: 'none', label: 'Not decided yet' }
];

const REGULATORY_STACK_OPTIONS = [
  {
    id: 'gdpr',
    name: 'GDPR Compliance',
    description: 'European data protection regulations',
    icon: '🇪🇺',
    features: ['Data privacy', 'Consent management', 'Right to erasure', 'Privacy by design']
  },
  {
    id: 'sox',
    name: 'SOX Compliance',
    description: 'Sarbanes-Oxley financial reporting',
    icon: '📊',
    features: ['Financial controls', 'Audit trails', 'Data integrity', 'Access controls']
  },
  {
    id: 'hipaa',
    name: 'HIPAA Compliance',
    description: 'Healthcare data protection',
    icon: '🏥',
    features: ['PHI protection', 'Access logging', 'Encryption', 'Risk assessments']
  },
  {
    id: 'iso27001',
    name: 'ISO 27001',
    description: 'Information security management',
    icon: '🔒',
    features: ['Security controls', 'Risk management', 'Incident response', 'Continuous monitoring']
  },
  {
    id: 'pci-dss',
    name: 'PCI DSS',
    description: 'Payment card industry standards',
    icon: '💳',
    features: ['Card data protection', 'Network security', 'Vulnerability management', 'Access control']
  },
  {
    id: 'custom-reg',
    name: 'Custom Regulatory',
    description: 'Other regulatory requirements',
    icon: '📋',
    features: ['Flexible compliance', 'Custom frameworks', 'Industry specific', 'Tailored approach']
  }
];

export function ProjectCreationWizard({ onClose, onProjectCreated }: ProjectCreationWizardProps) {
  const [step, setStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template: '',
    projectPath: '',
    aiModel: 'gpt-4',
    backend: '',
    frontend: '',
    uiFramework: '',
    authentication: '',
    hosting: '',
    regulatoryCompliance: [] as string[]
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Project name must be at least 3 characters';
    }
    
    if (!formData.projectPath.trim()) {
      newErrors.projectPath = 'Project path is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.template) {
      newErrors.template = 'Please select a project template';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.description.trim()) {
      newErrors.description = 'Project description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleExpandWithAI = async () => {
    if (!formData.description.trim()) return;
    
    try {
      setIsExpanding(true);
      setErrors({});
      
      const response = await fetch('/api/expand-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: formData.description,
          template: formData.template,
          [formData.template === 'business' ? 'regulatoryStack' : 'technologyStack']: formData.template === 'business' ? {
            regulatoryCompliance: formData.regulatoryCompliance
          } : {
            backend: formData.backend,
            frontend: formData.frontend,
            uiFramework: formData.uiFramework,
            authentication: formData.authentication,
            hosting: formData.hosting
          }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setFormData(prev => ({ ...prev, description: result.expandedDescription }));
        
        // Token usage is tracked on the server side
        if (result.tokenUsage) {
          console.log('Token usage for description expansion:', result.tokenUsage);
        }
      } else {
        const errorData = await response.json();
        setErrors({ description: errorData.error || 'Failed to expand description with AI' });
      }
    } catch (error) {
      console.error('Failed to expand description:', error);
      setErrors({ description: 'Failed to expand description with AI. Please try again.' });
    } finally {
      setIsExpanding(false);
    }
  };

  const handleAutoFillTechStack = async () => {
    if (!formData.description.trim()) return;
    
    try {
      setIsAutoFilling(true);
      setErrors({});
      
      const response = await fetch('/api/auto-fill-tech-stack', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: formData.description,
          template: formData.template,
          currentCompliance: formData.template === 'business' ? formData.regulatoryCompliance : undefined
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (formData.template === 'business' && result.regulatoryStack?.regulatoryCompliance) {
          setFormData(prev => ({
            ...prev,
            regulatoryCompliance: result.regulatoryStack.regulatoryCompliance
          }));
        } else if (result.technologyStack) {
          setFormData(prev => ({
            ...prev,
            backend: result.technologyStack.backend || '',
            frontend: result.technologyStack.frontend || '',
            uiFramework: result.technologyStack.uiFramework || '',
            authentication: result.technologyStack.authentication || '',
            hosting: result.technologyStack.hosting || ''
          }));
        }
        
        // Token usage is tracked on the server side
        if (result.tokenUsage) {
          console.log('Token usage for tech stack recommendation:', result.tokenUsage);
        }
      } else {
        const errorData = await response.json();
        setErrors({ general: errorData.error || `Failed to auto-fill ${formData.template === 'business' ? 'regulatory' : 'technology'} stack` });
      }
    } catch (error) {
      console.error('Failed to auto-fill technology stack:', error);
      setErrors({ general: `Failed to auto-fill ${formData.template === 'business' ? 'regulatory' : 'technology'} stack. Please try again.` });
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    } else if (step === 3 && validateStep3()) {
      setStep(4);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setErrors({});
    }
  };

  const handleSelectFolder = () => {
    // Create a hidden file input with webkitdirectory attribute for folder selection
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.style.display = 'none';
    
    input.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement;
      const files = target.files;
      
      if (files && files.length > 0) {
        // Get the folder path from the first file
        const firstFile = files[0];
        const folderPath = firstFile.webkitRelativePath.split('/')[0];
        
        // For security reasons, we can't get the full path from the browser
        // So we'll use a relative path or ask the user to provide the full path
        // For now, we'll use the folder name as a relative path
        setFormData(prev => ({ ...prev, projectPath: `./${folderPath}` }));
      }
    });
    
    input.click();
  };

  const handleManualPathInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, projectPath: e.target.value }));
  };

  const handleRegulatoryComplianceToggle = (regulationId: string) => {
    setFormData(prev => ({
      ...prev,
      regulatoryCompliance: prev.regulatoryCompliance.includes(regulationId)
        ? prev.regulatoryCompliance.filter(id => id !== regulationId)
        : [...prev.regulatoryCompliance, regulationId]
    }));
  };

  const handleCreate = async () => {
    try {
      setIsCreating(true);
      setErrors({});
      
      const projectConfig: Omit<ProjectConfiguration, 'projectId' | 'createdAt' | 'lastModified'> = {
        name: formData.name,
        description: formData.description,
        template: formData.template,
        aiModel: formData.aiModel,
        contextPreferences: {
          maxContextSize: 8000,
          prioritizeRecent: true,
          includeProgress: true
        }
      };

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...projectConfig,
          projectPath: formData.projectPath,
          [formData.template === 'business' ? 'regulatoryStack' : 'technologyStack']: formData.template === 'business' ? {
            regulatoryCompliance: formData.regulatoryCompliance
          } : {
            backend: formData.backend,
            frontend: formData.frontend,
            uiFramework: formData.uiFramework,
            authentication: formData.authentication,
            hosting: formData.hosting
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create project');
      }

      const newProject = await response.json();
      
      // Generate project specifications using Gemini
      try {
        console.log('Starting specs generation for project:', newProject.id);
        const specsResponse = await fetch(`/api/projects/${newProject.id}/generate-specs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log('Specs response status:', specsResponse.status);
        
        if (specsResponse.ok) {
          const specsResult = await specsResponse.json();
          console.log('Project specifications generated successfully');
          console.log('Specs result:', specsResult);
          
          // Token usage is tracked on the server side
          if (specsResult.tokenUsage) {
            console.log('Token usage for project specs generation:', specsResult.tokenUsage);
          }
        } else {
          const errorText = await specsResponse.text();
          console.error('Failed to generate project specifications:', errorText);
          console.error('Response status:', specsResponse.status);
        }
      } catch (specsError) {
        console.error('Error generating project specifications:', specsError);
      }

      onProjectCreated(newProject);
    } catch (error) {
      console.error('Failed to create project:', error);
      setErrors({ general: error instanceof Error ? error.message : 'Failed to create project. Please try again.' });
    } finally {
      setIsCreating(false);
    }
  };

  const selectedTemplate = PROJECT_TEMPLATES.find(t => t.id === formData.template);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-none shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Create New Project</h2>
            <p className="text-sm text-gray-500 mt-1">Step {step} of 4</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-gray-50">
          <div className="flex items-center">
            {[1, 2, 3, 4].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div className={`w-8 h-8 rounded-none flex items-center justify-center text-sm font-medium ${
                  stepNumber <= step 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {stepNumber}
                </div>
                {stepNumber < 4 && (
                  <div className={`w-12 h-1 mx-2 ${
                    stepNumber < step ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Project Details</h3>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        errors.name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="My Awesome Project"
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                  </div>



                  <div>
                    <label htmlFor="projectPath" className="block text-sm font-medium text-gray-700 mb-1">
                      Project Folder *
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        id="projectPath"
                        value={formData.projectPath}
                        onChange={handleManualPathInput}
                        className={`flex-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          errors.projectPath ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Select a folder or enter path manually"
                      />
                      <button
                        type="button"
                        onClick={handleSelectFolder}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                      >
                        Browse
                      </button>
                    </div>
                    {errors.projectPath && <p className="mt-1 text-sm text-red-600">{errors.projectPath}</p>}
                    <p className="mt-1 text-sm text-gray-500">
                      Select the folder where your project files are located
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Choose Template</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Select a template that best matches your project type. This will generate appropriate requirements, design, and task templates.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PROJECT_TEMPLATES.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => setFormData(prev => ({ ...prev, template: template.id }))}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
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
                          <ul className="mt-2 space-y-1">
                            {template.features.map((feature, index) => (
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
                  ))}
                </div>
                
                {errors.template && <p className="mt-2 text-sm text-red-600">{errors.template}</p>}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Project Description & {formData.template === 'business' ? 'Regulatory Stack' : 'Technology Stack'}
                </h3>
                
                <div className="space-y-6">
                  {/* Project Description */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                        Project Description *
                      </label>
                      <button
                        type="button"
                        onClick={handleExpandWithAI}
                        disabled={!formData.description.trim() || isExpanding}
                        className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center"
                      >
                        {isExpanding ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Expanding...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Expand with AI
                          </>
                        )}
                      </button>
                    </div>
                    <textarea
                      id="description"
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        errors.description ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Describe what kind of app you want to build, its main features, target users, and any specific requirements..."
                    />
                    {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
                    <p className="mt-1 text-sm text-gray-500">
                      Be as detailed as possible to help generate better project requirements and tasks.
                    </p>
                  </div>

                  {/* Technology/Regulatory Stack */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-md font-medium text-gray-900">
                          {formData.template === 'business' ? 'Regulatory Stack' : 'Technology Stack'}
                        </h4>

                        <p className="text-sm text-gray-600 mt-1">
                          {formData.template === 'business' 
                            ? 'Select your regulatory and compliance requirements (optional - you can change these later)'
                            : 'Select your preferred technologies (optional - you can change these later)'
                          }
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAutoFillTechStack}
                        disabled={!formData.description.trim() || isAutoFilling}
                        className="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center"
                      >
                        {isAutoFilling ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            {formData.template === 'business' ? 'Auto-fill Regulatory Stack' : 'Auto-fill Tech Stack'}
                          </>
                        )}
                      </button>
                    </div>
                    
                    {formData.template === 'business' ? (
                      /* Regulatory Compliance Cards */
                      <div className="space-y-4">
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-3">
                            Select Regulatory Frameworks (multiple allowed)
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {REGULATORY_STACK_OPTIONS.map((regulation) => (
                              <div
                                key={regulation.id}
                                onClick={() => handleRegulatoryComplianceToggle(regulation.id)}
                                className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                                  formData.regulatoryCompliance.includes(regulation.id)
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-start">
                                  <div className="text-2xl mr-3">{regulation.icon}</div>
                                  <div className="flex-1">
                                    <h6 className="font-medium text-gray-900 text-sm">{regulation.name}</h6>
                                    <p className="text-xs text-gray-600 mt-1">{regulation.description}</p>
                                    <ul className="mt-2 space-y-1">
                                      {regulation.features.slice(0, 2).map((feature, index) => (
                                        <li key={index} className="text-xs text-gray-500 flex items-center">
                                          <svg className="w-2 h-2 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                          </svg>
                                          {feature}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Technology Stack Dropdowns */
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="backend" className="block text-sm font-medium text-gray-700 mb-1">
                            Backend
                          </label>
                          <select
                            id="backend"
                            value={formData.backend}
                            onChange={(e) => setFormData(prev => ({ ...prev, backend: e.target.value }))}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Select backend...</option>
                            {BACKEND_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label htmlFor="frontend" className="block text-sm font-medium text-gray-700 mb-1">
                            Frontend
                          </label>
                          <select
                            id="frontend"
                            value={formData.frontend}
                            onChange={(e) => setFormData(prev => ({ ...prev, frontend: e.target.value }))}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Select frontend...</option>
                            {FRONTEND_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label htmlFor="uiFramework" className="block text-sm font-medium text-gray-700 mb-1">
                            UI Framework
                          </label>
                          <select
                            id="uiFramework"
                            value={formData.uiFramework}
                            onChange={(e) => setFormData(prev => ({ ...prev, uiFramework: e.target.value }))}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Select UI framework...</option>
                            {UI_FRAMEWORK_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label htmlFor="authentication" className="block text-sm font-medium text-gray-700 mb-1">
                            Authentication
                          </label>
                          <select
                            id="authentication"
                            value={formData.authentication}
                            onChange={(e) => setFormData(prev => ({ ...prev, authentication: e.target.value }))}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Select authentication...</option>
                            {AUTH_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label htmlFor="hosting" className="block text-sm font-medium text-gray-700 mb-1">
                            Hosting Platform
                          </label>
                          <select
                            id="hosting"
                            value={formData.hosting}
                            onChange={(e) => setFormData(prev => ({ ...prev, hosting: e.target.value }))}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Select hosting platform...</option>
                            {HOSTING_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Review & Create</h3>
                
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Project Name:</span>
                    <span className="ml-2 text-sm text-gray-900">{formData.name}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Description:</span>
                    <span className="ml-2 text-sm text-gray-900">{formData.description}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Template:</span>
                    <span className="ml-2 text-sm text-gray-900">
                      {selectedTemplate?.icon} {selectedTemplate?.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Project Path:</span>
                    <span className="ml-2 text-sm text-gray-900 font-mono">{formData.projectPath}</span>
                  </div>
                  
                  {/* Technology/Regulatory Stack Summary */}
                  {(formData.template === 'business' ? 
                    formData.regulatoryCompliance.length > 0 : 
                    (formData.backend || formData.frontend || formData.uiFramework || formData.authentication || formData.hosting)
                  ) && (
                    <div className="pt-3 border-t border-gray-200">
                      <span className="text-sm font-medium text-gray-700">
                        {formData.template === 'business' ? 'Regulatory Compliance:' : 'Technology Stack:'}
                      </span>
                      <div className="mt-1 space-y-1">
                        {formData.template === 'business' ? (
                          formData.regulatoryCompliance.map((regId) => {
                            const regulation = REGULATORY_STACK_OPTIONS.find(opt => opt.id === regId);
                            return regulation ? (
                              <div key={regId} className="text-sm text-gray-600 flex items-center">
                                <span className="text-base mr-2">{regulation.icon}</span>
                                <span className="font-medium">{regulation.name}</span>
                              </div>
                            ) : null;
                          })
                        ) : (
                          <>
                            {formData.backend && (
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">Backend:</span> {BACKEND_OPTIONS.find(opt => opt.value === formData.backend)?.label}
                              </div>
                            )}
                            {formData.frontend && (
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">Frontend:</span> {FRONTEND_OPTIONS.find(opt => opt.value === formData.frontend)?.label}
                              </div>
                            )}
                            {formData.uiFramework && (
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">UI Framework:</span> {UI_FRAMEWORK_OPTIONS.find(opt => opt.value === formData.uiFramework)?.label}
                              </div>
                            )}
                            {formData.authentication && (
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">Authentication:</span> {AUTH_OPTIONS.find(opt => opt.value === formData.authentication)?.label}
                              </div>
                            )}
                            {formData.hosting && (
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">Hosting:</span> {HOSTING_OPTIONS.find(opt => opt.value === formData.hosting)?.label}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <span className="text-sm font-medium text-gray-700">AI Model:</span>
                    <span className="ml-2 text-sm text-gray-900">{formData.aiModel}</span>
                  </div>
                </div>

                <div className="mt-6">
                  <label htmlFor="aiModel" className="block text-sm font-medium text-gray-700 mb-1">
                    AI Model
                  </label>
                  <select
                    id="aiModel"
                    value={formData.aiModel}
                    onChange={(e) => setFormData(prev => ({ ...prev, aiModel: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    <option value="claude-3">Claude 3</option>
                  </select>
                </div>

                {errors.general && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{errors.general}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={step === 1 ? onClose : handleBack}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          
          {step < 4 ? (
            <button
              onClick={handleNext}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isCreating && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isCreating ? 'Creating...' : 'Create Project'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}