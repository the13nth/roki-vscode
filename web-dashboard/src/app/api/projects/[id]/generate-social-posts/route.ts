import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getGoogleAIConfig, validateSecureConfig } from '@/lib/secureConfig';
import { TokenTrackingService } from '@/lib/tokenTrackingService';
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

interface SocialPostsGenerationRequest {
  platforms: string[];
  numberOfPosts: number;
  tone?: 'professional' | 'casual' | 'enthusiastic' | 'technical';
  includeHashtags?: boolean;
  includeEmojis?: boolean;
  postBackground?: string;
}

interface SocialPostsResult {
  posts: Array<{
    platform: string;
    content: string;
    hashtags?: string[];
    characterCount: number;
  }>;
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
    const body: SocialPostsGenerationRequest = await request.json();
    const { 
      platforms = ['twitter', 'linkedin'], 
      numberOfPosts = 3, 
      tone = 'professional',
      includeHashtags = true,
      includeEmojis = false,
      postBackground = ''
    } = body;

    console.log(`📱 Generating ${numberOfPosts} social posts for project ${projectId}`);
    console.log(`🎯 Platforms: ${platforms.join(', ')}, Tone: ${tone}`);

    // Load project documents and analysis results
    const projectPath = path.join(process.cwd(), '.ai-project', 'projects', projectId);
    
    let requirements = '';
    let design = '';
    let tasks = '';
    let progress: any = null;
    let config = null;
    let analysisResults: Record<string, any> = {};

