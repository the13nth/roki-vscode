import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ProjectService } from '@/lib/projectService';

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
        updateData.requirements = content;
        break;
      case 'design':
        updateData.design = content;
        break;
      case 'tasks':
        updateData.tasks = content;
        break;
    }

    const success = await projectService.updateProject(userId, projectId, updateData);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to save document' },
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