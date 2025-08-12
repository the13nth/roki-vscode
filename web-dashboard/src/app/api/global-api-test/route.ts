import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface ApiConfiguration {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

function getGlobalConfigPath(): string {
  return path.join(process.cwd(), '.ai-project', 'global-api-config.json');
}

async function testOpenAI(config: ApiConfiguration): Promise<boolean> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function testAnthropic(config: ApiConfiguration): Promise<boolean> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
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
    return response.ok;
  } catch {
    return false;
  }
}

async function testGoogleAI(config: ApiConfiguration): Promise<boolean> {
  try {
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
    return response.ok;
  } catch {
    return false;
  }
}

async function testCustomProvider(config: ApiConfiguration): Promise<boolean> {
  try {
    if (!config.baseUrl) return false;
    
    const response = await fetch(`${config.baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const config: ApiConfiguration = await request.json();

    // Validate required fields
    if (!config.provider || !config.apiKey || !config.model) {
      return NextResponse.json(
        { error: 'Provider, API key, and model are required' },
        { status: 400 }
      );
    }

    let testResult = false;

    // Test the configured provider
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

    if (testResult) {
      return NextResponse.json({ success: true, message: 'Global API connection successful' });
    } else {
      return NextResponse.json(
        { error: 'Global API connection failed. Please check your API key and configuration.' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Global API test failed:', error);
    return NextResponse.json(
      { error: 'Failed to test global API connection' },
      { status: 500 }
    );
  }
}
