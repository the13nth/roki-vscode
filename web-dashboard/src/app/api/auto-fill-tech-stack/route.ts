import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAIConfig, validateSecureConfig } from '@/lib/secureConfig';
import { promises as fs } from 'fs';
import path from 'path';
import { auth } from '@clerk/nextjs/server';

interface ApiConfiguration {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

interface AutoFillRequest {
  description: string;
  template: string;
}

interface TechnologyStack {
  backend: string;
  frontend: string;
  uiFramework: string;
  authentication: string;
  hosting: string;
}

interface RegulatoryStack {
  backend: string;
  frontend: string;
  uiFramework: string;
  authentication: string;
  hosting: string;
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
        temperature: 0.2,
        maxOutputTokens: 1000,
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
      max_tokens: 1000,
      temperature: 0.2,
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
      max_tokens: 1000,
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

function generateTechStackPrompt(request: AutoFillRequest): string {
  const { description, template } = request;
  const isBusinessTemplate = template === 'business';

  return `You are an expert ${isBusinessTemplate ? 'business analyst and regulatory consultant' : 'software architect and technology consultant'}. Analyze the following project description and recommend the most suitable ${isBusinessTemplate ? 'regulatory framework and compliance approach' : 'technology stack for optimal performance, scalability, and developer experience'}.

Project Description: "${description}"
Project Template: ${template}

Available Technology Options:

Backend:
- node-express: Node.js + Express (JavaScript/TypeScript, fast development, large ecosystem)
- python-django: Python + Django (rapid development, built-in admin, ORM)
- python-flask: Python + Flask (lightweight, flexible, microservices)
- java-spring: Java + Spring Boot (enterprise-grade, robust, scalable)
- csharp-dotnet: C# + .NET (Microsoft ecosystem, enterprise, Windows integration)
- go-gin: Go + Gin (high performance, concurrent, microservices)
- php-laravel: PHP + Laravel (web-focused, rapid development, hosting-friendly)
- ruby-rails: Ruby + Rails (convention over configuration, rapid prototyping)
- none: No Backend (static site, client-side only)

Frontend:
- react: React (component-based, large ecosystem, flexible)
- nextjs: Next.js (React framework, SSR/SSG, production-ready)
- vue: Vue.js (progressive, easy learning curve, good documentation)
- angular: Angular (enterprise, TypeScript, comprehensive framework)
- svelte: Svelte (compiled, lightweight, modern)
- vanilla: Vanilla JavaScript (no framework, full control)
- none: No Frontend (API-only, backend service)

UI Framework:
- tailwind: Tailwind CSS (utility-first, highly customizable)
- material-ui: Material-UI (Google Material Design, React components)
- chakra-ui: Chakra UI (accessible, modern, React components)
- ant-design: Ant Design (enterprise UI, comprehensive components)
- bootstrap: Bootstrap (responsive, widely used, easy to learn)
- shadcn-ui: shadcn/ui (modern, customizable, copy-paste components)
- none: No UI Framework (custom CSS, full control)

Authentication:
- jwt: JWT Tokens (stateless, scalable, custom implementation)
- oauth: OAuth 2.0 (industry standard, third-party integration)
- firebase-auth: Firebase Auth (Google, easy setup, multiple providers)
- auth0: Auth0 (enterprise, comprehensive, managed service)
- supabase-auth: Supabase Auth (PostgreSQL-based, real-time)
- none: No Authentication (public app, no user accounts)

Hosting:
- aws: AWS (comprehensive, scalable, enterprise)
- netlify: Netlify (static sites, JAMstack, easy deployment)
- vercel: Vercel (Next.js optimized, edge functions, fast)
- google-cloud: Google Cloud (comprehensive, AI/ML integration)
- azure: Microsoft Azure (enterprise, Windows integration)
- heroku: Heroku (simple deployment, managed platform)
- digitalocean: DigitalOcean (developer-friendly, cost-effective)
- none: Not decided yet

Based on the project description, recommend the most suitable technology for each category. Consider:
1. Project type and complexity
2. Team expertise and learning curve
3. Performance requirements
4. Scalability needs
5. Development speed
6. Cost considerations
7. Ecosystem and community support

Return your response as a JSON object with exactly these fields:
{
  "technologyStack": {
    "backend": "technology-value",
    "frontend": "technology-value", 
    "uiFramework": "technology-value",
    "authentication": "technology-value",
    "hosting": "technology-value"
  },
  "reasoning": "Detailed explanation of why these technologies were chosen, including considerations for the project type, scalability, development speed, and any trade-offs made."
}

Choose the most appropriate technology value from the available options above. If no technology is suitable for a category, use "none". Provide a comprehensive reasoning that explains your choices and how they align with the project requirements.`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const requestData: AutoFillRequest = await request.json();

    // Validate required fields
    if (!requestData.description || !requestData.description.trim()) {
      return NextResponse.json(
        { error: 'Project description is required' },
        { status: 400 }
      );
    }

    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
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

    // Get the appropriate API configuration (same comprehensive approach as analyze route)
    let apiConfig: ApiConfiguration | undefined;
    
    // Always check user API key preference first, regardless of environment variables
    let usePersonalApiKey = false;
    
    try {
      // For auto-fill-tech-stack, we don't have a project ID, so we'll default to global config
      // but still check if user has personal API key preference
      console.log(`🔑 API Source: APP DEFAULT API KEY (auto-fill-tech-stack)`);
      console.log(`👤 User ID: ${userId}`);
    } catch (error) {
      console.warn('⚠️ Failed to read API key selection, defaulting to global config');
      console.log(`🔑 API Source: APP DEFAULT API KEY (fallback)`);
      console.log(`👤 User ID: ${userId}`);
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
      console.warn('⚠️ Failed to get Google AI config from environment, checking user API configuration...');
      
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
        { error: 'No valid AI configuration found. Please configure an AI provider in the global settings.' },
        { status: 400 }
      );
    }

