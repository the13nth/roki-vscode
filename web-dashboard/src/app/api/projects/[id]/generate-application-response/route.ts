import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getGoogleAIConfig } from '@/lib/secureConfig';
import { TokenTrackingService } from '@/lib/tokenTrackingService';
import { getPineconeClient, PINECONE_INDEX_NAME, PINECONE_NAMESPACE_PROJECTS } from '@/lib/pinecone';
import { createVectorId } from '@/lib/projectService';

interface ApiConfiguration {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

interface ApplicationResponseRequest {
  question: string;
  applicationId?: string;
  applicationContext?: string;
  analysisData?: Record<string, any>;
  wordLimit?: number;
  characterLimit?: number;
  previousResponses?: Array<{
    question: string;
    response: string;
  }>;
}

interface ApplicationResponseResult {
  response: string;
  keyPoints: string[];
  suggestedImprovements: string[];
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
    const body: ApplicationResponseRequest = await request.json();
    const { 
      question,
      applicationId,
      applicationContext = '',
      analysisData: preloadedAnalyses = null,
      wordLimit,
      characterLimit,
      previousResponses = []
    } = body;

    console.log(`📝 Generating application response for project ${projectId}`);
    console.log(`❓ Question: ${question.substring(0, 100)}...`);
    console.log(`📊 Preloaded analyses: ${preloadedAnalyses ? Object.keys(preloadedAnalyses).length : 0}`);

    if (!question.trim()) {
      return NextResponse.json(
        { error: 'Application question is required' },
        { status: 400 }
      );
    }

    // Load project data from Pinecone
    console.log(`📊 Loading project data from Pinecone for project: ${projectId}`);
    
    let requirements = '';
    let design = '';
    let tasks = '';
    let progress: any = null;
    let config: any = null;
    let analysisResults: Record<string, any> = {};
    let applicationData: any = null;

    try {
      // Get project data from Pinecone
      const pinecone = getPineconeClient();
      const index = pinecone.index(PINECONE_INDEX_NAME);
      const vectorId = createVectorId('user-project', projectId);

      const fetchResponse = await index.namespace(PINECONE_NAMESPACE_PROJECTS).fetch([vectorId]);
      const record = fetchResponse.records?.[vectorId];

      if (!record?.metadata) {
        return NextResponse.json(
          { error: 'Project not found in database' },
          { status: 404 }
        );
      }

      // Check if user can access this project
      const isPublic = record.metadata.isPublic as boolean || false;
      const projectOwnerId = record.metadata.userId as string;
      
      if (!isPublic && (!userId || projectOwnerId !== userId)) {
        return NextResponse.json(
          { error: 'Project not found or access denied' },
          { status: 404 }
        );
      }

      // Parse project data
      let project;
      try {
        project = JSON.parse(record.metadata.projectData as string);
        console.log(`📄 Loaded project from Pinecone: ${project.name}`);
      } catch (error) {
        console.error('Failed to parse project data:', error);
        return NextResponse.json(
          { error: 'Project data corrupted' },
          { status: 500 }
        );
      }

      // Extract project documents and metadata
      requirements = project.requirements || '';
      design = project.design || '';
      tasks = project.tasks || '';
      
      // Create config object from project metadata
      config = {
        name: project.name || 'Untitled Project',
        description: project.description || '',
        projectId: project.projectId,
        createdAt: project.createdAt,
        lastModified: project.lastModified
      };

      console.log(`📄 Project config: name="${config.name}", description="${config.description?.substring(0, 50)}..."`);

      // Load application data if applicationId is provided
      if (applicationId) {
        try {
          const appFetchResponse = await index.namespace('applications').fetch([`application-${applicationId}`]);
          const appRecord = appFetchResponse.records?.[`application-${applicationId}`];

          if (appRecord?.metadata && appRecord.metadata.userId === userId) {
            applicationData = JSON.parse(appRecord.metadata.applicationData as string);
            console.log(`📋 Loaded application data: ${applicationData.name}`);
          }
        } catch (error) {
          console.warn('⚠️ Failed to load application data:', error);
        }
      }

      // Use preloaded analyses if available
      if (preloadedAnalyses && Object.keys(preloadedAnalyses).length > 0) {
        analysisResults = preloadedAnalyses;
        console.log(`📊 Using preloaded analyses: ${Object.keys(analysisResults).length} analyses`);
      }

    } catch (error) {
      console.error('Error loading project data from Pinecone:', error);
      return NextResponse.json(
        { error: 'Failed to load project data from database' },
        { status: 500 }
      );
    }

    // Get AI configuration
    let apiConfig: ApiConfiguration;
    try {
      apiConfig = getGoogleAIConfig();
      console.log('✅ Using secure Google AI configuration from environment');
    } catch (error) {
      return NextResponse.json(
        { error: 'No AI configuration found. Please configure an AI provider.' },
        { status: 400 }
      );
    }

    // Validate that we have sufficient project data
    if (!config?.name || config.name === 'Unknown Project') {
      return NextResponse.json(
        { error: 'Project configuration not found. Please ensure the project has a valid name and configuration.' },
        { status: 400 }
      );
    }

    console.log(`🤖 Using AI provider: ${apiConfig.provider} with model: ${apiConfig.model}`);

