// Task parsing and progress calculation utilities
import { ProgressData, ActivityItem, Milestone } from '../types/shared';

export interface ParsedTask {
  id: string;
  title: string;
  level: number;
  isCompleted: boolean;
  isSubtask: boolean;
  parentId?: string;
  requirements?: string[];
  details?: string[];
}

export interface TaskParseResult {
  tasks: ParsedTask[];
  totalTasks: number;
  completedTasks: number;
  percentage: number;
}

export class TaskParser {
  private static readonly TASK_REGEX = /^(\s*)-\s*\[([ x])\]\s*(.+)$/gm;
  private static readonly SUBTASK_REGEX = /^(\s*)-\s*\[([ x])\]\s*(\d+\.\d+)\s+(.+)$/gm;
  private static readonly REQUIREMENTS_REGEX = /_Requirements:\s*([^_]+)_/;
  private static readonly DETAILS_REGEX = /^\s*-\s+(.+)$/gm;

  /**
   * Parses tasks.md content and extracts task information
   */
  static parseTasksMarkdown(content: string): TaskParseResult {
    const tasks: ParsedTask[] = [];
    const lines = content.split('\n');
    let currentParentId: string | undefined;
    let taskCounter = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip empty lines and headers
      if (!line.trim() || line.startsWith('#')) {
        continue;
      }

      // Check if this is a task line
      const taskMatch = line.match(/^(\s*)-\s*\[([ x])\]\s*(.+)$/);
      if (taskMatch) {
        const [, indent, status, taskText] = taskMatch;
        const level = Math.floor(indent.length / 2); // Assuming 2 spaces per level
        const isCompleted = status.toLowerCase() === 'x';
        taskCounter++;

        // Extract task number and title
        const taskNumberMatch = taskText.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
        const taskId = taskNumberMatch ? taskNumberMatch[1] : `task-${taskCounter}`;
        const title = taskNumberMatch ? taskNumberMatch[2] : taskText;

        // Determine if this is a subtask
        const isSubtask = level > 0 || taskId.includes('.');
        
        // Set parent ID for subtasks
        if (isSubtask && level === 1) {
          // Find the most recent parent task
          for (let j = tasks.length - 1; j >= 0; j--) {
            if (!tasks[j].isSubtask) {
              currentParentId = tasks[j].id;
              break;
            }
          }
        } else if (!isSubtask) {
          currentParentId = undefined;
        }

        // Extract requirements and details from following lines
        const requirements: string[] = [];
        const details: string[] = [];
        
        // Look ahead for requirements and details
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j];
          
          // Stop if we hit another task or empty line followed by task
          if (nextLine.match(/^(\s*)-\s*\[([ x])\]/)) {
            break;
          }
          
          // Extract requirements
          const reqMatch = nextLine.match(/_Requirements:\s*([^_]+)_/);
          if (reqMatch) {
            requirements.push(...reqMatch[1].split(',').map(r => r.trim()));
          }
          
          // Extract details (bullet points)
          const detailMatch = nextLine.match(/^\s*-\s+(.+)$/);
          if (detailMatch && !nextLine.includes('_Requirements:')) {
            details.push(detailMatch[1]);
          }
        }

        const task: ParsedTask = {
          id: taskId,
          title: title.trim(),
          level,
          isCompleted,
          isSubtask,
          parentId: currentParentId,
          requirements: requirements.length > 0 ? requirements : undefined,
          details: details.length > 0 ? details : undefined
        };

