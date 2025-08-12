import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

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
  "backend": "technology-value",
  "frontend": "technology-value", 
  "uiFramework": "technology-value",
  "authentication": "technology-value",
  "hosting": "technology-value"
}

Choose the most appropriate technology value from the available options above. If no technology is suitable for a category, use "none".`;
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

    // Load global API configuration
    const globalConfigPath = getGlobalConfigPath();
    if (!await fileExists(globalConfigPath)) {
      return NextResponse.json(
        { error: 'No global API configuration found. Please configure an AI provider in the global settings.' },
        { status: 400 }
      );
    }

    const globalConfigData = await fs.readFile(globalConfigPath, 'utf8');
    const apiConfig: ApiConfiguration = JSON.parse(globalConfigData);

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

    // Track token usage for project creation
    try {
      const { TokenTrackingService } = await import('@/lib/tokenTrackingService');
      const tokenTrackingService = TokenTrackingService.getInstance();
      
      const inputTokens = aiResponse.tokenUsage?.promptTokenCount || aiResponse.tokenUsage?.prompt_tokens || 0;
      const outputTokens = aiResponse.tokenUsage?.candidatesTokenCount || aiResponse.tokenUsage?.completion_tokens || 0;
      
      await tokenTrackingService.trackTokenUsage('project-creation', inputTokens, outputTokens, 'tech-stack-recommendation');
    } catch (error) {
      console.warn('Failed to track token usage for tech stack recommendation:', error);
    }

    // Parse the AI response
    let technologyStack: TechnologyStack;
    try {
      const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        technologyStack = JSON.parse(jsonMatch[0]);
      } else {
        technologyStack = JSON.parse(aiResponse.content);
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return NextResponse.json(
        { error: 'Failed to parse AI technology stack response' },
        { status: 500 }
      );
    }

    // Validate the response structure
    const requiredFields = ['backend', 'frontend', 'uiFramework', 'authentication', 'hosting'];
    for (const field of requiredFields) {
      if (!technologyStack[field as keyof TechnologyStack]) {
        return NextResponse.json(
          { error: `Invalid technology stack response: missing ${field}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      technologyStack,
      tokenUsage: aiResponse.tokenUsage
    });

  } catch (error) {
    console.error('Failed to auto-fill technology stack:', error);
    return NextResponse.json(
      { error: 'Failed to auto-fill technology stack' },
      { status: 500 }
    );
  }
}
