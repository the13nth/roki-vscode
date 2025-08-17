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
  includeTechStack?: boolean;
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
  const { description, template, technologyStack, regulatoryStack, includeTechStack } = request;
  
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

  const techStackSection = includeTechStack && !isBusinessTemplate ? `

Additionally, recommend the most suitable technology stack for this project. Available Technology Options:

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

Consider the project type, complexity, team expertise, performance requirements, scalability needs, development speed, cost considerations, and ecosystem support when making recommendations.` : '';

  return `You are an expert ${isBusinessTemplate ? 'business analyst and project manager' : 'software project manager and technical writer'}. Expand and enhance the following brief project description into a comprehensive, detailed project description.

Original Description: "${description}"
Project Template: ${template}
${stackText}${techStackSection}

Please expand this into a detailed project description that includes:

1. **Project Overview**: Clear explanation of what the ${isBusinessTemplate ? 'project' : 'application'} does
2. **Target ${isBusinessTemplate ? 'Stakeholders' : 'Users'}**: Who will ${isBusinessTemplate ? 'be involved in or benefit from' : 'use'} this ${isBusinessTemplate ? 'project' : 'application'} and their needs
3. **Key ${isBusinessTemplate ? 'Components' : 'Features'}**: Main ${isBusinessTemplate ? 'deliverables and processes' : 'functionality and capabilities'}
4. **${isBusinessTemplate ? 'Regulatory Requirements' : 'Technical Requirements'}**: Specific ${isBusinessTemplate ? 'compliance needs and regulatory constraints' : 'technical needs and constraints'}
5. **${isBusinessTemplate ? 'Implementation Approach' : 'User Experience'}**: How ${isBusinessTemplate ? 'the project will be executed and stakeholders will engage' : 'users will interact with the application'}
6. **Business Value**: What problem it solves and its benefits
7. **Success Criteria**: How to measure if the project is successful

Make the description comprehensive, professional, and aligned with the chosen ${isBusinessTemplate ? 'regulatory framework' : 'technology stack'}. Keep it focused and practical, avoiding unnecessary jargon. The expanded description should be 3-5 paragraphs long and provide enough detail for ${isBusinessTemplate ? 'stakeholders' : 'developers'} to understand the project scope and requirements.

${includeTechStack && !isBusinessTemplate ? `

After the expanded description, provide a technology stack recommendation in the following JSON format:

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