    // Initialize token tracking
    const tokenTracker = new TokenTrackingService();

    // Prepare context for AI
    const projectContext = `
PROJECT INFORMATION:

PROJECT NAME: ${config.name}
PROJECT DESCRIPTION: ${config.description || 'No description available'}

PROJECT REQUIREMENTS:
${requirements || 'No requirements document available'}

PROJECT DESIGN:
${design || 'No design document available'}

PROJECT TASKS:
${tasks || 'No tasks document available'}

PROJECT ANALYSIS RESULTS:
${Object.entries(analysisResults).map(([type, analysis]) => `
${type.toUpperCase()} ANALYSIS:
${JSON.stringify(analysis, null, 2)}
`).join('\n')}

${applicationData ? `
APPLICATION DETAILS:
Application Name: ${applicationData.name}
Organization: ${applicationData.organizationName || 'Not specified'}
Description: ${applicationData.description}
Prize Type: ${applicationData.prizeType}
Prize Details: ${applicationData.prizeDetails}
Deadline: ${applicationData.deadline}
Requirements: ${applicationData.requirements || 'No specific requirements listed'}
Application URL: ${applicationData.applicationUrl || 'Not provided'}
Notes: ${applicationData.notes || 'No additional notes'}
Status: ${applicationData.status}
` : ''}

PREVIOUS RESPONSES IN THIS APPLICATION:
${previousResponses.length > 0 ? previousResponses.map((prev, index) => `
Question ${index + 1}: ${prev.question}
Response ${index + 1}: ${prev.response}
`).join('\n') : 'No previous responses in this application session.'}

ADDITIONAL CONTEXT:
${applicationContext || 'No additional context provided'}
`;

    // Create the prompt for application response generation
    const prompt = `You are an expert application consultant helping to craft compelling responses to application questions. You MUST use the specific project information provided to create a tailored, authentic response.

PROJECT CONTEXT:
${projectContext}

APPLICATION QUESTION:
${question}

INSTRUCTIONS:
1. Analyze the application question carefully
2. Use ONLY the project information provided above to craft your response
3. Reference specific details from the project's requirements, design, analysis results, and context
4. Make the response compelling and relevant to the question asked
5. Highlight the project's strengths and unique aspects that address the question
6. Be authentic - only mention what's actually documented in the project context
7. If the project context doesn't fully address the question, acknowledge this and focus on what you can substantiate

Your response should:
- Directly answer the application question
- Use specific examples and details from the project
- Demonstrate deep understanding of the project
- Be professional and compelling
- Show how the project aligns with what the application is seeking
- Include concrete evidence from the analysis results when relevant
- Build upon and reference previous responses when appropriate (avoid repetition but maintain consistency)
${wordLimit ? `- Stay within ${wordLimit} words` : ''}
${characterLimit ? `- Stay within ${characterLimit} characters` : ''}
${wordLimit || characterLimit ? '- Prioritize the most important information given the length constraints' : ''}

Return your response in the following JSON format:
{
  "response": "The main response to the application question, using specific project details and analysis results",
  "keyPoints": ["Key point 1 from project context", "Key point 2 from analysis", "Key point 3 from requirements"],
  "suggestedImprovements": ["Suggestion 1 for strengthening the response", "Suggestion 2 for additional context", "Suggestion 3 for better positioning"]
}

CRITICAL: Base your response entirely on the provided project context. Do not invent or assume information not present in the project data.`;

    console.log('🤖 Sending application response generation request to AI...');

    // Call AI service
    let generatedText: string;
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
            maxOutputTokens: 3000,
            temperature: 0.7,
          }
        };

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
        generatedText = result.candidates[0].content.parts[0].text;

        // Calculate token usage (approximate)
        inputTokens = Math.ceil(prompt.length / 4);
        outputTokens = Math.ceil(generatedText.length / 4);

      } else {
        throw new Error(`Unsupported AI provider: ${apiConfig.provider}`);
      }
    } catch (error) {
      console.error('❌ AI API error:', error);
      return NextResponse.json(
        { error: 'Failed to generate application response using AI service' },
        { status: 500 }
      );
    }
    
    // Parse the JSON response
    let parsedResult;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      
      parsedResult = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw response:', generatedText);
      
      // Fallback: use the raw text as response
      parsedResult = {
        response: generatedText,
        keyPoints: [],
        suggestedImprovements: []
      };
    }

    const totalTokens = inputTokens + outputTokens;
    const cost = (inputTokens / 1000) * 0.000125 + (outputTokens / 1000) * 0.000375; // Gemini pricing

    // Track token usage
    await tokenTracker.trackTokenUsage(projectId, inputTokens, outputTokens, 'application-response-generation');

    const result: ApplicationResponseResult = {
      response: parsedResult.response || generatedText,
      keyPoints: parsedResult.keyPoints || [],
      suggestedImprovements: parsedResult.suggestedImprovements || [],
      tokenUsage: {
        inputTokens,
        outputTokens,
        totalTokens,
        cost
      }
    };

    console.log('✅ Application response generated successfully');
    console.log(`📊 Token usage: ${totalTokens} tokens, Cost: ${cost.toFixed(4)}`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Application response generation error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Application response generation failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}