import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

interface ApiConfiguration {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

async function testOpenAI(config: ApiConfiguration): Promise<boolean> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error response:', errorData);
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    return data.data && data.data.length > 0;
  } catch (error) {
    console.error('OpenAI test failed:', error);
    return false;
  }
}

async function testAnthropic(config: ApiConfiguration): Promise<boolean> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Hello'
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Anthropic API error response:', errorData);
      throw new Error(`Anthropic API error: ${response.status} - ${errorData}`);
    }

    return true;
  } catch (error) {
    console.error('Anthropic test failed:', error);
    return false;
  }
}

async function testGoogleAI(config: ApiConfiguration): Promise<boolean> {
  try {
    // Test with a simple content generation request instead of just checking model availability
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
                text: 'Hello'
              }
            ]
          }
        ],
        generationConfig: {
          maxOutputTokens: 10,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Google AI API error response:', errorData);
      throw new Error(`Google AI API error: ${response.status} - ${errorData}`);
    }

    return true;
  } catch (error) {
    console.error('Google AI test failed:', error);
    return false;
  }
}

async function testCustomProvider(config: ApiConfiguration): Promise<boolean> {
  try {
    if (!config.baseUrl) {
      throw new Error('Base URL is required for custom provider');
    }

    const response = await fetch(`${config.baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Custom provider test failed:', error);
    return false;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: projectId } = await params;
    
    // Get the current API configuration for this project (respects user/app key selection)
    const configResponse = await fetch(`${request.nextUrl.origin}/api/projects/${projectId}/api-config`, {
      headers: {
        'Cookie': request.headers.get('Cookie') || ''
      }
    });

    if (!configResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to load project API configuration' },
        { status: 500 }
      );
    }

    const config: ApiConfiguration & { source?: string; usePersonalApiKey?: boolean } = await configResponse.json();

    // Validate required fields
    if (!config.provider || !config.apiKey || !config.model) {
      return NextResponse.json(
        { error: 'API configuration is incomplete. Please configure your API settings.' },
        { status: 400 }
      );
    }

    let testResult = false;
    let errorMessage = '';

    // Test the configured provider
    try {
      switch (config.provider) {
        case 'openai':
          testResult = await testOpenAI(config);
          break;
        case 'anthropic':
          testResult = await testAnthropic(config);
          break;
        case 'google':
          testResult = await testGoogleAI(config);
          break;
        case 'custom':
          testResult = await testCustomProvider(config);
          break;
        default:
          return NextResponse.json(
            { error: 'Unsupported provider' },
            { status: 400 }
          );
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      testResult = false;
    }

    if (testResult) {
      const keySource = config.usePersonalApiKey ? 'personal' : 'app default';
      return NextResponse.json({ 
        success: true, 
        message: `API connection successful using ${keySource} key (${config.provider} - ${config.model})` 
      });
    } else {
      const keySource = config.usePersonalApiKey ? 'personal' : 'app default';
      return NextResponse.json(
        { error: `API connection failed using ${keySource} key. ${errorMessage || 'Please check your API key and configuration.'}` },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('API test failed:', error);
    return NextResponse.json(
      { error: 'Failed to test API connection' },
      { status: 500 }
    );
  }
}
