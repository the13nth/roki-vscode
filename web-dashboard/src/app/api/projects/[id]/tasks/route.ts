import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  completedBy?: string;
  completedAt?: string;
}

function getTasksPath(projectId: string): string {
  const projectPath = path.join(process.cwd(), '.ai-project', 'projects', projectId);
  return path.join(projectPath, 'tasks.md');
}

function parseTasks(content: string): Task[] {
  const tasks: Task[] = [];
  const lines = content.split('\n');
  let currentTask: Partial<Task> = {};
  let currentSubTasks: string[] = [];
  let inTaskBlock = false;
  let taskCounter = 1;

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check for main task (starts with - [ ] or - [x] and has a number)
    const mainTaskMatch = trimmedLine.match(/^- \[([ x])\] (\d+)\. (.+)$/);
    if (mainTaskMatch) {
      // Save previous task if exists
      if (inTaskBlock && currentTask.title) {
        currentTask.description = currentSubTasks.join('\n');
        tasks.push(currentTask as Task);
      }
      
      // Start new task
      const isCompleted = mainTaskMatch[1] === 'x';
      currentTask = {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: mainTaskMatch[3].trim(),
        status: isCompleted ? 'completed' : 'pending',
        priority: 'medium',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      currentSubTasks = [];
      inTaskBlock = true;
      taskCounter++;
    } 
    // Check for subtask (starts with - and is indented)
    else if (inTaskBlock && trimmedLine.startsWith('- ') && line.startsWith('  ')) {
      currentSubTasks.push(trimmedLine);
    }
    // Check for sub-subtask (starts with - and is double indented)
    else if (inTaskBlock && trimmedLine.startsWith('- ') && line.startsWith('    ')) {
      currentSubTasks.push(trimmedLine);
    }
  }

  // Add the last task
  if (inTaskBlock && currentTask.title) {
    currentTask.description = currentSubTasks.join('\n');
    tasks.push(currentTask as Task);
  }

  return tasks;
}

function formatTasks(tasks: Task[]): string {
  let content = '# Implementation Plan\n\n';
  
  tasks.forEach((task, index) => {
    const taskNumber = index + 1;
    const checkbox = task.status === 'completed' ? 'x' : ' ';
    content += `- [${checkbox}] ${taskNumber}. ${task.title}\n`;
    
    if (task.description) {
      // Split description into lines and add proper indentation
      const descriptionLines = task.description.split('\n');
      descriptionLines.forEach(line => {
        if (line.trim()) {
          content += `  ${line}\n`;
        }
      });
    }
    content += '\n';
  });

  return content;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: projectId } = await params;
    const tasksPath = getTasksPath(projectId);

    if (!fs.existsSync(tasksPath)) {
      return NextResponse.json({ tasks: [] });
    }

    const content = fs.readFileSync(tasksPath, 'utf8');
    const tasks = parseTasks(content);

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: projectId } = await params;
    const { title, description, priority, status } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: 'Task title is required' },
        { status: 400 }
      );
    }

    const tasksPath = getTasksPath(projectId);
    const projectPath = path.dirname(tasksPath);

    // Ensure project directory exists
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    }

    // Read existing tasks
    let existingTasks: Task[] = [];
    let existingContent = '';
    if (fs.existsSync(tasksPath)) {
      existingContent = fs.readFileSync(tasksPath, 'utf8');
      existingTasks = parseTasks(existingContent);
    }

    // Create new task
    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      description: description || '',
      status: status || 'pending',
      priority: priority || 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add to existing tasks
    existingTasks.push(newTask);

    // If no existing content, create new file with proper header
    if (!existingContent.trim()) {
      const formattedContent = formatTasks(existingTasks);
      fs.writeFileSync(tasksPath, formattedContent, 'utf8');
    } else {
      // Append new task to existing content
      const lines = existingContent.split('\n');
      const lastTaskIndex = lines.findLastIndex(line => 
        line.trim().match(/^- \[([ x])\] \d+\. /)
      );
      
      if (lastTaskIndex !== -1) {
        // Find the end of the last task (next task or end of file)
        let insertIndex = lastTaskIndex + 1;
        while (insertIndex < lines.length && 
               (lines[insertIndex].trim() === '' || 
                lines[insertIndex].startsWith('  ') || 
                lines[insertIndex].startsWith('    '))) {
          insertIndex++;
        }
        
        // Insert new task
        const newTaskNumber = existingTasks.length;
        const newTaskLines = [
          '',
          `- [ ] ${newTaskNumber}. ${newTask.title}`,
          ...(newTask.description ? newTask.description.split('\n').map(line => `  ${line}`) : []),
          ''
        ];
        
        lines.splice(insertIndex, 0, ...newTaskLines);
        fs.writeFileSync(tasksPath, lines.join('\n'), 'utf8');
      } else {
        // Fallback: rewrite entire file
        const formattedContent = formatTasks(existingTasks);
        fs.writeFileSync(tasksPath, formattedContent, 'utf8');
      }
    }

    return NextResponse.json({ 
      success: true, 
      task: newTask,
      message: 'Task added successfully' 
    });
  } catch (error) {
    console.error('Error adding task:', error);
    return NextResponse.json(
      { error: 'Failed to add task' },
      { status: 500 }
    );
  }
}
