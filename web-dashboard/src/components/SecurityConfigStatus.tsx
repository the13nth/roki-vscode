'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SecurityConfig {
  isValid: boolean;
  errors: string[];
  environment: string;
  isProduction: boolean;
  hasEncryptionKey: boolean;
  hasEncryptionSalt: boolean;
  hasGoogleAIKey: boolean;
  auditLog: Array<{
    timestamp: string;
    operation: string;
    success: boolean;
    error?: string;
  }>;
}

interface EncryptionTestResult {
  success: boolean;
  message: string;
  isProduction: boolean;
}

export default function SecurityConfigStatus() {
  const [config, setConfig] = useState<SecurityConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<EncryptionTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/security/config');
      if (!response.ok) {
        throw new Error('Failed to fetch security configuration');
      }
      const data = await response.json();
      setConfig(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testEncryption = async () => {
    try {
      setTesting(true);
      const response = await fetch('/api/security/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'test-encryption' }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to test encryption');
      }
      
      const result = await response.json();
      setTestResult(result);
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Unknown error',
        isProduction: config?.isProduction || false
      });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Security Configuration</CardTitle>
          <CardDescription>Loading security status...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Security Configuration</CardTitle>
          <CardDescription>Error loading security status</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchConfig} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Security Configuration Status
            <Badge variant={config.isValid ? 'default' : 'destructive'}>
              {config.isValid ? 'Valid' : 'Invalid'}
            </Badge>
          </CardTitle>
          <CardDescription>
            Current security configuration and environment status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Environment Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium">Environment</h4>
              <Badge variant={config.isProduction ? 'destructive' : 'secondary'}>
                {config.environment}
              </Badge>
            </div>
            <div>
              <h4 className="font-medium">Encryption Status</h4>
              <Badge variant={config.isProduction ? 'default' : 'secondary'}>
                {config.isProduction ? 'Enabled' : 'Development Mode'}
              </Badge>
            </div>
          </div>

          {/* Configuration Checks */}
          <div className="space-y-2">
            <h4 className="font-medium">Configuration Checks</h4>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center justify-between">
                <span>Encryption Key</span>
                <Badge variant={config.hasEncryptionKey ? 'default' : 'destructive'}>
                  {config.hasEncryptionKey ? 'Set' : 'Missing'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Encryption Salt</span>
                <Badge variant={config.hasEncryptionSalt ? 'default' : 'destructive'}>
                  {config.hasEncryptionSalt ? 'Set' : 'Missing'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Google AI API Key</span>
                <Badge variant={config.hasGoogleAIKey ? 'default' : 'destructive'}>
                  {config.hasGoogleAIKey ? 'Set' : 'Missing'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Validation Errors */}
          {config.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-red-600">Configuration Errors</h4>
              <div className="space-y-1">
                {config.errors.map((error, index) => (
                  <Alert key={index}>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}

          {/* Test Encryption */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Encryption Test</h4>
              <Button 
                onClick={testEncryption} 
                disabled={testing || !config.isValid}
                size="sm"
              >
                {testing ? 'Testing...' : 'Test Encryption'}
              </Button>
            </div>
            
            {testResult && (
              <Alert>
                <AlertDescription className={testResult.success ? 'text-green-600' : 'text-red-600'}>
                  {testResult.message}
                  {!testResult.isProduction && ' (Development mode - no actual encryption)'}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={fetchConfig} variant="outline" size="sm">
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log */}
      {config.auditLog.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Security Audit Log</CardTitle>
            <CardDescription>Recent security-related operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {config.auditLog.slice().reverse().map((entry, index) => (
                <div key={index} className="flex items-center justify-between text-sm border-b pb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={entry.success ? 'default' : 'destructive'} className="text-xs">
                      {entry.success ? 'SUCCESS' : 'FAILURE'}
                    </Badge>
                    <span className="font-mono">{entry.operation}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}