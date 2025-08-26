import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAIConfig, validateSecureConfig } from '@/lib/secureConfig';
import { ProjectService } from '@/lib/projectService';
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

interface TransitionRequirementRequest {
  requirementNumber: number;
}

interface GeneratedTask {
  title: string;
  description?: string;
  requirements: string[];
  isSubTask: boolean;
  parentTaskNumber?: string;
}

async function generateTaskFromRequirement(requirement: string, existingTasks: string, projectContext: string): Promise<GeneratedTask> {
  const configValidation = validateSecureConfig();
  if (!configValidation.isValid) {
    throw new Error(`Configuration error: ${configValidation.errors.join(', ')}`);
  }

  const config = getGoogleAIConfig();

  const prompt = `You are an expert project manager and software architect. Based on the provided requirement and existing project context, generate a detailed implementation task.

PROJECT CONTEXT:
${projectContext}

EXISTING TASKS:
${existingTasks}

REQUIREMENT TO TRANSITION:
${requirement}

Please analyze the requirement and generate a comprehensive implementation task with the following structure:

1. **Task Title**: A clear, actionable title focused on implementation (max 80 characters)
2. **Task Description**: A brief description of the implementation work needed
3. **Requirements**: 3-5 specific, technical implementation steps or deliverables
4. **Task Type**: Determine if this should be a main task or sub-task based on existing tasks

Guidelines:
- Focus on implementation rather than requirements gathering
- Make the title action-oriented (e.g., "Implement user authentication", "Build dashboard component")
- Requirements should be technical implementation steps
- Consider the existing project structure and tasks
- If this relates to an existing task, suggest it as a sub-task
- Use developer-focused language
- Focus on concrete deliverables and code changes

Respond in JSON format:
{
  "title": "Clear, actionable implementation task title",
  "description": "Brief description of the implementation work",
  "requirements": [
    "Technical implementation step 1",
    "Technical implementation step 2", 
    "Technical implementation step 3"
  ],
  "isSubTask": false,
  "parentTaskNumber": "1" // only if isSubTask is true
}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.3,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const content = result.candidates[0].content.parts[0].text;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const generatedTask: GeneratedTask = JSON.parse(jsonMatch[0]);
    
    if (!generatedTask.title || !generatedTask.requirements || !Array.isArray(generatedTask.requirements)) {
      throw new Error('Invalid task structure generated by AI');
    }

    return generatedTask;
  } catch (error) {
    console.error('AI task generation failed:', error);
    throw new Error('Failed to generate task with AI');
  }
}

function getNextTaskNumber(lines: string[], parentTaskNumber?: string, isSubTask?: boolean): string {
  const taskRegex = /^- \[[ x]\] (\d+(?:\.\d+)?)/;
  const existingNumbers: number[] = [];
  const existingSubNumbers: { [key: string]: number[] } = {};

  for (const line of lines) {
    const match = line.match(taskRegex);
    if (match) {
      const taskNum = match[1];
      if (taskNum.includes('.')) {
        const [parent, sub] = taskNum.split('.').map(Number);
        if (!existingSubNumbers[parent.toString()]) {
          existingSubNumbers[parent.toString()] = [];
        }
        existingSubNumbers[parent.toString()].push(sub);
      } else {
        existingNumbers.push(Number(taskNum));
      }
    }
  }

  if (isSubTask && parentTaskNumber) {
    const parentNum = parentTaskNumber;
    const subNumbers = existingSubNumbers[parentNum] || [];
    const nextSubNumber = subNumbers.length > 0 ? Math.max(...subNumbers) + 1 : 1;
    return `${parentNum}.${nextSubNumber}`;
  } else {
    const nextMainNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    return nextMainNumber.toString();
  }
}

function formatNewTask(taskNumber: string, title: string, description?: string, requirements?: string[]): string {
  const formattedNumber = taskNumber.includes('.') ? taskNumber : `${taskNumber}.`;
  let task = `- [ ] ${formattedNumber} ${title}`;
  
  if (description) {
    task += `\n  - ${description}`;
  }
  
  if (requirements && requirements.length > 0) {
    for (const req of requirements) {
      task += `\n  - ${req}`;
    }
  }
  
  return task;
}

function findInsertionPoint(lines: string[], parentTaskNumber?: string, isSubTask?: boolean): number {
  if (isSubTask && parentTaskNumber) {
    const parentRegex = new RegExp(`^- \\[[ x]\\] ${parentTaskNumber}(?:\\.\\d+)?[. ]`);
    let parentIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (parentRegex.test(lines[i])) {
        parentIndex = i;
        break;
      }
    }
    
    if (parentIndex === -1) {
      return lines.length;
    }
    
    let insertIndex = parentIndex + 1;
    const nextMainTaskRegex = /^- \[[ x]\] \d+[. ]/;
    
    for (let i = parentIndex + 1; i < lines.length; i++) {
      if (nextMainTaskRegex.test(lines[i])) {
        insertIndex = i;
        break;
      }
      if (i === lines.length - 1) {
        insertIndex = lines.length;
        break;
      }
    }
    
    return insertIndex;
  } else {
    return lines.length;
  }
}

export async function POST(
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
    
    // Check project ownership before allowing requirement transition
    const projectService = ProjectService.getInstance();
    const project = await projectService.getProject(userId, id);
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // Only project owners can transition requirements
    if (project.userId !== userId) {
      return NextResponse.json(
        { error: 'Only project owners can transition requirements' },
        { status: 403 }
      );
    }
    
    const { requirementNumber }: TransitionRequirementRequest = await request.json();

    if (!requirementNumber) {
      return NextResponse.json(
        { error: 'Requirement number is required' },
        { status: 400 }
      );
    }

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

    // Read requirements file to get the specific requirement
    const requirementsFilePath = path.join(baseDir, 'requirements.md');
    let requirementsContent = '';
    try {
      requirementsContent = await fs.readFile(requirementsFilePath, 'utf-8');
    } catch (error) {
      return NextResponse.json(
        { error: 'Requirements file not found' },
        { status: 404 }
      );
    }

    // Extract the specific requirement
    const requirementRegex = new RegExp(`### Requirement ${requirementNumber}([\\s\\S]*?)(?=### Requirement \\d+|$)`, 'i');
    const requirementMatch = requirementsContent.match(requirementRegex);
    
    if (!requirementMatch) {
      return NextResponse.json(
        { error: `Requirement ${requirementNumber} not found` },
        { status: 404 }
      );
    }

    const selectedRequirement = requirementMatch[0].trim();

    // Read tasks file
    const tasksFilePath = path.join(baseDir, 'tasks.md');
    let tasksContent = '';
    try {
      tasksContent = await fs.readFile(tasksFilePath, 'utf-8');
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        tasksContent = '# Implementation Plan\n\n';
      } else {
        return NextResponse.json(
          { error: 'Failed to read tasks file' },
          { status: 500 }
        );
      }
    }

    // Get project context (design)
    let projectContext = '';
    try {
      const designPath = path.join(baseDir, 'design.md');
      try {
        const design = await fs.readFile(designPath, 'utf-8');
        projectContext += `DESIGN:\n${design}\n\n`;
      } catch (e) {
        // Design file doesn't exist, continue
      }
    } catch (error) {
      console.warn('Could not load project context:', error);
    }

    // Generate task from requirement using AI
    const generatedTask = await generateTaskFromRequirement(selectedRequirement, tasksContent, projectContext);
    
    // Parse the content to find the next task number
    const lines = tasksContent.split('\n');
    const nextTaskNumber = getNextTaskNumber(lines, generatedTask.parentTaskNumber, generatedTask.isSubTask);
    
    // Format the new task
    const newTask = formatNewTask(
      nextTaskNumber, 
      generatedTask.title, 
      generatedTask.description, 
      generatedTask.requirements
    );
    
    // Find the insertion point
    const insertionIndex = findInsertionPoint(lines, generatedTask.parentTaskNumber, generatedTask.isSubTask);
    
    // Insert the new task
    lines.splice(insertionIndex, 0, ...newTask.split('\n'));
    
    // Write back to file
    const updatedContent = lines.join('\n');
    await fs.writeFile(tasksFilePath, updatedContent, 'utf-8');

    return NextResponse.json({
      success: true,
      taskNumber: nextTaskNumber,
      title: generatedTask.title,
      requirementNumber,
      message: `Requirement ${requirementNumber} successfully transitioned to Task ${nextTaskNumber}`
    });

  } catch (error) {
    console.error('Error transitioning requirement to task:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to transition requirement to task' },
      { status: 500 }
    );
  }
}