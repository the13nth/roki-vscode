import { NextRequest, NextResponse } from 'next/server';

interface TagGenerationRequest {
  content: string;
  title?: string;
  category?: string;
  url?: string;
}

interface ApiConfiguration {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { content, title, category, url }: TagGenerationRequest = await request.json();

    if (!content || content.trim().length < 50) {
      return NextResponse.json(
        { error: 'Content is required and must be at least 50 characters' },
        { status: 400 }
      );
    }

    // First try AI-powered tag generation, fallback to rule-based
    let aiTags: string[] = [];
    try {
      aiTags = await generateAITags(content, title, category);
    } catch (error) {
      console.warn('AI tag generation failed, using fallback:', error);
    }

    // Generate rule-based tags as backup/supplement
    const ruleTags = generateAutomaticTags(content, title, category, url);

    // Combine and deduplicate tags
    const allTags = [...new Set([...aiTags, ...ruleTags])];
    const finalTags = allTags.slice(0, 12); // Limit to 12 tags

    return NextResponse.json({
      tags: finalTags,
      count: finalTags.length,
      aiGenerated: aiTags.length,
      ruleGenerated: ruleTags.length
    });

  } catch (error) {
    console.error('Tag generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate tags' },
      { status: 500 }
    );
  }
}

async function generateAITags(content: string, title?: string, category?: string): Promise<string[]> {
  // Get API configuration from environment or global settings
  const apiConfig: ApiConfiguration = {
    provider: 'google', // Default to Google Gemini
    apiKey: process.env.GOOGLE_AI_API_KEY || '',
    model: 'gemini-1.5-flash',
  };

  if (!apiConfig.apiKey) {
    throw new Error('No AI API key configured');
  }

  // Prepare content for analysis (limit length for API)
  const analysisContent = content.substring(0, 3000);
  
  const prompt = `Analyze the following content and generate relevant tags. Return ONLY a JSON array of strings, no explanation.

Content Title: ${title || 'No title'}
Category: ${category || 'general'}
Content: ${analysisContent}

Generate 8-10 relevant tags that capture:
1. Main topics and themes
2. Key concepts and ideas  
3. Industry/domain terms
4. Technologies mentioned
5. Geographic locations
6. People or organizations
7. Action items or processes

Return format: ["tag1", "tag2", "tag3", ...]

Tags should be:
- Lowercase
- 1-3 words max
- Specific and relevant
- Professional/formal tone
- No duplicates`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${apiConfig.model}:generateContent?key=${apiConfig.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.candidates[0]?.content?.parts[0]?.text;
    
    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    // Parse JSON response
    const jsonMatch = aiResponse.match(/\[.*\]/);
    if (!jsonMatch) {
      throw new Error('Invalid JSON format in AI response');
    }

    const tags = JSON.parse(jsonMatch[0]);
    return Array.isArray(tags) ? tags.filter(tag => typeof tag === 'string' && tag.length > 1) : [];

  } catch (error) {
    console.error('AI tag generation failed:', error);
    throw error;
  }
}

function generateAutomaticTags(content: string, title?: string, category?: string, url?: string): string[] {
  const tags = new Set<string>();
  const text = `${title || ''} ${content}`.toLowerCase();
  
  // Category-based tags
  if (category) {
    tags.add(category);
    
    // Add specific tags based on category
    const categoryTags = getCategorySpecificTags(category, text);
    categoryTags.forEach(tag => tags.add(tag));
  }

  // Technology and framework detection
  const techTags = detectTechnologies(text);
  techTags.forEach(tag => tags.add(tag));

  // Business and domain keywords
  const businessTags = detectBusinessKeywords(text);
  businessTags.forEach(tag => tags.add(tag));

  // Content type indicators
  const contentTags = detectContentTypes(text);
  contentTags.forEach(tag => tags.add(tag));

  // URL-based tags
  if (url) {
    const urlTags = extractUrlTags(url);
    urlTags.forEach(tag => tags.add(tag));
  }

  // Extract key phrases and topics
  const topicTags = extractTopics(text);
  topicTags.forEach(tag => tags.add(tag));

  // Filter and clean tags
  const finalTags = Array.from(tags)
    .filter(tag => tag.length >= 2 && tag.length <= 20)
    .filter(tag => !/^\d+$/.test(tag)) // Remove pure numbers
    .filter(tag => !/^(the|and|or|but|in|on|at|to|for|of|with|by)$/.test(tag)) // Remove common words
    .slice(0, 15); // Limit to 15 tags

  return finalTags;
}

