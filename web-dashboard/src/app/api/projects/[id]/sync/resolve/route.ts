import { NextRequest, NextResponse } from 'next/server';
import { pineconeSyncService } from '@/lib/pineconeSyncService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { documentId, resolution } = await request.json();
    
    const result = await pineconeSyncService.resolveConflict(projectId, documentId, resolution);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to resolve conflict:', error);
    return NextResponse.json(
      { error: 'Failed to resolve conflict' },
      { status: 500 }
    );
  }
}
