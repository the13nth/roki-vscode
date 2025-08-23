import { NextRequest, NextResponse } from 'next/server';
import { extract } from '@extractus/article-extractor';
import { convert } from 'html-to-text';

interface UrlPreviewRequest {
  url: string;
  includeMetadata?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { url, includeMetadata = true }: UrlPreviewRequest = await request.json();

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

    console.log(`Extracting article from: ${url}`);

    // Use the professional article extractor
    const article = await extract(url, {
      contentLengthThreshold: 100, // Minimum content length
      descriptionLengthThreshold: 50, // Minimum description length
      wordsPerMinute: 300 // For reading time estimation
    }, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AI Project Manager URL Preview Bot)'
      }
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Failed to extract article content' },
        { status: 400 }
      );
    }

    console.log(`Successfully extracted article:
      - Title: ${article.title?.substring(0, 100)}...
      - Content length: ${article.content?.length || 0}
      - Author: ${article.author || 'Unknown'}
      - Published: ${article.published || 'Unknown'}`);

    // Clean and format the content using professional HTML-to-text conversion
    let content = article.content || '';
    
    // Convert HTML to clean text with simple, reliable formatting
    content = convert(content, {
      wordwrap: null, // No word wrapping
      preserveNewlines: false,
      selectors: [
        // Skip unwanted elements
        { selector: 'script', format: 'skip' },
        { selector: 'style', format: 'skip' },
        { selector: 'nav', format: 'skip' },
        { selector: 'header', format: 'skip' },
        { selector: 'footer', format: 'skip' },
        { selector: '.advertisement', format: 'skip' },
        { selector: '.ads', format: 'skip' },
        { selector: '.social-share', format: 'skip' },
        { selector: '.related-articles', format: 'skip' },
        { selector: '.comments', format: 'skip' }
      ]
    });
    
    // Additional cleanup of extra whitespace
    content = content
      .replace(/\n{3,}/g, '\n\n') // Limit to max 2 consecutive line breaks
      .replace(/[ \t]+/g, ' ') // Multiple spaces/tabs to single space
      .trim();
    
    // Remove any remaining unwanted sections that might have slipped through
    const cleanupPatterns = [
      /latest articles?.*$/gi,
      /related articles?.*$/gi,
      /advertisement.*$/gi,
      /subscribe.*newsletter.*$/gi,
      /follow us on.*$/gi,
      /share this.*$/gi,
      /comments.*$/gi
    ];
    
    cleanupPatterns.forEach(pattern => {
      content = content.replace(pattern, '');
    });
    
    content = content.trim();

    // Format content based on URL type with metadata
    let formattedContent = '';
    
    if (url.includes('twitter.com') || url.includes('x.com')) {
      // Twitter/X post format
      formattedContent = `# ${article.title || 'Social Media Post'}\n\n**Source:** ${article.source || 'Twitter/X'}\n**URL:** ${url}\n\n${content}`;
    } else {
      // News article format with metadata header
      const metadata = [];
      if (article.title) metadata.push(`**Title:** ${article.title}`);
      if (article.author) metadata.push(`**Author:** ${article.author}`);
      if (article.published) metadata.push(`**Published:** ${new Date(article.published).toLocaleDateString()}`);
      if (article.source) metadata.push(`**Source:** ${article.source}`);
      metadata.push(`**URL:** ${url}`);
      if (article.ttr && article.ttr > 0) metadata.push(`**Reading Time:** ${Math.ceil(article.ttr / 60)} minutes`);
      
      const metadataSection = metadata.join('\n');
      formattedContent = `${metadataSection}\n\n---\n\n${content}`;
    }

    return NextResponse.json({
      title: article.title?.trim() || '',
      description: article.description?.trim() || '',
      content: formattedContent,
      fullContent: content,
      author: article.author || '',
      published: article.published || '',
      source: article.source || '',
      extractionType: 'full',
      contentLength: formattedContent.length,
      fullContentLength: content.length,
      image: article.image || '',
      siteName: article.source || '',
      url: article.url || url,
      ttr: article.ttr || 0 // time to read
    });

  } catch (error) {
    console.error('URL preview error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch URL preview' },
      { status: 500 }
    );
  }
}


