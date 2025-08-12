import { NextRequest, NextResponse } from 'next/server';
import { pineconeSyncService } from '@/lib/pineconeSyncService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const syncStatus = await pineconeSyncService.getSyncStatus(projectId);
    
    return NextResponse.json(syncStatus);
  } catch (error) {
    console.error('Failed to get sync status:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}
