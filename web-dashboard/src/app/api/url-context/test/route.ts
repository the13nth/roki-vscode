import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Test environment variables
    const envVars = {
      NEXT_PUBLIC_GOOGLE_AI_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY ? 'Set' : 'Not set',
      GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY ? 'Set' : 'Not set',
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    };

    // Test API configuration endpoints
    let userConfigStatus = 'Not tested';
    let globalConfigStatus = 'Not tested';

    try {
      const userConfigResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/user-api-config`);
      userConfigStatus = userConfigResponse.ok ? 'Available' : `Error: ${userConfigResponse.status}`;
    } catch (error) {
      userConfigStatus = `Error: ${error instanceof Error ? error.message : 'Unknown'}`;
    }

    try {
      const globalConfigResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/global-api-config`);
      globalConfigStatus = globalConfigResponse.ok ? 'Available' : `Error: ${globalConfigResponse.status}`;
    } catch (error) {
      globalConfigStatus = `Error: ${error instanceof Error ? error.message : 'Unknown'}`;
    }

    return NextResponse.json({
      status: 'URL Context API Test',
      timestamp: new Date().toISOString(),
      environment: envVars,
      configuration: {
        userApiConfig: userConfigStatus,
        globalApiConfig: globalConfigStatus
      },
      recommendations: [
        'Check if Google AI API key is set in environment variables',
        'Verify API configuration endpoints are accessible',
        'Ensure Google Gemini API is enabled in your Google Cloud Console'
      ]
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
