'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Key, 
  User, 
  Building, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Settings
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface ApiKeySelection {
  usePersonalApiKey: boolean;
  lastUpdated: string;
}

interface ApiKeyToggleProps {
  projectId: string;
}

export function ApiKeyToggle({ projectId }: ApiKeyToggleProps) {
  const [selection, setSelection] = useState<ApiKeySelection>({
    usePersonalApiKey: false,
    lastUpdated: new Date().toISOString()
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasPersonalConfig, setHasPersonalConfig] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadApiKeySelection();
    checkPersonalApiConfig();
  }, [projectId]);

  const loadApiKeySelection = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/projects/${projectId}/api-key-selection`);
      if (response.ok) {
        const data = await response.json();
        setSelection(data);
      }
    } catch (error) {
      console.error('Failed to load API key selection:', error);
      setMessage({ type: 'error', text: 'Failed to load API key selection' });
    } finally {
      setIsLoading(false);
    }
  };

  const checkPersonalApiConfig = async () => {
    try {
      const response = await fetch('/api/user-api-config');
      if (response.ok) {
        const data = await response.json();
        setHasPersonalConfig(data.provider && data.apiKey && data.model);
      }
    } catch (error) {
      console.error('Failed to check personal API config:', error);
    }
  };

  const handleToggle = async (usePersonalApiKey: boolean) => {
    if (usePersonalApiKey && !hasPersonalConfig) {
      setMessage({ 
        type: 'error', 
        text: 'Please configure your personal API key in your profile first.' 
      });
      return;
    }

    try {
      setIsSaving(true);
      setMessage(null);
      
      const response = await fetch(`/api/projects/${projectId}/api-key-selection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ usePersonalApiKey }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelection(data.selection);
        setMessage({ 
          type: 'success', 
          text: data.message || `Switched to ${usePersonalApiKey ? 'personal' : 'app default'} API key` 
        });
      } else {
        const errorData = await response.json();
        setMessage({ 
          type: 'error', 
          text: errorData.error || 'Failed to update API key selection' 
        });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Error updating API key selection' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Key className="w-5 h-5 mr-2" />
            API Key Selection
          </CardTitle>
          <CardDescription>
            Choose between your personal API key or the app's default key
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Key className="w-5 h-5 mr-2" />
          API Key Selection
        </CardTitle>
        <CardDescription>
          Choose which API key to use for AI features in this project
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Selection Status */}
        <div className="space-y-2">
          <Label>Current Selection</Label>
          <div className="flex items-center space-x-2">
            {selection.usePersonalApiKey ? (
              <Badge variant="default" className="flex items-center">
                <User className="w-4 h-4 mr-1" />
                Personal API Key
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center">
                <Building className="w-4 h-4 mr-1" />
                App Default Key
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              Last updated: {new Date(selection.lastUpdated).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Toggle Options */}
        <div className="space-y-4">
          <div className="flex items-start space-x-3 p-4 border rounded-lg">
            <Checkbox
              id="use-personal-key"
              checked={selection.usePersonalApiKey}
              onCheckedChange={(checked) => handleToggle(checked as boolean)}
              disabled={isSaving || (!hasPersonalConfig && !selection.usePersonalApiKey)}
            />
            <div className="flex-1 space-y-1">
              <Label 
                htmlFor="use-personal-key" 
                className="flex items-center cursor-pointer"
              >
                <User className="w-4 h-4 mr-2" />
                Use Personal API Key
                {hasPersonalConfig && (
                  <CheckCircle className="w-4 h-4 ml-2 text-green-500" />
                )}
              </Label>
              <p className="text-sm text-muted-foreground">
                Use your personal API key configured in your profile. 
                {!hasPersonalConfig && (
                  <span className="text-orange-600 font-medium">
                    {' '}(Not configured - set up in your profile first)
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 border rounded-lg">
            <Checkbox
              id="use-app-key"
              checked={!selection.usePersonalApiKey}
              onCheckedChange={(checked) => handleToggle(!(checked as boolean))}
              disabled={isSaving}
            />
            <div className="flex-1 space-y-1">
              <Label 
                htmlFor="use-app-key" 
                className="flex items-center cursor-pointer"
              >
                <Building className="w-4 h-4 mr-2" />
                Use App Default Key
                <CheckCircle className="w-4 h-4 ml-2 text-green-500" />
              </Label>
              <p className="text-sm text-muted-foreground">
                Use the application's default API key. This is managed by the app administrators.
              </p>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {message && (
          <Alert variant={message.type === 'error' ? "destructive" : "default"}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Action Button */}
        {!hasPersonalConfig && (
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => window.open('/profile?tab=api', '_blank')}
              className="w-full"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configure Personal API Key
            </Button>
          </div>
        )}

        {/* Usage Information */}
        <div className="text-sm text-muted-foreground space-y-1 pt-4 border-t">
          <p>• Personal API keys provide enhanced privacy and control over your AI interactions</p>
          <p>• App default keys are shared across all users and managed by administrators</p>
          <p>• You can switch between keys at any time without affecting existing project data</p>
          <p>• Token usage will be tracked separately for personal vs app keys</p>
        </div>
      </CardContent>
    </Card>
  );
}