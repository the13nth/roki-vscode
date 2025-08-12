import { NextRequest, NextResponse } from 'next/server';
import { pineconeSyncService } from '@/lib/pineconeSyncService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { forceResync = false } = body;
    
    console.log('Sync request for project:', projectId, 'forceResync:', forceResync);
    
    // Fetch current project data
    const projectResponse = await fetch(`${request.nextUrl.origin}/api/projects/${projectId}`);
    if (!projectResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch project data' },
        { status: 400 }
      );
    }
    
    const projectData = await projectResponse.json();
    
    // Fetch context documents
    const contextResponse = await fetch(`${request.nextUrl.origin}/api/projects/${projectId}/context`);
    const contextData = contextResponse.ok ? await contextResponse.json() : [];
    
    // Prepare data for sync
    const syncData = {
      ...projectData,
      requirements: projectData.documents?.requirements || '',
      design: projectData.documents?.design || '',
      tasks: projectData.documents?.tasks || '',
      progress: projectData.progress || {},
      contextDocuments: contextData
    };
    
    console.log('Syncing data with proper embeddings:', {
      projectId,
      hasRequirements: !!syncData.requirements,
      hasDesign: !!syncData.design,
      hasTasks: !!syncData.tasks,
      contextCount: syncData.contextDocuments?.length || 0
    });
    
    // Perform sync
    const result = await pineconeSyncService.syncProject(projectId, syncData);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        syncedItems: result.syncedItems
      });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync project' },
      { status: 500 }
    );
  }
}
