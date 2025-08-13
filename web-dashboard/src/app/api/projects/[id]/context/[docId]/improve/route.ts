import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAIConfig, validateSecureConfig } from '@/lib/secureConfig';
import fs from 'fs/promises';
import path from 'path';

interface ApiConfiguration {
  provider: 'openai' | 'anthropic' | 'google' | 'custom';
  apiKey: string;
  model: string;
  baseUrl?: string;
  customHeaders?: Record<string, string>;
}

async function getApiConfigPath(projectId: string): Promise<string> {
  const globalConfigPath = path.join(process.cwd(), '.ai-project', 'global-api-config.json');
  const projectConfigPath = path.join(process.cwd(), '.ai-project', 'projects', projectId, 'api-config.json');
  
  // Check if project-specific config exists
  try {
    await fs.access(projectConfigPath);
    return projectConfigPath;
  } catch {
    return globalConfigPath;
  }
}

// Improved helper function to find project by ID
async function findProjectById(projectId: string) {
  // First check internal project directory
  const internalProjectDir = path.join(process.cwd(), '.ai-project', 'projects', projectId);
  const internalConfigPath = path.join(internalProjectDir, 'config.json');
  
  try {
    const configData = await fs.readFile(internalConfigPath, 'utf8');
    const config = JSON.parse(configData);
    return {
      projectPath: config.originalPath || internalProjectDir,
      config
    };
  } catch (error) {
    // Fallback to scanning common paths
    const commonPaths = [
      path.join(process.cwd(), '.ai-project'),
      path.join(process.cwd(), 'projects', projectId),
      `/tmp/ai-projects/${projectId}`,
      `/home/${process.env.USER}/ai-projects/${projectId}`,
    ];

    for (const basePath of commonPaths) {
      const configPath = path.join(basePath, 'config.json');
      try {
        const configData = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configData);
        if (config.projectId === projectId) {
          return {
            projectPath: basePath,
            config
          };
        }
      } catch (error) {
        continue;
      }
    }

    throw new Error('Project not found');
  }
}

async function callGoogleAI(config: ApiConfiguration, prompt: string): Promise<{ content: string; tokenUsage: any }> {
  console.log('Making Google AI API call with model:', config.model);
  
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
        maxOutputTokens: 4000,
      },
    }),
  });

  console.log('Google AI API response status:', response.status);

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Google AI API error response:', errorData);
    throw new Error(`Google AI API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  console.log('Google AI API response data keys:', Object.keys(data));
  
  if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
    const content = data.candidates[0].content.parts[0].text;
    console.log('Generated content length:', content.length);
    return {
      content: content,
      tokenUsage: data.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 }
    };
  } else {
    console.error('Invalid response structure from Google AI API:', data);
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
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
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
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 4000,
      temperature: 0.3,
      messages: [
        { role: 'user', content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  return {
    content: data.content[0].text,
    tokenUsage: data.usage || { input_tokens: 0, output_tokens: 0 }
  };
}

async function callCustomProvider(config: ApiConfiguration, prompt: string): Promise<{ content: string; tokenUsage: any }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiKey}`,
    ...config.customHeaders,
  };

  const response = await fetch(config.baseUrl || '', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Custom provider API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || data.content || 'No response generated',
    tokenUsage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
  };
}

async function trackTokenUsage(projectId: string, tokenUsage: any, operation: string = 'improve_document') {
  try {
    const { TokenTrackingService } = await import('@/lib/tokenTrackingService');
    const tokenTrackingService = TokenTrackingService.getInstance();
    
    // Normalize token usage format for different providers
    let inputTokens = 0;
    let outputTokens = 0;
    
    if (tokenUsage.promptTokenCount !== undefined) {
      // Google AI format
      inputTokens = tokenUsage.promptTokenCount || 0;
      outputTokens = tokenUsage.candidatesTokenCount || 0;
    } else if (tokenUsage.input_tokens !== undefined) {
      // Anthropic format
      inputTokens = tokenUsage.input_tokens || 0;
      outputTokens = tokenUsage.output_tokens || 0;
    } else {
      // OpenAI/Custom format
      inputTokens = tokenUsage.prompt_tokens || 0;
      outputTokens = tokenUsage.completion_tokens || 0;
    }

    await tokenTrackingService.trackTokenUsage(projectId, inputTokens, outputTokens, operation);
  } catch (error) {
    console.error('Failed to track token usage:', error);
  }
}