        tasks.push(task);
      }
    }

    // Calculate progress
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.isCompleted).length;
    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      tasks,
      totalTasks,
      completedTasks,
      percentage
    };
  }

  /**
   * Updates task completion status in markdown content
   */
  static updateTaskCompletion(content: string, taskId: string, isCompleted: boolean): string {
    const lines = content.split('\n');
    const updatedLines: string[] = [];

    for (const line of lines) {
      const taskMatch = line.match(/^(\s*)-\s*\[([ x])\]\s*(.+)$/);
      if (taskMatch) {
        const [, indent, , taskText] = taskMatch;
        const taskNumberMatch = taskText.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
        const currentTaskId = taskNumberMatch ? taskNumberMatch[1] : null;
        
        if (currentTaskId === taskId) {
          const status = isCompleted ? 'x' : ' ';
          updatedLines.push(`${indent}- [${status}] ${taskText}`);
        } else {
          updatedLines.push(line);
        }
      } else {
        updatedLines.push(line);
      }
    }

    return updatedLines.join('\n');
  }

  /**
   * Extracts milestones from tasks content
   */
  static extractMilestones(tasks: ParsedTask[]): Milestone[] {
    const milestones: Milestone[] = [];
    
    // Look for milestone indicators in task titles
    for (const task of tasks) {
      const milestoneMatch = task.title.match(/milestone:\s*(.+?)(?:\s*-\s*(.+))?$/i);
      if (milestoneMatch) {
        const [, name, targetDate] = milestoneMatch;
        
        // Calculate progress for this milestone based on related tasks
        const relatedTasks = tasks.filter(t => 
          t.title.toLowerCase().includes(name.toLowerCase()) ||
          (t.requirements && t.requirements.some(req => req.toLowerCase().includes(name.toLowerCase())))
        );
        
        const completedRelated = relatedTasks.filter(t => t.isCompleted).length;
        const progress = relatedTasks.length > 0 ? Math.round((completedRelated / relatedTasks.length) * 100) : 0;
        
        milestones.push({
          name: name.trim(),
          targetDate: targetDate ? targetDate.trim() : '',
          progress
        });
      }
    }

    return milestones;
  }
}

export class ProgressCalculator {
  /**
   * Calculates comprehensive progress data from parsed tasks
   */
  static calculateProgress(
    tasks: ParsedTask[], 
    previousProgress?: ProgressData
  ): ProgressData {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.isCompleted).length;
    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // Generate recent activity by comparing with previous progress
    const recentActivity: ActivityItem[] = [];
    
    if (previousProgress) {
      // Find newly completed tasks
      const previousCompletedIds = new Set(
        previousProgress.recentActivity.map(activity => activity.taskId)
      );
      
      const newlyCompleted = tasks.filter(task => 
        task.isCompleted && !previousCompletedIds.has(task.id)
      );
      
      for (const task of newlyCompleted) {
        recentActivity.push({
          taskId: task.id,
          title: task.title,
          completedAt: new Date(),
          completedBy: 'manual' // Will be updated by VS Code extension for auto-detection
        });
      }
      
      // Keep some previous activity (last 10 items)
      const existingActivity = previousProgress.recentActivity
        .filter(activity => 
          // Keep if task is still completed or if it's recent (last 7 days)
          tasks.find(t => t.id === activity.taskId && t.isCompleted) ||
          (new Date().getTime() - new Date(activity.completedAt).getTime()) < 7 * 24 * 60 * 60 * 1000
        )
        .slice(0, 10 - recentActivity.length);
      
      recentActivity.push(...existingActivity);
    }
    
    // Extract milestones
    const milestones = TaskParser.extractMilestones(tasks);
    
    return {
      totalTasks,
      completedTasks,
      percentage,
      lastUpdated: new Date(),
      recentActivity: recentActivity.slice(0, 10), // Keep only last 10 activities
      milestones
    };
  }

  /**
   * Updates progress with task completion history and timestamps
   */
  static updateProgressWithHistory(
    currentProgress: ProgressData,
    taskId: string,
    taskTitle: string,
    completedBy: 'manual' | 'auto-detection' = 'manual'
  ): ProgressData {
    const newActivity: ActivityItem = {
      taskId,
      title: taskTitle,
      completedAt: new Date(),
      completedBy
    };

    // Remove any existing activity for this task and add the new one
    const filteredActivity = currentProgress.recentActivity.filter(
      activity => activity.taskId !== taskId
    );
    
    const updatedActivity = [newActivity, ...filteredActivity].slice(0, 10);

    return {
      ...currentProgress,
      lastUpdated: new Date(),
      recentActivity: updatedActivity
    };
  }

  /**
   * Calculates task completion velocity (tasks per day)
   */
  static calculateVelocity(recentActivity: ActivityItem[], days: number = 7): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentCompletions = recentActivity.filter(
      activity => new Date(activity.completedAt) >= cutoffDate
    );
    
    return recentCompletions.length / days;
  }

  /**
   * Estimates completion date based on current velocity
   */
  static estimateCompletionDate(
    totalTasks: number,
    completedTasks: number,
    recentActivity: ActivityItem[]
  ): Date | null {
    const remainingTasks = totalTasks - completedTasks;
    if (remainingTasks <= 0) {
      return new Date(); // Already complete
    }
    
    const velocity = this.calculateVelocity(recentActivity);
    if (velocity <= 0) {
      return null; // Cannot estimate without velocity
    }
    
    const daysToComplete = remainingTasks / velocity;
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + Math.ceil(daysToComplete));
    
    return completionDate;
  }
}