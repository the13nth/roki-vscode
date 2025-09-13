import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { ProjectService } from '@/lib/projectService';
import { ProjectDashboard } from '@/types';
import { supabaseService, SupabaseService } from '@/lib/supabase';

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
    const { id: projectId } = await params;
    
    // Get project from Supabase
    const supabaseService = SupabaseService.getInstance();
    const project = await supabaseService.getProject(projectId);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if user can access this project
    const isPublic = project.is_public || false;
    const projectOwnerId = project.user_id;
    
    // Check if user is the owner
    const isOwner = userId ? projectOwnerId === userId : false;
    
    // If not public and user is not the owner, check if project is shared with user
    if (!isPublic && !isOwner) {
      // Get user's email to check sharing
      const user = await currentUser();
      const userEmail = user?.emailAddresses[0]?.emailAddress;
      
      if (userEmail) {
        // Check if project is shared with this user
        const sharingCheck = await supabaseService.checkProjectSharing(projectId, userEmail);
        
        if (!sharingCheck) {
          return NextResponse.json(
            { error: 'Project not found' },
            { status: 404 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }
    }

    // Parse tasks from the tasks.md content to get accurate counts
    const tasksContent = project.tasks || '';
    
    // Parse tasks to calculate progress
    const taskStats = parseTasksFromMarkdown(tasksContent);
    const progressData = {
      totalTasks: taskStats.totalTasks,
      completedTasks: taskStats.completedTasks,
      percentage: taskStats.percentage,
      lastUpdated: new Date(project.updated_at || new Date()),
      recentActivity: [],
      milestones: []
    };
    console.log('📊 Parsed task stats:', {
      totalTasks: taskStats.totalTasks,
      completedTasks: taskStats.completedTasks,
      percentage: taskStats.percentage,
      tasksContentLength: tasksContent.length
    });

    // Convert to ProjectDashboard format with all project fields
    const projectDashboard: ProjectDashboard & { 
      isOwned?: boolean; 
      isPublic?: boolean;
      businessModel?: string[];
      technologyStack?: any;
      regulatoryCompliance?: any;
      industry?: string;
      customIndustry?: string;
      template?: string;
      customTemplate?: string;
      aiModel?: string;
    } = {
      projectId: project.id,
      name: project.name,
      projectPath: '', // Cloud-only projects don't have local paths
      documents: {
        requirements: project.requirements || '',
        design: project.design || '',
        tasks: tasksContent
      },
      progress: progressData,
      contextDocs: [],
      isOwned: userId ? projectOwnerId === userId : false,
      isPublic: isPublic,
      businessModel: project.business_model || [],
      technologyStack: project.technology_stack || null,
      regulatoryCompliance: project.regulatory_compliance || null,
      industry: project.industry,
      customIndustry: project.custom_industry,
      template: project.template,
      customTemplate: project.custom_template,
      aiModel: project.ai_model
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

    // Get project to verify ownership
    const supabaseService = SupabaseService.getInstance();
    const project = await supabaseService.getProject(projectId);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if user is the owner
    if (project.user_id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Update project in Supabase
    const success = await supabaseService.updateProject(projectId, updates);

    if (!success) {
      return NextResponse.json(
        { error: 'Update failed' },
        { status: 500 }
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