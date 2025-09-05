'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  NodeTypes,
  EdgeTypes,
  ReactFlowProvider,
  ReactFlowInstance,
  OnNodesChange,
  OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { NodeLibrary } from './workflow/NodeLibrary';
import { NodeConfigPanel } from './workflow/NodeConfigPanel';
import { CustomEdge } from './workflow/CustomEdge';
import { InputNode } from './workflow/nodes/InputNode';
import { OutputNode } from './workflow/nodes/OutputNode';
import { ProcessNode } from './workflow/nodes/ProcessNode';
import { ConditionalNode } from './workflow/nodes/ConditionalNode';
import { CodeNode } from './workflow/nodes/CodeNode';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Save, Play, Trash2, Download, Upload, Workflow, Sparkles, RefreshCw, CheckCircle, Clock, AlertCircle } from 'lucide-react';

// Define node types
const nodeTypes: NodeTypes = {
  input: InputNode,
  output: OutputNode,
  process: ProcessNode,
  conditional: ConditionalNode,
  code: CodeNode,
};

// Define edge types
const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

// Initial nodes and edges
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'input',
    position: { x: 100, y: 100 },
    data: { label: 'Start', description: 'Workflow entry point' },
  },
  {
    id: '2',
    type: 'output',
    position: { x: 500, y: 100 },
    data: { label: 'End', description: 'Workflow completion' },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    type: 'custom',
  },
];

interface WorkflowBuilderProps {
  projectId: string;
  analysisData?: any;
}

