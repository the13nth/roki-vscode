// API endpoints for progress tracking operations
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { ProgressManager, ProgressManagerError } from '../../../../../lib/progressManager';
import { ProjectConfiguration } from '../../../../../types/shared';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const projectId = params.id;
    
    // Find project by scanning for .ai-project directories
    const projectPath = await findProjectById(projectId);
    if (!projectPath) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }
    
    const progressManager = new ProgressManager(projectPath);
    const stats = await progressManager.getProgressStats();
    
    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting progress stats:', error);
    
    if (error instanceof ProgressManagerError) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          code: error.code 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get progress stats' 
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const projectId = params.id;
    const body = await request.json();
    
    // Find project by scanning for .ai-project directories
    const projectPath = await findProjectById(projectId);
    if (!projectPath) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }
    
    const progressManager = new ProgressManager(projectPath);
    
    // Handle different operations based on the action
    const { action, taskId, completedBy, milestoneName, targetDate } = body;
    
    switch (action) {
      case 'complete_task':
        if (!taskId) {
          return NextResponse.json(
            { success: false, error: 'Task ID is required' },
            { status: 400 }
          );
        }
        const completedProgress = await progressManager.completeTask(taskId, completedBy);
        return NextResponse.json({
          success: true,
          data: completedProgress
        });
        
      case 'uncomplete_task':
        if (!taskId) {
          return NextResponse.json(
            { success: false, error: 'Task ID is required' },
            { status: 400 }
          );
        }
        const uncompletedProgress = await progressManager.uncompleteTask(taskId);
        return NextResponse.json({
          success: true,
          data: uncompletedProgress
        });
        
      case 'add_milestone':
        if (!milestoneName || !targetDate) {
          return NextResponse.json(
            { success: false, error: 'Milestone name and target date are required' },
            { status: 400 }
          );
        }
        const milestoneProgress = await progressManager.addMilestone(milestoneName, targetDate);
        return NextResponse.json({
          success: true,
          data: milestoneProgress
        });
        
      case 'update_milestone_progress':
        const updatedProgress = await progressManager.updateMilestoneProgress();
        return NextResponse.json({
          success: true,
          data: updatedProgress
        });
        
      case 'calculate_progress':
        const calculatedProgress = await progressManager.calculateAndUpdateProgress();
        return NextResponse.json({
          success: true,
          data: calculatedProgress
        });
        
      case 'initialize':
        const initializedProgress = await progressManager.initializeProgress();
        return NextResponse.json({
          success: true,
          data: initializedProgress
        });
        
      case 'refresh':
        const refreshedProgress = await progressManager.calculateAndUpdateProgress();
        return NextResponse.json({
          success: true,
          data: refreshedProgress
        });
        
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error handling progress operation:', error);
    
    if (error instanceof ProgressManagerError) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          code: error.code 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to handle progress operation' 
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const projectId = params.id;
    const body = await request.json();
    
    // Find project by scanning for .ai-project directories
    const projectPath = await findProjectById(projectId);
    if (!projectPath) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }
    
    const progressManager = new ProgressManager(projectPath);
    
    // Update task completion status
    const { taskId, isCompleted } = body;
    
    if (!taskId || typeof isCompleted !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Task ID and completion status are required' },
        { status: 400 }
      );
    }
    
    let updatedProgress;
    if (isCompleted) {
      updatedProgress = await progressManager.completeTask(taskId, 'manual');
    } else {
      updatedProgress = await progressManager.uncompleteTask(taskId);
    }
    
    return NextResponse.json({
      success: true,
      data: updatedProgress
    });
  } catch (error) {
    console.error('Error updating task completion:', error);
    
    if (error instanceof ProgressManagerError) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          code: error.code 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update task completion' 
      },
      { status: 500 }
    );
  }
}
// Helper functions for finding projects
async function findProjectById(projectId: string): Promise<string | null> {
  // First check our internal projects directory
  const internalProjectPath = path.join(process.cwd(), '.ai-project', 'projects', projectId);
  const configPath = path.join(internalProjectPath, 'config.json');
  
  if (await fileExists(configPath)) {
    // Check if this is a reference to an original project
    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      
      // If there's an originalPath, use that instead
      if (config.originalPath && await directoryExists(config.originalPath)) {
        return config.originalPath;
      }
    } catch (error) {
      console.warn(`Failed to read config for project ${projectId}:`, error);
    }
    
    return internalProjectPath;
  }

  const commonPaths = [
    process.env.HOME || '/home',
    '/Users',
    '/workspace',
    '/tmp',
    process.cwd()
  ];

  for (const basePath of commonPaths) {
    try {
      if (await directoryExists(basePath)) {
        const foundPath = await scanForProjectById(basePath, projectId);
        if (foundPath) {
          return foundPath;
        }
      }
    } catch (error) {
      console.warn(`Failed to scan ${basePath}:`, error);
    }
  }

  return null;
}

async function scanForProjectById(
  basePath: string, 
  projectId: string, 
  maxDepth: number = 3
): Promise<string | null> {
  return await scanDirectoryForProject(basePath, projectId, 0, maxDepth);
}

async function scanDirectoryForProject(
  dirPath: string,
  projectId: string,
  currentDepth: number,
  maxDepth: number
): Promise<string | null> {
  if (currentDepth >= maxDepth) return null;

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      const fullPath = path.join(dirPath, entry.name);
      
      // Skip hidden directories and common non-project directories
      if (entry.name.startsWith('.') && entry.name !== '.ai-project') continue;
      if (['node_modules', 'dist', 'build', '.git'].includes(entry.name)) continue;
      
      // Check if this directory contains .ai-project with matching ID
      const aiProjectPath = path.join(fullPath, '.ai-project');
      if (await directoryExists(aiProjectPath)) {
        try {
          const configPath = path.join(aiProjectPath, 'config.json');
          if (await fileExists(configPath)) {
            const configContent = await fs.readFile(configPath, 'utf-8');
            const config: ProjectConfiguration = JSON.parse(configContent);
            
            if (config.projectId === projectId) {
              return fullPath;
            }
          }
        } catch (error) {
          console.warn(`Failed to check project config in ${fullPath}:`, error);
        }
      } else {
        // Recursively scan subdirectories
        const found = await scanDirectoryForProject(fullPath, projectId, currentDepth + 1, maxDepth);
        if (found) {
          return found;
        }
      }
    }
  } catch (error) {
    console.warn(`Cannot read directory ${dirPath}:`, error);
  }

  return null;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}