import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getGoogleAIConfig } from '@/lib/secureConfig';
import { TokenTrackingService } from '@/lib/tokenTrackingService';
import fs from 'fs/promises';
import path from 'path';

// Helper function to check if file exists
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

interface ApiConfiguration {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

interface ApplicationResponseImprovementRequest {
  originalResponse: string;
  improvementDetails: string;
  question: string;
  applicationContext?: string;
  wordLimit?: number;
  characterLimit?: number;
}

interface ApplicationResponseImprovementResult {
  improvedResponse: string;
  keyPoints: string[];
  suggestedImprovements: string[];
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
    const body: ApplicationResponseImprovementRequest = await request.json();
    const { 
      originalResponse,
      improvementDetails,
      question,
      applicationContext = '',
      wordLimit,
      characterLimit
    } = body;

    console.log(`📝 Improving application response for project ${projectId}`);
    console.log(`🎯 Improvement request: ${improvementDetails.substring(0, 100)}...`);

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
        const globalConfigPath = path.join(process.cwd(), '.ai-project', 'global-api-config.json');
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
    const sessionId = `application-response-improve-${Date.now()}`;

    // Create constraints text
    let constraintsText = '';
    if (wordLimit || characterLimit) {
      constraintsText = '\n\nCONSTRAINTS:\n';
      if (wordLimit) {
        constraintsText += `- Word limit: ${wordLimit} words\n`;
      }
      if (characterLimit) {
        constraintsText += `- Character limit: ${characterLimit} characters\n`;
      }
    }

    // Create the prompt for application response improvement
    const prompt = `You are an expert application writer and editor. I have an application response that needs improvement based on specific feedback.

APPLICATION QUESTION:
${question}

${applicationContext ? `APPLICATION CONTEXT:\n${applicationContext}\n` : ''}

ORIGINAL RESPONSE:
${originalResponse}

IMPROVEMENT REQUEST:
${improvementDetails}${constraintsText}

Please improve the application response according to the improvement request. The improved version should:

1. Maintain the same overall structure and flow
2. Address the specific improvement request
3. Keep the same professional tone
4. Preserve all important details and achievements
5. Ensure the content is compelling and well-written
6. Stay within any specified word/character limits
7. Be tailored to the specific application question

Please provide your response in the following JSON format:
{
  "improvedResponse": "The improved application response text",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "suggestedImprovements": ["Additional suggestion 1", "Additional suggestion 2"]
}

Return only the JSON response, no additional text or formatting.`;

    console.log('🤖 Sending application response improvement request to AI...');

    // Call AI service
    let responseText: string;
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

        console.log('🤖 Sending application response improvement request to Gemini API...');

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
        responseText = result.candidates[0].content.parts[0].text;

        // Calculate token usage (approximate)
        inputTokens = Math.ceil(prompt.length / 4);
        outputTokens = Math.ceil(responseText.length / 4);

      } else {
        throw new Error(`Unsupported AI provider: ${apiConfig.provider}`);
      }
    } catch (error) {
      console.error('❌ AI API error:', error);
      return NextResponse.json(
        { error: 'Failed to improve application response using AI service' },
        { status: 500 }
      );
    }

    // Parse the AI response
    let parsedResponse;
    try {
      // Clean up the response text to extract JSON
      const cleanedResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedResponse = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('❌ Failed to parse AI response as JSON:', parseError);
      console.log('Raw AI response:', responseText);
      
      // Fallback: treat the entire response as the improved response
      parsedResponse = {
        improvedResponse: responseText.trim(),
        keyPoints: [],
        suggestedImprovements: []
      };
    }
    
    const totalTokens = inputTokens + outputTokens;
    const cost = (inputTokens / 1000) * 0.000125 + (outputTokens / 1000) * 0.000375; // Gemini pricing

    // Track token usage
    await tokenTracker.trackTokenUsage(projectId, inputTokens, outputTokens, 'application-response-improvement');

    const result: ApplicationResponseImprovementResult = {
      improvedResponse: parsedResponse.improvedResponse || responseText.trim(),
      keyPoints: parsedResponse.keyPoints || [],
      suggestedImprovements: parsedResponse.suggestedImprovements || [],
      tokenUsage: {
        inputTokens,
        outputTokens,
        totalTokens,
        cost
      }
    };

    console.log('✅ Application response improved successfully');
    console.log(`📊 Token usage: ${totalTokens} tokens, Cost: ${cost.toFixed(4)}`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Application response improvement error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Application response improvement failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}