'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileInput, 
  FileOutput, 
  Settings, 
  GitBranch, 
  Code, 
  Database,
  Globe,
  Mail,
  BarChart3,
  Users,
  Zap
} from 'lucide-react';

interface NodeType {
  type: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  category: string;
}

const nodeTypes: NodeType[] = [
  // Input Nodes
  {
    type: 'input',
    label: 'Input',
    description: 'Entry point for data',
    icon: <FileInput className="w-4 h-4" />,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    category: 'Input'
  },
  {
    type: 'api-input',
    label: 'API Input',
    description: 'Fetch data from external API',
    icon: <Globe className="w-4 h-4" />,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    category: 'Input'
  },
  {
    type: 'file-input',
    label: 'File Input',
    description: 'Upload or read files',
    icon: <Database className="w-4 h-4" />,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    category: 'Input'
  },

  // Process Nodes
  {
    type: 'process',
    label: 'Process',
    description: 'Data transformation',
    icon: <Settings className="w-4 h-4" />,
    color: 'bg-green-100 text-green-700 border-green-200',
    category: 'Process'
  },
  {
    type: 'data-transform',
    label: 'Data Transform',
    description: 'Transform data structure',
    icon: <BarChart3 className="w-4 h-4" />,
    color: 'bg-green-100 text-green-700 border-green-200',
    category: 'Process'
  },
  {
    type: 'ai-process',
    label: 'AI Process',
    description: 'AI-powered processing',
    icon: <Zap className="w-4 h-4" />,
    color: 'bg-green-100 text-green-700 border-green-200',
    category: 'Process'
  },

  // Conditional Nodes
  {
    type: 'conditional',
    label: 'Conditional',
    description: 'Decision point with branches',
    icon: <GitBranch className="w-4 h-4" />,
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    category: 'Logic'
  },

  // Code Nodes
  {
    type: 'code',
    label: 'Code',
    description: 'Custom code execution',
    icon: <Code className="w-4 h-4" />,
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    category: 'Custom'
  },

  // Output Nodes
  {
    type: 'output',
    label: 'Output',
    description: 'Final result output',
    icon: <FileOutput className="w-4 h-4" />,
    color: 'bg-red-100 text-red-700 border-red-200',
    category: 'Output'
  },
  {
    type: 'email-output',
    label: 'Email Output',
    description: 'Send email notification',
    icon: <Mail className="w-4 h-4" />,
    color: 'bg-red-100 text-red-700 border-red-200',
    category: 'Output'
  },
  {
    type: 'user-notification',
    label: 'User Notification',
    description: 'Notify users',
    icon: <Users className="w-4 h-4" />,
    color: 'bg-red-100 text-red-700 border-red-200',
    category: 'Output'
  },
];

const onDragStart = (event: React.DragEvent, nodeType: string) => {
  event.dataTransfer.setData('application/reactflow', nodeType);
  event.dataTransfer.effectAllowed = 'move';
};

export function NodeLibrary() {
  const categories = Array.from(new Set(nodeTypes.map(node => node.category)));

  return (
    <div className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          Node Library
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Drag nodes to the canvas to build your workflow
        </p>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto">
        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                {category}
              </h3>
              <div className="space-y-2">
                {nodeTypes
                  .filter(node => node.category === category)
                  .map((node) => (
                    <div
                      key={node.type}
                      draggable
                      onDragStart={(event) => onDragStart(event, node.type)}
                      className={`
                        p-3 rounded-lg border-2 border-dashed cursor-grab hover:border-solid
                        transition-all duration-200 hover:shadow-md
                        ${node.color}
                        hover:scale-105 active:scale-95
                      `}
                    >
                      <div className="flex items-center space-x-2">
                        {node.icon}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {node.label}
                          </div>
                          <div className="text-xs opacity-75 truncate">
                            {node.description}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Analysis Integration Section */}
        <div className="mt-6 pt-4 border-t">
          <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            Implementation Phases
          </h3>
          <div className="space-y-2">
            <div className="p-3 rounded-lg border-2 border-dashed bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 cursor-pointer hover:border-solid hover:shadow-md transition-all duration-200">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-blue-800">
                    Technical Implementation
                  </div>
                  <div className="text-xs text-blue-600">
                    Development phase based on technical analysis
                  </div>
                </div>
              </div>
            </div>
            <div className="p-3 rounded-lg border-2 border-dashed bg-gradient-to-r from-green-50 to-blue-50 border-green-200 cursor-pointer hover:border-solid hover:shadow-md transition-all duration-200">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-green-600" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-green-800">
                    Financial Planning
                  </div>
                  <div className="text-xs text-green-600">
                    Budget and revenue implementation
                  </div>
                </div>
              </div>
            </div>
            <div className="p-3 rounded-lg border-2 border-dashed bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 cursor-pointer hover:border-solid hover:shadow-md transition-all duration-200">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-purple-600" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-purple-800">
                    Market Strategy
                  </div>
                  <div className="text-xs text-purple-600">
                    Execute market analysis recommendations
                  </div>
                </div>
              </div>
            </div>
            <div className="p-3 rounded-lg border-2 border-dashed bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 cursor-pointer hover:border-solid hover:shadow-md transition-all duration-200">
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4 text-yellow-600" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-yellow-800">
                    Quality Assurance
                  </div>
                  <div className="text-xs text-yellow-600">
                    Testing and validation phase
                  </div>
                </div>
              </div>
            </div>
            <div className="p-3 rounded-lg border-2 border-dashed bg-gradient-to-r from-red-50 to-pink-50 border-red-200 cursor-pointer hover:border-solid hover:shadow-md transition-all duration-200">
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-red-600" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-red-800">
                    Deployment & Monitoring
                  </div>
                  <div className="text-xs text-red-600">
                    Production deployment and feedback
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </div>
  );
}