    // Generate technology stack prompt
    const prompt = generateTechStackPrompt(requestData);

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

    // Parse the AI response to extract the JSON object and reasoning
    let technologyStack;
    let reasoning = 'No reasoning provided';
    
    try {
      // First, try to find the JSON object in the response
      const jsonMatch = aiResponse.content.match(/\{[^}]*"backend"[^}]*"frontend"[^}]*"uiFramework"[^}]*"authentication"[^}]*"hosting"[^}]*\}/);
      
      if (jsonMatch) {
        try {
          technologyStack = JSON.parse(jsonMatch[0]);
          // Extract reasoning from the text after the JSON
          const afterJson = aiResponse.content.substring(jsonMatch[0].length).trim();
          if (afterJson) {
            reasoning = afterJson;
          }
        } catch (parseError) {
          console.error('Failed to parse extracted JSON:', jsonMatch[0]);
          return NextResponse.json(
            { error: 'AI response could not be parsed as valid JSON' },
            { status: 500 }
          );
        }
      } else {
        // Fallback: try to parse the entire response as JSON
        const parsedResponse = JSON.parse(aiResponse.content.trim());
        technologyStack = parsedResponse.technologyStack || parsedResponse;
        reasoning = parsedResponse.reasoning || 'No reasoning provided';
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse.content);
      return NextResponse.json(
        { error: 'AI response could not be parsed' },
        { status: 500 }
      );
    }

    // Track token usage for project creation
    try {
      const { TokenTrackingService } = await import('@/lib/tokenTrackingService');
      const tokenTrackingService = TokenTrackingService.getInstance();
      
      const inputTokens = aiResponse.tokenUsage?.promptTokenCount || aiResponse.tokenUsage?.prompt_tokens || 0;
      const outputTokens = aiResponse.tokenUsage?.candidatesTokenCount || aiResponse.tokenUsage?.completion_tokens || 0;
      
      await tokenTrackingService.trackTokenUsage('project-creation', inputTokens, outputTokens, 'tech-stack-auto-fill');
    } catch (error) {
      console.warn('Failed to track token usage for tech stack auto-fill:', error);
    }

    return NextResponse.json({
      success: true,
      technologyStack: technologyStack,
      reasoning: reasoning,
      tokenUsage: aiResponse.tokenUsage
    });

  } catch (error) {
    console.error('Failed to auto-fill tech stack:', error);
    return NextResponse.json(
      { error: 'Failed to auto-fill technology stack with AI' },
      { status: 500 }
    );
  }
}
