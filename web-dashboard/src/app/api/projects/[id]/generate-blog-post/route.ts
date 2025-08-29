import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getGoogleAIConfig, validateSecureConfig } from '@/lib/secureConfig';
import { TokenTrackingService } from '@/lib/tokenTrackingService';
import { getPineconeClient, PINECONE_INDEX_NAME, PINECONE_NAMESPACE_PROJECTS } from '@/lib/pinecone';
import { createVectorId } from '@/lib/projectService';
import fs from 'fs/promises';
import path from 'path';

interface ApiConfiguration {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

// Helper function to check if file exists
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Helper function to get global config path
function getGlobalConfigPath(): string {
  return path.join(process.cwd(), '.ai-project', 'global-api-config.json');
}

interface BlogPostGenerationRequest {
  description: string;
  fundingStatus?: 'fully funded' | 'funding needed' | 'N/A';
  resourceNeeded?: 'cofounder needed' | 'dev needed' | 'business manager needed' | 'N/A';
  tags?: string[];
  analysisData?: Record<string, any>; // Pre-loaded analyses from frontend
}

interface BlogPostResult {
  title: string;
  content: string;
  excerpt: string;
  tags: string[];
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost: number;
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;
    const body: BlogPostGenerationRequest = await request.json();
    const { 
      description,
      fundingStatus = 'N/A',
      resourceNeeded = 'N/A',
      tags = [],
      analysisData: preloadedAnalyses = null
    } = body;

    console.log(`📝 Generating blog post for project ${projectId}`);
    console.log(`🎯 Description: ${description.substring(0, 100)}...`);
    console.log(`📊 Preloaded analyses: ${preloadedAnalyses ? Object.keys(preloadedAnalyses).length : 0}`);

    // Load project data from Pinecone
    console.log(`📊 Loading project data from Pinecone for project: ${projectId}`);
    
    let requirements = '';
    let design = '';
    let tasks = '';
    let progress: any = null;
    let config: any = null;
    let analysisResults: Record<string, any> = {};

