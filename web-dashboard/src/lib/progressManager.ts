// Progress management utilities for reading, updating, and persisting progress data
import { promises as fs } from 'fs';
import path from 'path';
import { ProgressData } from '../types/shared';
import { TaskParser, ProgressCalculator, ParsedTask } from './taskParser';

export class ProgressManagerError extends Error {
  constructor(message: string, public code: string, public path?: string) {
    super(message);
    this.name = 'ProgressManagerError';
  }
}

export class ProgressManager {
  private projectPath: string;

  constructor(projectPath: string) {
    // Store the projectPath and resolve actual file locations dynamically per operation
    this.projectPath = projectPath;
  }

  /**
   * Determines the correct paths based on project structure
   */
  private async determinePaths(): Promise<{ progressPath: string; tasksPath: string }> {
    const projectPath = this.projectPath;
    const directConfigPath = path.join(projectPath, 'config.json');
    const directTasksPath = path.join(projectPath, 'tasks.md');
    const directProgressPath = path.join(projectPath, 'progress.json');

    const aiProjectDir = path.join(projectPath, '.ai-project');
    const aiTasksPath = path.join(aiProjectDir, 'tasks.md');
    const aiProgressPath = path.join(aiProjectDir, 'progress.json');

    const kiroDir = path.join(projectPath, '.kiro', 'specs', 'ai-project-manager');
    const kiroTasksPath = path.join(kiroDir, 'tasks.md');
    const kiroProgressPath = path.join(kiroDir, 'progress.json');

    // 1) Direct/internal project
    try {
      await fs.access(directConfigPath);
      return { progressPath: directProgressPath, tasksPath: directTasksPath };
    } catch {}

    // 2) .ai-project folder
    try {
      await fs.access(aiTasksPath);
      return { progressPath: aiProgressPath, tasksPath: aiTasksPath };
    } catch {}

    // 3) .kiro/specs/ai-project-manager folder
    try {
      await fs.access(kiroTasksPath);
      return { progressPath: kiroProgressPath, tasksPath: kiroTasksPath };
    } catch {}

    // Fallback to direct paths (will throw ENOENT upstream)
    return { progressPath: directProgressPath, tasksPath: directTasksPath };
  }

  /**
   * Reads current progress data from progress.json
   */
  async readProgressData(): Promise<ProgressData | null> {
    try {
      // Determine the correct paths based on project structure
      const paths = await this.determinePaths();
      
      // Try to read the file directly first
      const content = await fs.readFile(paths.progressPath, 'utf-8');
      const data = JSON.parse(content);
      
      // Convert date strings back to Date objects
      return {
        ...data,
        lastUpdated: new Date(data.lastUpdated),
        recentActivity: data.recentActivity.map((activity: any) => ({
          ...activity,
          completedAt: new Date(activity.completedAt)
        }))
      };
    } catch (error) {
      if (error instanceof Error && (error.message.includes('ENOENT') || error.message.includes('no such file'))) {
        // File doesn't exist, return null
        return null;
      }
      throw new ProgressManagerError(
        `Failed to read progress data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'READ_ERROR',
        (error as any)?.path || undefined
      );
    }
  }

  /**
   * Writes progress data to progress.json with timestamp tracking
   */
  async writeProgressData(progressData: ProgressData): Promise<void> {
    try {
      const paths = await this.determinePaths();
      // Ensure lastUpdated is current
      const dataToWrite = {
        ...progressData,
        lastUpdated: new Date().toISOString(),
        recentActivity: progressData.recentActivity.map(activity => ({
          ...activity,
          completedAt: activity.completedAt.toISOString()
        }))
      };

      // Write directly to file
      await fs.writeFile(paths.progressPath, JSON.stringify(dataToWrite, null, 2), 'utf-8');
    } catch (error) {
      throw new ProgressManagerError(
        `Failed to write progress data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'WRITE_ERROR',
        (error as any)?.path || undefined
      );
    }
  }

  /**
   * Reads and parses tasks from tasks.md
   */
  async readTasks(): Promise<ParsedTask[]> {
    try {
      // Determine the correct paths based on project structure
      const paths = await this.determinePaths();
      
      const content = await fs.readFile(paths.tasksPath, 'utf-8');
      const parseResult = TaskParser.parseTasksMarkdown(content);
      return parseResult.tasks;
    } catch (error) {
      throw new ProgressManagerError(
        `Failed to read tasks: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'READ_TASKS_ERROR',
        (error as any)?.path || undefined
      );
    }
  }

  /**
   * Updates task completion status in tasks.md
   */
  async updateTaskCompletion(taskId: string, isCompleted: boolean): Promise<void> {
    try {
      const { tasksPath } = await this.determinePaths();
      const content = await fs.readFile(tasksPath, 'utf-8');
      const updatedContent = TaskParser.updateTaskCompletion(content, taskId, isCompleted);
      await fs.writeFile(tasksPath, updatedContent, 'utf-8');
    } catch (error) {
      throw new ProgressManagerError(
        `Failed to update task completion: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UPDATE_TASK_ERROR',
        (error as any)?.path || undefined
      );
    }
  }

