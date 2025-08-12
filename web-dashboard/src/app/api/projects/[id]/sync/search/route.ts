import { NextRequest, NextResponse } from 'next/server';
import { pineconeSyncService } from '@/lib/pineconeSyncService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { query, topK = 5 } = await request.json();
    
    const results = await pineconeSyncService.searchContextDocuments(projectId, query, topK);
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Failed to search documents:', error);
    return NextResponse.json(
      { error: 'Failed to search documents' },
      { status: 500 }
    );
  }
}
