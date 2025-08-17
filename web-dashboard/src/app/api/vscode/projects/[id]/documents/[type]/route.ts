import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { ProjectService } from '@/lib/projectService';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// GET /api/vscode/projects/[id]/documents/[type] - Get specific document for VS Code extension
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; type: string }> }
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
      console.error('Token verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Failed to get document for VS Code:', error);
    return NextResponse.json(
      { error: 'Failed to load document' },
      { status: 500 }
    );
  }
}




