import { Node, Edge } from '@xyflow/react';

export interface BusinessAnalysisResult {
  overallRating: number;
  businessInsights: {
    organizationalStructure: {
      score: number;
      analysis: string;
      recommendations: string[];
    };
    processEfficiency: {
      score: number;
      analysis: string;
      recommendations: string[];
    };
    stakeholderAlignment: {
      score: number;
      analysis: string;
      recommendations: string[];
    };
    executionReadiness: {
      score: number;
      analysis: string;
      recommendations: string[];
    };
  };
  strategicRecommendations: {
    priority: 'high' | 'medium' | 'low';
    category: string;
    title: string;
    description: string;
    impact: string;
    action: string;
  }[];
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    risks: {
      risk: string;
      probability: string;
      impact: string;
      mitigation: string;
    }[];
  };
}

export class WorkflowAnalysisService {
  async analyzeWorkflow(projectId: string, nodes: Node[], edges: Edge[]): Promise<BusinessAnalysisResult> {
    console.log('🔍 WorkflowAnalysisService.analyzeWorkflow called');
    console.log('📊 Analyzing workflow with:', { nodes: nodes.length, edges: edges.length });
    
    const response = await fetch(`/api/projects/${projectId}/workflow-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nodes, edges })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}: Failed to analyze workflow`);
    }

    const data = await response.json();
    console.log('✅ Workflow analysis completed:', data.analysis);
    return data.analysis;
  }
}