    try {
      // Get project data from Pinecone
      const pinecone = getPineconeClient();
      const index = pinecone.index(PINECONE_INDEX_NAME);
      const vectorId = createVectorId('user-project', projectId);

      const fetchResponse = await index.namespace(PINECONE_NAMESPACE_PROJECTS).fetch([vectorId]);
      const record = fetchResponse.records?.[vectorId];

      if (!record?.metadata) {
        return NextResponse.json(
          { error: 'Project not found in database' },
          { status: 404 }
        );
      }

      // Check if user can access this project
      const isPublic = record.metadata.isPublic as boolean || false;
      const projectOwnerId = record.metadata.userId as string;
      
      if (!isPublic && (!userId || projectOwnerId !== userId)) {
        return NextResponse.json(
          { error: 'Project not found or access denied' },
          { status: 404 }
        );
      }

      // Parse project data
      let project;
      try {
        project = JSON.parse(record.metadata.projectData as string);
        console.log(`📄 Loaded project from Pinecone: ${project.name}`);
      } catch (error) {
        console.error('Failed to parse project data:', error);
        return NextResponse.json(
          { error: 'Project data corrupted' },
          { status: 500 }
        );
      }

      // Extract project documents and metadata
      requirements = project.requirements || '';
      design = project.design || '';
      tasks = project.tasks || '';
      
      // Create config object from project metadata
      config = {
        name: project.name || 'Untitled Project',
        description: project.description || '',
        projectId: project.projectId,
        createdAt: project.createdAt,
        lastModified: project.lastModified
      };

      // Calculate progress from tasks if available
      if (tasks) {
        const lines = tasks.split('\n');
        let totalTasks = 0;
        let completedTasks = 0;

        for (const line of lines) {
          const taskMatch = line.match(/^[\s]*-[\s]*\[([x\s])\]/);
          if (taskMatch) {
            totalTasks++;
            if (taskMatch[1].toLowerCase() === 'x') {
              completedTasks++;
            }
          }
        }

        progress = {
          totalTasks,
          completedTasks,
          percentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          lastUpdated: new Date(project.lastModified || new Date())
        };
      }

      console.log(`📄 Project config: name="${config.name}", description="${config.description?.substring(0, 50)}..."`);
      console.log(`📄 Project documents: requirements=${!!requirements}, design=${!!design}, tasks=${!!tasks}`);

      // Use preloaded analyses if available, otherwise load from Pinecone
      if (preloadedAnalyses && Object.keys(preloadedAnalyses).length > 0) {
        analysisResults = preloadedAnalyses;
        console.log(`📊 Using preloaded analyses: ${Object.keys(analysisResults).length} analyses`);
      } else {
        console.log('📊 No preloaded analyses, fetching from Pinecone...');
        try {
          const analysisResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/projects/${projectId}/analyses`);
          if (analysisResponse.ok) {
            const analysisData = await analysisResponse.json();
            if (analysisData.success && analysisData.analyses) {
              analysisResults = analysisData.analyses;
              console.log(`📊 Loaded ${Object.keys(analysisResults).length} analyses from Pinecone`);
            }
          }
        } catch (error) {
          console.warn('⚠️ Failed to load analyses from Pinecone:', error);
        }
      }

    } catch (error) {
      console.error('Error loading project data from Pinecone:', error);
      return NextResponse.json(
        { error: 'Failed to load project data from database' },
        { status: 500 }
      );
    }

    // Get the appropriate API configuration for this project (respects user/app key selection)
    let apiConfig: ApiConfiguration | undefined;
    
    // Always check user API key preference first, regardless of environment variables
    let usePersonalApiKey = false;
    
    try {
      // Check if user prefers personal API key
      const apiKeySelectionPath = path.join(process.cwd(), '.ai-project', 'projects', projectId, 'api-key-selection.json');
      if (await fileExists(apiKeySelectionPath)) {
        const selectionData = await fs.readFile(apiKeySelectionPath, 'utf8');
        const selection = JSON.parse(selectionData);
        usePersonalApiKey = selection.usePersonalApiKey || false;
        console.log(`🔑 API Key Preference: ${usePersonalApiKey ? 'PERSONAL' : 'SHARED/ENVIRONMENT'}`);
      }
      
      // First try to get Google AI configuration from environment
      apiConfig = getGoogleAIConfig();
      console.log('✅ Using secure Google AI configuration from environment');
      console.log(`🔑 CONFIG SOURCE: ENVIRONMENT VARIABLE (GOOGLE_AI_API_KEY)`);
    } catch (error) {
      console.warn('⚠️ Failed to get Google AI config from environment, checking project API configuration...');
      
      // If user prefers personal API key or environment config is not available, load user config
      if (usePersonalApiKey || !process.env.GOOGLE_AI_API_KEY) {
        const userConfigPath = path.join(process.cwd(), '.ai-project', 'user-api-config.json');
        if (await fileExists(userConfigPath)) {
          try {
            const userConfigData = await fs.readFile(userConfigPath, 'utf8');
            const userConfig = JSON.parse(userConfigData);
            
            let decryptedApiKey = userConfig.apiKey;
            if (userConfig.encrypted && userConfig.iv) {
              // For now, we'll assume the key is not encrypted in user config
              // In live environment, you'd decrypt it here
              decryptedApiKey = userConfig.apiKey;
            }
            
            apiConfig = {
              provider: userConfig.provider,
              apiKey: decryptedApiKey,
              model: userConfig.model,
              baseUrl: userConfig.baseUrl
            };
            console.log('✅ Using user API configuration');
            console.log(`🔑 CONFIG SOURCE: USER-CONFIGURED API KEY`);
            console.log(`🤖 Provider: ${userConfig.provider}, Model: ${userConfig.model}`);
          } catch (error) {
            console.warn('⚠️ Failed to load user API config, checking project config...');
          }
        }
      }
      
      // If we still don't have a config, try project-specific config
      if (!apiConfig) {
        const projectConfigPath = path.join(process.cwd(), '.ai-project', 'projects', projectId, 'api-config.json');
        if (await fileExists(projectConfigPath)) {
          try {
            const projectConfigData = await fs.readFile(projectConfigPath, 'utf8');
            const parsedConfig = JSON.parse(projectConfigData);
            apiConfig = parsedConfig;
            console.log('✅ Using project-specific API configuration');
            console.log(`🔑 CONFIG SOURCE: PROJECT-SPECIFIC API KEY`);
            console.log(`🤖 Provider: ${parsedConfig.provider}, Model: ${parsedConfig.model}`);
          } catch (error) {
            console.warn('⚠️ Failed to load project API config, falling back to global config');
          }
        }
      }
      
      // Finally, fallback to global configuration file
      if (!apiConfig) {
        const globalConfigPath = getGlobalConfigPath();
        if (!await fileExists(globalConfigPath)) {
          return NextResponse.json(
            { error: 'No AI configuration found. Please set GOOGLE_AI_API_KEY environment variable or configure an AI provider in the global settings.' },
            { status: 400 }
          );
        }

        const globalConfigData = await fs.readFile(globalConfigPath, 'utf8');
        const parsedConfig = JSON.parse(globalConfigData);
        apiConfig = parsedConfig;
        console.log('✅ Using global API configuration');
        console.log(`🔑 CONFIG SOURCE: GLOBAL/APP DEFAULT API KEY`);
        console.log(`🤖 Provider: ${parsedConfig.provider}, Model: ${parsedConfig.model}`);
      }
    }

    // Ensure we have a valid API configuration
    if (!apiConfig) {
      return NextResponse.json(
        { error: 'No valid AI configuration found. Please configure an AI provider in the project settings or global settings.' },
        { status: 400 }
      );
    }

    console.log(`🤖 Using AI provider: ${apiConfig.provider} with model: ${apiConfig.model}`);

    // Initialize token tracking
    const tokenTracker = new TokenTrackingService();
    const sessionId = `blog-post-${Date.now()}`;

    // Validate that we have sufficient project data
    console.log(`🔍 Project config validation: config exists: ${!!config}, name: "${config?.name}"`);
    console.log(`🔍 Project data validation: requirements: ${!!requirements}, design: ${!!design}, tasks: ${!!tasks}, analyses: ${Object.keys(analysisResults).length}`);
    
    if (!config?.name || config.name === 'Unknown Project') {
      console.error(`❌ Project config validation failed: config=${!!config}, name="${config?.name}"`);
      return NextResponse.json(
        { error: 'Project configuration not found. Please ensure the project has a valid name and configuration.' },
        { status: 400 }
      );
    }

    if (!requirements && !design && !tasks && Object.keys(analysisResults).length === 0) {
      console.error(`❌ Project data validation failed: req=${!!requirements}, design=${!!design}, tasks=${!!tasks}, analyses=${Object.keys(analysisResults).length}`);
      return NextResponse.json(
        { error: 'No project data available. Please ensure the project has requirements, design, tasks, or analysis data.' },
        { status: 400 }
      );
    }

    // Prepare context for AI
    const projectContext = `
ACTUAL PROJECT TO WRITE ABOUT:

PROJECT NAME: ${config.name}
PROJECT DESCRIPTION: ${config.description || 'No description available'}

PROJECT REQUIREMENTS:
${requirements || 'No requirements document available'}

PROJECT DESIGN:
${design || 'No design document available'}

PROJECT TASKS:
${tasks || 'No tasks document available'}

PROJECT PROGRESS:
${progress ? JSON.stringify(progress, null, 2) : 'No progress data available'}

PROJECT ANALYSIS RESULTS:
${Object.entries(analysisResults).map(([type, analysis]) => `
${type.toUpperCase()} ANALYSIS FOR THIS PROJECT:
${JSON.stringify(analysis, null, 2)}
`).join('\n')}

PROJECT FUNDING STATUS: ${fundingStatus}
PROJECT RESOURCE NEEDED: ${resourceNeeded}
PROJECT TAGS: ${tags.join(', ')}

REMEMBER: Write ONLY about the project named "${config.name}" described above. Do not create content about any other project.
`;

    // Create the prompt for blog post generation
    const prompt = `You are an expert technical writer. You MUST write a blog post about the specific project described in the PROJECT CONTEXT below. DO NOT create generic content or make up fictional projects.

PROJECT CONTEXT:
${projectContext}

USER REQUEST:
${description}

CRITICAL REQUIREMENTS:
1. Write ONLY about the project described in the PROJECT CONTEXT above
2. Use the actual project name, description, and details from the context
3. Reference specific technical details, requirements, and analysis results provided
4. Do NOT create fictional or generic project content
5. Base your content entirely on the provided project information

Create a blog post that includes:

1. A compelling title that captures the essence of THIS SPECIFIC PROJECT
2. An engaging introduction that hooks the reader about THIS PROJECT
3. Detailed content that covers:
   - What THIS SPECIFIC PROJECT is about (use the actual project name and description)
   - The technical challenges and solutions for THIS PROJECT
   - Key insights from the analysis results provided
   - Lessons learned from THIS PROJECT
   - Future plans or next steps for THIS PROJECT
4. A conclusion that wraps up the main points about THIS PROJECT
5. Relevant tags for categorization

The blog post should be:
- Well-structured with clear sections
- Technical but accessible to a general developer audience
- Engaging and informative
- 800-1500 words in length
- Professional in tone
- Include specific details from the project context provided

If the funding status is not "N/A", mention it appropriately in the content.
If resource needs are specified, include them in a relevant section.

IMPORTANT: 
- Write about the ACTUAL PROJECT described in the context
- Use the REAL project name and details
- Reference the SPECIFIC analysis results provided
- Return ONLY valid JSON in the following format:

{
  "title": "The blog post title about the actual project",
  "content": "The full blog post content with proper markdown formatting about the actual project",
  "excerpt": "A brief 2-3 sentence summary of the post about the actual project",
  "tags": ["tag1", "tag2", "tag3"]
}`;

    console.log('🤖 Sending blog post generation request to AI...');

    // Call AI service
    let generatedText: string;
    let inputTokens: number;
    let outputTokens: number;

    try {
      if (apiConfig.provider === 'google') {
        const requestBody = {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            maxOutputTokens: 4000,
            temperature: 0.7,
          }
        };

        console.log('🤖 Sending blog post generation request to Gemini API...');

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${apiConfig.model}:generateContent?key=${apiConfig.apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Gemini API error ${response.status}:`, errorText);
          throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        generatedText = result.candidates[0].content.parts[0].text;

        // Calculate token usage (approximate)
        inputTokens = Math.ceil(prompt.length / 4);
        outputTokens = Math.ceil(generatedText.length / 4);

      } else {
        throw new Error(`Unsupported AI provider: ${apiConfig.provider}`);
      }
    } catch (error) {
      console.error('❌ AI API error:', error);
      return NextResponse.json(
        { error: 'Failed to generate blog post using AI service' },
        { status: 500 }
      );
    }
    
