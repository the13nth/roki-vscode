// API endpoint for file watcher status (cloud-only projects)
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // For cloud-only projects, file watching is not needed
    return NextResponse.json({
      isActive: false,
      message: 'Cloud-only projects - no local file watching needed',
      discoveredProjects: 0,
      activeSync: 0,
      totalFilesWatched: 0,
      watchedProjects: [],
      watcherStats: {}
    });
  } catch (error) {
    console.error('Failed to get file watcher status:', error);
    return NextResponse.json(
      { error: 'Failed to get file watcher status' },
      { status: 500 }
    );
  }
}

// Start watching a project (not needed for cloud-only projects)
export async function POST(request: Request) {
  try {
    return NextResponse.json({
      success: true,
      message: 'Cloud-only projects - no local file watching needed',
      projectPath: 'cloud'
    });
  } catch (error) {
    console.error('Failed to start watching project:', error);
    return NextResponse.json(
      { 
        error: 'Failed to start watching project',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Stop watching a project (not needed for cloud-only projects)
export async function DELETE(request: Request) {
  try {
    return NextResponse.json({
      success: true,
      message: 'Cloud-only projects - no local file watching needed',
      projectPath: 'cloud'
    });
  } catch (error) {
    console.error('Failed to stop watching project:', error);
    return NextResponse.json(
      { 
        error: 'Failed to stop watching project',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}