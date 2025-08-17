import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ProjectService } from '@/lib/projectService';

interface ApiConfiguration {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

async function callGoogleAI(config: ApiConfiguration, prompt: string): Promise<{ content: string; tokenUsage: any }> {
  console.log('Making Google AI API call with model:', config.model);
  
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
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4000,
      },
    }),
  });

  console.log('Google AI API response status:', response.status);

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Google AI API error response:', errorData);
    throw new Error(`Google AI API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();
  console.log('Google AI API response data keys:', Object.keys(data));
  
  if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
    const content = data.candidates[0].content.parts[0].text;
    console.log('Generated content length:', content.length);
    return {
      content: content,
      tokenUsage: data.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 }
    };
  } else {
    console.error('Invalid response structure from Google AI API:', data);
    throw new Error('Invalid response structure from Google AI API');
  }
}

function generateSpecsPrompt(projectData: any): string {
  const { name, description, template, technologyStack } = projectData;
  
  const techStackText = technologyStack ? `
Technology Stack:
- Backend: ${technologyStack.backend || 'Not specified'}
- Frontend: ${technologyStack.frontend || 'Not specified'}
- UI Framework: ${technologyStack.uiFramework || 'Not specified'}
- Authentication: ${technologyStack.authentication || 'Not specified'}
- Hosting: ${technologyStack.hosting || 'Not specified'}
` : '';

  return `You are an expert software architect and project manager. Generate comprehensive project specifications for the following project:

Project Name: ${name}
Template: ${template}
Description: ${description}
${techStackText}

Please generate three separate markdown documents following these EXACT formats:

1. REQUIREMENTS.md - Follow this structure:
   - # Requirements Document
   - ## Introduction (single paragraph describing the project)
   - ## Requirements
   - ### Requirement N (numbered requirements)
   - **User Story:** As a [role], I want to [action], so that [benefit]
   - #### Acceptance Criteria (numbered list with WHEN/THEN/IF statements)

2. DESIGN.md - Follow this structure:
   - # Design Document
   - ## Overview (project description and technology overview)
   - ## Architecture
   - ### System Components (with mermaid graph if applicable)
   - ### Data Flow (numbered steps)
   - ## Components and Interfaces
   - ### [Component Name] (multiple sections for different components)
   - **Key Components:** (TypeScript interfaces)
   - ## Data Models (TypeScript interfaces with JSON examples)
   - ## Error Handling (categorized error types)
   - ## Testing Strategy
   - ### Unit Testing, Integration Testing, End-to-End Testing, Manual Testing

3. TASKS.md - Follow this structure:
   - # Implementation Plan
   - - [x] or - [ ] for completion status
   - Hierarchical task structure with sub-tasks (2.1, 2.2, etc.)
   - Each task includes implementation details and requirements references
   - _Requirements: X.Y, Z.A_ at the end of tasks

CRITICAL: Match the exact formatting, section headers, and structure from the examples. Use proper markdown formatting with TypeScript code blocks, mermaid diagrams, and consistent numbering.

Format your response as a JSON object with three fields:
{
  "requirements": "markdown content for requirements.md",
  "design": "markdown content for design.md", 
  "tasks": "markdown content for tasks.md"
}

Make the specifications comprehensive, practical, and aligned with the chosen technology stack. Include specific technical details, user stories, acceptance criteria, and implementation guidelines.`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;

    // Get project from Pinecone using ProjectService
    const projectService = ProjectService.getInstance();
    const project = await projectService.getProject(userId, projectId);
    
    console.log('Project service getProject result:', project);
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    console.log('Loaded project config:', project);

    // Load API configuration from environment variable
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'No AI configuration found. Please set GOOGLE_AI_API_KEY environment variable or configure an AI provider in the global settings.' },
        { status: 400 }
      );
    }

    const apiConfig: ApiConfiguration = {
      provider: 'google',
      apiKey: apiKey,
      model: 'gemini-1.5-flash'
    };

    // Generate specs prompt
    const prompt = generateSpecsPrompt(project);
    console.log('Generated prompt for specs:', prompt);

    // Call Google AI to generate specs
    console.log('Calling Google AI with config:', { provider: apiConfig.provider, model: apiConfig.model });
    console.log('Prompt length:', prompt.length);
    const aiResponse = await callGoogleAI(apiConfig, prompt);
    console.log('AI Response received, content length:', aiResponse.content?.length || 0);
    console.log('AI Response preview:', aiResponse.content?.substring(0, 200) + '...');

    // Track token usage
    try {
      const { TokenTrackingService } = await import('@/lib/tokenTrackingService');
      const tokenTrackingService = TokenTrackingService.getInstance();
      
      const inputTokens = aiResponse.tokenUsage?.promptTokenCount || aiResponse.tokenUsage?.prompt_tokens || 0;
      const outputTokens = aiResponse.tokenUsage?.candidatesTokenCount || aiResponse.tokenUsage?.completion_tokens || 0;
      
      await tokenTrackingService.trackTokenUsage(projectId, inputTokens, outputTokens, 'project-specs-generation');
    } catch (error) {
      console.warn('Failed to track token usage for spec generation:', error);
    }

    // Parse the AI response
    let specsData: any;
    try {
      console.log('Parsing AI response, content preview:', aiResponse.content.substring(0, 200) + '...');
      
      const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log('Found JSON match, length:', jsonMatch[0].length);
        specsData = JSON.parse(jsonMatch[0]);
      } else {
        console.log('No JSON match found, trying to parse entire content');
        specsData = JSON.parse(aiResponse.content);
      }
      
      console.log('Successfully parsed specs data, keys:', Object.keys(specsData));
      console.log('Requirements length:', specsData.requirements?.length || 0);
      console.log('Design length:', specsData.design?.length || 0);
      console.log('Tasks length:', specsData.tasks?.length || 0);
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.error('AI response content:', aiResponse.content);
      return NextResponse.json(
        { error: 'Failed to parse AI-generated specifications' },
        { status: 500 }
      );
    }

    // Validate the response structure
    if (!specsData.requirements || !specsData.design || !specsData.tasks) {
      return NextResponse.json(
        { error: 'Invalid specifications format from AI' },
        { status: 500 }
      );
    }

    // Update the project in Pinecone with the generated specs
    const updatedProject = {
      ...project,
      requirements: specsData.requirements,
      design: specsData.design,
      tasks: specsData.tasks,
      lastModified: new Date().toISOString()
    };

    console.log('Updating project with specs, requirements length:', specsData.requirements?.length || 0);
    const success = await projectService.updateProject(userId, projectId, updatedProject);
    
    if (!success) {
      console.error('Failed to update project with specs');
      return NextResponse.json(
        { error: 'Failed to save generated specifications' },
        { status: 500 }
      );
    }

    console.log('Successfully updated project with specs');

    return NextResponse.json({
      success: true,
      message: 'Project specifications generated successfully',
      specs: {
        requirements: specsData.requirements,
        design: specsData.design,
        tasks: specsData.tasks
      }
    });

  } catch (error) {
    console.error('Failed to generate project specifications:', error);
    return NextResponse.json(
      { error: 'Failed to generate project specifications' },
      { status: 500 }
    );
  }
}
