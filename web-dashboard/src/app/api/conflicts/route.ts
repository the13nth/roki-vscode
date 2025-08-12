// API endpoints for conflict resolution
import { NextRequest, NextResponse } from 'next/server';
import { globalConflictResolver } from '@/lib/conflictResolution';

// GET /api/conflicts - Get all active conflicts
export async function GET() {
  try {
    const conflicts = globalConflictResolver.getActiveConflicts();
    return NextResponse.json({ conflicts });
  } catch (error) {
    console.error('Failed to get conflicts:', error);
    return NextResponse.json(
      { error: 'Failed to get conflicts' },
      { status: 500 }
    );
  }
}

// POST /api/conflicts/resolve - Resolve a conflict
export async function POST(request: NextRequest) {
  try {
    const { 
      conflictId, 
      resolution, 
      manualContent, 
      resolvedBy = 'user' 
    } = await request.json();

    // Validate required fields
    if (!conflictId || !resolution) {
      return NextResponse.json(
        { error: 'conflictId and resolution are required' },
        { status: 400 }
      );
    }

    // Validate resolution type
    if (!['local', 'remote', 'merge', 'manual'].includes(resolution)) {
      return NextResponse.json(
        { error: 'Invalid resolution type' },
        { status: 400 }
      );
    }

    // Validate manual content if manual resolution
    if (resolution === 'manual' && !manualContent) {
      return NextResponse.json(
        { error: 'manualContent is required for manual resolution' },
        { status: 400 }
      );
    }

    const conflictResolution = await globalConflictResolver.resolveConflict(
      conflictId,
      resolution,
      manualContent,
      resolvedBy
    );

    return NextResponse.json({
      success: true,
      resolution: conflictResolution
    });
  } catch (error) {
    console.error('Failed to resolve conflict:', error);
    return NextResponse.json(
      { 
        error: 'Failed to resolve conflict',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}