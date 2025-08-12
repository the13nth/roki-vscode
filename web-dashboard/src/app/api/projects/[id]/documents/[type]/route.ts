import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { globalFileWatcher } from '@/lib/fileWatcher';
import { globalConflictResolver } from '@/lib/conflictResolution';
import { pineconeSyncService } from '@/lib/pineconeSyncService';

// GET /api/projects/[id]/documents/[type] - Get document content
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; type: string }> }
) {
  try {
    const { id, type } = await params;
    
    // Validate document type
    if (!['requirements', 'design', 'tasks'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid document type' },
        { status: 400 }
      );
    }

    // Find project by ID
    const projectPath = await findProjectById(id);
    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Resolve the correct base directory for this project's documents.
    // Order of preference:
    // 1) Internal imported project at .ai-project/projects/[id]
    // 2) Direct project (files at root)
    // 3) .ai-project subfolder
    // 4) .kiro/specs/ai-project-manager subfolder
    const internalProjectPath = path.join(process.cwd(), '.ai-project', 'projects', id);
    const internalConfigPath = path.join(internalProjectPath, 'config.json');

    let baseDir: string | null = null;

    if (await fileExists(internalConfigPath)) {
      // Prefer Kiro specs if available, then originalPath, then internal
      baseDir = internalProjectPath;
      try {
        const internalConfig = JSON.parse(await fs.readFile(internalConfigPath, 'utf-8')) as any;
        const originalPath: string | undefined = internalConfig.originalPath;
        if (originalPath) {
          const kiroDir = path.join(originalPath, '.kiro', 'specs', 'ai-project-manager');
          const aiProjectDir = path.join(originalPath, '.ai-project');
          if (await directoryExists(kiroDir)) baseDir = kiroDir;
          else if (await directoryExists(aiProjectDir)) baseDir = aiProjectDir;
        }
      } catch {}
    }

    if (!baseDir) {
      const kiroDir = path.join(projectPath, '.kiro', 'specs', 'ai-project-manager');
      const directConfigPath = path.join(projectPath, 'config.json');
      const aiProjectDir = path.join(projectPath, '.ai-project');
      if (await directoryExists(kiroDir)) baseDir = kiroDir;
      else if (await fileExists(directConfigPath)) baseDir = projectPath;
      else if (await directoryExists(aiProjectDir)) baseDir = aiProjectDir;
    }

    // Final fallback: internal imported path if it exists
    if (!baseDir && await fileExists(internalConfigPath)) {
      baseDir = internalProjectPath;
    }

    if (!baseDir) {
      return NextResponse.json({ error: 'Project structure not found' }, { status: 404 });
    }

    const documentPath = path.join(baseDir, `${type}.md`);
    
    try {
      const content = await fs.readFile(documentPath, 'utf-8');
      return NextResponse.json({ content });
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return NextResponse.json({ content: '' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Failed to get document:', error);
    return NextResponse.json(
      { error: 'Failed to load document' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/documents/[type] - Save document content with conflict detection
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; type: string }> }
) {
  try {
    const { id, type } = await params;
    const { content, lastKnownTimestamp } = await request.json();
    
    // Validate document type
    if (!['requirements', 'design', 'tasks'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid document type' },
        { status: 400 }
      );
    }

    // Validate content
    if (typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content must be a string' },
        { status: 400 }
      );
    }

    // Find project by ID
    const projectPath = await findProjectById(id);
    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Resolve the correct base directory for saving the document
    const internalProjectPath = path.join(process.cwd(), '.ai-project', 'projects', id);
    const internalConfigPath = path.join(internalProjectPath, 'config.json');

    let baseDir: string | null = null;
    if (await fileExists(internalConfigPath)) {
      baseDir = internalProjectPath;
      try {
        const internalConfig = JSON.parse(await fs.readFile(internalConfigPath, 'utf-8')) as any;
        const originalPath: string | undefined = internalConfig.originalPath;
        if (originalPath) {
          const kiroDir = path.join(originalPath, '.kiro', 'specs', 'ai-project-manager');
          const aiProjectDir = path.join(originalPath, '.ai-project');
          if (await directoryExists(kiroDir)) baseDir = kiroDir;
          else if (await directoryExists(aiProjectDir)) baseDir = aiProjectDir;
        }
      } catch {}
    }

    if (!baseDir) {
      const kiroDir = path.join(projectPath, '.kiro', 'specs', 'ai-project-manager');
      const directConfigPath = path.join(projectPath, 'config.json');
      const aiProjectDir = path.join(projectPath, '.ai-project');
      if (await directoryExists(kiroDir)) baseDir = kiroDir;
      else if (await fileExists(directConfigPath)) baseDir = projectPath;
      else if (await directoryExists(aiProjectDir)) baseDir = aiProjectDir;
    }

    if (!baseDir && await fileExists(internalConfigPath)) {
      baseDir = internalProjectPath;
    }

    if (!baseDir) {
      return NextResponse.json({ error: 'Project structure not found' }, { status: 404 });
    }

    const documentPath = path.join(baseDir, `${type}.md`);
    
    // Check for conflicts before saving
    const lastKnownDate = lastKnownTimestamp ? new Date(lastKnownTimestamp) : undefined;
    const conflict = await globalConflictResolver.detectConflict(
      documentPath,
      content,
      lastKnownDate
    );

    if (conflict) {
      // Conflict detected - return conflict information
      return NextResponse.json({
        conflict: true,
        conflictId: conflict.id,
        conflictType: conflict.conflictType,
        description: conflict.description,
        localContent: conflict.localContent,
        remoteContent: conflict.remoteContent,
        baseContent: conflict.baseContent,
        timestamp: conflict.remoteTimestamp
      }, { status: 409 }); // HTTP 409 Conflict
    }

    // No conflict - proceed with save
    try {
      // Create backup using conflict resolver
      await globalConflictResolver.createBackup(documentPath);
    } catch (error) {
      console.warn('Failed to create backup:', error);
      // Continue with save even if backup fails
    }

    // Write new content atomically
    const tempPath = `${documentPath}.tmp.${Date.now()}`;
    try {
      await fs.writeFile(tempPath, content, 'utf-8');
      await fs.rename(tempPath, documentPath);
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }

    // Update project's last modified time
    // Try to update project's last modified time if a config.json is available beside the baseDir
    const possibleConfigPaths = [
      path.join(baseDir, 'config.json'),
      path.join(process.cwd(), '.ai-project', 'projects', id, 'config.json')
    ];
    for (const projectConfigPath of possibleConfigPaths) {
      try {
        if (await fileExists(projectConfigPath)) {
          const configContent = await fs.readFile(projectConfigPath, 'utf-8');
          const config = JSON.parse(configContent);
          config.lastModified = new Date().toISOString();
          await fs.writeFile(projectConfigPath, JSON.stringify(config, null, 2), 'utf-8');
          break;
        }
      } catch (error) {
        // Continue trying other possible config paths
      }
    }

    // Ensure file watcher is active for this project
    if (!globalFileWatcher.isWatching(projectPath)) {
      try {
        await globalFileWatcher.watchProject(projectPath);
        console.log(`Started file watcher for project: ${projectPath}`);
      } catch (error) {
        console.warn(`Failed to start file watcher for project ${projectPath}:`, error);
      }
    }

    // Auto-embed the updated document to Pinecone
    try {
      const embedResult = await pineconeSyncService.embedSingleMainDocument(id, type, content);
      if (embedResult.success) {
        console.log(`Auto-embedded main document: ${type}`);
      } else {
        console.warn(`Failed to auto-embed main document: ${embedResult.message}`);
      }
    } catch (error) {
      console.warn('Failed to auto-embed main document:', error);
      // Continue without failing the document save
    }

    return NextResponse.json({ 
      success: true, 
      savedAt: new Date().toISOString(),
      conflict: false
    });
  } catch (error) {
    console.error('Failed to save document:', error);
    return NextResponse.json(
      { error: 'Failed to save document' },
      { status: 500 }
    );
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
            const config = JSON.parse(configContent);
            
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

async function cleanupBackups(dirPath: string, prefix: string): Promise<void> {
  try {
    const files = await fs.readdir(dirPath);
    const backupFiles = files
      .filter(file => file.startsWith(prefix))
      .map(file => ({
        name: file,
        path: path.join(dirPath, file),
        timestamp: parseInt(file.split('.').pop() || '0')
      }))
      .sort((a, b) => b.timestamp - a.timestamp);

    // Keep only the 5 most recent backups
    const filesToDelete = backupFiles.slice(5);
    
    for (const file of filesToDelete) {
      try {
        await fs.unlink(file.path);
      } catch (error) {
        console.warn(`Failed to delete backup file ${file.name}:`, error);
      }
    }
  } catch (error) {
    console.warn('Failed to cleanup backup files:', error);
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