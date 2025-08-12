import { NextRequest, NextResponse } from 'next/server';
import { pineconeSyncService } from '@/lib/pineconeSyncService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { content, topK = 5 } = await request.json();
    
    const results = await pineconeSyncService.getSimilarDocuments(projectId, content, topK);
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Failed to get similar documents:', error);
    return NextResponse.json(
      { error: 'Failed to get similar documents' },
      { status: 500 }
    );
  }
}
