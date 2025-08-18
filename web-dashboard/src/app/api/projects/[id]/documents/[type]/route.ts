import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ProjectService } from '@/lib/projectService';

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

// GET /api/projects/[id]/documents/[type] - Get document content from Pinecone
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; type: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId, type } = await params;
    
    // Validate document type
    if (!['requirements', 'design', 'tasks'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid document type' },
        { status: 400 }
      );
    }

    // Get project from Pinecone using ProjectService
    const projectService = ProjectService.getInstance();
    const project = await projectService.getProject(userId, projectId);
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get the requested document content from the project
    let content = '';
    switch (type) {
      case 'requirements':
        content = project.requirements || '';
        break;
      case 'design':
        content = project.design || '';
        break;
      case 'tasks':
        content = project.tasks || '';
        break;
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error('Failed to get document:', error);
    return NextResponse.json(
      { error: 'Failed to load document' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/documents/[type] - Save document content to Pinecone
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; type: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId, type } = await params;
    const { content, lastKnownTimestamp } = await request.json();

    // Validate document type
    if (!['requirements', 'design', 'tasks'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid document type' },
        { status: 400 }
      );
    }

    // Validate content
    if (typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content must be a string' },
        { status: 400 }
      );
    }

    // Get project from Pinecone using ProjectService
    const projectService = ProjectService.getInstance();
    const project = await projectService.getProject(userId, projectId);
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check for conflicts before saving (simplified conflict detection)
    const lastKnownDate = lastKnownTimestamp ? new Date(lastKnownTimestamp) : undefined;
    const currentTimestamp = new Date(project.lastModified);
    
    if (lastKnownDate && currentTimestamp > lastKnownDate) {
      // Conflict detected - return conflict information
      return NextResponse.json({
        conflict: true,
        conflictId: `conflict_${Date.now()}`,
        conflictType: 'timestamp',
        description: 'Document was modified by another user',
        localContent: content,
        remoteContent: getCurrentContent(project, type),
        baseContent: getCurrentContent(project, type),
        timestamp: currentTimestamp.toISOString()
      }, { status: 409 }); // HTTP 409 Conflict
    }

    // No conflict - update the project in Pinecone
    const updateData: any = {
      lastModified: new Date().toISOString()
    };

    switch (type) {
      case 'requirements':
        (updateData as any).requirements = content;
        break;
      case 'design':
        (updateData as any).design = content;
        break;
      case 'tasks':
        (updateData as any).tasks = content;
        
        // Parse tasks to update progress data
        const taskStats = parseTasksFromMarkdown(content);
        console.log('📊 Updated task stats:', {
          totalTasks: taskStats.totalTasks,
          completedTasks: taskStats.completedTasks,
          percentage: taskStats.percentage
        });
        
        // Update progress data with accurate task counts
        if ((project as any).progress) {
          (updateData as any).progress = {
            ...(project as any).progress,
            totalTasks: taskStats.totalTasks,
            completedTasks: taskStats.completedTasks,
            percentage: taskStats.percentage,
            lastUpdated: new Date().toISOString()
          };
        } else {
          (updateData as any).progress = {
            totalTasks: taskStats.totalTasks,
            completedTasks: taskStats.completedTasks,
            percentage: taskStats.percentage,
            lastUpdated: new Date().toISOString(),
            recentActivity: [],
            milestones: []
          };
        }
        break;
    }

    try {
      const success = await projectService.updateProject(userId, projectId, updateData);
      
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to save document' },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('❌ Failed to update project in Pinecone:', error);
      
      // If it's a Pinecone embedding error, try to save without updating the project embedding
      if (error instanceof Error && error.message.includes('Dense vectors must contain at least one non-zero value')) {
        console.log('⚠️ Pinecone embedding error, attempting to save document content only...');
        
        // Try to save just the document content without updating the project embedding
        const minimalUpdate = {
          lastModified: new Date().toISOString()
        };
        
        switch (type) {
          case 'requirements':
            (minimalUpdate as any).requirements = content;
            break;
          case 'design':
            (minimalUpdate as any).design = content;
            break;
          case 'tasks':
            (minimalUpdate as any).tasks = content;
            // Don't update progress here to avoid the embedding issue
            break;
        }
        
                 try {
           const success = await projectService.updateProject(userId, projectId, minimalUpdate);
           if (success) {
             console.log('✅ Document saved successfully (minimal update)');
             
             // If this was a tasks document, try to update progress separately
             if (type === 'tasks') {
               try {
                 const taskStats = parseTasksFromMarkdown(content);
                 const progressUpdate: any = {
                   progress: {
                     totalTasks: taskStats.totalTasks,
                     completedTasks: taskStats.completedTasks,
                     percentage: taskStats.percentage,
                     lastUpdated: new Date().toISOString()
                   }
                 };
                 
                 await projectService.updateProject(userId, projectId, progressUpdate);
                 console.log('✅ Progress updated successfully');
               } catch (progressError) {
                 console.warn('⚠️ Failed to update progress separately:', progressError);
               }
             }
             
             return NextResponse.json({ 
               success: true, 
               savedAt: new Date().toISOString(),
               conflict: false,
               warning: 'Document saved but project embedding update was skipped due to technical issue'
             });
           }
         } catch (retryError) {
           console.error('❌ Even minimal update failed:', retryError);
         }
      }
      
      return NextResponse.json(
        { error: `Failed to save document: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      savedAt: new Date().toISOString(),
      conflict: false
    });
  } catch (error) {
    console.error('Failed to save document:', error);
    return NextResponse.json(
      { error: 'Failed to save document' },
      { status: 500 }
    );
  }
}

// Helper function to get current content for a document type
function getCurrentContent(project: any, type: string): string {
  switch (type) {
    case 'requirements':
      return project.requirements || '';
    case 'design':
      return project.design || '';
    case 'tasks':
      return project.tasks || '';
    default:
      return '';
  }
}