import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PineconeSyncServiceInstance } from '@/lib/pineconeSyncService';
import { getGoogleAIConfig, validateSecureConfig } from '@/lib/secureConfig';
import { TokenTrackingService } from '@/lib/tokenTrackingService';
import { ProjectService } from '@/lib/projectService';
import { analysisVectorService } from '@/lib/analysisVectorService';
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

interface ImproveAnalysisRequest {
  analysisType: string;
  originalAnalysis: string;
  improvementDetails: string;
  focusAreas?: string[];
}

interface ImproveAnalysisResult {
  success: boolean;
  improvedAnalysis: string;
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
    
    // Check project ownership before allowing improve analysis
    const projectService = ProjectService.getInstance();
    const project = await projectService.getProject(userId, projectId);
    
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // Only project owners can improve analysis
    if (project.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Only project owners can improve analysis' },
        { status: 403 }
      );
    }
    
    const body: ImproveAnalysisRequest = await request.json();
    console.log('🔍 DEBUG - Request body:', JSON.stringify(body, null, 2));
    
    const { 
      analysisType,
      originalAnalysis,
      improvementDetails,
      focusAreas = []
    } = body;

    if (!analysisType || !originalAnalysis || !improvementDetails?.trim()) {
      console.error('❌ Missing required fields:', { 
        hasAnalysisType: !!analysisType, 
        hasOriginalAnalysis: !!originalAnalysis, 
        hasImprovementDetails: !!improvementDetails?.trim()
      });
      return NextResponse.json(
        { success: false, error: 'Missing required fields: analysisType, originalAnalysis, and improvementDetails are required' },
        { status: 400 }
      );
    }

    console.log(`✨ Improving ${analysisType} analysis for project ${projectId}`);

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

    // Analysis type specific instructions
    const analysisTypeInstructions = {
      technical: 'Focus on technical feasibility, architecture, implementation details, technology stack recommendations, and development considerations.',
      market: 'Focus on market size, target audience, competitive landscape, market trends, and business opportunities.',
      differentiation: 'Focus on unique value propositions, competitive advantages, market positioning, and differentiation strategies.',
      financial: 'Focus on cost analysis, revenue projections, financial viability, pricing strategies, and investment requirements.',
      bmc: 'Focus on business model components, value creation, customer relationships, and revenue streams.',
      roast: 'Focus on critical analysis, potential weaknesses, realistic challenges, and honest feedback.'
    };

    const focusAreasText = focusAreas.length > 0 ? `\n\nSPECIFIC FOCUS AREAS:\n${focusAreas.map(area => `- ${area}`).join('\n')}` : '';

    // Get relevant context using vector search
    console.log(`🔍 Getting vector search context for ${analysisType} analysis improvement`);
    let vectorContext = '';
    try {
      const context = await analysisVectorService.getAnalysisContext(
        projectId,
        analysisType,
        `${improvementDetails} ${focusAreas.join(' ')}`
      );
      
      if (context.relevantDocuments.length > 0 || context.relatedAnalyses.length > 0 || context.projectInfo.length > 0) {
        vectorContext = analysisVectorService.formatContextForAnalysis(context, analysisType);
        console.log(`✅ Retrieved vector context: ${context.relevantDocuments.length} docs, ${context.relatedAnalyses.length} analyses, ${context.projectInfo.length} project info`);
      } else {
        console.log('⚠️ No relevant context found via vector search');
      }
    } catch (error) {
      console.error('❌ Failed to get vector search context:', error);
      // Continue without context rather than failing
    }

    const contextSection = vectorContext ? `\n\nRELEVANT PROJECT CONTEXT:\n${vectorContext}` : '';

    // Generate improved analysis using AI
    const prompt = `
You are an expert business and technical analyst. Improve the following ${analysisType} analysis based on the user's specific requirements and relevant project context.

ORIGINAL ${analysisType.toUpperCase()} ANALYSIS:
${originalAnalysis}

IMPROVEMENT INSTRUCTIONS:
${improvementDetails}${focusAreasText}${contextSection}

ANALYSIS TYPE GUIDELINES:
${analysisTypeInstructions[analysisType as keyof typeof analysisTypeInstructions] || 'Provide comprehensive analysis relevant to the analysis type.'}

REQUIREMENTS:
- Maintain the structure and format of the original analysis
- Incorporate the requested improvements while keeping the analysis professional and actionable
- Enhance depth and quality based on the improvement instructions
- Keep all existing insights that are still relevant
- Add new insights, recommendations, or details as requested
- Ensure the improved analysis is more comprehensive and valuable than the original
- Maintain consistency with the original analysis style and tone
- If the original analysis has sections (summary, insights, recommendations, etc.), preserve that structure

IMPORTANT:
- Return the complete improved analysis, not just the changes
- Maintain the same format and structure as the original
- Ensure all improvements feel natural and well-integrated
- Focus on adding value while preserving what was already good

Improved analysis:`;

    let improvedAnalysis = '';
    let tokenUsage = { totalTokens: 0, cost: 0 };

    if (apiConfig.provider === 'gemini' || apiConfig.provider === 'google') {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiConfig.apiKey);
      const model = genAI.getGenerativeModel({ model: apiConfig.model || 'gemini-1.5-flash' });

      console.log('🤖 Calling Gemini API for analysis improvement...');
      console.log('🔍 DEBUG - Prompt length:', prompt.length);
      
      try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        improvedAnalysis = response.text();
        console.log('✅ Gemini API call successful, response length:', improvedAnalysis.length);
      } catch (geminiError) {
        console.error('❌ Gemini API error:', geminiError);
        return NextResponse.json(
          { success: false, error: `Gemini API error: ${geminiError instanceof Error ? geminiError.message : 'Unknown error'}` },
          { status: 500 }
        );
      }

      // Calculate token usage for Gemini
      const inputTokens = Math.ceil(prompt.length / 4);
      const outputTokens = Math.ceil(improvedAnalysis.length / 4);
      const totalTokens = inputTokens + outputTokens;
      
      tokenUsage = {
        totalTokens,
        cost: totalTokens * 0.00015 / 1000 // Rough cost estimate
      };

      console.log(`✅ Gemini analysis improvement completed. Tokens: ${tokenUsage.totalTokens}, Cost: ${tokenUsage.cost.toFixed(4)}`);
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
        `${analysisType}-analysis-improvement`
      );
      console.log('📊 Token usage tracked successfully');
    } catch (error) {
      console.warn('⚠️ Failed to track token usage:', error);
    }

    const result: ImproveAnalysisResult = {
      success: true,
      improvedAnalysis: improvedAnalysis.trim(),
      tokenUsage
    };

    console.log(`✅ ${analysisType} analysis improvement completed successfully`);
    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Analysis improvement error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        success: false, 
        error: `Error improving analysis: ${errorMessage}` 
      },
      { status: 500 }
    );
  }
}