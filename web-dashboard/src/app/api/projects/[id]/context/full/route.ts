import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface ProjectContext {
  projectId: string;
  projectPath: string;
  requirements?: string;
  design?: string;
  tasks?: string;
  progress: {
    completedTasks: number;
    totalTasks: number;
    percentage: number;
    lastUpdated: string;
    recentActivity: any[];
  };
  contextDocs: any[];
}

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

  // Fallback to directory scanning for existing projects
  const searchPaths = [
    process.cwd(),
    path.join(process.cwd(), '..'),
    path.join(process.cwd(), '..', '..'),
    '/home/rwbts/Documents/roki'
  ];

  for (const basePath of searchPaths) {
    try {
      const found = await scanForProjectById(basePath, projectId);
      if (found) {
        return found;
      }
    } catch (error) {
      console.warn(`Error scanning ${basePath}:`, error);
    }
  }

  return null;
}

async function scanForProjectById(
  basePath: string, 
  projectId: string, 
  maxDepth: number = 3
): Promise<string | null> {
  try {
    return await scanDirectoryForProject(basePath, projectId, 0, maxDepth);
  } catch (error) {
    console.warn(`Error scanning ${basePath}:`, error);
    return null;
  }
}

async function scanDirectoryForProject(
  dirPath: string,
  projectId: string,
  currentDepth: number,
  maxDepth: number
): Promise<string | null> {
  if (currentDepth > maxDepth) {
    return null;
  }

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Check if this directory contains the project
        if (entry.name === projectId) {
          // Check if it has .ai-project or .kiro structure
          const hasAiProject = await directoryExists(path.join(fullPath, '.ai-project'));
          const hasKiro = await directoryExists(path.join(fullPath, '.kiro'));
          
          if (hasAiProject || hasKiro) {
            return fullPath;
          }
        }
        
        // Recursively search subdirectories
        const found = await scanDirectoryForProject(fullPath, projectId, currentDepth + 1, maxDepth);
        if (found) {
          return found;
        }
      }
    }
  } catch (error) {
    console.warn(`Error reading directory ${dirPath}:`, error);
  }

  return null;
}

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

async function readFileSafe(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    console.warn(`Failed to read file ${filePath}:`, error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    
    // Find project by ID
    const projectPath = await findProjectById(projectId);
    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const context: ProjectContext = {
      projectId,
      projectPath,
      progress: {
        completedTasks: 0,
        totalTasks: 0,
        percentage: 0,
        lastUpdated: new Date().toISOString(),
        recentActivity: []
      },
      contextDocs: []
    };

    // Try to load specs from .kiro/specs/ai-project-manager first
    const kiroSpecsPath = path.join(projectPath, '.kiro', 'specs', 'ai-project-manager');
    if (await directoryExists(kiroSpecsPath)) {
      console.log('Loading specs from .kiro directory:', kiroSpecsPath);
      
      // Load requirements
      const requirementsPath = path.join(kiroSpecsPath, 'requirements.md');
      if (await fileExists(requirementsPath)) {
        const content = await readFileSafe(requirementsPath);
        if (content) {
          context.requirements = content;
        }
      }

      // Load design
      const designPath = path.join(kiroSpecsPath, 'design.md');
      if (await fileExists(designPath)) {
        const content = await readFileSafe(designPath);
        if (content) {
          context.design = content;
        }
      }

      // Load tasks
      const tasksPath = path.join(kiroSpecsPath, 'tasks.md');
      if (await fileExists(tasksPath)) {
        const content = await readFileSafe(tasksPath);
        if (content) {
          context.tasks = content;
        }
      }
    }

    // If no specs found in .kiro, try .ai-project
    if (!context.requirements && !context.design && !context.tasks) {
      const aiProjectPath = path.join(projectPath, '.ai-project');
      if (await directoryExists(aiProjectPath)) {
        console.log('Loading specs from .ai-project directory:', aiProjectPath);
        
        // Load requirements
        const requirementsPath = path.join(aiProjectPath, 'requirements.md');
        if (await fileExists(requirementsPath)) {
          const content = await readFileSafe(requirementsPath);
          if (content) {
            context.requirements = content;
          }
        }

        // Load design
        const designPath = path.join(aiProjectPath, 'design.md');
        if (await fileExists(designPath)) {
          const content = await readFileSafe(designPath);
          if (content) {
            context.design = content;
          }
        }

        // Load tasks
        const tasksPath = path.join(aiProjectPath, 'tasks.md');
        if (await fileExists(tasksPath)) {
          const content = await readFileSafe(tasksPath);
          if (content) {
            context.tasks = content;
          }
        }
      }
    }

    // Load progress data
    const progressPath = path.join(projectPath, '.ai-project', 'progress.json');
    if (await fileExists(progressPath)) {
      try {
        const progressData = JSON.parse(await fs.readFile(progressPath, 'utf-8'));
        context.progress = {
          completedTasks: progressData.completedTasks || 0,
          totalTasks: progressData.totalTasks || 0,
          percentage: progressData.percentage || 0,
          lastUpdated: progressData.lastUpdated || new Date().toISOString(),
          recentActivity: progressData.recentActivity || []
        };
      } catch (error) {
        console.warn('Failed to parse progress data:', error);
      }
    }

    // Load context documents
    const contextDir = path.join(projectPath, '.ai-project', 'context');
    if (await directoryExists(contextDir)) {
      try {
        const files = await fs.readdir(contextDir);
        for (const file of files) {
          if (file.endsWith('.md') || file.endsWith('.json')) {
            const filePath = path.join(contextDir, file);
            const stats = await fs.stat(filePath);
            const content = await fs.readFile(filePath, 'utf-8');
            
            // Parse front matter for markdown files to get proper title and metadata
            let title = file.replace(/\.(md|json)$/, '');
            let actualContent = content;
            let metadata: any = {};
            
            if (file.endsWith('.md')) {
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
                  console.warn(`Failed to parse front matter for ${file}:`, error);
                }
              }
            }
            
            context.contextDocs.push({
              id: metadata.id || file,
              name: title,
              description: `Context document: ${title}`,
              content: actualContent,
              lastModified: stats.mtime,
              category: metadata.category || 'other',
              tags: metadata.tags || []
            });
          }
        }
      } catch (error) {
        console.warn('Failed to load context documents:', error);
      }
    }

    console.log('Loaded project context:', {
      projectId,
      projectPath,
      hasRequirements: !!context.requirements,
      hasDesign: !!context.design,
      hasTasks: !!context.tasks,
      contextDocsCount: context.contextDocs.length
    });

    return NextResponse.json(context);
  } catch (error) {
    console.error('Failed to load project context:', error);
    return NextResponse.json(
      { error: 'Failed to load project context' },
      { status: 500 }
    );
  }
}
