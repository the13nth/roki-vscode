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
import { SupplierNode } from './workflow/nodes/SupplierNode';
import { StakeholderNode } from './workflow/nodes/StakeholderNode';
import { RegulatorNode } from './workflow/nodes/RegulatorNode';
import { ClientNode } from './workflow/nodes/ClientNode';
import { TeamNode } from './workflow/nodes/TeamNode';

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
import { Save, Play, Trash2, Download, Upload, Workflow, Sparkles, RefreshCw, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';
import { WorkflowAnalysisService, BusinessAnalysisResult } from '@/lib/workflowAnalysisService';
import { BusinessAnalysis } from './BusinessAnalysis';

// Define node types
const nodeTypes: NodeTypes = {
  input: InputNode,
  output: OutputNode,
  process: ProcessNode,
  conditional: ConditionalNode,
  code: CodeNode,
  supplier: SupplierNode,
  stakeholder: StakeholderNode,
  regulator: RegulatorNode,
  client: ClientNode,
  team: TeamNode,
};

// Define edge types
const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
};

// Initial empty workflow
const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

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
  const [businessAnalysis, setBusinessAnalysis] = useState<BusinessAnalysisResult | null>(null);
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
      const customData = event.dataTransfer.getData('application/reactflow-data');
      
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

      let nodeData: any = {
        label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
        description: `A ${type} node`,
      };

      // Use custom data if available (for CEO, COO, CTO cards)
      if (customData) {
        try {
          const parsedData = JSON.parse(customData);
          nodeData = { ...nodeData, ...parsedData };
        } catch (error) {
          console.error('Failed to parse custom node data:', error);
        }
      }

      const newNode: Node = {
        id: `${Date.now()}`,
        type,
        position,
        data: nodeData,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  // Execute workflow
  const executeWorkflow = useCallback(async () => {
    console.log('Starting fresh workflow execution...', { 
      nodes: nodes.length, 
      edges: edges.length,
      timestamp: new Date().toISOString()
    });
    
    if (nodes.length === 0) {
      toast({
        title: "No Workflow",
        description: "Please create a workflow before executing",
        variant: "destructive",
      });
      return;
    }
    
    // Clear any previous results to ensure fresh analysis
    setWorkflowResults(null);
    setBusinessAnalysis(null);
    setIsExecuting(true);
    
    // Show that fresh analysis is starting
    toast({
      title: "Starting Analysis",
      description: "Running fresh business analysis on your workflow...",
      variant: "default",
    });
    
    try {
      // Perform fresh business analysis
      let businessAnalysisResult;
      try {
        console.log('Starting fresh business analysis...');
        const analysisService = new WorkflowAnalysisService();
        businessAnalysisResult = await analysisService.analyzeWorkflow(projectId, nodes, edges);
        console.log('Fresh business analysis completed:', businessAnalysisResult);
        setBusinessAnalysis(businessAnalysisResult);
        
      } catch (businessError) {
        console.error('Business analysis failed:', businessError);
        // Continue with execution even if business analysis fails
        businessAnalysisResult = null;
      }

      // Check if business analysis was successful
      if (!businessAnalysisResult) {
        throw new Error('Business analysis failed - unable to analyze workflow');
      }

      // Set results with only business analysis
      const results = {
        executionId: `exec_${Date.now()}`,
        timestamp: new Date().toISOString(),
        status: 'completed',
        duration: '3.2s',
        nodesAnalyzed: nodes.length,
        businessAnalysis: businessAnalysisResult
      };

      console.log('Setting analysis results...', results);
      setWorkflowResults(results);
      setShowResultsModal(true);

      console.log('Business analysis completed successfully');
      const businessRating = businessAnalysisResult.overallRating;
      toast({
        title: "Success",
        description: `Business analysis completed! Overall rating: ${businessRating}/100`,
        variant: "default",
      });
    } catch (error) {
      console.error('Business analysis failed:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : 'Unable to perform business analysis. Please check your workflow and try again.',
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  }, [toast, nodes, edges, setWorkflowResults, setBusinessAnalysis]);

  // Generate basic workflow with executive nodes
  const generateBasicWorkflow = useCallback(() => {
    const generatedNodes: Node[] = [];
    const generatedEdges: Edge[] = [];
    let nodeId = 1;

    // Calculate center position for the workflow
    const centerX = 400;
    const startY = 100;

    // Add executive team nodes
    const executiveNodes = [
      {
        id: `exec-${nodeId++}`,
        type: 'team',
        position: { x: 50, y: 100 },
        data: { 
          label: 'CEO', 
          description: 'Chief Executive Officer - Strategic oversight and decision making',
          role: 'CEO',
          department: 'Executive'
        },
      },
      {
        id: `exec-${nodeId++}`,
        type: 'team',
        position: { x: 50, y: 250 },
        data: { 
          label: 'COO', 
          description: 'Chief Operating Officer - Operations and process management',
          role: 'COO',
          department: 'Operations'
        },
      },
      {
        id: `exec-${nodeId++}`,
        type: 'team',
        position: { x: 50, y: 400 },
        data: { 
          label: 'CTO', 
          description: 'Chief Technology Officer - Technical strategy and implementation',
          role: 'CTO',
          department: 'Technology'
        },
      }
    ];

    generatedNodes.push(...executiveNodes);

    // Add a basic project start node
    generatedNodes.push({
      id: `${nodeId++}`,
      type: 'input',
      position: { x: centerX, y: startY },
      data: { 
        label: 'Project Start', 
        description: 'Begin your project implementation',
        outputFormat: 'json'
      },
    });

    // Add a basic project end node
    generatedNodes.push({
      id: `${nodeId++}`,
      type: 'output',
      position: { x: centerX, y: startY + 200 },
      data: { 
        label: 'Project Complete', 
        description: 'Project implementation completed',
        outputFormat: 'success'
      },
    });

    // Connect start to end
    generatedEdges.push({
      id: 'e-start-end',
      source: generatedNodes[3].id, // Project Start
      target: generatedNodes[4].id, // Project Complete
      type: 'custom',
    });

    // Connect CEO to project start
    generatedEdges.push({
      id: 'e-ceo-start',
      source: executiveNodes[0].id, // CEO
      target: generatedNodes[3].id, // Project Start
      type: 'custom',
    });

    // Update the workflow
    setNodes(generatedNodes);
    setEdges(generatedEdges);
    setSelectedNode(null);

    // Fit view to center the workflow
    setTimeout(() => {
      if (reactFlowInstance) {
        reactFlowInstance.fitView({ padding: 0.1 });
      }
    }, 100);

    toast({
      title: "Basic Workflow Generated",
      description: "A basic workflow with executive team has been created",
    });
  }, [setNodes, setEdges, reactFlowInstance, toast]);

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

  // Ensure executive nodes are present in workflow
  const ensureExecutiveNodes = useCallback((nodes: Node[], edges: Edge[]) => {
    const hasExecutiveNodes = nodes.some(node => node.type === 'team');
    
    if (!hasExecutiveNodes) {
      // Add executive nodes
      const executiveNodes = [
        {
          id: 'exec-ceo',
          type: 'team',
          position: { x: 50, y: 100 },
          data: { 
            label: 'CEO', 
            description: 'Chief Executive Officer - Strategic oversight and decision making',
            role: 'CEO',
            department: 'Executive'
          },
        },
        {
          id: 'exec-coo',
          type: 'team',
          position: { x: 50, y: 250 },
          data: { 
            label: 'COO', 
            description: 'Chief Operating Officer - Operations and process management',
            role: 'COO',
            department: 'Operations'
          },
        },
        {
          id: 'exec-cto',
          type: 'team',
          position: { x: 50, y: 400 },
          data: { 
            label: 'CTO', 
            description: 'Chief Technology Officer - Technical strategy and implementation',
            role: 'CTO',
            department: 'Technology'
          },
        }
      ];

      // Add executive nodes to the beginning
      const updatedNodes = [...executiveNodes, ...nodes];
      
      // Add connections from CEO to project start if it exists
      const projectStartNode = updatedNodes.find(node => node.data.label === 'Project Start');
      if (projectStartNode) {
        edges.push({
          id: 'e-ceo-start',
          source: 'exec-ceo',
          target: projectStartNode.id,
          type: 'custom',
        });
      }

      return { nodes: updatedNodes, edges };
    }
    
    return { nodes, edges };
  }, []);

  // Load workflow
  const loadWorkflow = useCallback(() => {
    const savedWorkflow = localStorage.getItem(`workflow-${projectId}`);
    if (savedWorkflow) {
      const workflowData = JSON.parse(savedWorkflow);
      const { nodes: updatedNodes, edges: updatedEdges } = ensureExecutiveNodes(
        workflowData.nodes || initialNodes,
        workflowData.edges || initialEdges
      );
      
      setNodes(updatedNodes);
      setEdges(updatedEdges);
      
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
  }, [projectId, setNodes, setEdges, toast, ensureExecutiveNodes]);

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

  // Delete node
  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNode(null);
    
    toast({
      title: "Node Deleted",
      description: "Node has been removed from the workflow",
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

  // Generate stakeholder nodes from BMC data
  const generateStakeholderNodesFromBMC = useCallback((bmcData: any, centerX: number, startY: number, startNodeId: number) => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let nodeId = startNodeId;
    let currentX = centerX - 200;
    let currentY = startY;

    // Extract key partners (suppliers)
    if (bmcData.keyPartners && Array.isArray(bmcData.keyPartners)) {
      bmcData.keyPartners.forEach((partner: string, index: number) => {
        nodes.push({
          id: `${nodeId++}`,
          type: 'supplier',
          position: { x: currentX, y: currentY + (index * 80) },
          data: {
            label: partner,
            description: 'Key business partner',
            supplierType: 'Strategic Partner',
            relationship: 'Key Partnership'
          },
        });
      });
    }

    // Extract customer segments (clients)
    if (bmcData.customerSegments && Array.isArray(bmcData.customerSegments)) {
      bmcData.customerSegments.forEach((segment: string, index: number) => {
        nodes.push({
          id: `${nodeId++}`,
          type: 'client',
          position: { x: centerX + 200, y: currentY + (index * 80) },
          data: {
            label: segment,
            description: 'Target customer segment',
            clientType: 'Primary Segment',
            segment: segment,
            valueProposition: bmcData.valuePropositions?.[0] || 'Core value'
          },
        });
      });
    }

    // Extract key stakeholders
    if (bmcData.keyStakeholders && Array.isArray(bmcData.keyStakeholders)) {
      bmcData.keyStakeholders.forEach((stakeholder: string, index: number) => {
        nodes.push({
          id: `${nodeId++}`,
          type: 'stakeholder',
          position: { x: centerX, y: currentY + 200 + (index * 80) },
          data: {
            label: stakeholder,
            description: 'Key business stakeholder',
            stakeholderType: 'Internal Stakeholder',
            influence: 'High',
            interest: 'High'
          },
        });
      });
    }

    // Add regulatory considerations if mentioned in value propositions or channels
    const regulatoryKeywords = ['compliance', 'regulation', 'legal', 'government', 'policy'];
    const hasRegulatoryMention = JSON.stringify(bmcData).toLowerCase().includes(regulatoryKeywords.join('|'));
    
    if (hasRegulatoryMention) {
      nodes.push({
        id: `${nodeId++}`,
        type: 'regulator',
        position: { x: centerX - 100, y: currentY + 300 },
        data: {
          label: 'Regulatory Body',
          description: 'Relevant regulatory authority',
          regulatorType: 'Industry Regulator',
          jurisdiction: 'Local/National',
          complianceLevel: 'Required'
        },
      });
    }

    // Create connections from business operations to stakeholders
    const businessOpsNodeId = startNodeId - 1; // The business operations node created just before
    nodes.forEach((node, index) => {
      edges.push({
        id: `e-business-${node.id}`,
        source: `${businessOpsNodeId}`,
        target: node.id,
        type: 'custom',
      });
    });

    return { nodes, edges };
  }, []);

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

      // Calculate center position for the workflow
      const centerX = 400;
      const startY = 100;
      
      // Start node
      generatedNodes.push({
        id: `${nodeId++}`,
        type: 'input',
        position: { x: centerX, y: startY },
        data: { 
          label: 'Project Start', 
          description: 'Begin implementation based on analysis results',
          outputFormat: 'json'
        },
      });

      let currentY = startY + 200;
      const nodeSpacing = 150;

      // Technical Analysis -> Development Phase
      if (analysisData.technical) {
        generatedNodes.push({
          id: `${nodeId++}`,
          type: 'process',
          position: { x: centerX, y: currentY },
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
          position: { x: centerX, y: currentY },
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
          position: { x: centerX, y: currentY },
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
          position: { x: centerX, y: currentY },
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

        // Generate stakeholder nodes from BMC data
        const bmcData = analysisData.bmc.businessModelCanvas || {};
        const stakeholderNodes = generateStakeholderNodesFromBMC(bmcData, centerX, currentY, nodeId);
        generatedNodes.push(...stakeholderNodes.nodes);
        generatedEdges.push(...stakeholderNodes.edges);
        nodeId += stakeholderNodes.nodes.length;
        currentY += nodeSpacing * 2; // Extra space for stakeholder nodes
      }

      // Conditional node for risk assessment
      if (analysisData.roast) {
        generatedNodes.push({
          id: `${nodeId++}`,
          type: 'conditional',
          position: { x: centerX + 200, y: currentY - 100 },
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
        position: { x: centerX + 300, y: currentY - 200 },
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
        position: { x: centerX + 300, y: currentY - 100 },
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
        position: { x: centerX + 300, y: currentY },
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
        position: { x: centerX + 500, y: currentY - 100 },
        data: { 
          label: 'Implementation Complete', 
          description: 'Project implementation successfully completed',
          outputFormat: 'success'
        },
      });

      // Always add executive team nodes regardless of analysis data
      const executiveNodes = [
        {
          id: `exec-${nodeId++}`,
          type: 'team',
          position: { x: 50, y: 100 },
          data: { 
            label: 'CEO', 
            description: 'Chief Executive Officer - Strategic oversight and decision making',
            role: 'CEO',
            department: 'Executive'
          },
        },
        {
          id: `exec-${nodeId++}`,
          type: 'team',
          position: { x: 50, y: 250 },
          data: { 
            label: 'COO', 
            description: 'Chief Operating Officer - Operations and process management',
            role: 'COO',
            department: 'Operations'
          },
        },
        {
          id: `exec-${nodeId++}`,
          type: 'team',
          position: { x: 50, y: 400 },
          data: { 
            label: 'CTO', 
            description: 'Chief Technology Officer - Technical strategy and implementation',
            role: 'CTO',
            department: 'Technology'
          },
        }
      ];

      // Add executive nodes to the beginning of the array so they appear first
      generatedNodes.unshift(...executiveNodes);

      // Create edges connecting the workflow
      // Find the actual project start node (not the executive nodes)
      const startNode = generatedNodes.find(node => node.data.label === 'Project Start');
      const endNode = generatedNodes[generatedNodes.length - 1];
      
      // Connect start to first process
      if (startNode) {
        const firstProcessNode = generatedNodes.find(node => 
          node.type === 'process' && node.data.label === 'Technical Implementation'
        );
        if (firstProcessNode) {
          generatedEdges.push({
            id: 'e-start-first',
            source: startNode.id,
            target: firstProcessNode.id,
            type: 'custom',
          });
        }
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

      // Connect executive nodes to relevant process nodes
      const ceoNode = executiveNodes[0];
      const cooNode = executiveNodes[1];
      const ctoNode = executiveNodes[2];

      // Find process nodes by their labels
      const technicalNode = generatedNodes.find(node => node.data.label === 'Technical Implementation');
      const marketNode = generatedNodes.find(node => node.data.label === 'Market Strategy');
      const financialNode = generatedNodes.find(node => node.data.label === 'Financial Planning');
      const businessNode = generatedNodes.find(node => node.data.label === 'Business Operations');
      const qaNode = generatedNodes.find(node => node.data.label === 'Quality Assurance');
      const deploymentNode = generatedNodes.find(node => node.data.label === 'Deployment');

      // CEO connections - strategic oversight of all major processes
      if (ceoNode && startNode) {
        generatedEdges.push({
          id: 'e-ceo-start',
          source: ceoNode.id,
          target: startNode.id,
          type: 'custom',
        });
      }
      if (ceoNode && marketNode) {
        generatedEdges.push({
          id: 'e-ceo-market',
          source: ceoNode.id,
          target: marketNode.id,
          type: 'custom',
        });
      }
      if (ceoNode && financialNode) {
        generatedEdges.push({
          id: 'e-ceo-financial',
          source: ceoNode.id,
          target: financialNode.id,
          type: 'custom',
        });
      }

      // COO connections - operations and business processes
      if (cooNode && businessNode) {
        generatedEdges.push({
          id: 'e-coo-business',
          source: cooNode.id,
          target: businessNode.id,
          type: 'custom',
        });
      }
      if (cooNode && qaNode) {
        generatedEdges.push({
          id: 'e-coo-qa',
          source: cooNode.id,
          target: qaNode.id,
          type: 'custom',
        });
      }
      if (cooNode && deploymentNode) {
        generatedEdges.push({
          id: 'e-coo-deployment',
          source: cooNode.id,
          target: deploymentNode.id,
          type: 'custom',
        });
      }

      // CTO connections - technical processes
      if (ctoNode && technicalNode) {
        generatedEdges.push({
          id: 'e-cto-technical',
          source: ctoNode.id,
          target: technicalNode.id,
          type: 'custom',
        });
      }
      if (ctoNode && qaNode) {
        generatedEdges.push({
          id: 'e-cto-qa',
          source: ctoNode.id,
          target: qaNode.id,
          type: 'custom',
        });
      }
      if (ctoNode && deploymentNode) {
        generatedEdges.push({
          id: 'e-cto-deployment',
          source: ctoNode.id,
          target: deploymentNode.id,
          type: 'custom',
        });
      }

      // Update the workflow
      setNodes(generatedNodes);
      setEdges(generatedEdges);
      setSelectedNode(null);

      // Fit view to center the workflow
      setTimeout(() => {
        if (reactFlowInstance) {
          reactFlowInstance.fitView({ padding: 0.1 });
        }
      }, 100);

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
  }, [analysisData, setNodes, setEdges, generateStakeholderNodesFromBMC, toast]);

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
    const savedWorkflow = localStorage.getItem(`workflow-${projectId}`);
    if (savedWorkflow) {
      const workflowData = JSON.parse(savedWorkflow);
      const { nodes: updatedNodes, edges: updatedEdges } = ensureExecutiveNodes(
        workflowData.nodes || initialNodes,
        workflowData.edges || initialEdges
      );
      setNodes(updatedNodes);
      setEdges(updatedEdges);
    }
  }, [projectId, setNodes, setEdges, ensureExecutiveNodes]);

  // Auto-generate workflow if no saved workflow exists
  useEffect(() => {
    const savedWorkflow = localStorage.getItem(`workflow-${projectId}`);
    if (!savedWorkflow) {
      if (analysisData && Object.keys(analysisData).length > 0) {
        // Generate full workflow with analysis data
        generateWorkflowFromAnalysis();
      } else {
        // Generate basic workflow with just executive nodes
        generateBasicWorkflow();
      }
    }
  }, [projectId, analysisData, generateWorkflowFromAnalysis, generateBasicWorkflow]);

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
            <Button
              onClick={() => {
                if (analysisData && Object.keys(analysisData).length > 0) {
                  generateWorkflowFromAnalysis();
                } else {
                  generateBasicWorkflow();
                }
              }}
              variant="outline"
              className="flex items-center text-blue-600 hover:text-blue-700"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Regenerate
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
          {nodes.length === 0 && edges.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center max-w-md">
                <Workflow className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold mb-2">Create Your Implementation Workflow</h3>
                <p className="text-gray-600 mb-6">
                  {analysisData && Object.keys(analysisData).length > 0 
                    ? "A workflow will be automatically generated based on your analysis results, or you can drag nodes from the sidebar to build a custom workflow."
                    : "Run some analyses first to automatically generate an implementation plan, or drag nodes from the sidebar to build a custom workflow."
                  }
                </p>
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
              onDeleteNode={deleteNode}
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
              Business Analysis Results
            </DialogTitle>
            <DialogDescription>
              Business analysis completed successfully on {workflowResults?.timestamp ? new Date(workflowResults.timestamp).toLocaleString() : 'Unknown time'}
            </DialogDescription>
          </DialogHeader>

          {workflowResults && (
            <div className="space-y-6">
              {/* Execution Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Analysis Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{workflowResults.duration}</div>
                      <div className="text-sm text-blue-700">Duration</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{workflowResults.nodesAnalyzed}</div>
                      <div className="text-sm text-purple-700">Nodes Analyzed</div>
                    </div>
                    {workflowResults.businessAnalysis && (
                      <div className="text-center p-3 bg-emerald-50 rounded-lg">
                        <div className="text-2xl font-bold text-emerald-600">{workflowResults.businessAnalysis.overallRating}/100</div>
                        <div className="text-sm text-emerald-700">Business Rating</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Business Analysis */}
              {workflowResults.businessAnalysis && (
                <BusinessAnalysis analysis={workflowResults.businessAnalysis} />
              )}


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
