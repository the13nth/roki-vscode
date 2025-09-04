import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';
import { ProjectSharing, TeamRole } from '@/types/shared';
import { NotificationService } from '@/lib/notificationService';

const pinecone = getPineconeClient();
const index = pinecone.index(PINECONE_INDEX_NAME);

// Share a project with a user by email
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { projectId, email, role = 'viewer' } = body;

    if (!projectId || !email) {
      return NextResponse.json(
        { success: false, error: 'Project ID and email are required' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles: TeamRole[] = ['admin', 'editor', 'viewer'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role. Must be admin, editor, or viewer' },
        { status: 400 }
      );
    }

    // Check if user owns the project or has admin access
    const projectResponse = await index.namespace('projects').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        projectId: { $eq: projectId }
      },
      topK: 1,
      includeMetadata: true
    });

    const project = projectResponse.matches?.[0]?.metadata;
    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (project.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Only project owners can share projects' },
        { status: 403 }
      );
    }

    // Check if project is already shared with this email
    const existingShareResponse = await index.namespace('project_sharing').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        projectId: { $eq: projectId },
        sharedWithEmail: { $eq: email },
        status: { $eq: 'active' }
      },
      topK: 1,
      includeMetadata: true
    });

    if (existingShareResponse.matches && existingShareResponse.matches.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Project is already shared with this email' },
        { status: 409 }
      );
    }

    // Create project sharing record
    const sharingId = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    const projectSharing: ProjectSharing = {
      id: sharingId,
      projectId,
      sharedWithEmail: email,
      role,
      sharedAt: now,
      sharedBy: userId,
      status: 'pending'
    };

    // Store project sharing in Pinecone
    await index.namespace('project_sharing').upsert([{
      id: sharingId,
      values: new Array(1024).fill(0.1),
      metadata: {
        ...projectSharing,
        sharedAt: projectSharing.sharedAt.toISOString(),
        expiresAt: expiresAt.toISOString()
      }
    }]);

    // Don't update project's sharedWith array until invitation is accepted
    // const currentSharedWith = Array.isArray(project.sharedWith) ? project.sharedWith : [];
    // if (!currentSharedWith.includes(email)) {
    //   const updatedSharedWith = [...currentSharedWith, email];
      
    //   await index.namespace('projects').upsert([{
    //     id: String(project.projectId),
    //     values: new Array(1024).fill(0.1),
    //     metadata: {
    //       ...project,
    //       sharedWith: updatedSharedWith
    //     }
    //   });
    // }

    // Create notification for project sharing
    try {
      const projectName = String(project.name || 'Unknown Project');
      await NotificationService.notifyProjectInvitation(userId, projectId, projectName, email, role);
    } catch (notificationError) {
      console.error('Failed to create project sharing notification:', notificationError);
      // Don't fail the sharing if notification fails
    }

    // TODO: Send email notification to shared user
    console.log(`Project ${projectId} shared with ${email} with role ${role}`);

    return NextResponse.json({
      success: true,
      sharing: {
        id: sharingId,
        projectId,
        email,
        role,
        sharedAt: projectSharing.sharedAt.toISOString()
      },
      message: 'Project shared successfully'
    });

  } catch (error) {
    console.error('Error sharing project:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to share project' },
      { status: 500 }
    );
  }
}

// Get shared projects for a user
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's email from Clerk (this would need to be implemented)
    // For now, we'll get shared projects by projectId
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (projectId) {
      // Get sharing details for a specific project
      const response = await index.namespace('project_sharing').query({
        vector: new Array(1024).fill(0.1),
        filter: {
          projectId: { $eq: projectId },
          status: { $eq: 'active' }
        },
        topK: 100,
        includeMetadata: true
      });

      const sharing = response.matches?.map(match => ({
        id: match.metadata?.id || match.id,
        projectId: match.metadata?.projectId || '',
        email: match.metadata?.sharedWithEmail || '',
        role: match.metadata?.role || 'viewer',
        sharedAt: match.metadata?.sharedAt || '',
        sharedBy: match.metadata?.sharedBy || ''
      })) || [];

      return NextResponse.json({
        success: true,
        sharing
      });
    } else {
      // Get all projects shared with the current user
      // This would require looking up the user's email and finding shared projects
      return NextResponse.json({
        success: true,
        sharedProjects: []
      });
    }

  } catch (error) {
    console.error('Error fetching shared projects:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch shared projects' },
      { status: 500 }
    );
  }
}

// Revoke project sharing
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sharingId = searchParams.get('sharingId');

    if (!sharingId) {
      return NextResponse.json(
        { success: false, error: 'Sharing ID is required' },
        { status: 400 }
      );
    }

    // Get sharing details
    const sharingResponse = await index.namespace('project_sharing').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        id: { $eq: sharingId }
      },
      topK: 1,
      includeMetadata: true
    });

    const sharing = sharingResponse.matches?.[0]?.metadata;
    if (!sharing) {
      return NextResponse.json(
        { success: false, error: 'Sharing record not found' },
        { status: 404 }
      );
    }

    // Check if user can revoke (must be project owner or the one who shared)
    if (sharing.sharedBy !== userId) {
      // Check if user is project owner
      const projectResponse = await index.namespace('projects').query({
        vector: new Array(1024).fill(0.1),
        filter: {
          projectId: { $eq: sharing.projectId }
        },
        topK: 1,
        includeMetadata: true
      });

      const project = projectResponse.matches?.[0]?.metadata;
      if (!project || project.userId !== userId) {
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions to revoke sharing' },
          { status: 403 }
        );
      }
    }

    // Update sharing status to revoked
    await index.namespace('project_sharing').upsert([{
      id: sharingId,
      values: new Array(1024).fill(0.1),
      metadata: {
        ...sharing,
        status: 'revoked'
      }
    }]);

    // Remove from project's sharedWith array
    const projectResponse = await index.namespace('projects').query({
      vector: new Array(1024).fill(0.1),
      filter: {
        projectId: { $eq: sharing.projectId }
      },
      topK: 1,
      includeMetadata: true
    });

    const project = projectResponse.matches?.[0]?.metadata;
    if (project && Array.isArray(project.sharedWith)) {
      const updatedSharedWith = project.sharedWith.filter((email: string) => email !== sharing.sharedWithEmail);
      
      await index.namespace('projects').upsert([{
        id: String(project.projectId),
        values: new Array(1024).fill(0.1),
        metadata: {
          ...project,
          sharedWith: updatedSharedWith
        }
      }]);
    }

    return NextResponse.json({
      success: true,
      message: 'Project sharing revoked successfully'
    });

  } catch (error) {
    console.error('Error revoking project sharing:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to revoke project sharing' },
      { status: 500 }
    );
  }
}
