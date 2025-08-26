import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ProjectService } from '@/lib/projectService';
import { ProjectListItem } from '@/types';

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
    const { name, description, template, aiModel, technologyStack, regulatoryCompliance, isPublic } = body;
    console.log('Received project creation request:', { name, description, template, aiModel, technologyStack, regulatoryCompliance, isPublic });

    // Validate required fields
    if (!name || !description || !template) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use ProjectService to create the project
    const projectService = ProjectService.getInstance();
    const projectData = {
      name,
      description,
      template,
      aiModel: aiModel || 'gpt-4',
      technologyStack,
      regulatoryCompliance,
      isPublic: isPublic || false,
      contextPreferences: {
        maxContextSize: 8000,
        prioritizeRecent: true,
        includeProgress: true
      }
    };

    const projectListItem = await projectService.createProject(userId, projectData);

    return NextResponse.json(projectListItem, { status: 201 });
  } catch (error) {
    console.error('Failed to create project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}