import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { ProjectService } from '@/lib/projectService';
import { ProjectDashboard } from '@/types';
import { getPineconeClient } from '@/lib/pinecone';
import { PINECONE_INDEX_NAME, PINECONE_NAMESPACE_PROJECTS } from '@/lib/pinecone';
import { createVectorId } from '@/lib/projectService';

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
    
    // Get project data and metadata from Pinecone
    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);
    const vectorId = createVectorId('user-project', projectId);

    const fetchResponse = await index.namespace(PINECONE_NAMESPACE_PROJECTS).fetch([vectorId]);
    const record = fetchResponse.records?.[vectorId];

    if (!record?.metadata) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if user can access this project
    const isPublic = record.metadata.isPublic as boolean || false;
    const projectOwnerId = record.metadata.userId as string;
    
    // Check if user is the owner
    const isOwner = userId ? projectOwnerId === userId : false;
    
    // If not public and user is not the owner, check if project is shared with user
    if (!isPublic && !isOwner) {
      // Get user's email to check sharing
      const user = await currentUser();
      const userEmail = user?.emailAddresses[0]?.emailAddress;
      
      if (userEmail) {
        // Check if project is shared with this user and invitation was accepted
        const sharingResponse = await index.namespace('project_sharing').query({
          vector: new Array(1024).fill(0.1),
          filter: {
            projectId: { $eq: projectId },
            sharedWithEmail: { $eq: userEmail },
            status: { $eq: 'accepted' }
          },
          topK: 1,
          includeMetadata: true
        });

        const hasSharedAccess = sharingResponse.matches && sharingResponse.matches.length > 0;
        
        if (!hasSharedAccess) {
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

    // Parse project data
    let project;
    try {
      project = JSON.parse(record.metadata.projectData as string);
    } catch (error) {
      console.error('Failed to parse project data:', error);
      return NextResponse.json(
        { error: 'Project data corrupted' },
        { status: 500 }
      );
    }

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
    const projectDashboard: ProjectDashboard & { isOwned?: boolean; isPublic?: boolean } = {
      projectId: project.projectId,
      name: project.name || project.projectId, // Use name if available, fallback to projectId
      projectPath: '', // Cloud-only projects don't have local paths
      documents: {
        requirements: project.requirements || '',
        design: project.design || '',
        tasks: tasksContent
      },
      progress: progressData,
      contextDocs: [],
      isOwned: userId ? projectOwnerId === userId : false,
      isPublic: isPublic
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