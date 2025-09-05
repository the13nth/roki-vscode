'use client';

import React, { useState, useEffect } from 'react';
import { Node } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, Save, Settings, Code, Database, Globe, Mail, Users } from 'lucide-react';

interface NodeConfigPanelProps {
  node: Node;
  onUpdateNode: (node: Node) => void;
  onClose: () => void;
}

export function NodeConfigPanel({ node, onUpdateNode, onClose }: NodeConfigPanelProps) {
  const [config, setConfig] = useState<{
    label: string;
    description: string;
    parameters: any;
    code: string;
    condition: string;
    apiUrl: string;
    emailTo: string;
    emailSubject: string;
    emailBody: string;
    filePath: string;
    transformType: string;
    outputFormat: string;
  }>({
    label: (node.data.label as string) || '',
    description: (node.data.description as string) || '',
    parameters: node.data.parameters || {},
    code: (node.data.code as string) || '',
    condition: (node.data.condition as string) || '',
    apiUrl: (node.data.apiUrl as string) || '',
    emailTo: (node.data.emailTo as string) || '',
    emailSubject: (node.data.emailSubject as string) || '',
    emailBody: (node.data.emailBody as string) || '',
    filePath: (node.data.filePath as string) || '',
    transformType: (node.data.transformType as string) || 'map',
    outputFormat: (node.data.outputFormat as string) || 'json',
  });

  const handleSave = () => {
    const updatedNode = {
      ...node,
      data: {
        ...node.data,
        ...config,
      },
    };
    onUpdateNode(updatedNode);
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'input':
        return <Database className="w-4 h-4" />;
      case 'output':
        return <Mail className="w-4 h-4" />;
      case 'process':
        return <Settings className="w-4 h-4" />;
      case 'conditional':
        return <Code className="w-4 h-4" />;
      case 'code':
        return <Code className="w-4 h-4" />;
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'input':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'output':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'process':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'conditional':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'code':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center">
            {getNodeIcon(node.type || 'default')}
            <span className="ml-2">Node Configuration</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={getNodeColor(node.type || 'default')}>
            {node.type || 'default'}
          </Badge>
          <span className="text-sm text-muted-foreground">
            ID: {node.id}
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto">
        <div className="space-y-6">
          {/* Basic Configuration */}
          <div>
            <h3 className="text-sm font-medium mb-3">Basic Configuration</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="label">Label</Label>
                <Input
                  id="label"
                  value={config.label}
                  onChange={(e) => setConfig({ ...config, label: e.target.value })}
                  placeholder="Node label"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={config.description}
                  onChange={(e) => setConfig({ ...config, description: e.target.value })}
                  placeholder="Node description"
                  rows={3}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Node-specific Configuration */}
          {node.type === 'input' && (
            <div>
              <h3 className="text-sm font-medium mb-3">Input Configuration</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="filePath">File Path</Label>
                  <Input
                    id="filePath"
                    value={config.filePath}
                    onChange={(e) => setConfig({ ...config, filePath: e.target.value })}
                    placeholder="/path/to/input/file"
                  />
                </div>
                <div>
                  <Label htmlFor="inputFormat">Input Format</Label>
                  <Select
                    value={config.outputFormat}
                    onValueChange={(value) => setConfig({ ...config, outputFormat: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="xml">XML</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {node.type === 'process' && (
            <div>
              <h3 className="text-sm font-medium mb-3">Process Configuration</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="transformType">Transform Type</Label>
                  <Select
                    value={config.transformType}
                    onValueChange={(value) => setConfig({ ...config, transformType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select transform type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="map">Map</SelectItem>
                      <SelectItem value="filter">Filter</SelectItem>
                      <SelectItem value="reduce">Reduce</SelectItem>
                      <SelectItem value="sort">Sort</SelectItem>
                      <SelectItem value="aggregate">Aggregate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="processParams">Parameters</Label>
                  <Textarea
                    id="processParams"
                    value={JSON.stringify(config.parameters, null, 2)}
                    onChange={(e) => {
                      try {
                        const params = JSON.parse(e.target.value);
                        setConfig({ ...config, parameters: params });
                      } catch {
                        // Invalid JSON, keep the text for editing
                      }
                    }}
                    placeholder='{"key": "value"}'
                    rows={4}
                  />
                </div>
              </div>
            </div>
          )}

          {node.type === 'conditional' && (
            <div>
              <h3 className="text-sm font-medium mb-3">Conditional Logic</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="condition">Condition</Label>
                  <Textarea
                    id="condition"
                    value={config.condition}
                    onChange={(e) => setConfig({ ...config, condition: e.target.value })}
                    placeholder="data.value > 100"
                    rows={3}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Use JavaScript expressions. Available variables:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li><code>data</code> - Input data</li>
                    <li><code>context</code> - Workflow context</li>
                    <li><code>params</code> - Node parameters</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {node.type === 'code' && (
            <div>
              <h3 className="text-sm font-medium mb-3">Custom Code</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="code">JavaScript Code</Label>
                  <Textarea
                    id="code"
                    value={config.code}
                    onChange={(e) => setConfig({ ...config, code: e.target.value })}
                    placeholder="// Your custom code here
function processData(data) {
  return data.map(item => ({
    ...item,
    processed: true
  }));
}

return processData(input);"
                    rows={8}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Available variables:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li><code>input</code> - Input data</li>
                    <li><code>context</code> - Workflow context</li>
                    <li><code>params</code> - Node parameters</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {node.type === 'output' && (
            <div>
              <h3 className="text-sm font-medium mb-3">Output Configuration</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="outputFormat">Output Format</Label>
                  <Select
                    value={config.outputFormat}
                    onValueChange={(value) => setConfig({ ...config, outputFormat: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="xml">XML</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="outputPath">Output Path</Label>
                  <Input
                    id="outputPath"
                    value={config.filePath}
                    onChange={(e) => setConfig({ ...config, filePath: e.target.value })}
                    placeholder="/path/to/output/file"
                  />
                </div>
              </div>
            </div>
          )}

          {/* API Configuration for API nodes */}
          {(node.type === 'api-input' || node.type === 'api-output') && (
            <div>
              <h3 className="text-sm font-medium mb-3">API Configuration</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="apiUrl">API URL</Label>
                  <Input
                    id="apiUrl"
                    value={config.apiUrl}
                    onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
                    placeholder="https://api.example.com/endpoint"
                  />
                </div>
                <div>
                  <Label htmlFor="apiMethod">HTTP Method</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Email Configuration for email nodes */}
          {node.type === 'email-output' && (
            <div>
              <h3 className="text-sm font-medium mb-3">Email Configuration</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="emailTo">To</Label>
                  <Input
                    id="emailTo"
                    value={config.emailTo}
                    onChange={(e) => setConfig({ ...config, emailTo: e.target.value })}
                    placeholder="recipient@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="emailSubject">Subject</Label>
                  <Input
                    id="emailSubject"
                    value={config.emailSubject}
                    onChange={(e) => setConfig({ ...config, emailSubject: e.target.value })}
                    placeholder="Email subject"
                  />
                </div>
                <div>
                  <Label htmlFor="emailBody">Body</Label>
                  <Textarea
                    id="emailBody"
                    value={config.emailBody}
                    onChange={(e) => setConfig({ ...config, emailBody: e.target.value })}
                    placeholder="Email body content"
                    rows={4}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <div className="flex-shrink-0 p-4 border-t">
        <Button onClick={handleSave} className="w-full flex items-center">
          <Save className="w-4 h-4 mr-2" />
          Save Configuration
        </Button>
      </div>
    </div>
  );
}
