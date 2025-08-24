import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getApiConfiguration } from '@/lib/apiConfig';

// POST /api/config-test - Test the current API configuration (user or environment)
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('POST /api/config-test: Testing current configuration for user:', userId);
    
    // Get the current configuration (same logic as backend)
    const config = await getApiConfiguration();
    
    if (config.source === 'none') {
      return NextResponse.json(
        { error: 'No API configuration found. Please configure your API keys.' },
        { status: 400 }
      );
    }

    console.log('POST /api/config-test: Testing config:', { 
      provider: config.provider, 
      model: config.model, 
      source: config.source,
      hasApiKey: !!config.apiKey
    });

    // Test the configuration based on provider
    let testResult = false;
    let errorMessage = '';

    try {
      switch (config.provider) {
        case 'google':
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: 'Hello'
                }]
              }],
              generationConfig: {
                maxOutputTokens: 10,
              },
            }),
          });

          if (!response.ok) {
            const errorData = await response.text();
            console.error('POST /api/config-test: Google AI API error response:', errorData);
            errorMessage = `Google AI API error: ${response.status}`;
            testResult = false;
          } else {
            testResult = true;
          }
          break;

        case 'openai':
          const openaiResponse = await fetch('https://api.openai.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${config.apiKey}`,
              'Content-Type': 'application/json',
            },
          });

          if (!openaiResponse.ok) {
            const errorData = await openaiResponse.text();
            console.error('POST /api/config-test: OpenAI API error response:', errorData);
            errorMessage = `OpenAI API error: ${openaiResponse.status}`;
            testResult = false;
          } else {
            const data = await openaiResponse.json();
            testResult = data.data && data.data.length > 0;
          }
          break;

        case 'anthropic':
          const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.apiKey}`,
              'Content-Type': 'application/json',
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: config.model,
              max_tokens: 10,
              messages: [{
                role: 'user',
                content: 'Hello'
              }]
            }),
          });

          if (!anthropicResponse.ok) {
            const errorData = await anthropicResponse.text();
            console.error('POST /api/config-test: Anthropic API error response:', errorData);
            errorMessage = `Anthropic API error: ${anthropicResponse.status}`;
            testResult = false;
          } else {
            testResult = true;
          }
          break;

        default:
          console.error('POST /api/config-test: Unsupported provider:', config.provider);
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
      const sourceDescription = config.source === 'user' ? 'personal API key' : 'environment variables';
      return NextResponse.json({ 
        success: true, 
        message: `API connection successful using ${sourceDescription} (${config.provider} - ${config.model})` 
      });
    } else {
      const sourceDescription = config.source === 'user' ? 'personal API key' : 'environment variables';
      return NextResponse.json(
        { error: `API connection failed using ${sourceDescription}. ${errorMessage || 'Please check your configuration.'}` },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('POST /api/config-test: Failed to test configuration:', error);
    return NextResponse.json(
      { error: 'Failed to test API configuration' },
      { status: 500 }
    );
  }
}