async function gatherProjectContext(projectPath: string, projectConfig: any) {
  const context = {
    projectFiles: [],
    requirements: null as string | null,
    design: null as string | null,
    tasks: null as string | null,
    otherContextDocs: [] as Array<{ filename: string; preview: string }>
  };

  try {
    // Read main project documents
    const aiProjectDir = path.join(projectPath, '.ai-project');
    
    // Try to read requirements
    try {
      const requirementsPath = path.join(aiProjectDir, 'requirements.md');
      const requirementsContent = await fs.readFile(requirementsPath, 'utf8');
      context.requirements = requirementsContent.substring(0, 2000); // Limit length
    } catch (error) {
      // Requirements file not found or not readable
    }

    // Try to read design
    try {
      const designPath = path.join(aiProjectDir, 'design.md');
      const designContent = await fs.readFile(designPath, 'utf8');
      context.design = designContent.substring(0, 2000); // Limit length
    } catch (error) {
      // Design file not found or not readable
    }

    // Try to read tasks
    try {
      const tasksPath = path.join(aiProjectDir, 'tasks.md');
      const tasksContent = await fs.readFile(tasksPath, 'utf8');
      context.tasks = tasksContent.substring(0, 1500); // Limit length
    } catch (error) {
      // Tasks file not found or not readable
    }

    // Read other context documents (limit to 3 most recent)
    try {
      const contextDir = path.join(aiProjectDir, 'context');
      const contextFiles = await fs.readdir(contextDir);
      const mdFiles = contextFiles.filter(file => file.endsWith('.md')).slice(0, 3);
      
      for (const file of mdFiles) {
        try {
          const filePath = path.join(contextDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const preview = content.substring(0, 800); // Limit preview length
          context.otherContextDocs.push({
            filename: file,
            preview: preview
          });
        } catch (error) {
          // Skip files that can't be read
        }
      }
    } catch (error) {
      // Context directory not found or not readable
    }

  } catch (error) {
    // Project directory structure issues
  }

  return context;
}

function generateImprovementPrompt(document: any, projectConfig: any, projectContext: any): string {
  const isBusinessProject = projectConfig.template === 'business';
  
  let contextInfo = '';
  if (projectContext.requirements) {
    contextInfo += `\n## Project Requirements:\n${projectContext.requirements}\n`;
  }
  if (projectContext.design) {
    contextInfo += `\n## Project Design:\n${projectContext.design}\n`;
  }
  if (projectContext.tasks) {
    contextInfo += `\n## Project Tasks:\n${projectContext.tasks}\n`;
  }
  if (projectContext.otherContextDocs.length > 0) {
    contextInfo += `\n## Related Context Documents:\n`;
    projectContext.otherContextDocs.forEach((doc: { filename: string; preview: string }) => {
      contextInfo += `### ${doc.filename}:\n${doc.preview}\n\n`;
    });
  }
  
  return `You are an expert ${isBusinessProject ? 'business analyst and consultant' : 'technical writer and project manager'} helping to improve project documentation. 

## Project Information:
- **Type**: ${projectConfig.template || 'general'}
- **Name**: ${projectConfig.name}
- **Description**: ${projectConfig.description}
${projectConfig.technologyStack ? `- **Technology Stack**: ${JSON.stringify(projectConfig.technologyStack)}` : ''}
${projectConfig.regulatoryCompliance ? `- **Regulatory Compliance**: ${JSON.stringify(projectConfig.regulatoryCompliance)}` : ''}

## Project Context:${contextInfo}

## Document to Improve:
- **Title**: ${document.title}
- **Category**: ${document.category}
- **Current Content**:
${document.content}

## Improvement Instructions:

Using the project context above, please improve this document by:

1. **Contextual Integration**: Add relevant connections to other project documents and requirements
2. **Project-Specific Details**: Include information that aligns with the project's technology stack${isBusinessProject ? ', regulatory requirements,' : ','} and overall goals
3. **Cross-Reference Enhancement**: Reference relevant sections from requirements, design, or tasks where appropriate
4. **Stakeholder Alignment**: Ensure content serves the project's stakeholders and objectives
5. **${isBusinessProject ? 'Business Integration' : 'Technical Integration'}**: ${isBusinessProject ? 'Connect to business goals, compliance needs, and ROI considerations from the project context' : 'Align with technical architecture, implementation details, and development workflow from the project context'}

## Specific Enhancements:
- Reference relevant requirements or design decisions where applicable
- Add connections to related tasks or milestones
- Include project-specific terminology and standards
- Suggest actionable next steps that align with project goals
- ${isBusinessProject ? 'Incorporate regulatory compliance considerations and business metrics' : 'Include technical specifications and implementation details'}

## Format Guidelines:
- Use markdown formatting for clear structure
- Add relevant headings, lists, and code blocks
- Include cross-references to other project documents when relevant
- Make it comprehensive yet focused and actionable
- Maintain professional tone appropriate for ${isBusinessProject ? 'business stakeholders' : 'technical teams'}

Return ONLY the improved document content in markdown format, without any explanatory text before or after.`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id: projectId, docId } = await params;

    // Parse request body to get current document content
    const body = await request.json();
    const { title, content, category, tags } = body;

    if (!content || !title) {
      return NextResponse.json(
        { error: 'Missing document content or title' },
        { status: 400 }
      );
    }

    // Find project
    const { projectPath, config } = await findProjectById(projectId);
    
    // Create document metadata from the request
    const documentMetadata = {
      id: docId,
      title: title,
      category: category || 'other',
      tags: tags || [],
      content: content
    };

    // Load API configuration
    const configPath = await getApiConfigPath(projectId);
    let apiConfig: ApiConfiguration;
    
    try {
      const configData = await fs.readFile(configPath, 'utf8');
      apiConfig = JSON.parse(configData);
    } catch (error) {
      return NextResponse.json(
        { error: 'API configuration not found. Please configure an AI provider first.' },
        { status: 400 }
      );
    }

    // Gather project context for better improvements
    const projectContext = await gatherProjectContext(projectPath, config);
    
    // Generate improvement prompt with context
    const prompt = generateImprovementPrompt(documentMetadata, config, projectContext);
    
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
      case 'custom':
        aiResponse = await callCustomProvider(apiConfig, prompt);
        break;
      default:
        return NextResponse.json(
          { error: 'Unsupported AI provider' },
          { status: 400 }
        );
    }

    // Track token usage
    await trackTokenUsage(projectId, aiResponse.tokenUsage, 'improve_document');
    
    return NextResponse.json({
      success: true,
      improvedContent: aiResponse.content,
      tokenUsage: aiResponse.tokenUsage,
      message: 'Document improved successfully'
    });

  } catch (error) {
    console.error('Error improving document:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to improve document' },
      { status: 500 }
    );
  }
}
