import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { TokenTrackingService } from '@/lib/tokenTrackingService';
import { getGoogleAIConfig, validateSecureConfig } from '@/lib/secureConfig';
import { auth } from '@clerk/nextjs/server';

const tokenTrackingService = new TokenTrackingService();

interface ApiConfiguration {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

interface PitchGenerationRequest {
  format?: 'markdown' | 'plain' | 'structured';
  sections?: string[];
}

function getGlobalConfigPath(): string {
  return path.join(process.cwd(), '.ai-project', 'global-api-config.json');
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

interface PitchResult {
  pitch: string;
  sections: {
    overview: string;
    keyFeatures: string;
    progress: string;
    futurePlans: string;
    marketOpportunity?: string;
    technicalHighlights?: string;
    businessModel?: string;
  };
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost: number;
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;
    const body: PitchGenerationRequest = await request.json();
    const { format = 'structured', sections = ['overview', 'keyFeatures', 'progress', 'futurePlans'] } = body;

    console.log(`🎯 Generating pitch for project ${projectId}`);
    console.log(`📝 Format: ${format}, Sections: ${sections.join(', ')}`);

    // Load project documents and analysis results
    const projectPath = path.join(process.cwd(), '.ai-project', 'projects', projectId);
    
    let requirements = '';
    let design = '';
    let tasks = '';
    let progress = null;
    let config = null;
    let analysisResults: Record<string, any> = {};

    try {
      // Load project documents
      const [reqContent, designContent, tasksContent] = await Promise.allSettled([
        fs.readFile(path.join(projectPath, 'requirements.md'), 'utf-8'),
        fs.readFile(path.join(projectPath, 'design.md'), 'utf-8'),
        fs.readFile(path.join(projectPath, 'tasks.md'), 'utf-8')
      ]);

      requirements = reqContent.status === 'fulfilled' ? reqContent.value : '';
      design = designContent.status === 'fulfilled' ? designContent.value : '';
      tasks = tasksContent.status === 'fulfilled' ? tasksContent.value : '';

      // Load progress and config
      try {
        const progressContent = await fs.readFile(path.join(projectPath, 'progress.json'), 'utf-8');
        progress = JSON.parse(progressContent);
      } catch (error) {
        console.log('No progress file found');
      }

      try {
        const configContent = await fs.readFile(path.join(projectPath, 'config.json'), 'utf-8');
        config = JSON.parse(configContent);
      } catch (error) {
        console.log('No config file found');
      }

      // Load project data from Pinecone for accurate metadata
      try {
        console.log('🗃️ Loading project data from Pinecone...');
        const { PineconeSyncServiceInstance } = await import('@/lib/pineconeSyncService');
        const pineconeResult = await PineconeSyncServiceInstance.downloadProject(projectId);
        
        if (pineconeResult.success && pineconeResult.data?.project) {
          const projectData = pineconeResult.data.project;
          console.log('✅ Loaded project data from Pinecone:', projectData.name);
          
          // Override config with actual project data
          config = {
            name: projectData.name || config?.name || 'Unnamed Project',
            description: projectData.description || config?.description || 'No description available',
            template: projectData.template || config?.template || 'Unknown',
            ...config
          };
        }
      } catch (error) {
        console.warn('⚠️ Failed to load project data from Pinecone:', error);
      }

      // Load saved analysis results
      try {
        console.log('📊 Loading saved analysis results...');
        const analysesResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/projects/${projectId}/analyses`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (analysesResponse.ok) {
          const analysesData = await analysesResponse.json();
          if (analysesData.success && analysesData.analyses) {
            analysisResults = analysesData.analyses;
            console.log(`✅ Loaded ${Object.keys(analysisResults).length} analysis results: ${Object.keys(analysisResults).join(', ')}`);
          }
        }
      } catch (error) {
        console.warn('⚠️ Failed to load analysis results:', error);
      }

    } catch (error) {
      console.error('Error loading project documents:', error);
      return NextResponse.json(
        { error: 'Failed to load project documents' },
        { status: 500 }
      );
    }

    // Validate secure configuration
    const configValidation = validateSecureConfig();
    if (!configValidation.isValid) {
      console.error('❌ Secure configuration validation failed:', configValidation.errors);
      return NextResponse.json(
        { error: `Configuration error: ${configValidation.errors.join(', ')}` },
        { status: 500 }
      );
    }

    // Try to get Google AI configuration from environment
    let apiConfig: ApiConfiguration;
    try {
      apiConfig = getGoogleAIConfig();
      console.log('✅ Using secure Google AI configuration from environment');
    } catch (error) {
      console.warn('⚠️ Failed to get Google AI config from environment, falling back to global config file');
      
      // Fallback to global configuration file
      const globalConfigPath = getGlobalConfigPath();
      if (!await fileExists(globalConfigPath)) {
        return NextResponse.json(
          { error: 'No AI configuration found. Please set GOOGLE_AI_API_KEY environment variable or configure an AI provider in the global settings.' },
          { status: 400 }
        );
      }

      const globalConfigData = await fs.readFile(globalConfigPath, 'utf8');
      apiConfig = JSON.parse(globalConfigData);
    }

    console.log(`🤖 Using AI provider: ${apiConfig.provider} with model: ${apiConfig.model}`);

    // Generate pitch using AI
    const prompt = `
You are a professional pitch writer and business strategist. Generate a compelling project pitch based on the following project data.

PROJECT INFORMATION:
${config ? `Project Name: ${config.name || 'Unnamed Project'}` : ''}
${config ? `Description: ${config.description || 'No description available'}` : ''}
${config ? `Template: ${config.template || 'Unknown'}` : ''}

REQUIREMENTS:
${requirements || 'No requirements document available'}

DESIGN:
${design || 'No design document available'}

TASKS:
${tasks || 'No tasks document available'}

PROGRESS:
${progress ? `
- Total Tasks: ${progress.totalTasks || 0}
- Completed Tasks: ${progress.completedTasks || 0}
- Progress: ${progress.percentage || 0}%
- Last Updated: ${progress.lastUpdated || 'Unknown'}
` : 'No progress data available'}

ANALYSIS RESULTS:
${Object.keys(analysisResults).length > 0 ? Object.entries(analysisResults).map(([type, data]) => `
${type.toUpperCase()} ANALYSIS:
${data.summary ? `Summary: ${data.summary}` : ''}
${data.strengths ? `Strengths: ${Array.isArray(data.strengths) ? data.strengths.join(', ') : data.strengths}` : ''}
${data.weaknesses ? `Weaknesses: ${Array.isArray(data.weaknesses) ? data.weaknesses.join(', ') : data.weaknesses}` : ''}
${data.opportunities ? `Opportunities: ${Array.isArray(data.opportunities) ? data.opportunities.join(', ') : data.opportunities}` : ''}
${data.threats ? `Threats: ${Array.isArray(data.threats) ? data.threats.join(', ') : data.threats}` : ''}
${data.marketSize ? `Market Size: ${data.marketSize}` : ''}
${data.targetAudience ? `Target Audience: ${data.targetAudience}` : ''}
${data.competitiveAdvantage ? `Competitive Advantage: ${data.competitiveAdvantage}` : ''}
${data.revenueStreams ? `Revenue Streams: ${Array.isArray(data.revenueStreams) ? data.revenueStreams.join(', ') : data.revenueStreams}` : ''}
${data.keyTechnologies ? `Key Technologies: ${Array.isArray(data.keyTechnologies) ? data.keyTechnologies.join(', ') : data.keyTechnologies}` : ''}
${data.scalabilityConsiderations ? `Scalability: ${data.scalabilityConsiderations}` : ''}
${data.riskAssessment ? `Risk Assessment: ${data.riskAssessment}` : ''}
`).join('\n') : 'No analysis results available'}

INSTRUCTIONS:
Generate a professional project pitch with the following sections:
${sections.includes('overview') ? '- PROJECT OVERVIEW: A compelling summary of what the project is and why it matters' : ''}
${sections.includes('keyFeatures') ? '- KEY FEATURES: The most important features and capabilities' : ''}
${sections.includes('progress') ? '- CURRENT PROGRESS: What has been accomplished and current status' : ''}
${sections.includes('futurePlans') ? '- FUTURE PLANS: Roadmap and next steps' : ''}
${sections.includes('marketOpportunity') ? '- MARKET OPPORTUNITY: Target market and business potential' : ''}
${sections.includes('technicalHighlights') ? '- TECHNICAL HIGHLIGHTS: Key technical innovations and architecture' : ''}
${sections.includes('businessModel') ? '- BUSINESS MODEL: How the project creates and captures value' : ''}

FORMAT: ${format === 'markdown' ? 'Use markdown formatting with headers, bullet points, and emphasis' : format === 'plain' ? 'Use plain text with clear section breaks' : 'Use structured format with clear sections and professional language'}

Make the pitch:
- Compelling and engaging
- Professional and credible
- Focused on value proposition
- Backed by concrete details from the project data
- Appropriate for investors, stakeholders, or potential users
- Concise but comprehensive

If project data is limited, focus on potential and vision while being honest about current status.
`;

    // Call AI service
    let pitchContent: string;
    let inputTokens: number;
    let outputTokens: number;

    try {
      if (apiConfig.provider === 'google') {
        const requestBody = {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            maxOutputTokens: 4000,
            temperature: 0.3,
          }
        };

        console.log('🤖 Sending pitch generation request to Gemini API...');

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${apiConfig.model}:generateContent?key=${apiConfig.apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Gemini API error ${response.status}:`, errorText);
          throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        pitchContent = result.candidates[0].content.parts[0].text;

        // Calculate token usage (approximate)
        inputTokens = Math.ceil(prompt.length / 4);
        outputTokens = Math.ceil(pitchContent.length / 4);

      } else {
        throw new Error(`Unsupported AI provider: ${apiConfig.provider}`);
      }
    } catch (error) {
      console.error('❌ AI API error:', error);
      return NextResponse.json(
        { error: 'Failed to generate pitch using AI service' },
        { status: 500 }
      );
    }

    const totalTokens = inputTokens + outputTokens;
    const cost = (inputTokens / 1000) * 0.000125 + (outputTokens / 1000) * 0.000375; // Gemini pricing

    const tokenUsage = {
      inputTokens,
      outputTokens,
      totalTokens,
      cost
    };

    // Track token usage
    await tokenTrackingService.trackTokenUsage(projectId, inputTokens, outputTokens, 'pitch-generation');

    // Parse sections from the generated content
    const parsedSections = {
      overview: extractSection(pitchContent, 'PROJECT OVERVIEW', 'KEY FEATURES') || extractSection(pitchContent, 'OVERVIEW', 'FEATURES') || '',
      keyFeatures: extractSection(pitchContent, 'KEY FEATURES', 'CURRENT PROGRESS') || extractSection(pitchContent, 'FEATURES', 'PROGRESS') || '',
      progress: extractSection(pitchContent, 'CURRENT PROGRESS', 'FUTURE PLANS') || extractSection(pitchContent, 'PROGRESS', 'FUTURE') || '',
      futurePlans: extractSection(pitchContent, 'FUTURE PLANS', 'MARKET OPPORTUNITY') || extractSection(pitchContent, 'FUTURE', 'MARKET') || extractSection(pitchContent, 'FUTURE PLANS', null) || '',
      marketOpportunity: extractSection(pitchContent, 'MARKET OPPORTUNITY', 'TECHNICAL HIGHLIGHTS') || extractSection(pitchContent, 'MARKET', 'TECHNICAL') || '',
      technicalHighlights: extractSection(pitchContent, 'TECHNICAL HIGHLIGHTS', 'BUSINESS MODEL') || extractSection(pitchContent, 'TECHNICAL', 'BUSINESS') || '',
      businessModel: extractSection(pitchContent, 'BUSINESS MODEL', null) || extractSection(pitchContent, 'BUSINESS', null) || ''
    };

    const pitchResult: PitchResult = {
      pitch: pitchContent,
      sections: parsedSections,
      tokenUsage
    };

    console.log('✅ Pitch generated successfully');
    console.log(`📊 Token usage: ${totalTokens} tokens, $${cost.toFixed(4)} cost`);

    return NextResponse.json(pitchResult);

  } catch (error) {
    console.error('❌ Pitch generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate pitch' },
      { status: 500 }
    );
  }
}

// Helper function to extract sections from generated content
function extractSection(content: string, startMarker: string, endMarker: string | null): string {
  const startIndex = content.indexOf(startMarker);
  if (startIndex === -1) return '';

  const contentStart = startIndex + startMarker.length;
  let endIndex = content.length;

  if (endMarker) {
    const endMarkerIndex = content.indexOf(endMarker, contentStart);
    if (endMarkerIndex !== -1) {
      endIndex = endMarkerIndex;
    }
  }

  return content.substring(contentStart, endIndex).trim();
}