    try {
      // Load project documents
      const [reqContent, designContent, tasksContent] = await Promise.allSettled([
        fs.readFile(path.join(projectPath, 'requirements.md'), 'utf-8'),
        fs.readFile(path.join(projectPath, 'design.md'), 'utf-8'),
        fs.readFile(path.join(projectPath, 'tasks.md'), 'utf-8')
      ]);

      requirements = reqContent.status === 'fulfilled' ? reqContent.value : '';
      design = designContent.status === 'fulfilled' ? designContent.value : '';
      tasks = tasksContent.status === 'fulfilled' ? tasksContent.value : '';

      // Load config
      try {
        const configContent = await fs.readFile(path.join(projectPath, 'config.json'), 'utf-8');
        config = JSON.parse(configContent);
      } catch (error) {
        console.log('No config file found');
      }

      // Load project data from Pinecone for accurate metadata
      try {
        console.log('🗃️ Loading project data from Pinecone...');
        const { PineconeSyncServiceInstance } = await import('@/lib/pineconeSyncService');
        const pineconeResult = await PineconeSyncServiceInstance.downloadProject(projectId);
        
        if (pineconeResult.success && pineconeResult.data?.project) {
          const projectData = pineconeResult.data.project;
          console.log('✅ Loaded project data from Pinecone:', projectData.name);
          
          config = {
            name: projectData.name || config?.name || 'Unnamed Project',
            description: projectData.description || config?.description || 'No description available',
            template: projectData.template || config?.template || 'Unknown',
            ...config
          };
        }
      } catch (error) {
        console.warn('⚠️ Failed to load project data from Pinecone:', error);
      }

      // Load saved analysis results
      try {
        console.log('📊 Loading saved analysis results...');
        const analysesResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/projects/${projectId}/analyses`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (analysesResponse.ok) {
          const contentType = analysesResponse.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const analysesData = await analysesResponse.json();
            if (analysesData.success && analysesData.analyses) {
              analysisResults = analysesData.analyses;
              console.log(`✅ Loaded ${Object.keys(analysisResults).length} analysis results: ${Object.keys(analysisResults).join(', ')}`);
            }
          } else {
            console.warn('⚠️ Analysis endpoint returned non-JSON response, skipping analysis results');
          }
        } else {
          console.warn(`⚠️ Analysis endpoint returned status ${analysesResponse.status}, skipping analysis results`);
        }
      } catch (error) {
        console.warn('⚠️ Failed to load analysis results:', error);
      }

    } catch (error) {
      console.error('Error loading project documents:', error);
      return NextResponse.json(
        { error: 'Failed to load project documents' },
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
              // In production, you'd decrypt it here
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

    // Generate platform-specific character limits and guidelines
    const platformLimits = {
      twitter: { limit: 280, style: 'Concise and engaging, use trending hashtags' },
      linkedin: { limit: 5000, style: 'Professional and detailed, focus on business value' },
      facebook: { limit: 2000, style: 'Engaging and community-focused' },
      instagram: { limit: 2200, style: 'Visual-first, use relevant hashtags' },
      tiktok: { limit: 150, style: 'Catchy and trend-aware' },
      youtube: { limit: 5000, style: 'Descriptive and informative' }
    };

    // Generate social posts using AI
    const backgroundContext = postBackground ? `
POST BACKGROUND/STARTING POINT:
"${postBackground}"

Use this as inspiration, context, or starting point for the posts. Build on this narrative or experience to create more engaging and personal content.
` : '';

    const prompt = `
You are a social media marketing expert. Generate ${numberOfPosts} engaging social media posts for each of the following platforms: ${platforms.join(', ')}.

${backgroundContext}

PROJECT INFORMATION:
Project Name: ${config?.name || 'Unnamed Project'}
Description: ${config?.description || 'No description available'}
Template: ${config?.template || 'Unknown'}

REQUIREMENTS:
${requirements || 'No requirements document available'}

DESIGN:
${design || 'No design document available'}

PROGRESS:
${progress ? `Total Tasks: ${progress.totalTasks || 0}, Completed: ${progress.completedTasks || 0}, Progress: ${progress.percentage || 0}%` : 'No progress data available'}

ANALYSIS RESULTS:
${Object.keys(analysisResults).length > 0 ? Object.entries(analysisResults).map(([type, data]) => `
${type.toUpperCase()} ANALYSIS:
${data.summary ? `Summary: ${data.summary}` : ''}
${data.marketSize ? `Market Size: ${data.marketSize}` : ''}
${data.targetAudience ? `Target Audience: ${data.targetAudience}` : ''}
${data.competitiveAdvantage ? `Competitive Advantage: ${data.competitiveAdvantage}` : ''}
`).join('\n') : 'No analysis results available'}

REQUIREMENTS:
- Tone: ${tone}
- ${includeHashtags ? 'Include relevant hashtags' : 'Do not include hashtags'}
- ${includeEmojis ? 'Include appropriate emojis' : 'Do not include emojis'}
- Generate exactly ${numberOfPosts} posts for each platform
- Each post should be unique and engaging
- Consider platform-specific character limits and best practices:

${platforms.map(platform => `
${platform.toUpperCase()}: 
- Character limit: ${platformLimits[platform as keyof typeof platformLimits]?.limit || 'No limit'}
- Style: ${platformLimits[platform as keyof typeof platformLimits]?.style || 'Adapt to platform'}
`).join('\n')}

OUTPUT FORMAT:
Return a JSON array where each object has:
{
  "platform": "platform_name",
  "content": "post_content",
  "hashtags": ["hashtag1", "hashtag2"] (if includeHashtags is true),
  "characterCount": number
}

Generate content that:
- Highlights the project's value proposition
- Uses project-specific details and insights
- Is appropriate for each platform's audience
- Follows the specified tone and requirements
- Encourages engagement (likes, shares, comments)
`;

    // Call AI service
    let postsContent: string;
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
            temperature: 0.7, // Higher temperature for more creative social content
          }
        };

        console.log('🤖 Sending social posts generation request to Gemini API...');

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
        postsContent = result.candidates[0].content.parts[0].text;

        // Calculate token usage (approximate)
        inputTokens = Math.ceil(prompt.length / 4);
        outputTokens = Math.ceil(postsContent.length / 4);

      } else {
        throw new Error(`Unsupported AI provider: ${apiConfig.provider}`);
      }
    } catch (error) {
      console.error('❌ AI API error:', error);
      return NextResponse.json(
        { error: 'Failed to generate social posts using AI service' },
        { status: 500 }
      );
    }

    const totalTokens = inputTokens + outputTokens;
    const cost = (inputTokens / 1000) * 0.000125 + (outputTokens / 1000) * 0.000375; // Gemini pricing

    const tokenUsage = {
      inputTokens,
      outputTokens,
      totalTokens,
      cost
    };

    // Track token usage
    const tokenTracker = new TokenTrackingService();
    await tokenTracker.trackTokenUsage(projectId, inputTokens, outputTokens, 'social-posts-generation');

    // Parse the AI response
    let posts: Array<{
      platform: string;
      content: string;
      hashtags?: string[];
      characterCount: number;
    }> = [];

    try {
      // Extract JSON from the response
      const jsonMatch = postsContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        posts = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: try to parse the entire response
        posts = JSON.parse(postsContent);
      }

      // Validate and ensure character counts are accurate
      posts = posts.map(post => ({
        ...post,
        characterCount: post.content.length
      }));

    } catch (parseError) {
      console.error('❌ Failed to parse AI response as JSON:', parseError);
      
      // Fallback: create structured posts from the text response
      posts = platforms.flatMap(platform => 
        Array.from({ length: numberOfPosts }, (_, i) => ({
          platform,
          content: `${postsContent.slice(i * 200, (i + 1) * 200)}...`,
          hashtags: includeHashtags ? ['#innovation', '#project', '#launch'] : undefined,
          characterCount: Math.min(200, postsContent.length - i * 200)
        }))
      );
    }

    const socialPostsResult: SocialPostsResult = {
      posts,
      tokenUsage
    };

    console.log('✅ Social posts generated successfully');
    console.log(`📊 Token usage: ${totalTokens} tokens, $${cost.toFixed(4)} cost`);
    console.log(`📱 Generated ${posts.length} posts across ${platforms.length} platforms`);

    return NextResponse.json(socialPostsResult);

  } catch (error) {
    console.error('❌ Social posts generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate social posts' },
      { status: 500 }
    );
  }
}
