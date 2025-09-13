import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ProjectService } from '@/lib/projectService';
import { ProjectListItem } from '@/types';
import { NotificationService } from '@/lib/notificationService';
import { validateProjectContext, truncateProjectFields } from '@/lib/contextValidation';

// GET /api/projects - List user's projects
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const projectService = ProjectService.getInstance();
    const projects = await projectService.getUserProjects(userId);

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Failed to list projects:', error);
    return NextResponse.json(
      { error: 'Failed to list projects' },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      name, 
      description, 
      template, 
      customTemplate,
      industry,
      customIndustry,
      businessModel,
      aiModel, 
      technologyStack, 
      regulatoryCompliance, 
      isPublic,
      analysisData
    } = body;
    console.log('Received project creation request:', { 
      name, 
      description, 
      template, 
      customTemplate,
      industry,
      customIndustry,
      businessModel,
      aiModel, 
      technologyStack, 
      regulatoryCompliance, 
      isPublic,
      analysisData: !!analysisData
    });

    // Validate required fields
    if (!name || !description || !template) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate context length to prevent AI API failures
    const contextValidation = validateProjectContext({
      name,
      description,
      template
    }, aiModel?.includes('gemini') ? 'google' : 'openai');

    if (!contextValidation.isValid) {
      console.warn('Project context validation warning:', contextValidation.warning);
      // Truncate fields to prevent future issues
      const truncatedData = truncateProjectFields({ name, description });
      return NextResponse.json({
        warning: 'Project content was truncated due to length limits',
        originalLength: contextValidation.originalLength,
        truncatedLength: contextValidation.truncatedLength,
        truncatedData
      }, { status: 200 });
    }

    // Use ProjectService to create the project
    const projectService = ProjectService.getInstance();
    const projectData = {
      name,
      description,
      template,
      customTemplate,
      industry,
      customIndustry,
      businessModel,
      aiModel: aiModel || 'gpt-4',
      technologyStack,
      regulatoryCompliance,
      isPublic: isPublic || false,
      analysisData,
      userId: userId,
      contextPreferences: {
        maxContextSize: 8000,
        prioritizeRecent: true,
        includeProgress: true
      }
    };

    const projectListItem = await projectService.createProject(userId, projectData);

    // Create notification for project creation
    try {
      await NotificationService.notifyProjectCreated(userId, projectListItem.id, projectListItem.name);
    } catch (notificationError) {
      console.error('Failed to create project creation notification:', notificationError);
      // Don't fail the project creation if notification fails
    }

    return NextResponse.json(projectListItem, { status: 201 });
  } catch (error) {
    console.error('Failed to create project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects - Delete a project (for cleanup purposes)
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('id');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Use ProjectService to delete the project
    const projectService = ProjectService.getInstance();
    const success = await projectService.deleteProject(userId, projectId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete project' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Failed to delete project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}