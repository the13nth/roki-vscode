import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ProjectService } from '@/lib/projectService';

// PATCH /api/projects/[id]/visibility - Toggle project visibility
export async function PATCH(
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
    const body = await request.json();
    const { isPublic } = body;

    if (typeof isPublic !== 'boolean') {
      return NextResponse.json(
        { error: 'isPublic must be a boolean' },
        { status: 400 }
      );
    }

    const projectService = ProjectService.getInstance();
    const success = await projectService.updateProject(userId, projectId, { isPublic });

    if (!success) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, isPublic });
  } catch (error) {
    console.error('Failed to update project visibility:', error);
    return NextResponse.json(
      { error: 'Failed to update project visibility' },
      { status: 500 }
    );
  }
}

