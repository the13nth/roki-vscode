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
  Zap,
  Truck,
  Shield,
  User,
  UserCheck,
  Crown,
  Briefcase,
  Cpu
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

  // Business Nodes
  {
    type: 'supplier',
    label: 'Supplier',
    description: 'External supplier or vendor',
    icon: <Truck className="w-4 h-4" />,
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    category: 'Business'
  },
  {
    type: 'stakeholder',
    label: 'Stakeholder',
    description: 'Key stakeholder or partner',
    icon: <Users className="w-4 h-4" />,
    color: 'bg-green-100 text-green-700 border-green-200',
    category: 'Business'
  },
  {
    type: 'regulator',
    label: 'Regulator',
    description: 'Regulatory body or authority',
    icon: <Shield className="w-4 h-4" />,
    color: 'bg-red-100 text-red-700 border-red-200',
    category: 'Business'
  },
  {
    type: 'client',
    label: 'Client',
    description: 'End customer or client',
    icon: <User className="w-4 h-4" />,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    category: 'Business'
  },
  {
    type: 'team',
    label: 'Team Member',
    description: 'Team member or executive',
    icon: <UserCheck className="w-4 h-4" />,
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    category: 'Business'
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

const onDragStart = (event: React.DragEvent, nodeType: string, nodeData?: any) => {
  event.dataTransfer.setData('application/reactflow', nodeType);
  if (nodeData) {
    event.dataTransfer.setData('application/reactflow-data', JSON.stringify(nodeData));
  }
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

        {/* Executive Team Section */}
        <div className="mt-6 pt-4 border-t">
          <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            Executive Team
          </h3>
          <div className="space-y-2">
            <div
              draggable
              onDragStart={(event) => onDragStart(event, 'team', { 
                label: 'CEO', 
                description: 'Chief Executive Officer',
                role: 'CEO',
                department: 'Executive'
              })}
              className="p-3 rounded-lg border-2 border-dashed bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 cursor-grab hover:border-solid hover:shadow-md transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <div className="flex items-center space-x-2">
                <Crown className="w-4 h-4 text-yellow-600" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-yellow-800">
                    CEO
                  </div>
                  <div className="text-xs text-yellow-600">
                    Chief Executive Officer
                  </div>
                </div>
              </div>
            </div>
            <div
              draggable
              onDragStart={(event) => onDragStart(event, 'team', { 
                label: 'COO', 
                description: 'Chief Operating Officer',
                role: 'COO',
                department: 'Operations'
              })}
              className="p-3 rounded-lg border-2 border-dashed bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 cursor-grab hover:border-solid hover:shadow-md transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <div className="flex items-center space-x-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-blue-800">
                    COO
                  </div>
                  <div className="text-xs text-blue-600">
                    Chief Operating Officer
                  </div>
                </div>
              </div>
            </div>
            <div
              draggable
              onDragStart={(event) => onDragStart(event, 'team', { 
                label: 'CTO', 
                description: 'Chief Technology Officer',
                role: 'CTO',
                department: 'Technology'
              })}
              className="p-3 rounded-lg border-2 border-dashed bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 cursor-grab hover:border-solid hover:shadow-md transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-green-600" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-green-800">
                    CTO
                  </div>
                  <div className="text-xs text-green-600">
                    Chief Technology Officer
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





