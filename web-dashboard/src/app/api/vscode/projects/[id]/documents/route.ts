import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { ProjectService } from '@/lib/projectService';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// GET /api/vscode/projects/[id]/documents - Get all documents for a project (VS Code extension)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the JWT token
    try {
      const decoded = verify(token, JWT_SECRET) as any;
      
      // Check if it's a VSCode token
      if (decoded.type !== 'vscode') {
        return NextResponse.json(
          { error: 'Invalid token type' },
          { status: 401 }
        );
      }

      // Check if token is expired
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        return NextResponse.json(
          { error: 'Token expired' },
          { status: 401 }
        );
      }

      const userId = decoded.userId;
      if (!userId) {
        return NextResponse.json(
          { error: 'Invalid token' },
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
      console.error('Token verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Failed to get project documents for VS Code:', error);
    return NextResponse.json(
      { error: 'Failed to load project documents' },
      { status: 500 }
    );
  }
}