  /**
   * Calculates and updates progress based on current tasks
   */
  async calculateAndUpdateProgress(): Promise<ProgressData> {
    try {
      const tasks = await this.readTasks();
      const previousProgress = await this.readProgressData();
      
      const newProgress = ProgressCalculator.calculateProgress(tasks, previousProgress || undefined);
      
      await this.writeProgressData(newProgress);
      return newProgress;
    } catch (error) {
      throw new ProgressManagerError(
        `Failed to calculate and update progress: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CALCULATE_PROGRESS_ERROR'
      );
    }
  }

  /**
   * Marks a task as completed and updates progress
   */
  async completeTask(
    taskId: string, 
    completedBy: 'manual' | 'auto-detection' = 'manual'
  ): Promise<ProgressData> {
    try {
      // First update the task in tasks.md
      await this.updateTaskCompletion(taskId, true);
      
      // Get the task details for activity tracking
      const tasks = await this.readTasks();
      const task = tasks.find(t => t.id === taskId);
      
      if (!task) {
        throw new ProgressManagerError(
          `Task not found: ${taskId}`,
          'TASK_NOT_FOUND'
        );
      }

      // Calculate new progress
      const currentProgress = await this.readProgressData();
      const newProgress = ProgressCalculator.calculateProgress(tasks, currentProgress || undefined);
      
      // Add completion to activity history
      const progressWithHistory = ProgressCalculator.updateProgressWithHistory(
        newProgress,
        taskId,
        task.title,
        completedBy
      );

      await this.writeProgressData(progressWithHistory);
      return progressWithHistory;
    } catch (error) {
      if (error instanceof ProgressManagerError) {
        throw error;
      }
      throw new ProgressManagerError(
        `Failed to complete task: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'COMPLETE_TASK_ERROR'
      );
    }
  }

  /**
   * Marks a task as incomplete and updates progress
   */
  async uncompleteTask(taskId: string): Promise<ProgressData> {
    try {
      // Update the task in tasks.md
      await this.updateTaskCompletion(taskId, false);
      
      // Calculate new progress
      const tasks = await this.readTasks();
      const currentProgress = await this.readProgressData();
      const newProgress = ProgressCalculator.calculateProgress(tasks, currentProgress || undefined);
      
      // Remove from recent activity if present
      if (currentProgress) {
        newProgress.recentActivity = currentProgress.recentActivity.filter(
          activity => activity.taskId !== taskId
        );
      }

      await this.writeProgressData(newProgress);
      return newProgress;
    } catch (error) {
      throw new ProgressManagerError(
        `Failed to uncomplete task: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UNCOMPLETE_TASK_ERROR'
      );
    }
  }

  /**
   * Gets comprehensive progress statistics
   */
  async getProgressStats(): Promise<{
    progress: ProgressData;
    tasks: ParsedTask[];
    velocity: number;
    estimatedCompletion: Date | null;
  }> {
    try {
      const tasks = await this.readTasks();
      
      // Always recalculate progress from current tasks to ensure accuracy
      const currentProgress = await this.readProgressData();
      const updatedProgress = ProgressCalculator.calculateProgress(tasks, currentProgress || undefined);
      
      // Save the updated progress
      await this.writeProgressData(updatedProgress);

      const velocity = ProgressCalculator.calculateVelocity(updatedProgress.recentActivity);
      const estimatedCompletion = ProgressCalculator.estimateCompletionDate(
        updatedProgress.totalTasks,
        updatedProgress.completedTasks,
        updatedProgress.recentActivity
      );

      return {
        progress: updatedProgress,
        tasks,
        velocity,
        estimatedCompletion
      };
    } catch (error) {
      throw new ProgressManagerError(
        `Failed to get progress stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GET_STATS_ERROR'
      );
    }
  }

  /**
   * Adds a milestone to the progress tracking
   */
  async addMilestone(name: string, targetDate: string): Promise<ProgressData> {
    try {
      const currentProgress = await this.readProgressData();
      if (!currentProgress) {
        throw new ProgressManagerError(
          'No progress data found. Initialize progress first.',
          'NO_PROGRESS_DATA'
        );
      }

      const milestones = currentProgress.milestones || [];
      milestones.push({
        name,
        targetDate,
        progress: 0 // Will be calculated based on related tasks
      });

      const updatedProgress = {
        ...currentProgress,
        milestones
      };

      await this.writeProgressData(updatedProgress);
      return updatedProgress;
    } catch (error) {
      if (error instanceof ProgressManagerError) {
        throw error;
      }
      throw new ProgressManagerError(
        `Failed to add milestone: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ADD_MILESTONE_ERROR'
      );
    }
  }

  /**
   * Updates milestone progress based on related tasks
   */
  async updateMilestoneProgress(): Promise<ProgressData> {
    try {
      const tasks = await this.readTasks();
      const currentProgress = await this.readProgressData();
      
      if (!currentProgress || !currentProgress.milestones) {
        return currentProgress || await this.calculateAndUpdateProgress();
      }

      const updatedMilestones = currentProgress.milestones.map(milestone => {
        // Find tasks related to this milestone
        const relatedTasks = tasks.filter(task => 
          task.title.toLowerCase().includes(milestone.name.toLowerCase()) ||
          (task.requirements && task.requirements.some(req => 
            req.toLowerCase().includes(milestone.name.toLowerCase())
          ))
        );

        const completedRelated = relatedTasks.filter(task => task.isCompleted).length;
        const progress = relatedTasks.length > 0 
          ? Math.round((completedRelated / relatedTasks.length) * 100) 
          : 0;

        return {
          ...milestone,
          progress
        };
      });

      const updatedProgress = {
        ...currentProgress,
        milestones: updatedMilestones
      };

      await this.writeProgressData(updatedProgress);
      return updatedProgress;
    } catch (error) {
      throw new ProgressManagerError(
        `Failed to update milestone progress: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UPDATE_MILESTONE_ERROR'
      );
    }
  }

  /**
   * Initializes progress tracking for a new project
   */
  async initializeProgress(): Promise<ProgressData> {
    try {
      const tasks = await this.readTasks();
      const initialProgress = ProgressCalculator.calculateProgress(tasks);
      
      await this.writeProgressData(initialProgress);
      return initialProgress;
    } catch (error) {
      throw new ProgressManagerError(
        `Failed to initialize progress: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INITIALIZE_ERROR'
      );
    }
  }
}