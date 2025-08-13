'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApiKeyToggle } from '@/components/ApiKeyToggle';
import { 
  Settings, 
  Key, 
  Eye, 
  EyeOff, 
  Save, 
  TestTube, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Info
} from 'lucide-react';

interface ApiProvider {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  models: string[];
}

interface ApiConfiguration {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
  source?: string;
  usePersonalApiKey?: boolean;
}

const AI_PROVIDERS: ApiProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4, GPT-3.5 Turbo, and other OpenAI models',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k']
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude 3 and Claude 2 models',
    baseUrl: 'https://api.anthropic.com',
    models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-2.1']
  },
  {
    id: 'google',
    name: 'Google AI',
    description: 'Gemini Pro and other Google AI models',
    baseUrl: 'https://generativelanguage.googleapis.com',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro']
  },
  {
    id: 'custom',
    name: 'Custom Provider',
    description: 'Use your own API endpoint',
    baseUrl: '',
    models: ['custom']
  }
];

interface ApiConfigurationProps {
  projectId: string;
}

export function ApiConfiguration({ projectId }: ApiConfigurationProps) {
  const [config, setConfig] = useState<ApiConfiguration>({
    provider: '',
    apiKey: '',
    model: ''
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadConfiguration();
  }, [projectId]);

  const loadConfiguration = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/projects/${projectId}/api-config`);
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
        
        // Show error message if there's a configuration error
        if (data.error) {
          setTestResult({ success: false, message: data.error });
        }
      }
    } catch (error) {
      console.error('Failed to load API configuration:', error);
      setTestResult({ success: false, message: 'Failed to load API configuration' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const response = await fetch(`/api/projects/${projectId}/api-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setTestResult({ success: true, message: 'API configuration saved successfully!' });
      } else {
        setTestResult({ success: false, message: 'Failed to save API configuration' });
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Error saving API configuration' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      
      const response = await fetch(`/api/projects/${projectId}/api-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const result = await response.json();
      
      if (response.ok) {
        setTestResult({ success: true, message: 'API connection successful! Model is ready to use.' });
      } else {
        setTestResult({ success: false, message: result.error || 'API connection failed' });
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Error testing API connection' });
    } finally {
      setIsTesting(false);
    }
  };

  const selectedProvider = AI_PROVIDERS.find(p => p.id === config.provider);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-3">API Configuration</h1>
        <p className="text-muted-foreground text-lg">
          Configure AI providers and API keys for project analysis and AI-powered features.
        </p>
      </div>

      {/* API Key Selection Toggle */}
      <ApiKeyToggle projectId={projectId} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Configuration Display Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Info className="w-5 h-5 mr-2" />
              Current Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading configuration...
              </div>
            ) : (
              <>
                {/* Configuration Source */}
                <div className="space-y-2">
                  <Label>Configuration Source</Label>
                  <div className="flex items-center space-x-2">
                    {config.usePersonalApiKey ? (
                      <Badge variant="default" className="flex items-center">
                        <Key className="w-4 h-4 mr-1" />
                        Personal API Key
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="flex items-center">
                        <Settings className="w-4 h-4 mr-1" />
                        App Default Key
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Provider Information */}
                {config.provider && (
                  <div className="space-y-2">
                    <Label>Provider Information</Label>
                    <div className="text-sm space-y-1">
                      <p><strong>Provider:</strong> {AI_PROVIDERS.find(p => p.id === config.provider)?.name || config.provider}</p>
                      <p><strong>Model:</strong> {config.model}</p>
                      {config.baseUrl && <p><strong>Base URL:</strong> {config.baseUrl}</p>}
                      <p><strong>API Key:</strong> {config.apiKey ? '••••••••' : 'Not configured'}</p>
                    </div>
                  </div>
                )}

                {/* Test Connection Button */}
                <div className="pt-4">
                  <Button
                    onClick={handleTest}
                    disabled={isTesting || !config.provider || !config.apiKey || !config.model}
                    className="w-full"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Testing Connection...
                      </>
                    ) : (
                      <>
                        <TestTube className="w-4 h-4 mr-2" />
                        Test Current Configuration
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Status and Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Status */}
            <div className="space-y-2">
              <Label>Current Status</Label>
              <div className="flex items-center space-x-2">
                {config.provider && config.apiKey && config.model ? (
                  <Badge variant="default" className="flex items-center">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Configured
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    Not Configured
                  </Badge>
                )}
              </div>
            </div>

            {/* Provider Info */}
            {selectedProvider && (
              <div className="space-y-2">
                <Label>Provider Information</Label>
                <div className="text-sm space-y-1">
                  <p><strong>Name:</strong> {selectedProvider.name}</p>
                  <p><strong>Description:</strong> {selectedProvider.description}</p>
                  <p><strong>Base URL:</strong> {selectedProvider.baseUrl}</p>
                  <p><strong>Selected Model:</strong> {config.model}</p>
                </div>
              </div>
            )}

            {/* Test Results */}
            {testResult && (
              <Alert variant={testResult.success ? "default" : "destructive"}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{testResult.message}</AlertDescription>
              </Alert>
            )}

            {/* Usage Information */}
            <div className="space-y-2">
              <Label>Usage</Label>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• This API configuration will be used for project analysis</p>
                <p>• The AI model will analyze your project context and provide insights</p>
                <p>• For Google AI (Gemini), set GOOGLE_AI_API_KEY environment variable for secure configuration</p>
                <p>• API keys are encrypted in production, stored as plaintext in development</p>
                <p>• Test the connection before using analysis features</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
