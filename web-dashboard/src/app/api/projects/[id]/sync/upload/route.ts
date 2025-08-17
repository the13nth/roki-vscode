import { NextRequest, NextResponse } from 'next/server';
import { PineconeSyncServiceInstance } from '@/lib/pineconeSyncService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const localData = await request.json();
    
    const result = await PineconeSyncServiceInstance.syncProject(projectId, localData);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to sync project:', error);
    return NextResponse.json(
      { error: 'Failed to sync project' },
      { status: 500 }
    );
  }
}
