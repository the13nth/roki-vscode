import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { ContextDocument } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { pineconeSyncService } from '@/lib/pineconeSyncService';

// GET /api/projects/[id]/context - Get all context documents
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const search = searchParams.get('search');

    // Find project by ID
    const projectPath = await findProjectById(id);
    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Determine context directory based on project structure
    let contextDir: string;
    const kiroContextPath = path.join(projectPath, '.kiro', 'specs', 'ai-project-manager', 'context');
    const aiProjectContextPath = path.join(projectPath, '.ai-project', 'context');
    
    // Check which structure exists and use the appropriate context directory
    if (await directoryExists(kiroContextPath)) {
      contextDir = kiroContextPath;
    } else if (await directoryExists(aiProjectContextPath)) {
      contextDir = aiProjectContextPath;
    } else {
      // Default to .ai-project structure for new context documents
      contextDir = aiProjectContextPath;
    }
    
    // Create context directory if it doesn't exist
    try {
      await fs.mkdir(contextDir, { recursive: true });
    } catch (error) {
      console.warn('Failed to create context directory:', error);
    }

    // Read all context documents
    const contextDocs: ContextDocument[] = [];
    
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
                      } else if (key.trim() === 'url') {
                        metadata.url = value;
                      }
                    }
                  }
                } catch (error) {
                  console.warn(`Failed to parse front matter for ${file}:`, error);
                }
              }
            }
            
            const doc: ContextDocument = {
              id: metadata.id || uuidv4(),
              filename: file,
              title: metadata.title || file.replace(/\.(md|json)$/, ''),
              content: actualContent,
              tags: metadata.tags || [],
              category: metadata.category || 'other',
              lastModified: stats.mtime,
              relevanceScore: metadata.relevanceScore,
              url: metadata.url || undefined
            };
            
            // Apply filters
            if (category && doc.category !== category) continue;
            if (tags && tags.length > 0 && !tags.some(tag => doc.tags.includes(tag))) continue;
            if (search && !doc.title.toLowerCase().includes(search.toLowerCase()) && 
                !doc.content.toLowerCase().includes(search.toLowerCase())) continue;
            
            contextDocs.push(doc);
          } catch (error) {
            console.warn(`Failed to read context document ${file}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to read context directory:', error);
    }

    // Sort by last modified (newest first)
    contextDocs.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

    return NextResponse.json({ contextDocs });
  } catch (error) {
    console.error('Failed to get context documents:', error);
    return NextResponse.json(
      { error: 'Failed to load context documents' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/context - Create new context document
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { title, content, tags, category, filename, url } = await request.json();

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

    // Determine context directory based on project structure
    let contextDir: string;
    const kiroContextPath = path.join(projectPath, '.kiro', 'specs', 'ai-project-manager', 'context');
    const aiProjectContextPath = path.join(projectPath, '.ai-project', 'context');
    
    // Check which structure exists and use the appropriate context directory
    if (await directoryExists(kiroContextPath)) {
      contextDir = kiroContextPath;
    } else if (await directoryExists(aiProjectContextPath)) {
      contextDir = aiProjectContextPath;
    } else {
      // Default to .ai-project structure for new context documents
      contextDir = aiProjectContextPath;
    }
    
    // Create context directory if it doesn't exist
    await fs.mkdir(contextDir, { recursive: true });

    // Generate unique filename if not provided
    let docId: string;
    let safeFilename: string;
    
    if (filename && filename.includes('.md') && filename.match(/^[a-f0-9-]{36}\.md$/)) {
      // If filename is a UUID.md format, extract the UUID as docId
      docId = filename.replace('.md', '');
      safeFilename = filename;
    } else {
      // Generate new UUID and filename
      docId = uuidv4();
      safeFilename = filename || `${title.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()}.md`;
    }
    
    const filePath = path.join(contextDir, safeFilename);

    // Check if file already exists (but allow overwrite for specific docIds)
    const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
    if (fileExists && !filename?.match(/^[a-f0-9-]{36}\.md$/)) {
      return NextResponse.json(
        { error: 'A document with this filename already exists' },
        { status: 409 }
      );
    }

    // Create document with front matter
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

    const newDoc: ContextDocument = {
      id: docId,
      filename: safeFilename,
      title,
      content,
      tags: tags || [],
      category: category || 'other',
      lastModified: new Date(),
      url: url || undefined
    };

    // Auto-embed the new document to Pinecone
    try {
      const embedResult = await pineconeSyncService.embedSingleContextDocument(id, newDoc);
      if (embedResult.success) {
        console.log(`Auto-embedded new context document: ${newDoc.title}`);
      } else {
        console.warn(`Failed to auto-embed context document: ${embedResult.message}`);
      }
    } catch (error) {
      console.warn('Failed to auto-embed context document:', error);
      // Continue without failing the document creation
    }

    return NextResponse.json({ contextDoc: newDoc }, { status: 201 });
  } catch (error) {
    console.error('Failed to create context document:', error);
    return NextResponse.json(
      { error: 'Failed to create context document' },
      { status: 500 }
    );
  }
}

// Helper function to find project by ID (reused from documents route)
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
  
  // Fallback: check the most likely location - the user's Documents folder
  const userDocumentsPath = path.join(process.env.HOME || '/home', 'Documents', projectId);
  if (await directoryExists(userDocumentsPath)) {
    const kiroPath = path.join(userDocumentsPath, '.kiro', 'specs', 'ai-project-manager');
    if (await directoryExists(kiroPath)) {
      return userDocumentsPath;
    }
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

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      const fullPath = path.join(dirPath, entry.name);
      
      // Skip hidden directories and common non-project directories
      if (entry.name.startsWith('.') && entry.name !== '.ai-project') continue;
      if (['node_modules', 'dist', 'build', '.git'].includes(entry.name)) continue;
      
      // Skip system directories that cause permission errors
      if (dirPath.startsWith('/tmp/') || dirPath.startsWith('/var/') || dirPath.startsWith('/sys/')) {
        continue;
      }
      
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