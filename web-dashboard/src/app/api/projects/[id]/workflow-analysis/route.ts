import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getApiConfiguration } from '@/lib/apiConfig';
import { validateSecureConfig } from '@/lib/secureConfig';
import { analysisVectorService } from '@/lib/analysisVectorService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const { nodes, edges } = await request.json();

    if (!nodes || !edges) {
      return NextResponse.json(
        { error: 'Nodes and edges are required' },
        { status: 400 }
      );
    }

    // Validate secure configuration
    const configValidation = validateSecureConfig();
    if (!configValidation.isValid) {
      console.error('❌ Secure configuration validation failed:', configValidation.errors);
      return NextResponse.json(
        { error: `Configuration error: ${configValidation.errors.join(', ')}` },
        { status: 500 }
      );
    }

    // Get API configuration
    let apiConfig;
    try {
      apiConfig = await getApiConfiguration();
      console.log(`🔑 API Source: ${apiConfig.source.toUpperCase()}`);
      console.log(`🤖 Provider: ${apiConfig.provider}, Model: ${apiConfig.model}`);
      console.log(`👤 User ID: ${userId}`);
      console.log(`📁 Project ID: ${projectId}`);
      
      if (apiConfig.source === 'none') {
        return NextResponse.json(
          { error: 'No AI configuration found. Please set GOOGLE_AI_API_KEY environment variable or configure your personal API key in profile settings.' },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('Failed to get API configuration:', error);
      return NextResponse.json(
        { error: 'Failed to load API configuration. Please check your settings.' },
        { status: 500 }
      );
    }

    console.log('🚀 Calling real Gemini API for workflow analysis...');
    
    // Get relevant context using vector search
    console.log(`🔍 Getting vector search context for workflow analysis`);
    let vectorContext = '';
    try {
      const context = await analysisVectorService.getAnalysisContext(
        projectId,
        'workflow',
        `workflow analysis business process ${nodes.map((n: any) => n.data?.label).join(' ')}`
      );
      
      if (context.relevantDocuments.length > 0 || context.relatedAnalyses.length > 0 || context.projectInfo.length > 0) {
        vectorContext = analysisVectorService.formatContextForAnalysis(context, 'workflow');
        console.log(`✅ Retrieved vector context: ${context.relevantDocuments.length} docs, ${context.relatedAnalyses.length} analyses, ${context.projectInfo.length} project info`);
      } else {
        console.log('⚠️ No relevant context found via vector search');
      }
    } catch (error) {
      console.error('❌ Failed to get vector search context:', error);
      // Continue without vector context rather than failing
    }
    
    // Create business analysis prompt
    const prompt = createBusinessAnalysisPrompt(nodes, edges, vectorContext);
    console.log('📝 Prompt length:', prompt.length);
    
    // Call Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${apiConfig.model}:generateContent?key=${apiConfig.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.candidates[0].content.parts[0].text;
    console.log('✅ Gemini API response received, length:', responseText.length);
    
    // Parse the response
    const analysisResult = parseGeminiResponse(responseText);
    
    return NextResponse.json({
      success: true,
      analysis: analysisResult
    });

  } catch (error) {
    console.error('Workflow analysis failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze workflow' },
      { status: 500 }
    );
  }
}

