import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { auth } from '@clerk/nextjs/server';

// Helper functions
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

async function findProjectById(projectId: string): Promise<string | null> {
  const internalProjectsPath = path.join(process.cwd(), '.ai-project', 'projects', projectId);
  
  if (await directoryExists(internalProjectsPath)) {
    return internalProjectsPath;
  }
  
  return null;
}

async function resolveProjectBaseDir(id: string, projectPath: string): Promise<string | null> {
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

  return baseDir;
}

interface Requirement {
  number: number;
  title: string;
  userStory: string;
}

function parseRequirements(content: string): Requirement[] {
  const requirements: Requirement[] = [];
  
  // Split content into sections by requirement headers
  const sections = content.split(/### Requirement (\d+)/);
  
  // Skip the first section (before any requirements)
  for (let i = 1; i < sections.length; i += 2) {
    const number = parseInt(sections[i], 10);
    const sectionContent = sections[i + 1];
    
    if (!sectionContent) continue;
    
    // Look for user story in this section - more flexible regex
    const userStoryMatch = sectionContent.match(/\*\*User Story:\*\*\s*(.+?)(?:\n\n|#### |$)/s);
    
    if (userStoryMatch) {
      const userStory = userStoryMatch[1].trim();
      
      // Extract a title from the user story (the action part)
      let title = userStory;
      
      // Extract the "I want to..." part
      const wantMatch = userStory.match(/I want to (.+?)(?:,| so that)/);
      if (wantMatch) {
        title = wantMatch[1].trim();
      } else {
        // Fallback: use the part before "so that" or comma
        if (userStory.includes(' so that ')) {
          title = userStory.split(' so that ')[0];
        } else if (userStory.includes(',')) {
          title = userStory.split(',')[0];
        }
        title = title.replace(/^As a .+?, I want to /, '').trim();
      }
      
      // Clean up title
      if (title.length > 60) {
        title = title.substring(0, 57) + '...';
      }
      
      requirements.push({
        number,
        title,
        userStory
      });
    } else {
      // If no user story found, try to extract title from the section
      const lines = sectionContent.split('\n').filter(line => line.trim());
      const firstLine = lines[0]?.trim() || `Requirement ${number}`;
      
      requirements.push({
        number,
        title: firstLine.length > 60 ? firstLine.substring(0, 57) + '...' : firstLine,
        userStory: firstLine
      });
    }
  }
  
  return requirements.sort((a, b) => a.number - b.number);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const projectPath = await findProjectById(id);
    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const baseDir = await resolveProjectBaseDir(id, projectPath);
    if (!baseDir) {
      return NextResponse.json({ error: 'Project structure not found' }, { status: 404 });
    }

    const requirementsFilePath = path.join(baseDir, 'requirements.md');
    
    try {
      const requirementsContent = await fs.readFile(requirementsFilePath, 'utf-8');
      const requirements = parseRequirements(requirementsContent);
      
      return NextResponse.json({
        success: true,
        requirements
      });
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return NextResponse.json({
          success: true,
          requirements: []
        });
      } else {
        return NextResponse.json(
          { error: 'Failed to read requirements file' },
          { status: 500 }
        );
      }
    }

  } catch (error) {
    console.error('Error listing requirements:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list requirements' },
      { status: 500 }
    );
  }
}