import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

interface ApiConfiguration {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

// POST /api/user-api-test - Test user's API configuration
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      console.error('POST /api/user-api-test: No userId found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('POST /api/user-api-test: Testing config for user:', userId);
    const config: ApiConfiguration = await request.json();
    console.log('POST /api/user-api-test: Testing config:', { 
      provider: config.provider, 
      model: config.model, 
      hasApiKey: !!config.apiKey,
      baseUrl: config.baseUrl 
    });

    // Validate required fields
    if (!config.provider || !config.apiKey || !config.model) {
      console.error('POST /api/user-api-test: Missing required fields:', { 
        hasProvider: !!config.provider, 
        hasApiKey: !!config.apiKey, 
        hasModel: !!config.model 
      });
      return NextResponse.json(
        { error: 'Provider, API key, and model are required' },
        { status: 400 }
      );
    }

    // Test the API configuration based on provider
    let testResult: { success: boolean; message: string };

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
        console.error('POST /api/user-api-test: Unsupported provider:', config.provider);
        return NextResponse.json(
          { error: 'Unsupported provider' },
          { status: 400 }
        );
    }

    console.log('POST /api/user-api-test: Test result:', testResult);

    if (testResult.success) {
      return NextResponse.json({
        success: true,
        message: testResult.message
      });
    } else {
      return NextResponse.json(
        { error: testResult.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('POST /api/user-api-test: Failed to test user API configuration:', error);
    return NextResponse.json(
      { error: 'Failed to test API configuration' },
      { status: 500 }
    );
  }
}

async function testOpenAI(config: ApiConfiguration): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const modelExists = data.data?.some((model: any) => model.id === config.model);
      
      if (modelExists) {
        return { success: true, message: `OpenAI API connection successful! Model ${config.model} is available.` };
      } else {
        return { success: false, message: `Model ${config.model} not found in your OpenAI account.` };
      }
    } else {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, message: `OpenAI API error: ${errorData.error?.message || response.statusText}` };
    }
  } catch (error) {
    return { success: false, message: `OpenAI connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

async function testAnthropic(config: ApiConfiguration): Promise<{ success: boolean; message: string }> {
  try {
    // Anthropic doesn't have a simple models endpoint, so we'll make a minimal completion request
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': config.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }]
      })
    });

    if (response.ok) {
      return { success: true, message: `Anthropic API connection successful! Model ${config.model} is available.` };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, message: `Anthropic API error: ${errorData.error?.message || response.statusText}` };
    }
  } catch (error) {
    return { success: false, message: `Anthropic connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

async function testGoogleAI(config: ApiConfiguration): Promise<{ success: boolean; message: string }> {
  try {
    const baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com';
    const response = await fetch(`${baseUrl}/v1/models?key=${config.apiKey}`);

    if (response.ok) {
      const data = await response.json();
      const modelExists = data.models?.some((model: any) => model.name.includes(config.model));
      
      if (modelExists) {
        return { success: true, message: `Google AI API connection successful! Model ${config.model} is available.` };
      } else {
        return { success: false, message: `Model ${config.model} not found in Google AI.` };
      }
    } else {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, message: `Google AI API error: ${errorData.error?.message || response.statusText}` };
    }
  } catch (error) {
    return { success: false, message: `Google AI connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

async function testCustomProvider(config: ApiConfiguration): Promise<{ success: boolean; message: string }> {
  try {
    if (!config.baseUrl) {
      return { success: false, message: 'Base URL is required for custom providers' };
    }

    // Try to make a basic request to the custom endpoint
    const response = await fetch(`${config.baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      return { success: true, message: `Custom API connection successful! Endpoint ${config.baseUrl} is reachable.` };
    } else {
      return { success: false, message: `Custom API error: ${response.statusText}` };
    }
  } catch (error) {
    return { success: false, message: `Custom API connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}