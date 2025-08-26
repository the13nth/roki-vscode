import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ProjectService } from '@/lib/projectService';
import { PineconeSyncServiceInstance } from '@/lib/pineconeSyncService';
import { getPineconeClient } from '@/lib/pinecone';

interface ApiConfiguration {
  provider: 'openai' | 'anthropic' | 'google' | 'custom';
  apiKey: string;
  model: string;
  baseUrl?: string;
  customHeaders?: Record<string, string>;
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
    const { userId } = await auth();
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

    await tokenTrackingService.trackTokenUsage(projectId, inputTokens, outputTokens, operation, userId || undefined);
  } catch (error) {
    console.error('Failed to track token usage:', error);
  }
}

async function gatherProjectContextFromPinecone(projectId: string) {
  const context = {
    requirements: null as string | null,
    design: null as string | null,
    tasks: null as string | null,
    otherContextDocs: [] as Array<{ filename: string; preview: string }>
  };

  try {
    console.log('🔍 Gathering project context from Pinecone for project:', projectId);
    
    const pinecone = getPineconeClient();
    const index = pinecone.index(process.env.NEXT_PUBLIC_PINECONE_INDEX_NAME || 'roki');
    
    // Query for all documents in this project
    const queryResponse = await index.query({
      vector: new Array(1024).fill(0), // Match the index dimension
      filter: {
        projectId: { $eq: projectId }
      },
      topK: 50, // Get various documents
      includeMetadata: true,
      includeValues: false
    });
    
    console.log(`📄 Found ${queryResponse.matches.length} documents for context`);
    
    // Separate documents by type
    for (const match of queryResponse.matches) {
      if (!match.metadata) continue;
      
      const metadata = match.metadata;
      const docType = metadata.type as string;
      const content = metadata.content as string || '';
      
      if (docType === 'requirements') {
        context.requirements = content.substring(0, 2000); // Limit length
      } else if (docType === 'design') {
        context.design = content.substring(0, 2000); // Limit length
      } else if (docType === 'tasks') {
        context.tasks = content.substring(0, 1500); // Limit length
      } else if (docType === 'context' && context.otherContextDocs.length < 3) {
        // Include up to 3 context documents for additional context
        context.otherContextDocs.push({
          filename: metadata.filename as string || metadata.title as string || 'Untitled',
          preview: content.substring(0, 800) // Limit preview length
        });
      }
    }
    
    console.log('✅ Successfully gathered project context from Pinecone');
    
  } catch (error) {
    console.error('❌ Failed to gather project context from Pinecone:', error);
  }

  return context;
}

function generateImprovementPrompt(document: any, project: any, projectContext: any): string {
  const isBusinessProject = project.template === 'business';
  
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
- **Type**: ${project.template || 'general'}
- **Name**: ${project.name}
- **Description**: ${project.description}

## Project Context:${contextInfo}

## Document to Improve:
- **Title**: ${document.title}
- **Category**: ${document.category}
- **Current Content**:
${document.content}

## Improvement Instructions:

Using the project context above, please improve this document by:

1. **Contextual Integration**: Add relevant connections to other project documents and requirements
2. **Project-Specific Details**: Include information that aligns with the project's goals and requirements
3. **Cross-Reference Enhancement**: Reference relevant sections from requirements, design, or tasks where appropriate
4. **Stakeholder Alignment**: Ensure content serves the project's stakeholders and objectives
5. **${isBusinessProject ? 'Business Integration' : 'Technical Integration'}**: ${isBusinessProject ? 'Connect to business goals and requirements from the project context' : 'Align with technical architecture and implementation details from the project context'}

## Specific Enhancements:
- Reference relevant requirements or design decisions where applicable
- Add connections to related tasks or milestones
- Include project-specific terminology and standards
- Suggest actionable next steps that align with project goals
- ${isBusinessProject ? 'Incorporate business considerations and metrics' : 'Include technical specifications and implementation details'}

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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId, docId } = await params;

    // Check project ownership before allowing document improvement
    const projectService = ProjectService.getInstance();
    const project = await projectService.getProject(userId, projectId);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Only project owners can improve documents
    if (project.userId !== userId) {
      return NextResponse.json(
        { error: 'Only project owners can improve documents' },
        { status: 403 }
      );
    }

    // Parse request body to get current document content
    const body = await request.json();
    const { title, content, category, tags } = body;

    if (!content || !title) {
      return NextResponse.json(
        { error: 'Missing document content or title' },
        { status: 400 }
      );
    }

    console.log('🔄 Improving document using Pinecone-based project context');

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // Create document metadata from the request
    const documentMetadata = {
      id: docId,
      title: title,
      category: category || 'other',
      tags: tags || [],
      content: content
    };

    // Load API configuration from user's settings
    try {
      const configResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/user-api-config`, {
        headers: {
          'Authorization': request.headers.get('Authorization') || '',
          'Cookie': request.headers.get('Cookie') || ''
        }
      });

      if (!configResponse.ok) {
        return NextResponse.json(
          { error: 'API configuration not found. Please configure an AI provider first.' },
          { status: 400 }
        );
      }

      const apiConfig: ApiConfiguration = await configResponse.json();

      // Gather project context from Pinecone
      const projectContext = await gatherProjectContextFromPinecone(projectId);
      
      // Generate improvement prompt with context
      const prompt = generateImprovementPrompt(documentMetadata, project, projectContext);
      
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
        message: 'Document improved successfully using project context from Pinecone'
      });

    } catch (error) {
      console.error('Error with API configuration or AI call:', error);
      return NextResponse.json(
        { error: 'Failed to load API configuration or call AI provider' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error improving document:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to improve document' },
      { status: 500 }
    );
  }
}