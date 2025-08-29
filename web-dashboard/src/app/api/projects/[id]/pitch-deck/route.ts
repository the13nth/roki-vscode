import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PineconeSyncServiceInstance } from '@/lib/pineconeSyncService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;

    console.log(`📊 Loading pitch deck for project ${projectId}`);

    // Load pitch deck from Pinecone
    try {
      const result = await PineconeSyncServiceInstance.downloadProject(projectId);

      if (result.success && result.data?.project?.pitchDeck) {
        console.log('✅ Pitch deck loaded from Pinecone');
        return NextResponse.json({
          success: true,
          pitchDeck: result.data.project.pitchDeck,
          timestamp: result.data.project.pitchDeckTimestamp || new Date().toISOString()
        });
      } else {
        console.log('ℹ️ No pitch deck found for project');
        return NextResponse.json({
          success: false,
          message: 'No pitch deck found'
        });
      }
    } catch (error) {
      console.error('❌ Failed to load pitch deck:', error);
      return NextResponse.json(
        { error: 'Failed to load pitch deck' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Pitch deck loading failed:', error);
    return NextResponse.json(
      { error: 'Failed to load pitch deck' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;
    const body = await request.json();
    const { pitchDeck, timestamp } = body;

    if (!pitchDeck) {
      return NextResponse.json(
        { error: 'Pitch deck data is required' },
        { status: 400 }
      );
    }

    console.log(`💾 Saving pitch deck for project ${projectId}`);

    // Save pitch deck to Pinecone
    try {
      // First, get the current project data
      const currentResult = await PineconeSyncServiceInstance.downloadProject(projectId);

      if (!currentResult.success) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }

      const projectData = currentResult.data.project;

      // Update project with pitch deck data
      const updatedProject = {
        ...projectData,
        pitchDeck: pitchDeck,
        pitchDeckTimestamp: timestamp || new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      // Save updated project to Pinecone
      const saveResult = await PineconeSyncServiceInstance.syncProject(projectId, updatedProject);

      if (saveResult.success) {
        console.log('✅ Pitch deck saved to Pinecone');
        return NextResponse.json({
          success: true,
          message: 'Pitch deck saved successfully',
          timestamp: timestamp || new Date().toISOString()
        });
      } else {
        console.error('❌ Failed to save pitch deck:', saveResult.message);
        return NextResponse.json(
          { error: 'Failed to save pitch deck' },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('❌ Failed to save pitch deck:', error);
      return NextResponse.json(
        { error: 'Failed to save pitch deck' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Pitch deck saving failed:', error);
    return NextResponse.json(
      { error: 'Failed to save pitch deck' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;

    console.log(`🗑️ Deleting pitch deck for project ${projectId}`);

    // Delete pitch deck from Pinecone
    try {
      // First, get the current project data
      const currentResult = await PineconeSyncServiceInstance.downloadProject(projectId);

      if (!currentResult.success) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }

      const projectData = currentResult.data.project;

      // Remove pitch deck data
      const { pitchDeck, pitchDeckTimestamp, ...updatedProject } = projectData;
      updatedProject.lastUpdated = new Date().toISOString();

      // Save updated project to Pinecone
      const saveResult = await PineconeSyncServiceInstance.syncProject(projectId, updatedProject);

      if (saveResult.success) {
        console.log('✅ Pitch deck deleted from Pinecone');
        return NextResponse.json({
          success: true,
          message: 'Pitch deck deleted successfully'
        });
      } else {
        console.error('❌ Failed to delete pitch deck:', saveResult.message);
        return NextResponse.json(
          { error: 'Failed to delete pitch deck' },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('❌ Failed to delete pitch deck:', error);
      return NextResponse.json(
        { error: 'Failed to delete pitch deck' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Pitch deck deletion failed:', error);
    return NextResponse.json(
      { error: 'Failed to delete pitch deck' },
      { status: 500 }
    );
  }
}




