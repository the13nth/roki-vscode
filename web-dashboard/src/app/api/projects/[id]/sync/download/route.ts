import { NextRequest, NextResponse } from 'next/server';
import { pineconeSyncService } from '@/lib/pineconeSyncService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    
    const result = await pineconeSyncService.downloadProject(projectId);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to download project:', error);
    return NextResponse.json(
      { error: 'Failed to download project' },
      { status: 500 }
    );
  }
}
