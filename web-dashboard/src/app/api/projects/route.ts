import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { FileSystemManager } from '@/lib/fileSystem';
import { ProjectConfiguration, ProjectListItem } from '@/types';

// GET /api/projects - List all projects
export async function GET() {
  try {
    const projects: ProjectListItem[] = [];
    
    // For now, we'll scan common project directories
    // In a real implementation, this might come from a database or config file
    // Only scan safe, relevant directories for projects
    const commonPaths = [
      // User's home directory (but limit depth)
      process.env.HOME ? path.join(process.env.HOME, 'Documents') : null,
      process.env.HOME ? path.join(process.env.HOME, 'Projects') : null,
      process.env.HOME ? path.join(process.env.HOME, 'Development') : null,
      // Current working directory
      process.cwd(),
      // Common workspace directories (only if they exist and are accessible)
      '/workspace',
    ].filter(Boolean) as string[];

    for (const basePath of commonPaths) {
      try {
        if (await directoryExists(basePath)) {
          const foundProjects = await scanForProjects(basePath);
          projects.push(...foundProjects);
        }
      } catch (error) {
        // Continue scanning other paths if one fails
        console.warn(`Failed to scan ${basePath}:`, error);
      }
    }

    // Also scan our internal projects directory directly
    const internalProjectsPath = path.join(process.cwd(), '.ai-project', 'projects');
    try {
      if (await directoryExists(internalProjectsPath)) {
        const internalProjects = await scanInternalProjects(internalProjectsPath);
        projects.push(...internalProjects);
      }
    } catch (error) {
      console.warn(`Failed to scan internal projects:`, error);
    }

    // Remove duplicates based on project ID
    const uniqueProjects = projects.filter((project, index, self) => 
      index === self.findIndex(p => p.id === project.id)
    );

    return NextResponse.json(uniqueProjects);
  } catch (error) {
    console.error('Failed to list projects:', error);
    return NextResponse.json(
      { error: 'Failed to list projects' },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, template, projectPath, aiModel, technologyStack } = body;
    console.log('Received project creation request:', { name, description, template, projectPath, aiModel, technologyStack });

    // Validate required fields
    if (!name || !description || !template || !projectPath) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if project path exists
    if (!await directoryExists(projectPath)) {
      return NextResponse.json(
        { error: 'Project path does not exist' },
        { status: 400 }
      );
    }

    // Check if .ai-project already exists
    const aiProjectPath = path.join(projectPath, '.ai-project');
    if (await directoryExists(aiProjectPath)) {
      return NextResponse.json(
        { error: 'Project already has .ai-project directory' },
        { status: 400 }
      );
    }

    // Create project configuration
    const projectId = uuidv4();
    const now = new Date().toISOString();
    
    const config: ProjectConfiguration = {
      projectId,
      name,
      description,
      template,
      createdAt: now,
      lastModified: now,
      aiModel: aiModel || 'gpt-4',
      technologyStack,
      tokenTracking: {
        totalTokens: 0,
        totalCost: 0,
        lastUpdated: now
      },
      contextPreferences: {
        maxContextSize: 8000,
        prioritizeRecent: true,
        includeProgress: true
      }
    };
    console.log('Created project config:', config);

    // Create project structure in the actual project directory
    await FileSystemManager.createProjectStructure(projectPath, config);

    // Create internal project directory structure for API management
    const internalProjectDir = path.join(process.cwd(), '.ai-project', 'projects', projectId);
    const internalConfigPath = path.join(internalProjectDir, 'config.json');
    
    try {
      // Create internal project directory
      await fs.mkdir(internalProjectDir, { recursive: true });
      
      // Create internal config with reference to original path
      const internalConfig = {
        ...config,
        originalPath: projectPath
      };
      await fs.writeFile(internalConfigPath, JSON.stringify(internalConfig, null, 2), 'utf8');
      
      // Copy global API configuration to project if it exists
      const globalConfigPath = path.join(process.cwd(), '.ai-project', 'global-api-config.json');
      const projectApiConfigPath = path.join(internalProjectDir, 'api-config.json');
      
      if (await fileExists(globalConfigPath)) {
        const globalConfigData = await fs.readFile(globalConfigPath, 'utf8');
        await fs.writeFile(projectApiConfigPath, globalConfigData, 'utf8');
      }
    } catch (error) {
      console.error('Failed to create internal project directory:', error);
      // Don't fail the whole process if internal directory creation fails
    }

    // Initialize token tracking for the project
    try {
      const { TokenTrackingService } = await import('@/lib/tokenTrackingService');
      const tokenTrackingService = TokenTrackingService.getInstance();
      
      // Initialize with zero usage
      await tokenTrackingService.trackTokenUsage(projectId, 0, 0, 'project-initialization');
    } catch (error) {
      console.warn('Failed to initialize token tracking for project:', error);
    }

    // Return project list item
    const projectListItem: ProjectListItem = {
      id: projectId,
      name,
      description,
      lastModified: new Date(now),
      progress: 0
    };

    return NextResponse.json(projectListItem, { status: 201 });
  } catch (error) {
    console.error('Failed to create project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}

// Helper functions
async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

async function scanForProjects(basePath: string, maxDepth: number = 2): Promise<ProjectListItem[]> {
  const projects: ProjectListItem[] = [];
  
  try {
    await scanDirectory(basePath, 0, maxDepth, projects);
  } catch (error) {
    console.warn(`Failed to scan directory ${basePath}:`, error);
  }
  
  return projects;
}

async function scanInternalProjects(projectsPath: string): Promise<ProjectListItem[]> {
  const projects: ProjectListItem[] = [];
  
  try {
    const entries = await fs.readdir(projectsPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      const projectDir = path.join(projectsPath, entry.name);
      const configPath = path.join(projectDir, 'config.json');
      
      if (await directoryExists(projectDir) && await fileExists(configPath)) {
        try {
          const configContent = await fs.readFile(configPath, 'utf-8');
          const config = JSON.parse(configContent);
          
          // Read progress if it exists
          let progress = 0;
          const progressPath = path.join(projectDir, 'progress.json');
          if (await fileExists(progressPath)) {
            try {
              const progressContent = await fs.readFile(progressPath, 'utf-8');
              const progressData = JSON.parse(progressContent);
              progress = progressData.percentage || 0;
            } catch {
              // Ignore progress read errors
            }
          }
          
          projects.push({
            id: config.projectId || entry.name,
            name: config.name || entry.name,
            description: config.description || 'Imported project',
            lastModified: config.lastModified || new Date().toISOString(),
            progress
          });
        } catch (error) {
          console.warn(`Failed to read project config ${configPath}:`, error);
        }
      }
    }
  } catch (error) {
    console.warn(`Failed to scan internal projects directory:`, error);
  }
  
  return projects;
}

async function scanDirectory(
  dirPath: string, 
  currentDepth: number, 
  maxDepth: number, 
  projects: ProjectListItem[]
): Promise<void> {
  if (currentDepth >= maxDepth) return;

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      const fullPath = path.join(dirPath, entry.name);
      
      // Skip hidden directories and common non-project directories
      if (entry.name.startsWith('.') && entry.name !== '.ai-project' && entry.name !== '.kiro') continue;
      if (['node_modules', 'dist', 'build', '.git', 'tmp', 'temp', 'cache'].includes(entry.name)) continue;
      
      // Skip system directories that commonly cause permission issues
      if (entry.name.startsWith('systemd-private-') || 
          entry.name.startsWith('snap-private-') ||
          fullPath.includes('/tmp/') ||
          fullPath.includes('/var/') ||
          fullPath.includes('/proc/') ||
          fullPath.includes('/sys/')) continue;
      
      // Check if this directory contains .ai-project
      const aiProjectPath = path.join(fullPath, '.ai-project');
      if (await directoryExists(aiProjectPath)) {
        try {
          const project = await loadProjectFromPath(fullPath);
          if (project) {
            projects.push(project);
          }
        } catch (error) {
          console.warn(`Failed to load project from ${fullPath}:`, error);
        }
      } else {
        // Recursively scan subdirectories, but skip if we can't access them
        try {
          await scanDirectory(fullPath, currentDepth + 1, maxDepth, projects);
        } catch (error: any) {
          // Skip directories we can't access (permission denied, etc.)
          if (error.code === 'EACCES' || error.code === 'EPERM') {
            continue; // Silently skip permission denied directories
          }
          console.warn(`Failed to scan directory ${fullPath}:`, error);
        }
      }
    }
  } catch (error) {
    // Skip directories we can't read
    console.warn(`Cannot read directory ${dirPath}:`, error);
  }
}

async function loadProjectFromPath(projectPath: string): Promise<ProjectListItem | null> {
  try {
    const configPath = path.join(projectPath, '.ai-project', 'config.json');
    const progressPath = path.join(projectPath, '.ai-project', 'progress.json');
    
    // Load config
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config: ProjectConfiguration = JSON.parse(configContent);
    
    // Load progress
    let progress = 0;
    try {
      const progressContent = await fs.readFile(progressPath, 'utf-8');
      const progressData = JSON.parse(progressContent);
      progress = progressData.percentage || 0;
    } catch {
      // Progress file might not exist or be invalid
    }
    
    // Get last modified time
    const stats = await fs.stat(configPath);
    
    return {
      id: config.projectId,
      name: config.name,
      description: config.description,
      lastModified: stats.mtime,
      progress
    };
  } catch (error) {
    console.warn(`Failed to load project config from ${projectPath}:`, error);
    return null;
  }
}