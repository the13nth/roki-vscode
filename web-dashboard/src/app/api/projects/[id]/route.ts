import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ProjectService } from '@/lib/projectService';
import { ProjectDashboard } from '@/types';

// Helper function to parse tasks from markdown content
function parseTasksFromMarkdown(content: string): { totalTasks: number; completedTasks: number; percentage: number } {
  if (!content || !content.trim()) {
    return { totalTasks: 0, completedTasks: 0, percentage: 0 };
  }

  const lines = content.split('\n');
  let totalTasks = 0;
  let completedTasks = 0;

  for (const line of lines) {
    // Match task checkboxes: - [ ] or - [x]
    const taskMatch = line.match(/^[\s]*-[\s]*\[([x\s])\]/);
    if (taskMatch) {
      totalTasks++;
      if (taskMatch[1].toLowerCase() === 'x') {
        completedTasks++;
      }
    }
  }

  const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  return { totalTasks, completedTasks, percentage };
}

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

    // Parse tasks from the tasks.md content to get accurate counts
    const tasksContent = project.tasks || '';
    
    // Parse tasks to calculate progress (UserProject doesn't have progress property)
    const taskStats = parseTasksFromMarkdown(tasksContent);
    const progressData = {
      totalTasks: taskStats.totalTasks,
      completedTasks: taskStats.completedTasks,
      percentage: taskStats.percentage,
      lastUpdated: new Date(project.lastModified || new Date()),
      recentActivity: [],
      milestones: []
    };
    console.log('📊 Parsed task stats:', {
      totalTasks: taskStats.totalTasks,
      completedTasks: taskStats.completedTasks,
      percentage: taskStats.percentage,
      tasksContentLength: tasksContent.length
    });

    // Convert to ProjectDashboard format with accurate task counts
    const projectDashboard: ProjectDashboard = {
      projectId: project.projectId,
      projectPath: '', // Cloud-only projects don't have local paths
      documents: {
        requirements: project.requirements || '',
        design: project.design || '',
        tasks: tasksContent
      },
      progress: progressData,
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