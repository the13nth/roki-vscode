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
  return NextResponse.json({
    error: 'Per-project API testing is deprecated. Please use the global API test endpoint.',
    redirectTo: '/profile',
    useGlobalEndpoint: '/api/user-api-test'
  }, { status: 410 });
}
