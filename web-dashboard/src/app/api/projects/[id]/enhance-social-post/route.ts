import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PineconeSyncServiceInstance } from '@/lib/pineconeSyncService';
import { getGoogleAIConfig, validateSecureConfig } from '@/lib/secureConfig';
import { TokenTrackingService } from '@/lib/tokenTrackingService';
import { promises as fs } from 'fs';
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

interface EnhanceSocialPostRequest {
  originalContent: string;
  platform: string;
  enhanceAdditions: string;
  postType?: 'promotional' | 'story' | 'educational' | 'announcement' | 'behind-the-scenes' | 'testimonial' | 'question' | 'inspirational';
  tone?: 'professional' | 'casual' | 'enthusiastic' | 'technical';
  includeHashtags?: boolean;
  includeEmojis?: boolean;
  postBackground?: string;
}

interface EnhanceSocialPostResult {
  success: boolean;
  enhancedContent: string;
  tokenUsage: {
    totalTokens: number;
    cost: number;
  };
  error?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;
    const body: EnhanceSocialPostRequest = await request.json();
    console.log('🔍 DEBUG - Request body:', JSON.stringify(body, null, 2));
    
    const { 
      originalContent,
      platform,
      enhanceAdditions,
      postType = 'promotional',
      tone = 'professional',
      includeHashtags = true,
      includeEmojis = false,
      postBackground = ''
    } = body;

    if (!originalContent || !platform || !enhanceAdditions?.trim()) {
      console.error('❌ Missing required fields:', { 
        hasOriginalContent: !!originalContent, 
        hasPlatform: !!platform, 
        hasEnhanceAdditions: !!enhanceAdditions?.trim()
      });
      return NextResponse.json(
        { success: false, error: 'Missing required fields: originalContent, platform, and enhanceAdditions are required' },
        { status: 400 }
      );
    }

    console.log(`✨ Enhancing social post for project ${projectId}`);
    console.log(`📱 Platform: ${platform}, Type: ${postType}, Tone: ${tone}`);

    // Validate secure configuration
    const configValidation = validateSecureConfig();
    if (!configValidation.isValid) {
      console.error('❌ Secure configuration validation failed:', configValidation.errors);
      return NextResponse.json(
        { success: false, error: `Configuration error: ${configValidation.errors.join(', ')}` },
        { status: 500 }
      );
    }

    // Get the appropriate API configuration for this project (respects user/app key selection)
    let apiConfig: ApiConfiguration | undefined;
    
    // Always check user API key preference first, regardless of environment variables
    let usePersonalApiKey = false;
    
    try {
      const selection = await PineconeSyncServiceInstance.getApiKeySelection(projectId, userId);
      usePersonalApiKey = selection?.usePersonalApiKey || false;
      console.log(`🔑 API key selection: ${usePersonalApiKey ? 'personal' : 'app default'}`);
      console.log(`🔑 API Source: ${usePersonalApiKey ? 'USER PERSONAL API KEY' : 'APP DEFAULT API KEY'}`);
      console.log(`👤 User ID: ${userId}`);
      console.log(`📁 Project ID: ${projectId}`);
    } catch (error) {
      console.warn('⚠️ Failed to read API key selection from Pinecone, defaulting to global config');
      console.log(`🔑 API Source: APP DEFAULT API KEY (fallback)`);
      console.log(`👤 User ID: ${userId}`);
      console.log(`📁 Project ID: ${projectId}`);
    }
    