function createBusinessAnalysisPrompt(nodes: any[], edges: any[], vectorContext?: string): string {
  const workflowData = formatWorkflowForAnalysis(nodes, edges);
  
  const contextSection = vectorContext ? `\n\nRELEVANT PROJECT CONTEXT (VECTOR SEARCH):\n${vectorContext}` : '';
  
  return `You are a business strategy consultant analyzing a startup's implementation workflow. Please provide a comprehensive business analysis focusing on organizational structure, process efficiency, and execution readiness.

WORKFLOW DATA:
${workflowData}${contextSection}

Please analyze this workflow from a business/startup perspective and provide insights on:

1. ORGANIZATIONAL STRUCTURE (0-100 score):
   - Executive oversight and leadership involvement
   - Role clarity and responsibility distribution
   - Decision-making hierarchy and authority
   - Team coordination and communication flow

2. PROCESS EFFICIENCY (0-100 score):
   - Workflow optimization and bottlenecks
   - Resource allocation and utilization
   - Time-to-market considerations
   - Scalability and growth potential

3. STAKEHOLDER ALIGNMENT (0-100 score):
   - Customer focus and market orientation
   - Internal stakeholder engagement
   - External partner integration
   - Value delivery mechanisms

4. EXECUTION READINESS (0-100 score):
   - Implementation feasibility
   - Risk management and mitigation
   - Success metrics and KPIs
   - Go-to-market strategy alignment

Please respond in the following JSON format:
{
  "overallRating": 85,
  "businessInsights": {
    "organizationalStructure": {
      "score": 80,
      "analysis": "Detailed analysis of organizational structure...",
      "recommendations": ["Recommendation 1", "Recommendation 2"]
    },
    "processEfficiency": {
      "score": 75,
      "analysis": "Detailed analysis of process efficiency...",
      "recommendations": ["Recommendation 1", "Recommendation 2"]
    },
    "stakeholderAlignment": {
      "score": 90,
      "analysis": "Detailed analysis of stakeholder alignment...",
      "recommendations": ["Recommendation 1", "Recommendation 2"]
    },
    "executionReadiness": {
      "score": 85,
      "analysis": "Detailed analysis of execution readiness...",
      "recommendations": ["Recommendation 1", "Recommendation 2"]
    }
  },
  "strategicRecommendations": [
    {
      "priority": "high",
      "category": "Organizational",
      "title": "Strengthen Executive Oversight",
      "description": "Description of the recommendation",
      "impact": "Expected impact on business",
      "action": "Specific action to take"
    }
  ],
  "riskAssessment": {
    "level": "medium",
    "risks": [
      {
        "risk": "Risk description",
        "probability": "High/Medium/Low",
        "impact": "High/Medium/Low",
        "mitigation": "Mitigation strategy"
      }
    ]
  }
}

Focus on practical, actionable business insights that would help a startup optimize their implementation strategy.`;
}

function formatWorkflowForAnalysis(nodes: any[], edges: any[]): string {
  const nodeDescriptions = nodes.map(node => {
    const connections = edges
      .filter(edge => edge.source === node.id || edge.target === node.id)
      .map(edge => edge.source === node.id ? `→ ${edge.target}` : `← ${edge.source}`)
      .join(', ');

    return `- ${node.data.label || node.id} (${node.type}): ${node.data.description || 'No description'} | Connections: ${connections || 'None'}`;
  }).join('\n');

  const edgeDescriptions = edges.map(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    return `- ${sourceNode?.data.label || edge.source} → ${targetNode?.data.label || edge.target}`;
  }).join('\n');

  return `
NODES (${nodes.length}):
${nodeDescriptions}

CONNECTIONS (${edges.length}):
${edgeDescriptions}

EXECUTIVE TEAM PRESENCE:
${nodes.filter(n => n.type === 'team').map(n => `- ${n.data.label}: ${n.data.description}`).join('\n') || 'No executive team nodes found'}

PROCESS NODES:
${nodes.filter(n => n.type === 'process').map(n => `- ${n.data.label}: ${n.data.description}`).join('\n') || 'No process nodes found'}

STAKEHOLDER NODES:
${nodes.filter(n => ['supplier', 'stakeholder', 'regulator', 'client'].includes(n.type || '')).map(n => `- ${n.data.label}: ${n.data.description}`).join('\n') || 'No stakeholder nodes found'}`;
}

function parseGeminiResponse(response: string): any {
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : response;
    
    const parsed = JSON.parse(jsonString);
    return parsed;
  } catch (error) {
    console.error('Failed to parse Gemini response:', error);
    throw new Error('Invalid response format from Gemini');
  }
}