Choose the most appropriate technology value from the available options above. If no technology is suitable for a category, use "none". Provide comprehensive reasoning that explains your choices and how they align with the project requirements.` : 'Return only the expanded description text, no additional formatting or explanations.'}`;
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
      // For expand-description, we don't have a project ID, so we'll default to global config
      // but still check if user has personal API key preference
      console.log(`🔑 API Source: APP DEFAULT API KEY (expand-description)`);
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

    // Generate expansion prompt
    console.log('🔧 Request data:', requestData);
    console.log('🔧 Include tech stack:', requestData.includeTechStack);
    console.log('🔧 Template:', requestData.template);
    
    const prompt = generateExpandPrompt(requestData);
    console.log('📝 Generated prompt length:', prompt.length);

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

    // Parse the AI response to extract expanded description and tech stack (if included)
    let expandedDescription = aiResponse.content.trim();
    let technologyStack = null;
    let reasoning = null;

    if (requestData.includeTechStack && requestData.template !== 'business') {
      console.log('🔍 Parsing AI response for tech stack...');
      console.log('AI Response:', aiResponse.content);
      
      // Try multiple approaches to extract JSON
      let jsonMatch = null;
      
      // First, try to find the complete JSON object with technologyStack and reasoning
      // Look for the start of the JSON and capture everything until the last closing brace
      const jsonStart = aiResponse.content.indexOf('{');
      if (jsonStart !== -1) {
        // Find the matching closing brace by counting braces
        let braceCount = 0;
        let jsonEnd = -1;
        
        for (let i = jsonStart; i < aiResponse.content.length; i++) {
          if (aiResponse.content[i] === '{') {
            braceCount++;
          } else if (aiResponse.content[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
              jsonEnd = i;
              break;
            }
          }
        }
        
        if (jsonEnd !== -1) {
          jsonMatch = aiResponse.content.substring(jsonStart, jsonEnd + 1);
          console.log('🔍 Found complete JSON object using brace counting');
        }
      }
      
      if (!jsonMatch) {
        // Fallback: try to find JSON with technologyStack and reasoning using regex
        jsonMatch = aiResponse.content.match(/\{[^}]*"technologyStack"[^}]*"reasoning"[^}]*\}/);
      }
      
      if (!jsonMatch) {
        // Fallback: try to find any JSON object that might contain the tech stack
        jsonMatch = aiResponse.content.match(/\{[^}]*"backend"[^}]*"frontend"[^}]*"uiFramework"[^}]*"authentication"[^}]*"hosting"[^}]*\}/);
      }
      
      if (!jsonMatch) {
        // Last resort: try to find any JSON object at the end of the response
        const jsonMatches = aiResponse.content.match(/\{[^}]*\}/g);
        if (jsonMatches && jsonMatches.length > 0) {
          jsonMatch = jsonMatches[jsonMatches.length - 1];
        }
      }
      
      if (jsonMatch) {
        console.log('📋 Found JSON match:', jsonMatch);
        try {
          const parsedResponse = JSON.parse(jsonMatch);
          console.log('✅ Parsed JSON:', parsedResponse);
          
          // Check if it has the expected structure
          if (parsedResponse.technologyStack && Object.keys(parsedResponse.technologyStack).length > 0) {
            technologyStack = parsedResponse.technologyStack;
            reasoning = parsedResponse.reasoning || 'No reasoning provided';
          } else if (parsedResponse.backend || parsedResponse.frontend) {
            // Direct tech stack object
            technologyStack = parsedResponse;
            reasoning = 'Technology stack recommended based on project requirements.';
          }
          
          // Remove the JSON from the description
          const jsonStartIndex = aiResponse.content.indexOf(jsonMatch);
          if (jsonStartIndex !== -1) {
            expandedDescription = aiResponse.content.substring(0, jsonStartIndex).trim();
          }
          
          console.log('📝 Extracted tech stack:', technologyStack);
          console.log('📝 Extracted reasoning:', reasoning);
        } catch (parseError) {
          console.error('❌ Failed to parse tech stack JSON from response:', parseError);
          console.error('JSON content:', jsonMatch);
          
          // Try to fix malformed JSON and parse again
          try {
            console.log('🔧 Attempting to fix malformed JSON...');
            let fixedJson = jsonMatch;
            
            // Fix the specific issue: empty technologyStack object with properties at root level
            if (fixedJson.includes('"technologyStack": {}') && 
                (fixedJson.includes('"backend"') || fixedJson.includes('"frontend"'))) {
              
              // Extract the tech stack properties from root level
              const backendMatch = fixedJson.match(/"backend":\s*"([^"]+)"/);
              const frontendMatch = fixedJson.match(/"frontend":\s*"([^"]+)"/);
              const uiFrameworkMatch = fixedJson.match(/"uiFramework":\s*"([^"]+)"/);
              const authenticationMatch = fixedJson.match(/"authentication":\s*"([^"]+)"/);
              const hostingMatch = fixedJson.match(/"hosting":\s*"([^"]+)"/);
              
              // Create a properly structured tech stack object
              const fixedTechStack = {
                backend: backendMatch ? backendMatch[1] : '',
                frontend: frontendMatch ? frontendMatch[1] : '',
                uiFramework: uiFrameworkMatch ? uiFrameworkMatch[1] : '',
                authentication: authenticationMatch ? authenticationMatch[1] : '',
                hosting: hostingMatch ? hostingMatch[1] : ''
              };
              
              console.log('🔧 Fixed tech stack:', fixedTechStack);
              technologyStack = fixedTechStack;
              reasoning = 'Technology stack recommended based on project requirements.';
              
              // Remove the malformed JSON from the description
              const jsonStartIndex = aiResponse.content.indexOf(jsonMatch);
              if (jsonStartIndex !== -1) {
                expandedDescription = aiResponse.content.substring(0, jsonStartIndex).trim();
              }
            }
          } catch (fixError) {
            console.error('❌ Failed to fix malformed JSON:', fixError);
          }
        }
      } else {
        console.log('❌ No JSON found in AI response');
      }
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
      expandedDescription,
      technologyStack,
      reasoning,
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