    // Parse the JSON response
    let parsedResult;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      
      // Clean the JSON string to handle control characters
      let jsonString = jsonMatch[0];
      
      // Remove or escape problematic control characters
      jsonString = jsonString
        .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
        .replace(/\n/g, '\\n') // Escape newlines
        .replace(/\r/g, '\\r') // Escape carriage returns
        .replace(/\t/g, '\\t'); // Escape tabs
      
      parsedResult = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw response:', generatedText);
      
      // Fallback: try to extract content manually if JSON parsing fails
      try {
        const titleMatch = generatedText.match(/"title":\s*"([^"]+)"/);
        const contentMatch = generatedText.match(/"content":\s*"([^"]+)"/);
        const excerptMatch = generatedText.match(/"excerpt":\s*"([^"]+)"/);
        const tagsMatch = generatedText.match(/"tags":\s*\[([^\]]+)\]/);
        
        parsedResult = {
          title: titleMatch ? titleMatch[1] : 'Generated Blog Post',
          content: contentMatch ? contentMatch[1] : generatedText,
          excerpt: excerptMatch ? excerptMatch[1] : 'A blog post about this project.',
          tags: tagsMatch ? tagsMatch[1].split(',').map(tag => tag.trim().replace(/"/g, '')) : []
        };
      } catch (fallbackError) {
        console.error('Fallback parsing also failed:', fallbackError);
        // Last resort: use the raw text
        parsedResult = {
          title: 'Generated Blog Post',
          content: generatedText,
          excerpt: 'A blog post about this project.',
          tags: []
        };
      }
    }

    const totalTokens = inputTokens + outputTokens;
    const cost = (inputTokens / 1000) * 0.000125 + (outputTokens / 1000) * 0.000375; // Gemini pricing

    // Track token usage
    await tokenTracker.trackTokenUsage(projectId, inputTokens, outputTokens, 'blog-post-generation');

    const result: BlogPostResult = {
      title: parsedResult.title || 'Generated Blog Post',
      content: parsedResult.content || generatedText,
      excerpt: parsedResult.excerpt || 'A blog post about this project.',
      tags: parsedResult.tags || tags,
      tokenUsage: {
        inputTokens,
        outputTokens,
        totalTokens,
        cost
      }
    };

    console.log('✅ Blog post generated successfully');
    console.log(`📊 Token usage: ${totalTokens} tokens, Cost: $${cost.toFixed(4)}`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Blog post generation error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Blog post generation failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
