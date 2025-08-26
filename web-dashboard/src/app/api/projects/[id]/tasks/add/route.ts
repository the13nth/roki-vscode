import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAIConfig, validateSecureConfig } from '@/lib/secureConfig';
import { ProjectService } from '@/lib/projectService';
import { promises as fs } from 'fs';
import path from 'path';
import { auth } from '@clerk/nextjs/server';

// Helper functions from documents API
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
  
  // Could add more search logic here if needed
  return null;
}

async function resolveProjectBaseDir(id: string, projectPath: string): Promise<string | null> {
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

  return baseDir;
}

interface AddTaskRequest {
  description: string;
}

interface GeneratedTask {
  title: string;
  description?: string;
  requirements: string[];
  isSubTask: boolean;
  parentTaskNumber?: string;
}

async function generateTaskWithAI(description: string, existingTasks: string, projectContext: string): Promise<GeneratedTask> {
  // Validate secure configuration
  const configValidation = validateSecureConfig();
  if (!configValidation.isValid) {
    throw new Error(`Configuration error: ${configValidation.errors.join(', ')}`);
  }

  // Get Google AI configuration
  const config = getGoogleAIConfig();

  const prompt = `You are an expert project manager and software architect. Based on the user's task description and the existing project context, generate a detailed, actionable task.

PROJECT CONTEXT:
${projectContext}

EXISTING TASKS:
${existingTasks}

USER'S TASK DESCRIPTION:
"${description}"

Please analyze the description and generate a comprehensive task with the following structure:

1. **Task Title**: A clear, concise title (max 80 characters)
2. **Task Description**: A brief description of what needs to be accomplished
3. **Requirements**: 3-5 specific, actionable requirements or implementation details
4. **Task Type**: Determine if this should be a main task or sub-task based on the existing tasks

Guidelines:
- Make the title specific and actionable
- Requirements should be technical and implementable
- Consider the existing project structure and tasks
- If this relates to an existing task, suggest it as a sub-task
- Use technical language appropriate for developers
- Focus on concrete deliverables

Respond in JSON format:
{
  "title": "Clear, actionable task title",
  "description": "Brief description of the task",
  "requirements": [
    "Specific requirement 1",
    "Specific requirement 2",
    "Specific requirement 3"
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

    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const generatedTask: GeneratedTask = JSON.parse(jsonMatch[0]);
    
    // Validate the generated task
    if (!generatedTask.title || !generatedTask.requirements || !Array.isArray(generatedTask.requirements)) {
      throw new Error('Invalid task structure generated by AI');
    }

    return generatedTask;
  } catch (error) {
    console.error('AI task generation failed:', error);
    throw new Error('Failed to generate task with AI');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    // Check project ownership before allowing task addition
    const projectService = ProjectService.getInstance();
    const project = await projectService.getProject(userId, id);
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }
    
    // Only project owners can add tasks
    if (project.userId !== userId) {
      return NextResponse.json(
        { error: 'Only project owners can add tasks' },
        { status: 403 }
      );
    }
    
    const { description }: AddTaskRequest = await request.json();

    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: 'Task description is required' },
        { status: 400 }
      );
    }

    // Find project by ID and resolve document paths
    const projectPath = await findProjectById(id);
    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Resolve the correct base directory for this project's documents
    const baseDir = await resolveProjectBaseDir(id, projectPath);
    if (!baseDir) {
      return NextResponse.json({ error: 'Project structure not found' }, { status: 404 });
    }

    const tasksFilePath = path.join(baseDir, 'tasks.md');
    
    // Check if tasks file exists and read it
    let tasksContent = '';
    try {
      tasksContent = await fs.readFile(tasksFilePath, 'utf-8');
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        // Tasks file doesn't exist, create empty content
        tasksContent = '# Implementation Plan\n\n';
      } else {
        return NextResponse.json(
          { error: 'Failed to read tasks file' },
          { status: 500 }
        );
      }
    }
    
    // Get project context (requirements and design)
    let projectContext = '';
    try {
      const requirementsPath = path.join(baseDir, 'requirements.md');
      const designPath = path.join(baseDir, 'design.md');
      
      try {
        const requirements = await fs.readFile(requirementsPath, 'utf-8');
        projectContext += `REQUIREMENTS:\n${requirements}\n\n`;
      } catch (e) {
        // Requirements file doesn't exist, continue
      }
      
      try {
        const design = await fs.readFile(designPath, 'utf-8');
        projectContext += `DESIGN:\n${design}\n\n`;
      } catch (e) {
        // Design file doesn't exist, continue
      }
    } catch (error) {
      console.warn('Could not load project context:', error);
    }

    // Generate task with AI
    const generatedTask = await generateTaskWithAI(description.trim(), tasksContent, projectContext);
    
    // Parse the content to find the next task number
    const lines = tasksContent.split('\n');
    let nextTaskNumber = getNextTaskNumber(lines, generatedTask.parentTaskNumber, generatedTask.isSubTask);
    
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
      message: 'Task generated and added successfully'
    });

  } catch (error) {
    console.error('Error adding task:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add task' },
      { status: 500 }
    );
  }
}

function getNextTaskNumber(lines: string[], parentTaskNumber?: string, isSubTask?: boolean): string {
  // More flexible regex to match various task number formats
  const taskRegex = /^- \[[ x]\] (\d+(?:\.\d+)?)/;
  const existingNumbers: number[] = [];
  const existingSubNumbers: { [key: string]: number[] } = {};

  for (const line of lines) {
    const match = line.match(taskRegex);
    if (match) {
      const taskNum = match[1];
      if (taskNum.includes('.')) {
        // Sub-task
        const [parent, sub] = taskNum.split('.').map(Number);
        if (!existingSubNumbers[parent.toString()]) {
          existingSubNumbers[parent.toString()] = [];
        }
        existingSubNumbers[parent.toString()].push(sub);
      } else {
        // Main task
        existingNumbers.push(Number(taskNum));
      }
    }
  }

  if (isSubTask && parentTaskNumber) {
    // Find next sub-task number
    const parentNum = parentTaskNumber;
    const subNumbers = existingSubNumbers[parentNum] || [];
    const nextSubNumber = subNumbers.length > 0 ? Math.max(...subNumbers) + 1 : 1;
    return `${parentNum}.${nextSubNumber}`;
  } else {
    // Find next main task number
    const nextMainNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    return nextMainNumber.toString();
  }
}

function formatNewTask(taskNumber: string, title: string, description?: string, requirements?: string[]): string {
  // Ensure consistent formatting with period after task number
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
    // Find the parent task and insert after its last sub-task or details
    const parentRegex = new RegExp(`^- \\[[ x]\\] ${parentTaskNumber}(?:\\.\\d+)?[. ]`);
    let parentIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (parentRegex.test(lines[i])) {
        parentIndex = i;
        break;
      }
    }
    
    if (parentIndex === -1) {
      // Parent not found, add at end
      return lines.length;
    }
    
    // Find the end of this task's content (next main task or end of file)
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
    // Add at the end of the file
    return lines.length;
  }
}