// API endpoints for backup management
import { NextRequest, NextResponse } from 'next/server';
import { globalConflictResolver } from '@/lib/conflictResolution';

// GET /api/backups?filePath=... - Get backups for a specific file
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('filePath');

    if (!filePath) {
      return NextResponse.json(
        { error: 'filePath parameter is required' },
        { status: 400 }
      );
    }

    const backups = await globalConflictResolver.getBackupsForFile(filePath);
    return NextResponse.json({ backups });
  } catch (error) {
    console.error('Failed to get backups:', error);
    return NextResponse.json(
      { error: 'Failed to get backups' },
      { status: 500 }
    );
  }
}

// POST /api/backups/restore - Restore a file from backup
export async function POST(request: NextRequest) {
  try {
    const { backupPath, targetPath } = await request.json();

    if (!backupPath) {
      return NextResponse.json(
        { error: 'backupPath is required' },
        { status: 400 }
      );
    }

    await globalConflictResolver.restoreFromBackup(backupPath, targetPath);

    return NextResponse.json({
      success: true,
      message: 'File restored from backup successfully'
    });
  } catch (error) {
    console.error('Failed to restore from backup:', error);
    return NextResponse.json(
      { 
        error: 'Failed to restore from backup',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}