import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { ContextDocument } from '@/types';
import { PineconeSyncServiceInstance } from '@/lib/pineconeSyncService';

// GET /api/projects/[id]/context/[docId] - Get specific context document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id, docId } = await params;

    // Find project by ID
    const projectPath = await findProjectById(id);
    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const contextDir = path.join(projectPath, '.ai-project', 'context');
    const contextDoc = await findContextDocumentById(contextDir, docId);
    
    if (!contextDoc) {
      return NextResponse.json(
        { error: 'Context document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ contextDoc });
  } catch (error) {
    console.error('Failed to get context document:', error);
    return NextResponse.json(
      { error: 'Failed to load context document' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/context/[docId] - Update context document
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id, docId } = await params;
    const { title, content, tags, category, url } = await request.json();

    // Validate required fields
    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
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

    const contextDir = path.join(projectPath, '.ai-project', 'context');
    const existingDoc = await findContextDocumentById(contextDir, docId);
    
    if (!existingDoc) {
      return NextResponse.json(
        { error: 'Context document not found' },
        { status: 404 }
      );
    }

    const filePath = path.join(contextDir, existingDoc.filename);

    // Create backup before updating
    const backupPath = `${filePath}.backup.${Date.now()}`;
    try {
      await fs.copyFile(filePath, backupPath);
    } catch (error) {
      console.warn('Failed to create backup:', error);
    }

    // Update document with front matter
    const frontMatterLines = [
      '---',
      `id: ${docId}`,
      `title: ${title}`,
      `category: ${category || 'other'}`,
      `tags: ${(tags || []).join(', ')}`
    ];
    
    if (url) {
      frontMatterLines.push(`url: ${url}`);
    }
    
    frontMatterLines.push('---', '', content);
    const frontMatter = frontMatterLines.join('\n');

    await fs.writeFile(filePath, frontMatter, 'utf-8');

    const updatedDoc: ContextDocument = {
      id: docId,
      filename: existingDoc.filename,
      title,
      content,
      tags: tags || [],
      category: category || 'other',
      lastModified: new Date(),
      url: url || undefined
    };

    // Auto-embed the updated document to Pinecone
    try {
      const embedResult = await PineconeSyncServiceInstance.embedSingleContextDocument(id, updatedDoc);
      if (embedResult.success) {
        console.log(`Auto-embedded updated context document: ${updatedDoc.title}`);
      } else {
        console.warn(`Failed to auto-embed updated context document: ${embedResult.message}`);
      }
    } catch (error) {
      console.warn('Failed to auto-embed updated context document:', error);
      // Continue without failing the document update
    }

    return NextResponse.json({ contextDoc: updatedDoc });
  } catch (error) {
    console.error('Failed to update context document:', error);
    return NextResponse.json(
      { error: 'Failed to update context document' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/context/[docId] - Delete context document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id, docId } = await params;

    // Find project by ID
    const projectPath = await findProjectById(id);
    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const contextDir = path.join(projectPath, '.ai-project', 'context');
    const existingDoc = await findContextDocumentById(contextDir, docId);
    
    if (!existingDoc) {
      return NextResponse.json(
        { error: 'Context document not found' },
        { status: 404 }
      );
    }

    const filePath = path.join(contextDir, existingDoc.filename);

    // Create backup before deleting
    const backupPath = `${filePath}.deleted.${Date.now()}`;
    try {
      await fs.copyFile(filePath, backupPath);
    } catch (error) {
      console.warn('Failed to create backup before deletion:', error);
    }

    // Delete the file
    await fs.unlink(filePath);

    // Delete from Pinecone vector database
    try {
      const deleteResult = await PineconeSyncServiceInstance.deleteContextDocument(id, docId);
      if (deleteResult.success) {
        console.log(`Deleted context document from Pinecone: ${existingDoc.title}`);
      } else {
        console.warn(`Failed to delete context document from Pinecone: ${deleteResult.message}`);
      }
    } catch (error) {
      console.warn('Failed to delete context document from Pinecone:', error);
      // Continue without failing the document deletion
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete context document:', error);
    return NextResponse.json(
      { error: 'Failed to delete context document' },
      { status: 500 }
    );
  }
}

// Helper function to find a context document by ID
async function findContextDocumentById(contextDir: string, docId: string): Promise<ContextDocument | null> {
  try {
    const files = await fs.readdir(contextDir);
    
    for (const file of files) {
      if (file.endsWith('.md') || file.endsWith('.json')) {
        try {
          const filePath = path.join(contextDir, file);
          const stats = await fs.stat(filePath);
          const content = await fs.readFile(filePath, 'utf-8');
          
          // Try to parse metadata from front matter or JSON
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
          
          // Check if this is the document we're looking for
          if (metadata.id === docId) {
            return {
              id: metadata.id || docId,
              filename: file,
              title: metadata.title || file.replace(/\.(md|json)$/, ''),
              content: actualContent,
              tags: metadata.tags || [],
              category: metadata.category || 'other',
              lastModified: stats.mtime,
              relevanceScore: metadata.relevanceScore
            };
          }
        } catch (error) {
          console.warn(`Failed to read context document ${file}:`, error);
        }
      }
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to search for context document:', error);
    return null;
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