// API endpoints for individual conflict operations
import { NextRequest, NextResponse } from 'next/server';
import { globalConflictResolver } from '@/lib/conflictResolution';

// GET /api/conflicts/[id] - Get a specific conflict
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conflict = globalConflictResolver.getConflict(id);
    
    if (!conflict) {
      return NextResponse.json(
        { error: 'Conflict not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ conflict });
  } catch (error) {
    console.error('Failed to get conflict:', error);
    return NextResponse.json(
      { error: 'Failed to get conflict' },
      { status: 500 }
    );
  }
}

// POST /api/conflicts/[id]/merge - Perform automatic merge for a conflict
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conflict = globalConflictResolver.getConflict(id);
    
    if (!conflict) {
      return NextResponse.json(
        { error: 'Conflict not found' },
        { status: 404 }
      );
    }

    // Perform three-way merge
    const mergeResult = await globalConflictResolver.performThreeWayMerge(conflict);

    return NextResponse.json({
      success: mergeResult.success,
      mergedContent: mergeResult.mergedContent,
      conflicts: mergeResult.conflicts,
      warnings: mergeResult.warnings
    });
  } catch (error) {
    console.error('Failed to perform merge:', error);
    return NextResponse.json(
      { 
        error: 'Failed to perform merge',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}