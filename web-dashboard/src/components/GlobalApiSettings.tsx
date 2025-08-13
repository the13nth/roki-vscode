'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  Brain
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

export function GlobalApiSettings() {
  const [isOpen, setIsOpen] = useState(false);
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
    if (isOpen) {
      loadGlobalConfiguration();
    }
  }, [isOpen]);

  const loadGlobalConfiguration = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/global-api-config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
        
        if (data.error) {
          setTestResult({ success: false, message: data.error });
        }
      }
    } catch (error) {
      console.error('Failed to load global API configuration:', error);
      setTestResult({ success: false, message: 'Failed to load global API configuration' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/global-api-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setTestResult({ success: true, message: 'Global API configuration saved successfully!' });
      } else {
        setTestResult({ success: false, message: 'Failed to save global API configuration' });
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Error saving global API configuration' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      
      const response = await fetch('/api/global-api-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const result = await response.json();
      
      if (response.ok) {
        setTestResult({ success: true, message: 'Global API connection successful! Model is ready to use.' });
      } else {
        setTestResult({ success: false, message: result.error || 'Global API connection failed' });
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Error testing global API connection' });
    } finally {
      setIsTesting(false);
    }
  };

  const selectedProvider = AI_PROVIDERS.find(p => p.id === config.provider);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center">
          <Settings className="mr-2 h-4 w-4" />
          AI Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Brain className="w-5 h-5 mr-2" />
            Global AI Provider Settings
          </DialogTitle>
          <DialogDescription>
            Configure AI providers and API keys for project analysis and AI-powered features across all projects.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label htmlFor="provider">AI Provider</Label>
            <Select
              value={config.provider}
              onValueChange={(value) => {
                const provider = AI_PROVIDERS.find(p => p.id === value);
                setConfig({
                  ...config,
                  provider: value,
                  model: provider?.models[0] || '',
                  baseUrl: provider?.baseUrl || ''
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an AI provider" />
              </SelectTrigger>
              <SelectContent>
                {AI_PROVIDERS.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{provider.name}</span>
                      <span className="text-xs text-muted-foreground">{provider.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model Selection */}
          {selectedProvider && (
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Select
                value={config.model}
                onValueChange={(value) => setConfig({ ...config, model: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {selectedProvider.models.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Custom Base URL */}
          {config.provider === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                type="url"
                placeholder="https://api.example.com/v1"
                value={config.baseUrl || ''}
                onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
              />
            </div>
          )}

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showApiKey ? 'text' : 'password'}
                placeholder="Enter your API key"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Status */}
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

          {/* Test Results */}
          {testResult && (
            <Alert variant={testResult.success ? "default" : "destructive"}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{testResult.message}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-4">
            <Button
              onClick={handleSave}
              disabled={isSaving || !config.provider || !config.apiKey || !config.model}
              className="flex-1"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Configuration
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={isTesting || !config.provider || !config.apiKey || !config.model}
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <TestTube className="w-4 h-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
          </div>

          {/* Usage Information */}
          <div className="text-sm text-muted-foreground space-y-1 pt-4 border-t">
            <p>• This global configuration will be used as default for new projects</p>
            <p>• Individual projects can override these settings</p>
            <p>• For Google AI (Gemini), set GOOGLE_AI_API_KEY environment variable for secure configuration</p>
            <p>• API keys are encrypted in production, stored as plaintext in development</p>
            <p>• Test the connection before using AI features</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
