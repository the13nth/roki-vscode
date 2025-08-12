import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { ContextDocument } from '@/types';
import { ContextSelectionEngine, ContextSelectionOptions } from '@/lib/contextSelection';

// POST /api/projects/[id]/context/select - Select relevant context documents
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      currentFile,
      workContext,
      maxTokens = 8000,
      maxDocuments = 5,
      categoryPreferences
    }: ContextSelectionOptions = body;

    // Find project by ID
    const projectPath = await findProjectById(id);
    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Load all context documents
    const contextDir = path.join(projectPath, '.ai-project', 'context');
    const documents = await loadAllContextDocuments(contextDir);

    if (documents.length === 0) {
      return NextResponse.json({
        selectedDocuments: [],
        formattedContext: '',
        totalDocuments: 0,
        message: 'No context documents found'
      });
    }

    try {
      // Select relevant documents
      const selectedDocs = ContextSelectionEngine.selectRelevantContext(documents, {
        currentFile,
        workContext,
        maxTokens,
        maxDocuments,
        categoryPreferences
      });

      // Load project info for context formatting
      const projectInfo = await loadProjectInfo(projectPath);

      // Format for AI injection
      const formattedContext = ContextSelectionEngine.formatContextForAI(
        selectedDocs,
        projectInfo
      );

      // Update usage tracking (for future relevance improvements)
      if (selectedDocs.length > 0) {
        await ContextSelectionEngine.updateUsageTracking(
          projectPath,
          selectedDocs.map(doc => doc.id)
        );
      }

      return NextResponse.json({
        selectedDocuments: selectedDocs,
        formattedContext,
        totalDocuments: documents.length,
        selectionCriteria: {
          currentFile,
          workContext,
          maxTokens,
          maxDocuments
        }
      });
    } catch (selectionError) {
      console.error('Error in context selection:', selectionError);
      
      // Fallback: return all documents
      return NextResponse.json({
        selectedDocuments: documents.map(doc => ({ ...doc, relevanceScore: 0.5, scoreBreakdown: {} })),
        formattedContext: `# Project Context\n\n${documents.map(doc => `## ${doc.title}\n${doc.content}`).join('\n\n')}`,
        totalDocuments: documents.length,
        error: 'Used fallback selection due to error',
        selectionCriteria: {
          currentFile,
          workContext,
          maxTokens,
          maxDocuments
        }
      });
    }

  } catch (error) {
    console.error('Failed to select context documents:', error);
    return NextResponse.json(
      { error: 'Failed to select context documents' },
      { status: 500 }
    );
  }
}

// Helper function to load all context documents
async function loadAllContextDocuments(contextDir: string): Promise<ContextDocument[]> {
  const documents: ContextDocument[] = [];
  
  try {
    await fs.mkdir(contextDir, { recursive: true });
    const files = await fs.readdir(contextDir);
    
    for (const file of files) {
      if (file.endsWith('.md') || file.endsWith('.json')) {
        try {
          const filePath = path.join(contextDir, file);
          const stats = await fs.stat(filePath);
          const content = await fs.readFile(filePath, 'utf-8');
          
          // Parse metadata from front matter or JSON
          let metadata: Partial<ContextDocument> = {};
          let actualContent = content;
          
          if (file.endsWith('.json')) {
            try {
              const parsed = JSON.parse(content);
              metadata = parsed.metadata || {};
              actualContent = parsed.content || '';
            } catch {
              // If JSON parsing fails, treat as plain text
            }
          } else {
            // Parse front matter for markdown files
            const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
            if (frontMatterMatch) {
              try {
                const frontMatter = frontMatterMatch[1];
                actualContent = frontMatterMatch[2];
                
                // Simple YAML-like parsing for front matter
                const lines = frontMatter.split('\n');
                for (const line of lines) {
                  const [key, ...valueParts] = line.split(':');
                  if (key && valueParts.length > 0) {
                    const value = valueParts.join(':').trim();
                    if (key.trim() === 'tags') {
                      metadata.tags = value.split(',').map(t => t.trim()).filter(Boolean);
                    } else if (key.trim() === 'category') {
                      metadata.category = value as any;
                    } else if (key.trim() === 'title') {
                      metadata.title = value;
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
          
          const doc: ContextDocument = {
            id: metadata.id || file.replace(/\.(md|json)$/, ''),
            filename: file,
            title: metadata.title || file.replace(/\.(md|json)$/, ''),
            content: actualContent,
            tags: metadata.tags || [],
            category: metadata.category || 'other',
            lastModified: stats.mtime,
            relevanceScore: metadata.relevanceScore
          };
          
          documents.push(doc);
        } catch (error) {
          console.warn(`Failed to read context document ${file}:`, error);
        }
      }
    }
  } catch (error) {
    console.warn('Failed to read context directory:', error);
  }

  return documents;
}

// Helper function to load project info
async function loadProjectInfo(projectPath: string): Promise<{ name: string; description?: string } | undefined> {
  try {
    const configPath = path.join(projectPath, '.ai-project', 'config.json');
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    
    return {
      name: config.name || path.basename(projectPath),
      description: config.description
    };
  } catch (error) {
    console.warn('Failed to load project info:', error);
    return {
      name: path.basename(projectPath)
    };
  }
}

// Helper function to find project by ID (reused from other routes)
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
  
  // Skip system directories entirely
  if (dirPath.startsWith('/tmp/systemd-private') || 
      dirPath.startsWith('/tmp/snap-private') ||
      dirPath.startsWith('/var/lib') ||
      dirPath.startsWith('/sys')) {
    return null;
  }

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      const fullPath = path.join(dirPath, entry.name);
      
      // Skip hidden directories and common non-project directories
      if (entry.name.startsWith('.') && entry.name !== '.ai-project') continue;
      if (['node_modules', 'dist', 'build', '.git'].includes(entry.name)) continue;
      
      // Skip system directories
      if (['systemd-private', 'snap-private-tmp', 'snap-private'].some(skip => entry.name.includes(skip))) continue;
      
      // Check if this directory contains .ai-project with matching ID
      const aiProjectPath = path.join(fullPath, '.ai-project');
      if (await directoryExists(aiProjectPath)) {
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
    // Only log errors for user directories, not system directories
    if (!dirPath.startsWith('/tmp') && !dirPath.startsWith('/var') && !dirPath.startsWith('/sys')) {
      console.warn(`Cannot read directory ${dirPath}:`, error);
    }
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
