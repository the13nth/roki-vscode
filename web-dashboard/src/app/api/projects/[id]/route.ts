import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ProjectService } from '@/lib/projectService';
import { ProjectDashboard } from '@/types';

// GET /api/projects/[id] - Get project details
export async function GET(
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
    console.log('Loading project:', projectId, 'for user:', userId);

    // Use ProjectService to get project from Pinecone
    const projectService = ProjectService.getInstance();
    const project = await projectService.getProject(userId, projectId);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Convert to ProjectDashboard format
    const projectDashboard: ProjectDashboard = {
      projectId: project.projectId,
      projectPath: '', // Cloud-only projects don't have local paths
      documents: {
        requirements: project.requirements || '',
        design: project.design || '',
        tasks: project.tasks || ''
      },
      progress: {
        totalTasks: 0,
        completedTasks: 0,
        percentage: 0,
        lastUpdated: new Date(),
        recentActivity: [],
        milestones: []
      },
      contextDocs: []
    };

    return NextResponse.json(projectDashboard);
  } catch (error) {
    console.error('Failed to load project:', error);
    return NextResponse.json(
      { error: 'Failed to load project' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id] - Update project
export async function PUT(
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
    const updates = await request.json();

    const projectService = ProjectService.getInstance();
    const success = await projectService.updateProject(userId, projectId, updates);

    if (!success) {
      return NextResponse.json(
        { error: 'Project not found or update failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - Delete project
export async function DELETE(
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

    const projectService = ProjectService.getInstance();
    const success = await projectService.deleteProject(userId, projectId);

    if (!success) {
      return NextResponse.json(
        { error: 'Project not found or delete failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}