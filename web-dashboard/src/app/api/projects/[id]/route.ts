import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { FileSystemManager } from '@/lib/fileSystem';
import { ProjectDashboard, ProjectConfiguration, ProgressData, ContextDocument } from '@/types';

// GET /api/projects/[id] - Get project details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Find project by scanning for .ai-project directories
    const projectPath = await findProjectById(id);
    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Load project data
    const projectData = await loadProjectData(projectPath, id);
    
    return NextResponse.json(projectData);
  } catch (error) {
    console.error('Failed to get project:', error);
    return NextResponse.json(
      { error: 'Failed to load project' },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id] - Update project metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Find project by scanning for .ai-project directories
    const projectPath = await findProjectById(id);
    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Load current config
    const configPath = path.join(projectPath, '.ai-project', 'config.json');
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config: ProjectConfiguration = JSON.parse(configContent);

    // Update config with new data
    const updatedConfig: ProjectConfiguration = {
      ...config,
      ...body,
      lastModified: new Date().toISOString()
    };

    // Save updated config
    await fs.writeFile(configPath, JSON.stringify(updatedConfig, null, 2), 'utf-8');

    // Return updated project data
    const projectData = await loadProjectData(projectPath, id);
    
    return NextResponse.json(projectData);
  } catch (error) {
    console.error('Failed to update project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - Delete project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Find project by ID
    const projectPath = await findProjectById(id);
    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Create backup before deleting
    const aiProjectPath = path.join(projectPath, '.ai-project');
    const backupDir = path.join(process.cwd(), '.ai-project', 'backups');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `${id}_${timestamp}`);

    try {
      // Ensure backup directory exists
      await fs.mkdir(backupDir, { recursive: true });
      
      // Copy the .ai-project directory to backup
      await copyDirectory(aiProjectPath, backupPath);
      console.log(`Created backup at: ${backupPath}`);
    } catch (error) {
      console.warn('Failed to create backup before deletion:', error);
      // Continue with deletion even if backup fails
    }

    // Delete the .ai-project directory from the original project
    try {
      await fs.rm(aiProjectPath, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to delete original .ai-project directory:', error);
    }

    // Delete the internal project directory
    const internalProjectPath = path.join(process.cwd(), '.ai-project', 'projects', id);
    try {
      await fs.rm(internalProjectPath, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to delete internal project directory:', error);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Project deleted successfully',
      backupPath: backupPath
    });
  } catch (error) {
    console.error('Failed to delete project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}

// Helper function to copy directory recursively
async function copyDirectory(source: string, destination: string): Promise<void> {
  await fs.mkdir(destination, { recursive: true });
  
  const entries = await fs.readdir(source, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);
    
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

// Helper functions
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
      
      // Check if this directory contains .ai-project or .kiro with matching ID
      const aiProjectPath = path.join(fullPath, '.ai-project');
      const kiroPath = path.join(fullPath, '.kiro', 'specs', 'ai-project-manager');
      
      // First check .kiro structure
      if (await directoryExists(kiroPath)) {
        try {
          // For .kiro projects, we can identify by directory name or check for project files
          // Since the project ID is 'roki' and the directory is also 'roki', this should match
          if (entry.name === projectId) {
            return fullPath;
          }
        } catch (error) {
          console.warn(`Failed to check .kiro project in ${fullPath}:`, error);
        }
      }
      // Then check .ai-project structure
      else if (await directoryExists(aiProjectPath)) {
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

async function loadProjectData(projectPath: string, projectId: string): Promise<ProjectDashboard> {
  // First check if this is an imported project in our internal directory
  const internalProjectPath = path.join(process.cwd(), '.ai-project', 'projects', projectId);
  const internalConfigPath = path.join(internalProjectPath, 'config.json');
  
  let aiProjectPath: string;
  let config: ProjectConfiguration;
  
  if (await fileExists(internalConfigPath)) {
    // This is an imported project - check if it has originalPath pointing to Kiro specs
    const configContent = await fs.readFile(internalConfigPath, 'utf-8');
    config = JSON.parse(configContent);
    
    // Check if the original project has Kiro specs
    if (config.originalPath) {
      const kiroSpecsPath = path.join(config.originalPath, '.kiro', 'specs', 'ai-project-manager');
      const kiroConfigPath = path.join(kiroSpecsPath, 'config.json');
      
      if (await fileExists(kiroConfigPath)) {
        // Use Kiro specs as the primary source
        aiProjectPath = kiroSpecsPath;
        const kiroConfigContent = await fs.readFile(kiroConfigPath, 'utf-8');
        config = JSON.parse(kiroConfigContent);
      } else {
        aiProjectPath = internalProjectPath;
      }
    } else {
      aiProjectPath = internalProjectPath;
    }
  } else {
    // Check for Kiro specs first, then fallback to traditional structure
    const kiroSpecsPath = path.join(projectPath, '.kiro', 'specs', 'ai-project-manager');
    const kiroConfigPath = path.join(kiroSpecsPath, 'config.json');
    
    if (await fileExists(kiroConfigPath)) {
      // Use Kiro specs
      aiProjectPath = kiroSpecsPath;
      const configContent = await fs.readFile(kiroConfigPath, 'utf-8');
      config = JSON.parse(configContent);
    } else {
      // Fallback to traditional structure
      const directConfigPath = path.join(projectPath, 'config.json');
      const isDirectProject = await fileExists(directConfigPath);
      
      aiProjectPath = isDirectProject ? projectPath : path.join(projectPath, '.ai-project');
      const finalConfigPath = path.join(aiProjectPath, 'config.json');
      
      const configContent = await fs.readFile(finalConfigPath, 'utf-8');
      config = JSON.parse(configContent);
    }
  }

  // Load documents
  const requirementsPath = path.join(aiProjectPath, 'requirements.md');
  const designPath = path.join(aiProjectPath, 'design.md');
  const tasksPath = path.join(aiProjectPath, 'tasks.md');

  const documents = {
    requirements: await safeReadFile(requirementsPath),
    design: await safeReadFile(designPath),
    tasks: await safeReadFile(tasksPath)
  };

  // Load progress
  const progressPath = path.join(aiProjectPath, 'progress.json');
  let progress: ProgressData;
  
  try {
    const progressContent = await fs.readFile(progressPath, 'utf-8');
    const progressData = JSON.parse(progressContent);
    progress = {
      ...progressData,
      lastUpdated: new Date(progressData.lastUpdated),
      recentActivity: progressData.recentActivity.map((activity: any) => ({
        ...activity,
        completedAt: new Date(activity.completedAt)
      }))
    };
  } catch {
    // Create default progress if file doesn't exist
    progress = {
      totalTasks: 0,
      completedTasks: 0,
      percentage: 0,
      lastUpdated: new Date(),
      recentActivity: [],
      milestones: []
    };
  }

  // Load context documents
  // For context documents, always use the original project path if available
  let contextProjectPath = aiProjectPath;
  if (config.originalPath) {
    contextProjectPath = path.join(config.originalPath, '.ai-project');
  }
  
  const contextDir = path.join(contextProjectPath, 'context');
  const contextDocs: ContextDocument[] = [];
  
  try {
    if (await directoryExists(contextDir)) {
      const contextFiles = await fs.readdir(contextDir);
      
      for (const filename of contextFiles) {
        // Skip deleted files and backup files
        if (filename.includes('.deleted.') || filename.includes('.backup.')) {
          continue;
        }
        
        if (filename.endsWith('.md') || filename.endsWith('.txt')) {
          try {
            const filePath = path.join(contextDir, filename);
            const content = await fs.readFile(filePath, 'utf-8');
            const stats = await fs.stat(filePath);
            
            // Parse front matter for markdown files
            let title = filename.replace(/\.(md|txt)$/, '');
            let actualContent = content;
            let metadata: any = {};
            
            if (filename.endsWith('.md')) {
              const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
              if (frontMatterMatch) {
                try {
                  const frontMatter = frontMatterMatch[1];
                  actualContent = frontMatterMatch[2];
                  
                  // Parse front matter
                  const lines = frontMatter.split('\n');
                  for (const line of lines) {
                    const [key, ...valueParts] = line.split(':');
                    if (key && valueParts.length > 0) {
                      const value = valueParts.join(':').trim();
                      if (key.trim() === 'title') {
                        title = value;
                        metadata.title = value;
                      } else if (key.trim() === 'category') {
                        metadata.category = value;
                      } else if (key.trim() === 'tags') {
                        metadata.tags = value.split(',').map(t => t.trim()).filter(Boolean);
                      } else if (key.trim() === 'id') {
                        metadata.id = value;
                      }
                    }
                  }
                } catch (error) {
                  console.warn(`Failed to parse front matter for ${filename}:`, error);
                }
              }
            }
            
            contextDocs.push({
              id: metadata.id || filename,
              filename,
              title: title,
              content: actualContent,
              tags: metadata.tags || [],
              category: metadata.category || 'other',
              lastModified: stats.mtime
            });
          } catch (error) {
            console.warn(`Failed to load context document ${filename}:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.warn('Failed to load context documents:', error);
  }

  return {
    projectId,
    projectPath,
    documents,
    progress,
    contextDocs
  };
}

async function safeReadFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return '';
  }
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