function getCategorySpecificTags(category: string, text: string): string[] {
  const tags: string[] = [];

  switch (category) {
    case 'api':
      const apiPatterns = ['rest', 'graphql', 'endpoint', 'webhook', 'integration', 'oauth', 'authentication', 'json', 'xml'];
      apiPatterns.forEach(pattern => {
        if (text.includes(pattern)) tags.push(pattern);
      });
      break;

    case 'design':
      const designPatterns = ['ui', 'ux', 'wireframe', 'prototype', 'figma', 'sketch', 'responsive', 'mobile', 'desktop'];
      designPatterns.forEach(pattern => {
        if (text.includes(pattern)) tags.push(pattern);
      });
      break;

    case 'research':
      const researchPatterns = ['survey', 'analysis', 'data', 'insights', 'user research', 'market', 'competitor'];
      researchPatterns.forEach(pattern => {
        if (text.includes(pattern)) tags.push(pattern.replace(' ', '-'));
      });
      break;

    case 'requirements':
      const reqPatterns = ['feature', 'functionality', 'specification', 'acceptance criteria', 'user story'];
      reqPatterns.forEach(pattern => {
        if (text.includes(pattern)) tags.push(pattern.replace(' ', '-'));
      });
      break;

    case 'news-article':
      tags.push('news', 'article', 'external');
      break;

    case 'social-media-post':
      tags.push('social', 'post', 'external');
      break;
  }

  return tags;
}

function detectTechnologies(text: string): string[] {
  const technologies = [
    // Frontend
    'react', 'vue', 'angular', 'javascript', 'typescript', 'html', 'css', 'sass', 'tailwind',
    'next.js', 'nuxt', 'svelte', 'jquery', 'bootstrap', 'webpack', 'vite',
    
    // Backend
    'node.js', 'express', 'fastify', 'python', 'django', 'flask', 'java', 'spring',
    'php', 'laravel', 'ruby', 'rails', 'go', 'rust', 'c#', '.net',
    
    // Databases
    'mysql', 'postgresql', 'mongodb', 'redis', 'sqlite', 'elasticsearch',
    
    // Cloud & Infrastructure
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'serverless', 'lambda',
    'vercel', 'netlify', 'heroku',
    
    // Tools & Services
    'git', 'github', 'gitlab', 'jira', 'slack', 'discord', 'figma', 'notion'
  ];

  return technologies.filter(tech => {
    const regex = new RegExp(`\\b${tech.replace('.', '\\.')}\\b`, 'i');
    return regex.test(text);
  });
}

function detectBusinessKeywords(text: string): string[] {
  const businessKeywords = [
    'startup', 'enterprise', 'saas', 'b2b', 'b2c', 'ecommerce', 'fintech',
    'healthcare', 'education', 'marketing', 'sales', 'analytics', 'growth',
    'mvp', 'roadmap', 'strategy', 'monetization', 'revenue', 'pricing',
    'customer', 'user', 'client', 'stakeholder', 'team', 'agile', 'scrum'
  ];

  return businessKeywords.filter(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(text);
  });
}

function detectContentTypes(text: string): string[] {
  const tags: string[] = [];

  // Content type indicators
  if (text.includes('tutorial') || text.includes('how to') || text.includes('guide')) {
    tags.push('tutorial');
  }
  if (text.includes('documentation') || text.includes('docs')) {
    tags.push('documentation');
  }
  if (text.includes('bug') || text.includes('issue') || text.includes('error')) {
    tags.push('troubleshooting');
  }
  if (text.includes('feature') || text.includes('enhancement')) {
    tags.push('feature-request');
  }
  if (text.includes('security') || text.includes('vulnerability')) {
    tags.push('security');
  }
  if (text.includes('performance') || text.includes('optimization')) {
    tags.push('performance');
  }
  if (text.includes('testing') || text.includes('qa') || text.includes('quality')) {
    tags.push('testing');
  }

  return tags;
}

function extractUrlTags(url: string): string[] {
  const tags: string[] = [];

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    
    // Add domain as tag (limit to known sites)
    const knownSites = [
      'github.com', 'stackoverflow.com', 'medium.com', 'dev.to', 'hackernews',
      'reddit.com', 'twitter.com', 'linkedin.com', 'youtube.com', 'docs.google.com'
    ];
    
    if (knownSites.some(site => domain.includes(site))) {
      tags.push(domain.split('.')[0]);
    }

    // Extract from path
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
    pathSegments.forEach(segment => {
      if (segment.length > 2 && segment.length < 15 && !/^\d+$/.test(segment)) {
        tags.push(segment.toLowerCase());
      }
    });

  } catch (error) {
    // Invalid URL, skip
  }

  return tags;
}

function extractTopics(text: string): string[] {
  const topics: string[] = [];
  
  // Common technical topics
  const technicalTopics = [
    'machine learning', 'ai', 'artificial intelligence', 'blockchain', 'cryptocurrency',
    'cloud computing', 'cybersecurity', 'data science', 'big data', 'iot',
    'mobile development', 'web development', 'devops', 'microservices',
    'automation', 'ci/cd', 'monitoring', 'logging', 'deployment'
  ];

  technicalTopics.forEach(topic => {
    if (text.includes(topic.toLowerCase())) {
      topics.push(topic.replace(' ', '-'));
    }
  });

  // Extract potential acronyms (2-5 uppercase letters)
  const acronyms = text.match(/\b[A-Z]{2,5}\b/g);
  if (acronyms) {
    acronyms.slice(0, 5).forEach(acronym => {
      if (acronym !== 'API' && acronym !== 'URL' && acronym !== 'HTTP') {
        topics.push(acronym.toLowerCase());
      }
    });
  }

  return topics;
}
