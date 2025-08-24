'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings,
  Key,
  TestTube,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info,
  ExternalLink
} from 'lucide-react';

interface ApiConfiguration {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
  source: 'user' | 'environment' | 'none';
}

interface ApiConfigurationProps {
  projectId: string;
}

export function ApiConfiguration({ projectId }: ApiConfigurationProps) {
  const [config, setConfig] = useState<ApiConfiguration>({
    provider: '',
    apiKey: '',
    model: '',
    source: 'none'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      setIsLoading(true);

      // Use the config status endpoint that checks both user config and environment variables
      const response = await fetch('/api/config-status');
      if (response.ok) {
        const data = await response.json();
        setConfig({
          provider: data.provider || '',
          apiKey: data.apiKey || '',
          model: data.model || '',
          baseUrl: data.baseUrl,
          source: data.source || 'none'
        });
      } else {
        // If the endpoint fails, assume no configuration
        setConfig({
          provider: '',
          apiKey: '',
          model: '',
          source: 'none'
        });
      }

    } catch (error) {
      console.error('Failed to load API configuration:', error);
      setTestResult({ success: false, message: 'Failed to load API configuration' });
      setConfig({
        provider: '',
        apiKey: '',
        model: '',
        source: 'none'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);

      // Always use the config-test endpoint since we don't have access to the real API key
      // (the config-status endpoint returns masked keys for security)
      const testEndpoint = '/api/config-test';
      const testBody = {}; // Backend will use getApiConfiguration to get the real config

      const response = await fetch(testEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testBody),
      });

      const result = await response.json();

      if (response.ok) {
        setTestResult({ success: true, message: result.message || 'API connection successful! Model is ready to use.' });
      } else {
        setTestResult({ success: false, message: result.error || 'API connection failed' });
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Error testing API connection' });
    } finally {
      setIsTesting(false);
    }
  };

  const getSourceBadge = () => {
    switch (config.source) {
      case 'user':
        return (
          <Badge variant="default" className="flex items-center">
            <Key className="w-4 h-4 mr-1" />
            Personal API Key
          </Badge>
        );
      case 'environment':
        return (
          <Badge variant="secondary" className="flex items-center">
            <Settings className="w-4 h-4 mr-1" />
            Environment Variable
          </Badge>
        );
      default:
        return (
          <Badge variant="destructive" className="flex items-center">
            <AlertCircle className="w-4 h-4 mr-1" />
            Not Configured
          </Badge>
        );
    }
  };

  const getProviderName = (providerId: string) => {
    const providers: Record<string, string> = {
      'openai': 'OpenAI',
      'anthropic': 'Anthropic',
      'google': 'Google AI',
      'custom': 'Custom Provider'
    };
    return providers[providerId] || providerId;
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-3">API Configuration</h1>
        <p className="text-muted-foreground text-lg">
          View current AI API configuration. Configure your personal API keys in your profile settings.
        </p>
      </div>

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
                  <div className="text-sm font-medium">Configuration Source</div>
                  <div className="flex items-center space-x-2">
                    {getSourceBadge()}
                  </div>
                </div>

                {/* Provider Information */}
                {config.provider && config.source !== 'none' && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Provider Information</div>
                    <div className="text-sm space-y-1">
                      <p><strong>Provider:</strong> {getProviderName(config.provider)}</p>
                      <p><strong>Model:</strong> {config.model}</p>
                      {config.baseUrl && <p><strong>Base URL:</strong> {config.baseUrl}</p>}
                      <p><strong>API Key:</strong> {config.apiKey ? '••••••••' : 'Not configured'}</p>
                    </div>
                  </div>
                )}

                {/* No Configuration Message */}
                {config.source === 'none' && (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      No API configuration found. Configure your personal API keys to use AI features.
                    </p>
                    <Button asChild>
                      <Link href="/profile" className="flex items-center">
                        <Key className="w-4 h-4 mr-2" />
                        Configure API Keys
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                )}

                {/* Test Connection Button */}
                {(config.source === 'user' || config.source === 'environment') && (
                  <div className="pt-4">
                    <Button
                      onClick={handleTest}
                      disabled={isTesting}
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
                )}
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
              <div className="text-sm font-medium">Current Status</div>
              <div className="flex items-center space-x-2">
                {config.source !== 'none' ? (
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

            {/* Configuration Instructions */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Configuration Options</div>
              <div className="text-sm text-muted-foreground space-y-2">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium mb-1">Option 1: Personal API Keys (Recommended)</p>
                  <p>Configure your own API keys in your profile settings for enhanced privacy and control.</p>
                  <Button asChild variant="outline" size="sm" className="mt-2">
                    <Link href="/profile" className="flex items-center">
                      <Key className="w-4 h-4 mr-2" />
                      Go to Profile Settings
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium mb-1">Option 2: Environment Variables</p>
                  <p>Set GOOGLE_AI_API_KEY in your .env.local file for app-wide configuration.</p>
                </div>
              </div>
            </div>

            {/* Usage Information */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Usage</div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• This API configuration will be used for all AI features</p>
                <p>• Personal API keys take priority over environment variables</p>
                <p>• API keys are encrypted and stored securely</p>
                <p>• Test the connection to ensure everything works correctly</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
