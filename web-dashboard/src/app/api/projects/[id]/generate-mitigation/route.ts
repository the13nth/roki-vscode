import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getGoogleAIConfig, validateSecureConfig } from '@/lib/secureConfig';
import { PineconeSyncServiceInstance } from '@/lib/pineconeSyncService';
import fs from 'fs';
import path from 'path';

interface MitigationRequest {
  context: string;
  criticism: string;
  criticismType: string;
  projectTemplate: string;
}

interface ApiConfiguration {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

function getApiConfigPath(projectId: string): string {
  return path.join(process.cwd(), '.ai-project', 'projects', projectId, 'api-config.json');
}

function generateMitigationPrompt(context: string, criticism: string, criticismType: string, projectTemplate: string): string {
  const isBusinessProject = projectTemplate === 'business';
  
  return `You are an expert ${isBusinessProject ? 'business strategy consultant and problem solver' : 'technical consultant and solution architect'} helping to address specific criticisms and challenges in project planning.

Project Context:
${context}

Specific Criticism to Address:
"${criticism}"

Criticism Type: ${criticismType}

Your task is to provide a practical, actionable mitigation strategy that directly addresses this specific criticism. Focus on realistic solutions that can be implemented.

Provide your response in the following JSON format:
{
  "mitigation": "A detailed, practical strategy to address this specific criticism. Include concrete steps, alternative approaches, and realistic solutions. Be specific and actionable."
}

${isBusinessProject ? 
  'Focus on business solutions like market research, financial planning, regulatory compliance, partnerships, pilot programs, and risk management strategies.' : 
  'Focus on technical solutions like architecture changes, technology alternatives, implementation strategies, testing approaches, and development methodologies.'
}

The mitigation should be:
- Directly relevant to the criticism
- Practically implementable
- Cost-effective when possible
- Risk-aware but solution-oriented
- Specific rather than generic advice`;
}

async function callOpenAI(config: ApiConfiguration, prompt: string): Promise<{ content: string; tokenUsage: any }> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model || 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    tokenUsage: {
      inputTokens: data.usage.prompt_tokens,
      outputTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
      cost: (data.usage.prompt_tokens * 0.000125 / 1000) + (data.usage.completion_tokens * 0.000375 / 1000)
    }
  };
}

async function callAnthropic(config: ApiConfiguration, prompt: string): Promise<{ content: string; tokenUsage: any }> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': config.apiKey!,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model || 'claude-3-sonnet-20240229',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    content: data.content[0].text,
    tokenUsage: {
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
      totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      cost: (data.usage.input_tokens * 0.003 / 1000) + (data.usage.output_tokens * 0.015 / 1000)
    }
  };
}

async function callGoogleAI(config: ApiConfiguration, prompt: string): Promise<{ content: string; tokenUsage: any }> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.model || 'gemini-1.5-pro'}:generateContent?key=${config.apiKey}`, {
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
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Google AI API error ${response.status}:`, errorText);
      throw new Error(`Google AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      content: data.candidates[0].content.parts[0].text,
      tokenUsage: {
        inputTokens: data.usageMetadata?.promptTokenCount || 0,
        outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
        cost: ((data.usageMetadata?.promptTokenCount || 0) / 1000) * 0.000125 + ((data.usageMetadata?.candidatesTokenCount || 0) / 1000) * 0.000375
      }
    };
  } catch (error) {
    console.error('❌ Google AI API call failed:', error);
    throw error;
  }
}

async function callCustomProvider(config: ApiConfiguration, prompt: string): Promise<{ content: string; tokenUsage: any }> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`Custom API error: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    tokenUsage: {
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
      cost: 0 // Custom provider pricing varies
    }
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;
    const { context, criticism, criticismType, projectTemplate }: MitigationRequest = await request.json();

    if (!context || !criticism) {
      return NextResponse.json(
        { error: 'Context and criticism are required' },
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

    // Get the appropriate API configuration for this project (respects user/app key selection)
    let config: ApiConfiguration | undefined;
    
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
      config = getGoogleAIConfig();
      console.log('✅ Using secure Google AI configuration from environment');
      console.log(`🔑 CONFIG SOURCE: ENVIRONMENT VARIABLE (GOOGLE_AI_API_KEY)`);
    } catch (error) {
      console.warn('⚠️ Failed to get Google AI config from environment, checking project API configuration...');
      
      if (usePersonalApiKey) {
        // Try to get user's personal API config
        const userConfigPath = path.join(process.cwd(), '.ai-project', 'user-configs', `${userId}-api-config.json`);
        if (fs.existsSync(userConfigPath)) {
          try {
            const userConfigData = fs.readFileSync(userConfigPath, 'utf8');
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
            
            config = {
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
      if (!config) {
        const configPath = getApiConfigPath(projectId);
        if (fs.existsSync(configPath)) {
          try {
            const configData = fs.readFileSync(configPath, 'utf8');
            const parsedConfig = JSON.parse(configData);
            config = parsedConfig;
            console.log('✅ Using project-specific API configuration');
            console.log(`🔑 CONFIG SOURCE: PROJECT-SPECIFIC API KEY`);
            console.log(`🤖 Provider: ${parsedConfig.provider}, Model: ${parsedConfig.model}`);
          } catch (error) {
            console.warn('⚠️ Failed to load project API config, falling back to global config');
          }
        }
      }
      
      // Finally, fallback to global configuration file
      if (!config) {
        const globalConfigPath = path.join(process.cwd(), '.ai-project', 'global-api-config.json');
        if (fs.existsSync(globalConfigPath)) {
          try {
            const globalConfigData = fs.readFileSync(globalConfigPath, 'utf8');
            const parsedConfig = JSON.parse(globalConfigData);
            config = parsedConfig;
            console.log('✅ Using global API configuration');
            console.log(`🔑 CONFIG SOURCE: GLOBAL/APP DEFAULT API KEY`);
            console.log(`🤖 Provider: ${parsedConfig.provider}, Model: ${parsedConfig.model}`);
          } catch (error) {
            console.warn('⚠️ Failed to load global API config');
          }
        }
      }
    }

    // Ensure we have a valid API configuration
    if (!config) {
      return NextResponse.json(
        { error: 'No valid AI configuration found. Please configure an AI provider in the project settings or global settings.' },
        { status: 400 }
      );
    }

    // Generate mitigation prompt
    const prompt = generateMitigationPrompt(context, criticism, criticismType, projectTemplate);

    // Call the appropriate AI provider
    let aiResponse: { content: string; tokenUsage: any };
    switch (config.provider) {
      case 'openai':
        aiResponse = await callOpenAI(config, prompt);
        break;
      case 'anthropic':
        aiResponse = await callAnthropic(config, prompt);
        break;
      case 'google':
        aiResponse = await callGoogleAI(config, prompt);
        break;
      case 'custom':
        aiResponse = await callCustomProvider(config, prompt);
        break;
      default:
        return NextResponse.json(
          { error: 'Unsupported AI provider' },
          { status: 400 }
        );
    }

    // Parse the AI response
    let mitigationData;
    try {
      // Extract JSON from the response
      const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        mitigationData = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback if no JSON found
        mitigationData = { mitigation: aiResponse.content };
      }
    } catch (parseError) {
      // If JSON parsing fails, use the raw content
      mitigationData = { mitigation: aiResponse.content };
    }

    const result = {
      mitigation: mitigationData.mitigation || 'Unable to generate mitigation strategy.',
      tokenUsage: aiResponse.tokenUsage,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Mitigation generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate mitigation' },
      { status: 500 }
    );
  }
}



