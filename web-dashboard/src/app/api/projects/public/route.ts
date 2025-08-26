import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ProjectService } from '@/lib/projectService';

// GET /api/projects/public - List all public projects (excluding user's own projects)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    const projectService = ProjectService.getInstance();
    
    // Get public projects excluding those owned by the current user
    const projects = await projectService.getPublicProjects(userId || undefined);

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Failed to list public projects:', error);
    return NextResponse.json(
      { error: 'Failed to list public projects' },
      { status: 500 }
    );
  }
}

