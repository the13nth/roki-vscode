import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

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

    // Fetch the URL content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AI Project Manager URL Preview Bot)'
      },
      timeout: 10000 // 10 second timeout
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.status} ${response.statusText}` },
        { status: 400 }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract metadata
    const title = 
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text() ||
      '';

    const description = 
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      '';

    const image = 
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      '';

    const siteName = 
      $('meta[property="og:site_name"]').attr('content') ||
      '';

    // Extract main content (try to get article content)
    let content = '';
    
    // Try common article selectors
    const articleSelectors = [
      'article',
      '[role="main"]',
      '.content',
      '.article-content',
      '.post-content',
      '.entry-content',
      'main'
    ];

    for (const selector of articleSelectors) {
      const element = $(selector).first();
      if (element.length) {
        // Get text content and clean it up
        content = element.text()
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 2000); // Limit to 2000 characters
        break;
      }
    }

    // If no article content found, use the description
    if (!content) {
      content = description;
    }

    // Format content for different types
    let formattedContent = '';
    
    if (url.includes('twitter.com') || url.includes('x.com')) {
      // Twitter/X post format
      formattedContent = `# ${title || 'Social Media Post'}\n\n**Source:** ${siteName || 'Twitter/X'}\n**URL:** ${url}\n\n${content || description}`;
    } else {
      // News article format
      formattedContent = `# ${title}\n\n**Source:** ${siteName}\n**URL:** ${url}\n\n## Summary\n\n${description}\n\n## Content\n\n${content}`;
    }

    return NextResponse.json({
      title: title.trim(),
      description: description.trim(),
      content: formattedContent,
      image,
      siteName,
      url
    });

  } catch (error) {
    console.error('URL preview error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch URL preview' },
      { status: 500 }
    );
  }
}


