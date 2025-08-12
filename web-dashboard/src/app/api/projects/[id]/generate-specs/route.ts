import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { ProjectConfiguration } from '@/types';

interface ApiConfiguration {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

function getApiConfigPath(projectId: string): string {
  return path.join(process.cwd(), '.ai-project', 'projects', projectId, 'api-config.json');
}



async function findProjectById(projectId: string): Promise<string | null> {
  const internalProjectsPath = path.join(process.cwd(), '.ai-project', 'projects', projectId);
  const configPath = path.join(internalProjectsPath, 'config.json');
  
  if (await fileExists(configPath)) {
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config: ProjectConfiguration = JSON.parse(configContent);
    return config.originalPath || internalProjectsPath;
  }
  
  return null;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
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
    const { id: projectId } = await params;

    // Find project by ID
    const projectPath = await findProjectById(projectId);
    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Load project configuration
    const configPath = path.join(process.cwd(), '.ai-project', 'projects', projectId, 'config.json');
    if (!await fileExists(configPath)) {
      return NextResponse.json(
        { error: 'Project configuration not found' },
        { status: 404 }
      );
    }

    const configContent = await fs.readFile(configPath, 'utf-8');
    const projectConfig: ProjectConfiguration = JSON.parse(configContent);
    console.log('Loaded project config:', projectConfig);

    // Load API configuration (try project-specific first, then global)
    let apiConfig: ApiConfiguration;
    const apiConfigPath = getApiConfigPath(projectId);
    
    if (await fileExists(apiConfigPath)) {
      // Use project-specific configuration
      const apiConfigData = await fs.readFile(apiConfigPath, 'utf8');
      apiConfig = JSON.parse(apiConfigData);
    } else {
      // Try global configuration
      const globalConfigPath = path.join(process.cwd(), '.ai-project', 'global-api-config.json');
      if (!await fileExists(globalConfigPath)) {
        return NextResponse.json(
          { error: 'No API configuration found. Please configure an AI provider in the global settings or project settings.' },
          { status: 400 }
        );
      }
      
      const globalConfigData = await fs.readFile(globalConfigPath, 'utf8');
      apiConfig = JSON.parse(globalConfigData);
    }

    // Generate specs prompt
    const prompt = generateSpecsPrompt(projectConfig);
    console.log('Generated prompt for specs:', prompt);

    // Call Google AI to generate specs
    console.log('Calling Google AI with config:', { provider: apiConfig.provider, model: apiConfig.model });
    const aiResponse = await callGoogleAI(apiConfig, prompt);
    console.log('AI Response received, content length:', aiResponse.content?.length || 0);

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
        specsData = JSON.parse(jsonMatch[0]);
      } else {
        specsData = JSON.parse(aiResponse.content);
      }
      
      console.log('Successfully parsed specs data, keys:', Object.keys(specsData));
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

    // Update the project files with generated specs
    const aiProjectPath = path.join(projectPath, '.ai-project');
    if (!await fileExists(aiProjectPath)) {
      await fs.mkdir(aiProjectPath, { recursive: true });
    }

    // Write the generated specifications
    console.log('Writing requirements.md to:', path.join(aiProjectPath, 'requirements.md'));
    await fs.writeFile(
      path.join(aiProjectPath, 'requirements.md'),
      specsData.requirements,
      'utf-8'
    );

    console.log('Writing design.md to:', path.join(aiProjectPath, 'design.md'));
    await fs.writeFile(
      path.join(aiProjectPath, 'design.md'),
      specsData.design,
      'utf-8'
    );

    console.log('Writing tasks.md to:', path.join(aiProjectPath, 'tasks.md'));
    await fs.writeFile(
      path.join(aiProjectPath, 'tasks.md'),
      specsData.tasks,
      'utf-8'
    );

    // Also create the files in the internal project directory for consistency
    const internalProjectPath = path.join(process.cwd(), '.ai-project', 'projects', projectId);
    await fs.mkdir(internalProjectPath, { recursive: true });

    await fs.writeFile(
      path.join(internalProjectPath, 'requirements.md'),
      specsData.requirements,
      'utf-8'
    );

    await fs.writeFile(
      path.join(internalProjectPath, 'design.md'),
      specsData.design,
      'utf-8'
    );

    await fs.writeFile(
      path.join(internalProjectPath, 'tasks.md'),
      specsData.tasks,
      'utf-8'
    );

    // Update the project configuration with new lastModified timestamp
    projectConfig.lastModified = new Date().toISOString();
    await fs.writeFile(
      path.join(process.cwd(), '.ai-project', 'projects', projectId, 'config.json'),
      JSON.stringify(projectConfig, null, 2),
      'utf-8'
    );

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
