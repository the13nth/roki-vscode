import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ProjectService } from '@/lib/projectService';

// GET /api/projects/[id]/documents - Get all documents for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Return all documents with their metadata
    const documents = {
      requirements: {
        content: project.requirements || '',
        lastModified: project.lastModified || new Date().toISOString(),
        exists: !!project.requirements
      },
      design: {
        content: project.design || '',
        lastModified: project.lastModified || new Date().toISOString(),
        exists: !!project.design
      },
      tasks: {
        content: project.tasks || '',
        lastModified: project.lastModified || new Date().toISOString(),
        exists: !!project.tasks
      }
    };

    return NextResponse.json(documents);
  } catch (error) {
    console.error('Failed to get project documents:', error);
    return NextResponse.json(
      { error: 'Failed to load project documents' },
      { status: 500 }
    );
  }
}
