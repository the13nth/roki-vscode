// API endpoint for file watcher status
import { NextResponse } from 'next/server';
import { globalFileWatcher } from '@/lib/fileWatcher';

export async function GET() {
  try {
    const watchedProjects = globalFileWatcher.getWatchedProjects();
    const watcherStats = globalFileWatcher.getWatcherStats();
    
    // Calculate total files being watched
    const totalFilesWatched = Object.values(watcherStats).reduce(
      (total, stats) => total + stats.filesWatched, 
      0
    );

    return NextResponse.json({
      isActive: watchedProjects.length > 0,
      message: watchedProjects.length > 0 
        ? `Watching ${watchedProjects.length} project(s)` 
        : 'No projects being watched',
      discoveredProjects: watchedProjects.length,
      activeSync: watchedProjects.length,
      totalFilesWatched,
      watchedProjects,
      watcherStats
    });
  } catch (error) {
    console.error('Failed to get file watcher status:', error);
    return NextResponse.json(
      { error: 'Failed to get file watcher status' },
      { status: 500 }
    );
  }
}

// Start watching a project
export async function POST(request: Request) {
  try {
    const { projectPath } = await request.json();
    
    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project path is required' },
        { status: 400 }
      );
    }

    await globalFileWatcher.watchProject(projectPath);
    
    return NextResponse.json({
      success: true,
      message: `Started watching project: ${projectPath}`,
      projectPath
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

// Stop watching a project
export async function DELETE(request: Request) {
  try {
    const { projectPath } = await request.json();
    
    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project path is required' },
        { status: 400 }
      );
    }

    await globalFileWatcher.stopWatching(projectPath);
    
    return NextResponse.json({
      success: true,
      message: `Stopped watching project: ${projectPath}`,
      projectPath
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