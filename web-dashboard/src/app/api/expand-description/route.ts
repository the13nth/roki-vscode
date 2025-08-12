import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface ApiConfiguration {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

interface ExpandRequest {
  description: string;
  template: string;
  technologyStack?: {
    backend?: string;
    frontend?: string;
    uiFramework?: string;
    authentication?: string;
    hosting?: string;
  };
  regulatoryStack?: {
    regulatoryCompliance?: string[];
  };
}

function getGlobalConfigPath(): string {
  return path.join(process.cwd(), '.ai-project', 'global-api-config.json');
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function callGoogleAI(config: ApiConfiguration, prompt: string): Promise<{ content: string; tokenUsage: any }> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2000,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Google AI API error response:', errorData);
    throw new Error(`Google AI API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  
  if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
    return {
      content: data.candidates[0].content.parts[0].text,
      tokenUsage: data.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 }
    };
  } else {
    throw new Error('Invalid response structure from Google AI API');
  }
}

async function callOpenAI(config: ApiConfiguration, prompt: string): Promise<{ content: string; tokenUsage: any }> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('OpenAI API error response:', errorData);
    throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  
  return {
    content: data.choices[0].message.content,
    tokenUsage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
  };
}

async function callAnthropic(config: ApiConfiguration, prompt: string): Promise<{ content: string; tokenUsage: any }> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Anthropic API error response:', errorData);
    throw new Error(`Anthropic API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  
  return {
    content: data.content[0].text,
    tokenUsage: data.usage || { input_tokens: 0, output_tokens: 0 }
  };
}

function generateExpandPrompt(request: ExpandRequest): string {
  const { description, template, technologyStack, regulatoryStack } = request;
  
  const stack = technologyStack || regulatoryStack;
  const isBusinessTemplate = template === 'business';
  
  const stackText = stack ? `
${isBusinessTemplate ? 'Regulatory Compliance Requirements' : 'Technology Stack'}:
${isBusinessTemplate && regulatoryStack?.regulatoryCompliance?.length ? 
  regulatoryStack.regulatoryCompliance.map(comp => `- ${comp}`).join('\n') :
  !isBusinessTemplate && technologyStack ? `- Backend: ${technologyStack.backend || 'Not specified'}
- Frontend: ${technologyStack.frontend || 'Not specified'}
- UI Framework: ${technologyStack.uiFramework || 'Not specified'}
- Authentication: ${technologyStack.authentication || 'Not specified'}
- Hosting: ${technologyStack.hosting || 'Not specified'}` : 'Not specified'
}
` : '';

  return `You are an expert ${isBusinessTemplate ? 'business analyst and project manager' : 'software project manager and technical writer'}. Expand and enhance the following brief project description into a comprehensive, detailed project description.

Original Description: "${description}"
Project Template: ${template}
${stackText}

Please expand this into a detailed project description that includes:

1. **Project Overview**: Clear explanation of what the ${isBusinessTemplate ? 'project' : 'application'} does
2. **Target ${isBusinessTemplate ? 'Stakeholders' : 'Users'}**: Who will ${isBusinessTemplate ? 'be involved in or benefit from' : 'use'} this ${isBusinessTemplate ? 'project' : 'application'} and their needs
3. **Key ${isBusinessTemplate ? 'Components' : 'Features'}**: Main ${isBusinessTemplate ? 'deliverables and processes' : 'functionality and capabilities'}
4. **${isBusinessTemplate ? 'Regulatory Requirements' : 'Technical Requirements'}**: Specific ${isBusinessTemplate ? 'compliance needs and regulatory constraints' : 'technical needs and constraints'}
5. **${isBusinessTemplate ? 'Implementation Approach' : 'User Experience'}**: How ${isBusinessTemplate ? 'the project will be executed and stakeholders will engage' : 'users will interact with the application'}
6. **Business Value**: What problem it solves and its benefits
7. **Success Criteria**: How to measure if the project is successful

Make the description comprehensive, professional, and aligned with the chosen ${isBusinessTemplate ? 'regulatory framework' : 'technology stack'}. Keep it focused and practical, avoiding unnecessary jargon. The expanded description should be 3-5 paragraphs long and provide enough detail for ${isBusinessTemplate ? 'stakeholders' : 'developers'} to understand the project scope and requirements.

Return only the expanded description text, no additional formatting or explanations.`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const requestData: ExpandRequest = await request.json();

    // Validate required fields
    if (!requestData.description || !requestData.description.trim()) {
      return NextResponse.json(
        { error: 'Project description is required' },
        { status: 400 }
      );
    }

    // Load global API configuration
    const globalConfigPath = getGlobalConfigPath();
    if (!await fileExists(globalConfigPath)) {
      return NextResponse.json(
        { error: 'No global API configuration found. Please configure an AI provider in the global settings.' },
        { status: 400 }
      );
    }

    const globalConfigData = await fs.readFile(globalConfigPath, 'utf8');
    const apiConfig: ApiConfiguration = JSON.parse(globalConfigData);

    // Generate expansion prompt
    const prompt = generateExpandPrompt(requestData);

    // Call the appropriate AI provider
    let aiResponse: { content: string; tokenUsage: any };
    switch (apiConfig.provider) {
      case 'openai':
        aiResponse = await callOpenAI(apiConfig, prompt);
        break;
      case 'anthropic':
        aiResponse = await callAnthropic(apiConfig, prompt);
        break;
      case 'google':
        aiResponse = await callGoogleAI(apiConfig, prompt);
        break;
      default:
        return NextResponse.json(
          { error: 'Unsupported AI provider' },
          { status: 400 }
        );
    }

    // Track token usage for project creation
    try {
      const { TokenTrackingService } = await import('@/lib/tokenTrackingService');
      const tokenTrackingService = TokenTrackingService.getInstance();
      
      const inputTokens = aiResponse.tokenUsage?.promptTokenCount || aiResponse.tokenUsage?.prompt_tokens || 0;
      const outputTokens = aiResponse.tokenUsage?.candidatesTokenCount || aiResponse.tokenUsage?.completion_tokens || 0;
      
      await tokenTrackingService.trackTokenUsage('project-creation', inputTokens, outputTokens, 'description-expansion');
    } catch (error) {
      console.warn('Failed to track token usage for description expansion:', error);
    }

    return NextResponse.json({
      success: true,
      expandedDescription: aiResponse.content.trim(),
      tokenUsage: aiResponse.tokenUsage
    });

  } catch (error) {
    console.error('Failed to expand description:', error);
    return NextResponse.json(
      { error: 'Failed to expand description with AI' },
      { status: 500 }
    );
  }
}
