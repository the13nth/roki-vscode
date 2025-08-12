import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

interface ScanRequest {
  folderPath: string;
  folderName: string;
}

interface ProjectStructure {
  hasAiProject: boolean;
  hasKiroProject: boolean;
  aiProjectPath?: string;
  kiroProjectPath?: string;
  projectType: 'ai-project' | 'kiro' | 'none';
}

function scanForProjects(basePath: string): ProjectStructure {
  const result: ProjectStructure = {
    hasAiProject: false,
    hasKiroProject: false,
    projectType: 'none'
  };

  try {
    // Check for .ai-project directory
    const aiProjectPath = path.join(basePath, '.ai-project');
    if (fs.existsSync(aiProjectPath) && fs.statSync(aiProjectPath).isDirectory()) {
      // Verify it has config.json
      const configPath = path.join(aiProjectPath, 'config.json');
      if (fs.existsSync(configPath)) {
        result.hasAiProject = true;
        result.aiProjectPath = aiProjectPath;
        result.projectType = 'ai-project';
      }
    }

    // Check for .kiro directory with ai-project-manager specs
    const kiroPath = path.join(basePath, '.kiro');
    if (fs.existsSync(kiroPath) && fs.statSync(kiroPath).isDirectory()) {
      const specsPath = path.join(kiroPath, 'specs', 'ai-project-manager');
      if (fs.existsSync(specsPath) && fs.statSync(specsPath).isDirectory()) {
        result.hasKiroProject = true;
        result.kiroProjectPath = specsPath;
        if (result.projectType === 'none') {
          result.projectType = 'kiro';
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Error scanning folder:', error);
    return result;
  }
}

function generateProjectId(basePath: string): string {
  const folderName = path.basename(basePath);
  return folderName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

async function createProjectFromFolder(basePath: string, folderName: string, structure: ProjectStructure) {
  const projectId = generateProjectId(basePath);
  
  // Create project directory in our system
  const projectPath = path.join(process.cwd(), '.ai-project', 'projects', projectId);
  
  try {
    // Ensure project directory exists
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    }

    // Create project configuration that references the original location
    const config = {
      projectId,
      name: folderName,
      description: `Project from ${basePath}`,
      template: structure.projectType === 'kiro' ? 'kiro' : 'default',
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      aiModel: 'gpt-4',
      originalPath: basePath, // Store the original path
      projectType: structure.projectType,
      contextPreferences: {
        maxContextSize: 8000,
        prioritizeRecent: true,
        includeProgress: true
      }
    };

    const configPath = path.join(projectPath, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Create symbolic links to the original project files instead of copying
    if (structure.hasAiProject && structure.aiProjectPath) {
      // Create symbolic links to existing .ai-project directory files
      const filesToLink = ['requirements.md', 'design.md', 'tasks.md', 'progress.json'];
      
      for (const file of filesToLink) {
        const sourcePath = path.join(structure.aiProjectPath, file);
        const destPath = path.join(projectPath, file);
        
        if (fs.existsSync(sourcePath)) {
          // Create symbolic link instead of copying
          try {
            fs.symlinkSync(sourcePath, destPath);
          } catch (error) {
            // Fallback to copying if symlink fails (e.g., on Windows)
            fs.copyFileSync(sourcePath, destPath);
          }
        } else {
          // Create default file if it doesn't exist
          createDefaultFile(destPath, file);
        }
      }

      // Copy context directory if it exists
      const sourceContextDir = path.join(structure.aiProjectPath, 'context');
      const destContextDir = path.join(projectPath, 'context');
      
      if (fs.existsSync(sourceContextDir)) {
        copyDirectory(sourceContextDir, destContextDir);
      } else {
        fs.mkdirSync(destContextDir, { recursive: true });
      }
    } else if (structure.hasKiroProject && structure.kiroProjectPath) {
      // Handle Kiro project structure
      const kiroBasePath = path.dirname(path.dirname(structure.kiroProjectPath)); // Go up from specs/ai-project-manager to .kiro
      
      // Look for project files in the Kiro structure
      const filesToCheck = [
        { source: path.join(kiroBasePath, 'specs', 'ai-project-manager', 'requirements.md'), dest: 'requirements.md' },
        { source: path.join(kiroBasePath, 'specs', 'ai-project-manager', 'design.md'), dest: 'design.md' },
        { source: path.join(kiroBasePath, 'specs', 'ai-project-manager', 'tasks.md'), dest: 'tasks.md' },
        { source: path.join(kiroBasePath, 'specs', 'ai-project-manager', 'progress.json'), dest: 'progress.json' }
      ];

      for (const file of filesToCheck) {
        const destPath = path.join(projectPath, file.dest);
        
        if (fs.existsSync(file.source)) {
          fs.copyFileSync(file.source, destPath);
        } else {
          createDefaultFile(destPath, file.dest);
        }
      }

      // Create context directory
      const contextDir = path.join(projectPath, 'context');
      fs.mkdirSync(contextDir, { recursive: true });
    } else {
      // Create default project structure
      createDefaultProjectStructure(projectPath);
    }

    return { projectId, projectPath, config };
  } catch (error) {
    // Clean up on error
    if (fs.existsSync(projectPath)) {
      fs.rmSync(projectPath, { recursive: true, force: true });
    }
    throw error;
  }
}

function createDefaultFile(filePath: string, fileName: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let content = '';
  
  switch (fileName) {
    case 'requirements.md':
      content = '# Requirements Document\n\n## Introduction\n\nThis project was imported from an existing folder.\n\n## Requirements\n\n- [ ] Define project requirements\n';
      break;
    case 'design.md':
      content = '# Design Document\n\n## Overview\n\nThis project was imported from an existing folder.\n\n## Architecture\n\n- System design to be documented\n';
      break;
    case 'tasks.md':
      content = '# Implementation Plan\n\n- [ ] Set up project structure\n- [ ] Define requirements\n- [ ] Create design documentation\n- [ ] Implement core features\n';
      break;
    case 'progress.json':
      content = JSON.stringify({
        totalTasks: 0,
        completedTasks: 0,
        percentage: 0,
        lastUpdated: new Date().toISOString(),
        recentActivity: [],
        milestones: []
      }, null, 2);
      break;
  }

  fs.writeFileSync(filePath, content);
}

function createDefaultProjectStructure(projectPath: string) {
  const files = ['requirements.md', 'design.md', 'tasks.md', 'progress.json'];
  
  for (const file of files) {
    createDefaultFile(path.join(projectPath, file), file);
  }

  // Create context directory
  const contextDir = path.join(projectPath, 'context');
  fs.mkdirSync(contextDir, { recursive: true });
}

function copyDirectory(source: string, destination: string) {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  const items = fs.readdirSync(source);
  
  for (const item of items) {
    const sourcePath = path.join(source, item);
    const destPath = path.join(destination, item);
    
    if (fs.statSync(sourcePath).isDirectory()) {
      copyDirectory(sourcePath, destPath);
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
  }
}

// POST /api/projects/scan - Scan folder for existing projects
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: ScanRequest = await request.json();
    const { folderPath, folderName } = body;

    if (!folderPath || !folderName) {
      return NextResponse.json(
        { error: 'Folder path and name are required' },
        { status: 400 }
      );
    }

    // Validate that the folder exists
    if (!fs.existsSync(folderPath)) {
      return NextResponse.json(
        { error: 'Folder does not exist' },
        { status: 404 }
      );
    }

    if (!fs.statSync(folderPath).isDirectory()) {
      return NextResponse.json(
        { error: 'Path is not a directory' },
        { status: 400 }
      );
    }

    // Scan for project structures
    const structure = scanForProjects(folderPath);

    if (structure.projectType === 'none') {
      return NextResponse.json(
        { 
          error: 'No AI project or Kiro project structure found in the specified folder',
          message: 'Looking for .ai-project/ directory or .kiro/specs/ai-project-manager/ structure'
        },
        { status: 404 }
      );
    }

    // Create project from the scanned folder
    const project = await createProjectFromFolder(folderPath, folderName, structure);

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${structure.projectType} project`,
      project: {
        id: project.projectId,
        name: project.config.name,
        type: structure.projectType,
        path: project.projectPath,
        sourceFolder: folderPath
      }
    });

  } catch (error) {
    console.error('Error scanning folder:', error);
    return NextResponse.json(
      { 
        error: 'Failed to scan folder',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