export function WorkflowBuilder({ projectId, analysisData }: WorkflowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [workflowResults, setWorkflowResults] = useState<any>(null);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [isSavingResults, setIsSavingResults] = useState(false);
  const { toast } = useToast();

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // Handle edge connection
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, type: 'custom' }, eds));
    },
    [setEdges]
  );

  // Handle drag over
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) {
        return;
      }

      if (!reactFlowInstance) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `${Date.now()}`,
        type,
        position,
        data: {
          label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
          description: `A ${type} node`,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  // Execute workflow
  const executeWorkflow = useCallback(async () => {
    setIsExecuting(true);
    
    try {
      // Simulate workflow execution
      const executionSteps = [
        'Initializing workflow...',
        'Processing input nodes...',
        'Executing process nodes...',
        'Evaluating conditions...',
        'Generating outputs...',
        'Workflow completed successfully!'
      ];

      for (let i = 0; i < executionSteps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast({
          title: "Workflow Execution",
          description: executionSteps[i],
        });
      }

      // Generate mock results based on the workflow
      const mockResults = {
        executionId: `exec_${Date.now()}`,
        timestamp: new Date().toISOString(),
        status: 'completed',
        duration: '6.2s',
        nodesExecuted: nodes.length,
        totalConnections: edges.length,
        results: {
          technicalImplementation: {
            status: 'completed',
            output: 'Technical architecture implemented successfully',
            metrics: {
              codeQuality: 'A+',
              testCoverage: '95%',
              performance: 'Excellent'
            }
          },
          marketStrategy: {
            status: 'completed',
            output: 'Market strategy executed with 3 key initiatives',
            metrics: {
              marketReach: '85%',
              competitiveAdvantage: 'High',
              userAdoption: 'Projected 40%'
            }
          },
          financialPlanning: {
            status: 'completed',
            output: 'Financial projections and budget allocation completed',
            metrics: {
              budgetUtilization: '78%',
              roi: 'Projected 250%',
              costSavings: '$45,000'
            }
          },
          businessOperations: {
            status: 'completed',
            output: 'Business model implementation in progress',
            metrics: {
              operationalEfficiency: '92%',
              processAutomation: '85%',
              stakeholderSatisfaction: 'High'
            }
          },
          qualityAssurance: {
            status: 'completed',
            output: 'All quality gates passed successfully',
            metrics: {
              testPassRate: '98%',
              defectDensity: '0.2 per KLOC',
              userAcceptance: 'Approved'
            }
          },
          deployment: {
            status: 'completed',
            output: 'Successfully deployed to production environment',
            metrics: {
              deploymentTime: '12 minutes',
              zeroDowntime: 'Achieved',
              rollbackCapability: 'Available'
            }
          }
        },
        summary: {
          totalTasks: nodes.length,
          completedTasks: nodes.length,
          successRate: '100%',
          overallStatus: 'Success',
          nextSteps: [
            'Monitor system performance for 48 hours',
            'Collect user feedback and metrics',
            'Plan next iteration based on results',
            'Update documentation with lessons learned'
          ]
        }
      };

      setWorkflowResults(mockResults);
      setShowResultsModal(true);

      toast({
        title: "Success",
        description: "Workflow executed successfully! View results in the modal.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to execute workflow",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  }, [toast, nodes, edges]);

  // Save workflow
  const saveWorkflow = useCallback(() => {
    const workflowData = {
      nodes,
      edges,
      projectId,
      timestamp: new Date().toISOString(),
    };
    
    localStorage.setItem(`workflow-${projectId}`, JSON.stringify(workflowData));
    
    toast({
      title: "Workflow Saved",
      description: "Your workflow has been saved successfully!",
    });
  }, [nodes, edges, projectId, toast]);

  // Load workflow
  const loadWorkflow = useCallback(() => {
    const savedWorkflow = localStorage.getItem(`workflow-${projectId}`);
    if (savedWorkflow) {
      const workflowData = JSON.parse(savedWorkflow);
      setNodes(workflowData.nodes || initialNodes);
      setEdges(workflowData.edges || initialEdges);
      
      toast({
        title: "Workflow Loaded",
        description: "Your workflow has been loaded successfully!",
      });
    } else {
      toast({
        title: "No Saved Workflow",
        description: "No saved workflow found for this project",
        variant: "destructive",
      });
    }
  }, [projectId, setNodes, setEdges, toast]);

  // Clear workflow
  const clearWorkflow = useCallback(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setSelectedNode(null);
    
    toast({
      title: "Workflow Cleared",
      description: "Workflow has been reset to default",
    });
  }, [setNodes, setEdges, toast]);

  // Export workflow
  const exportWorkflow = useCallback(() => {
    const workflowData = {
      nodes,
      edges,
      projectId,
      timestamp: new Date().toISOString(),
    };
    
    const dataStr = JSON.stringify(workflowData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `workflow-${projectId}-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast({
      title: "Workflow Exported",
      description: "Your workflow has been exported successfully!",
    });
  }, [nodes, edges, projectId, toast]);

  // Auto-generate workflow from analysis data
  const generateWorkflowFromAnalysis = useCallback(async () => {
    if (!analysisData || Object.keys(analysisData).length === 0) {
      toast({
        title: "No Analysis Data",
        description: "Please run some analyses first to generate an implementation workflow",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      // Generate workflow based on available analysis data
      const generatedNodes: Node[] = [];
      const generatedEdges: Edge[] = [];
      let nodeId = 1;

      // Start node
      generatedNodes.push({
        id: `${nodeId++}`,
        type: 'input',
        position: { x: 100, y: 100 },
        data: { 
          label: 'Project Start', 
          description: 'Begin implementation based on analysis results',
          outputFormat: 'json'
        },
      });

      let currentY = 200;
      const nodeSpacing = 150;

      // Technical Analysis -> Development Phase
      if (analysisData.technical) {
        generatedNodes.push({
          id: `${nodeId++}`,
          type: 'process',
          position: { x: 300, y: currentY },
          data: { 
            label: 'Technical Implementation', 
            description: 'Implement technical recommendations from analysis',
            transformType: 'technical',
            parameters: {
              insights: analysisData.technical.insights || [],
              recommendations: analysisData.technical.recommendations || []
            }
          },
        });
        currentY += nodeSpacing;
      }

      // Market Analysis -> Market Strategy
      if (analysisData.market) {
        generatedNodes.push({
          id: `${nodeId++}`,
          type: 'process',
          position: { x: 300, y: currentY },
          data: { 
            label: 'Market Strategy', 
            description: 'Execute market analysis recommendations',
            transformType: 'market',
            parameters: {
              marketInsights: analysisData.market.insights || [],
              marketRecommendations: analysisData.market.recommendations || []
            }
          },
        });
        currentY += nodeSpacing;
      }

      // Financial Analysis -> Financial Planning
      if (analysisData.financial) {
        generatedNodes.push({
          id: `${nodeId++}`,
          type: 'process',
          position: { x: 300, y: currentY },
          data: { 
            label: 'Financial Planning', 
            description: 'Implement financial projections and cost management',
            transformType: 'financial',
            parameters: {
              financialProjections: analysisData.financial.financialProjections || {},
              costStructure: analysisData.financial.costStructure || {}
            }
          },
        });
        currentY += nodeSpacing;
      }

      // Business Model Canvas -> Business Operations
      if (analysisData.bmc) {
        generatedNodes.push({
          id: `${nodeId++}`,
          type: 'process',
          position: { x: 300, y: currentY },
          data: { 
            label: 'Business Operations', 
            description: 'Implement business model canvas recommendations',
            transformType: 'business',
            parameters: {
              businessModel: analysisData.bmc.businessModelCanvas || {}
            }
          },
        });
        currentY += nodeSpacing;
      }

      // Conditional node for risk assessment
      if (analysisData.roast) {
        generatedNodes.push({
          id: `${nodeId++}`,
          type: 'conditional',
          position: { x: 500, y: currentY - 100 },
          data: { 
            label: 'Risk Assessment', 
            description: 'Evaluate potential risks and mitigation strategies',
            condition: 'risks.length > 0',
            parameters: {
              risks: analysisData.roast.realityCheck || [],
              mitigations: analysisData.roast.improvements || []
            }
          },
        });
      }

      // Quality Assurance node
      generatedNodes.push({
        id: `${nodeId++}`,
        type: 'process',
        position: { x: 700, y: currentY - 200 },
        data: { 
          label: 'Quality Assurance', 
          description: 'Test and validate implementation',
          transformType: 'qa',
          parameters: {
            testCases: ['Unit Tests', 'Integration Tests', 'User Acceptance Tests']
          }
        },
      });

      // Deployment node
      generatedNodes.push({
        id: `${nodeId++}`,
        type: 'process',
        position: { x: 700, y: currentY - 100 },
        data: { 
          label: 'Deployment', 
          description: 'Deploy to production environment',
          transformType: 'deployment',
          parameters: {
            environment: 'production',
            deploymentStrategy: 'blue-green'
          }
        },
      });

      // Monitoring and feedback node
      generatedNodes.push({
        id: `${nodeId++}`,
        type: 'process',
        position: { x: 700, y: currentY },
        data: { 
          label: 'Monitoring & Feedback', 
          description: 'Monitor performance and collect user feedback',
          transformType: 'monitoring',
          parameters: {
            metrics: ['Performance', 'User Engagement', 'Business KPIs']
          }
        },
      });

      // End node
      generatedNodes.push({
        id: `${nodeId++}`,
        type: 'output',
        position: { x: 900, y: currentY - 100 },
        data: { 
          label: 'Implementation Complete', 
          description: 'Project implementation successfully completed',
          outputFormat: 'success'
        },
      });

      // Create edges connecting the workflow
      const startNode = generatedNodes[0];
      const endNode = generatedNodes[generatedNodes.length - 1];
      
      // Connect start to first process
      if (generatedNodes.length > 2) {
        generatedEdges.push({
          id: 'e-start-first',
          source: startNode.id,
          target: generatedNodes[1].id,
          type: 'custom',
        });
      }

      // Connect processes in sequence
      for (let i = 1; i < generatedNodes.length - 2; i++) {
        if (generatedNodes[i].type === 'process') {
          const nextProcess = generatedNodes.slice(i + 1).find(node => node.type === 'process');
          if (nextProcess) {
            generatedEdges.push({
              id: `e-${i}-${nextProcess.id}`,
              source: generatedNodes[i].id,
              target: nextProcess.id,
              type: 'custom',
            });
          }
        }
      }

      // Connect to end node
      const lastProcess = generatedNodes.slice(-2, -1)[0];
      if (lastProcess) {
        generatedEdges.push({
          id: 'e-last-end',
          source: lastProcess.id,
          target: endNode.id,
          type: 'custom',
        });
      }

      // Update the workflow
      setNodes(generatedNodes);
      setEdges(generatedEdges);
      setSelectedNode(null);

      toast({
        title: "Workflow Generated",
        description: `Generated implementation workflow with ${generatedNodes.length} nodes based on your analysis data`,
      });

    } catch (error) {
      console.error('Error generating workflow:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate workflow from analysis data",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [analysisData, setNodes, setEdges, toast]);

  // Save workflow results
  const saveWorkflowResults = useCallback(async () => {
    if (!workflowResults) return;

    setIsSavingResults(true);
    
    try {
      const response = await fetch(`/api/projects/${projectId}/workflow-results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflowResults,
          projectId,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        toast({
          title: "Results Saved",
          description: "Workflow execution results have been saved successfully!",
        });
      } else {
        // Fallback to localStorage if API fails
        localStorage.setItem(`workflow-results-${projectId}-${workflowResults.executionId}`, JSON.stringify(workflowResults));
        toast({
          title: "Results Saved Locally",
          description: "Workflow results saved to local storage",
        });
      }
    } catch (error) {
      // Fallback to localStorage
      localStorage.setItem(`workflow-results-${projectId}-${workflowResults.executionId}`, JSON.stringify(workflowResults));
      toast({
        title: "Results Saved Locally",
        description: "Workflow results saved to local storage",
      });
    } finally {
      setIsSavingResults(false);
    }
  }, [workflowResults, projectId, toast]);

  // Load workflow on component mount
  useEffect(() => {
    loadWorkflow();
  }, [loadWorkflow]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Workflow className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold">Implementation Workflow Builder</h2>
              <p className="text-sm text-muted-foreground">
                Auto-generate implementation plans from your analysis or design custom workflows
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {analysisData && Object.keys(analysisData).length > 0 ? (
              <Badge variant="default" className="flex items-center bg-green-100 text-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                {Object.keys(analysisData).length} analyses available
              </Badge>
            ) : (
              <Badge variant="outline" className="flex items-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2" />
                No analysis data
              </Badge>
            )}
            <Badge variant="outline" className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
              {nodes.length} nodes, {edges.length} connections
            </Badge>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex-shrink-0 p-3 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              onClick={generateWorkflowFromAnalysis}
              disabled={isGenerating}
              className="flex items-center bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Auto-Generate from Analysis'}
            </Button>
            <Button
              onClick={executeWorkflow}
              disabled={isExecuting}
              className="flex items-center"
            >
              <Play className="w-4 h-4 mr-2" />
              {isExecuting ? 'Executing...' : 'Execute Workflow'}
            </Button>
            <Button
              onClick={saveWorkflow}
              variant="outline"
              className="flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button
              onClick={loadWorkflow}
              variant="outline"
              className="flex items-center"
            >
              <Upload className="w-4 h-4 mr-2" />
              Load
            </Button>
            <Button
              onClick={exportWorkflow}
              variant="outline"
              className="flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              onClick={clearWorkflow}
              variant="outline"
              className="flex items-center text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Node Library Sidebar */}
        <div className="w-48 border-r bg-white">
          <NodeLibrary />
        </div>

        {/* React Flow Canvas */}
        <div className="flex-1 relative">
          {nodes.length <= 2 && edges.length <= 1 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center max-w-md">
                <Workflow className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold mb-2">Create Your Implementation Workflow</h3>
                <p className="text-gray-600 mb-6">
                  {analysisData && Object.keys(analysisData).length > 0 
                    ? "Click 'Auto-Generate from Analysis' to create an implementation plan based on your analysis results, or drag nodes from the sidebar to build a custom workflow."
                    : "Run some analyses first, then use 'Auto-Generate from Analysis' to create an implementation plan, or drag nodes from the sidebar to build a custom workflow."
                  }
                </p>
                {analysisData && Object.keys(analysisData).length > 0 && (
                  <Button
                    onClick={generateWorkflowFromAnalysis}
                    disabled={isGenerating}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {isGenerating ? 'Generating...' : 'Auto-Generate from Analysis'}
                  </Button>
                )}
              </div>
            </div>
          ) : null}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <Controls />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          </ReactFlow>
        </div>

        {/* Node Configuration Panel */}
        {selectedNode && (
          <div className="w-80 border-l bg-white">
            <NodeConfigPanel
              node={selectedNode}
              onUpdateNode={(updatedNode: Node) => {
                setNodes((nds) =>
                  nds.map((node) =>
                    node.id === updatedNode.id ? updatedNode : node
                  )
                );
                setSelectedNode(updatedNode);
              }}
              onClose={() => setSelectedNode(null)}
            />
          </div>
        )}
      </div>

      {/* Workflow Results Modal */}
      <Dialog open={showResultsModal} onOpenChange={setShowResultsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
              Workflow Execution Results
            </DialogTitle>
            <DialogDescription>
              Execution completed successfully on {workflowResults?.timestamp ? new Date(workflowResults.timestamp).toLocaleString() : 'Unknown time'}
            </DialogDescription>
          </DialogHeader>

          {workflowResults && (
            <div className="space-y-6">
              {/* Execution Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Execution Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{workflowResults.summary.successRate}</div>
                      <div className="text-sm text-green-700">Success Rate</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{workflowResults.duration}</div>
                      <div className="text-sm text-blue-700">Duration</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{workflowResults.nodesExecuted}</div>
                      <div className="text-sm text-purple-700">Nodes Executed</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{workflowResults.totalConnections}</div>
                      <div className="text-sm text-orange-700">Connections</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Node Results */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Node Execution Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(workflowResults.results).map(([nodeName, result]: [string, any]) => (
                      <div key={nodeName} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold capitalize">{nodeName.replace(/([A-Z])/g, ' $1').trim()}</h4>
                          <Badge variant={result.status === 'completed' ? 'default' : 'secondary'} className="flex items-center">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {result.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{result.output}</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {Object.entries(result.metrics).map(([metric, value]: [string, any]) => (
                            <div key={metric} className="text-xs bg-gray-50 p-2 rounded">
                              <span className="font-medium capitalize">{metric.replace(/([A-Z])/g, ' $1').trim()}:</span>
                              <span className="ml-1 text-muted-foreground">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Next Steps */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Next Steps</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {workflowResults.summary.nextSteps.map((step: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <Clock className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{step}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowResultsModal(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={saveWorkflowResults}
                  disabled={isSavingResults}
                  className="flex items-center"
                >
                  {isSavingResults ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Results
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Wrapper component with ReactFlowProvider
export function WorkflowBuilderWrapper({ projectId, analysisData }: WorkflowBuilderProps) {
  return (
    <ReactFlowProvider>
      <WorkflowBuilder projectId={projectId} analysisData={analysisData} />
    </ReactFlowProvider>
  );
}