    try {
      // If user wants to use personal API key, skip environment variables
      if (usePersonalApiKey) {
        console.log('🔑 User selected personal API key, skipping environment variables');
        throw new Error('User selected personal API key');
      }
      
      // First try to get Google AI configuration from environment
      apiConfig = getGoogleAIConfig();
      console.log('✅ Using secure Google AI configuration from environment');
      console.log(`🔑 CONFIG SOURCE: ENVIRONMENT VARIABLE (GOOGLE_AI_API_KEY)`);
    } catch (error) {
      console.warn('⚠️ Failed to get Google AI config from environment, checking project API configuration...');
      
      if (usePersonalApiKey) {
        // Try to get user's personal API config
        const userConfigPath = path.join(process.cwd(), '.ai-project', 'user-configs', `${userId}-api-config.json`);
        if (await fileExists(userConfigPath)) {
          try {
            const userConfigData = await fs.readFile(userConfigPath, 'utf8');
            const userConfig = JSON.parse(userConfigData);
            
            // Decrypt API key if it's encrypted
            let decryptedApiKey = '';
            if (userConfig.encryptedApiKey) {
              // Note: You'll need to import the decryptApiKey function
              // decryptedApiKey = decryptApiKey(userConfig.encryptedApiKey);
              decryptedApiKey = userConfig.encryptedApiKey; // For now, assume it's not encrypted
            } else if (userConfig.apiKey) {
              decryptedApiKey = userConfig.apiKey;
            }
            
            apiConfig = {
              provider: userConfig.provider,
              apiKey: decryptedApiKey,
              model: userConfig.model,
              baseUrl: userConfig.baseUrl
            };
            console.log('✅ Using user personal API configuration');
            console.log(`🔑 CONFIG SOURCE: USER PERSONAL API KEY`);
            console.log(`🤖 Provider: ${userConfig.provider}, Model: ${userConfig.model}`);
          } catch (error) {
            console.warn('⚠️ Failed to load user API config, falling back to global config');
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
            { success: false, error: 'No AI configuration found. Please set GOOGLE_AI_API_KEY environment variable or configure an AI provider in the global settings.' },
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
        { success: false, error: 'No valid AI configuration found. Please configure an AI provider in the project settings or global settings.' },
        { status: 400 }
      );
    }

    console.log(`🤖 Using AI provider: ${apiConfig.provider} with model: ${apiConfig.model}`);
    console.log(`🔍 DEBUG - API Config:`, { provider: apiConfig.provider, model: apiConfig.model, hasApiKey: !!apiConfig.apiKey });

    // Platform-specific character limits and styles
    const platformLimits = {
      twitter: { limit: 280, style: 'Concise and engaging with relevant hashtags' },
      linkedin: { limit: 3000, style: 'Professional and thought-provoking' },
      facebook: { limit: 2000, style: 'Engaging and community-focused' },
      instagram: { limit: 2200, style: 'Visual-first, use relevant hashtags' },
      tiktok: { limit: 150, style: 'Catchy and trend-aware' },
      youtube: { limit: 5000, style: 'Descriptive and informative' }
    };

    // Generate enhanced post using AI
    const prompt = `
You are a social media marketing expert. Enhance the following social media post based on the user's requirements.

ORIGINAL POST:
${originalContent}

PLATFORM: ${platform.toUpperCase()}
POST TYPE: ${postType}
TONE: ${tone}

ENHANCEMENT INSTRUCTIONS:
${enhanceAdditions}

REQUIREMENTS:
- Maintain the core message and authenticity of the original post
- Apply the requested enhancements while keeping it natural
- Adapt for ${platform} platform (${platformLimits[platform as keyof typeof platformLimits]?.limit || 'no specific'} character limit)
- Style: ${platformLimits[platform as keyof typeof platformLimits]?.style || 'Adapt to platform'}
- Post type: ${postType} (adjust tone and structure accordingly)
- Tone: ${tone}
- ${includeHashtags ? 'Include relevant hashtags' : 'Do not include hashtags'}
- ${includeEmojis ? 'Include appropriate emojis' : 'Do not include emojis'}

IMPORTANT:
- Keep the enhanced post within platform character limits
- Ensure the enhancement feels natural and not forced
- Maintain the original intent while incorporating the requested improvements
- Return ONLY the enhanced post content, no explanations or additional text

Enhanced post:`;

    let enhancedContent = '';
    let tokenUsage = { totalTokens: 0, cost: 0 };

    if (apiConfig.provider === 'gemini' || apiConfig.provider === 'google') {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiConfig.apiKey);
      const model = genAI.getGenerativeModel({ model: apiConfig.model || 'gemini-1.5-flash' });

      console.log('🤖 Calling Gemini API for post enhancement...');
      console.log('🔍 DEBUG - Prompt length:', prompt.length);
      
      try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        enhancedContent = response.text();
        console.log('✅ Gemini API call successful, response length:', enhancedContent.length);
      } catch (geminiError) {
        console.error('❌ Gemini API error:', geminiError);
        return NextResponse.json(
          { success: false, error: `Gemini API error: ${geminiError instanceof Error ? geminiError.message : 'Unknown error'}` },
          { status: 500 }
        );
      }

      // Calculate token usage for Gemini
      const tokenCount = enhancedContent.length / 4; // Rough estimate
      tokenUsage = {
        totalTokens: Math.ceil(tokenCount),
        cost: Math.ceil(tokenCount) * 0.00015 / 1000 // Rough cost estimate
      };

      console.log(`✅ Gemini post enhancement completed. Tokens: ${tokenUsage.totalTokens}, Cost: $${tokenUsage.cost.toFixed(4)}`);
    } else {
      return NextResponse.json(
        { success: false, error: `Unsupported AI provider: ${apiConfig.provider}` },
        { status: 400 }
      );
    }

    // Track token usage
    try {
      const tokenTrackingService = new TokenTrackingService();
      await tokenTrackingService.trackTokenUsage(
        projectId,
        Math.ceil(tokenUsage.totalTokens * 0.7), // Rough estimate for input tokens
        Math.ceil(tokenUsage.totalTokens * 0.3), // Rough estimate for output tokens
        'social-post-enhancement'
      );
      console.log('📊 Token usage tracked successfully');
    } catch (error) {
      console.warn('⚠️ Failed to track token usage:', error);
    }

    const result: EnhanceSocialPostResult = {
      success: true,
      enhancedContent: enhancedContent.trim(),
      tokenUsage
    };

    console.log('✅ Social post enhancement completed successfully');
    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Social post enhancement error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        success: false, 
        error: `Error enhancing social post: ${errorMessage}` 
      },
      { status: 500 }
    );
  }
}
