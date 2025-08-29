import { NextRequest, NextResponse } from 'next/server';

interface UrlContextRequest {
  url: string;
  prompt?: string;
  includeMetadata?: boolean;
  analysisType?: 'summary' | 'insights' | 'extraction' | 'custom';
}

interface ApiConfiguration {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
  customHeaders?: Record<string, string>;
}

async function getApiConfiguration(): Promise<ApiConfiguration> {
  // Try to get user-specific API configuration first
  try {
    const configResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/user-api-config`, {
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (configResponse.ok) {
      const config = await configResponse.json();
      if (config.provider === 'google' && config.apiKey) {
        return config;
      }
    }
  } catch (error) {
    console.warn('Failed to get user API config, falling back to global config');
  }

  // Fallback to global configuration
  try {
    const globalConfigResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/global-api-config`);
    
    if (globalConfigResponse.ok) {
      const globalConfig = await globalConfigResponse.json();
      if (globalConfig.provider === 'google' && globalConfig.apiKey) {
        return globalConfig;
      }
    }
  } catch (error) {
    console.warn('Failed to get global API config');
  }

  // Final fallback to environment variables
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';
  
  if (!apiKey) {
    throw new Error('No Google AI API key found in configuration or environment variables');
  }

  return {
    provider: 'google',
    apiKey: apiKey,
    model: 'gemini-1.5-flash',
    baseUrl: 'https://generativelanguage.googleapis.com'
  };
}

async function callGeminiWithUrlContext(
  config: ApiConfiguration, 
  url: string, 
  prompt: string
): Promise<{ content: string; tokenUsage: any; metadata?: any }> {
  console.log(`🤖 Calling Gemini with URL context for: ${url}`);
  
  // First, try to extract content using traditional web scraping
  let extractedContent = '';
  try {
    const { extract } = await import('@extractus/article-extractor');
    const article = await extract(url, {
      contentLengthThreshold: 100,
      descriptionLengthThreshold: 50,
      wordsPerMinute: 300
    }, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Roki AI Project Manager Bot)'
      }
    });
    
    if (article && article.content) {
      extractedContent = article.content.substring(0, 8000); // Limit content length
      console.log(`✅ Extracted ${extractedContent.length} characters from URL`);
    }
  } catch (error) {
    console.warn('⚠️ Failed to extract content from URL:', error);
  }

  // Now use Gemini to analyze the extracted content
  const enhancedPrompt = extractedContent 
    ? `${prompt}\n\nURL: ${url}\n\nExtracted Content:\n${extractedContent}`
    : `${prompt}\n\nURL: ${url}\n\nNote: Unable to extract content from this URL. Please provide analysis based on the URL and any available information.`;

  const requestBody = {
    contents: [{
      parts: [{
        text: enhancedPrompt
      }]
    }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4000,
    },
  };

  const response = await fetch(
    `${config.baseUrl || 'https://generativelanguage.googleapis.com'}/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.customHeaders
      },
      body: JSON.stringify(requestBody)
    }
  );

  console.log('Gemini API response status:', response.status);

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Gemini API error response:', errorData);
    throw new Error(`Gemini API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  console.log('Gemini API response data keys:', Object.keys(data));
  
  if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
    const content = data.candidates[0].content.parts[0].text;
    console.log('Generated content length:', content.length);
    return {
      content: content,
      tokenUsage: data.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 },
      metadata: {
        extractedContentLength: extractedContent.length,
        url: url,
        method: 'web-scraping-plus-ai'
      }
    };
  } else {
    console.error('Invalid response structure from Gemini API:', data);
    throw new Error('Invalid response structure from Gemini API');
  }
}

function generatePrompt(url: string, analysisType: string, customPrompt?: string): string {
  const basePrompt = `Analyze the content at this URL: ${url}`;
  
  switch (analysisType) {
    case 'summary':
      return `${basePrompt}

Please provide a comprehensive summary of the main content, including:
- Key points and main arguments
- Important facts and data
- Author's perspective or stance
- Target audience
- Key takeaways

Format the response in a clear, structured manner.`;
    
    case 'insights':
      return `${basePrompt}

Please extract key insights and analysis from this content, including:
- Main themes and topics
- Notable findings or conclusions
- Implications or significance
- Related trends or context
- Potential applications or relevance

Focus on actionable insights and deeper analysis.`;
    
    case 'extraction':
      return `${basePrompt}

Please extract and organize the key information from this content:
- Main title and headings
- Key facts and figures
- Important quotes or statements
- Technical details or specifications
- Contact information or references
- Related links or resources

Present the information in a structured, easy-to-read format.`;
    
    case 'custom':
      return customPrompt || `${basePrompt}

Please analyze this content according to your understanding and provide relevant insights.`;
    
    default:
      return `${basePrompt}

Please provide a comprehensive analysis of this content, including:
- Summary of main points
- Key insights and takeaways
- Important details and context
- Relevance and significance

Format the response clearly and include any notable metadata.`;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url, prompt, includeMetadata = true, analysisType = 'summary' }: UrlContextRequest = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    console.log(`🔗 Processing URL context for: ${url}`);

    // Get API configuration
    let apiConfig: ApiConfiguration;
    try {
      apiConfig = await getApiConfiguration();
      console.log('✅ API configuration loaded:', { provider: apiConfig.provider, model: apiConfig.model });
    } catch (error) {
      console.error('❌ Failed to get API configuration:', error);
      return NextResponse.json(
        { error: 'Google AI API key not configured. Please configure an AI provider first.' },
        { status: 400 }
      );
    }
    
    if (!apiConfig.apiKey) {
      return NextResponse.json(
        { error: 'Google AI API key not configured. Please configure an AI provider first.' },
        { status: 400 }
      );
    }

    if (apiConfig.provider !== 'google') {
      return NextResponse.json(
        { error: 'URL context feature requires Google Gemini API. Please configure Google AI provider.' },
        { status: 400 }
      );
    }

    // Generate appropriate prompt
    const analysisPrompt = generatePrompt(url, analysisType, prompt);

    // Call Gemini with URL context
    const result = await callGeminiWithUrlContext(apiConfig, url, analysisPrompt);

    // Format response
    const response = {
      success: true,
      url: url,
      content: result.content,
      analysisType: analysisType,
      tokenUsage: result.tokenUsage,
      metadata: includeMetadata ? {
        model: apiConfig.model,
        provider: apiConfig.provider,
        timestamp: new Date().toISOString(),
        url: url
      } : undefined
    };

    console.log(`✅ Successfully processed URL context for: ${url}`);
    console.log(`📊 Token usage: ${result.tokenUsage.totalTokenCount || 'unknown'}`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('URL context error:', error);
    
    // Provide helpful error messages
    let errorMessage = 'Failed to process URL context';
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'Invalid or missing API key. Please check your Google AI configuration.';
      } else if (error.message.includes('quota')) {
        errorMessage = 'API quota exceeded. Please try again later or check your usage limits.';
      } else if (error.message.includes('invalid URL')) {
        errorMessage = 'The provided URL could not be accessed or is not supported.';
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing URL accessibility
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { error: 'URL parameter is required' },
      { status: 400 }
    );
  }

  try {
    // Validate URL format
    new URL(url);
    
    // Test if URL is accessible
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Roki URL Context Bot)'
      }
    });

    return NextResponse.json({
      url: url,
      accessible: response.ok,
      status: response.status,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length')
    });

  } catch (error) {
    return NextResponse.json({
      url: url,
      accessible: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
