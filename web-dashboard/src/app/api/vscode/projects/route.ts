import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { ProjectService } from '@/lib/projectService';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// GET /api/vscode/projects - List user's projects for VS Code extension
export async function GET(request: NextRequest) {
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

      const projectService = ProjectService.getInstance();
      const projects = await projectService.getUserProjects(userId);

      return NextResponse.json(projects);
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Failed to list projects for VS Code:', error);
    return NextResponse.json(
      { error: 'Failed to list projects' },
      { status: 500 }
    );
  }
}

