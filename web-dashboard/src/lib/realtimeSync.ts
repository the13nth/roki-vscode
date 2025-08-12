// Real-time synchronization service for web dashboard UI updates
import { EventEmitter } from 'events';
import { ProjectFileWatcher, globalFileWatcher } from './fileWatcher';
import { FileSystemManager } from './fileSystem';

interface ActivityItem {
  taskId: string;
  title: string;
  completedAt: Date;
  completedBy: 'manual' | 'auto-detection';
}

export interface SyncEvent {
  type: 'document_updated' | 'progress_updated' | 'context_updated' | 'project_updated';
  projectPath: string;
  data: unknown;
  timestamp: Date;
}

export interface DocumentUpdateEvent extends SyncEvent {
  type: 'document_updated';
  data: {
    documentType: 'requirements' | 'design' | 'tasks' | 'config';
    content?: string;
    filePath: string;
  };
}

export interface ProgressUpdateEvent extends SyncEvent {
  type: 'progress_updated';
  data: {
    totalTasks: number;
    completedTasks: number;
    percentage: number;
    recentActivity: ActivityItem[];
  };
}

export interface ContextUpdateEvent extends SyncEvent {
  type: 'context_updated';
  data: {
    fileName: string;
    action: 'added' | 'modified' | 'removed';
    filePath: string;
  };
}

/**
 * Real-time synchronization service that bridges file system changes to UI updates
 */
export class RealtimeSyncService extends EventEmitter {
  private fileWatcher: ProjectFileWatcher;
  private activeProjects: Set<string> = new Set();
  private documentCache: Map<string, { content: string; lastModified: Date }> = new Map();

  constructor(fileWatcher: ProjectFileWatcher = globalFileWatcher) {
    super();
    this.fileWatcher = fileWatcher;
    this.setupFileWatcherEvents();
  }

  /**
   * Start real-time synchronization for a project
   */
  async startSyncForProject(projectPath: string): Promise<void> {
    try {
      // Start file watching
      await this.fileWatcher.watchProject(projectPath);
      this.activeProjects.add(projectPath);

      // Load initial document cache
      await this.loadDocumentCache(projectPath);

      this.emit('syncStarted', { projectPath, timestamp: new Date() });

    } catch (error) {
      this.emit('syncError', {
        projectPath,
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'SYNC_START_ERROR',
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Stop real-time synchronization for a project
   */
  async stopSyncForProject(projectPath: string): Promise<void> {
    await this.fileWatcher.stopWatching(projectPath);
    this.activeProjects.delete(projectPath);
    
    // Clear document cache for this project
    const cacheKeys = Array.from(this.documentCache.keys()).filter(key => 
      key.startsWith(`${projectPath}:`)
    );
    cacheKeys.forEach(key => this.documentCache.delete(key));

    this.emit('syncStopped', { projectPath, timestamp: new Date() });
  }

  /**
   * Stop all synchronization
   */
  async stopAllSync(): Promise<void> {
    const projects = Array.from(this.activeProjects);
    await Promise.all(projects.map(project => this.stopSyncForProject(project)));
  }

  /**
   * Get list of actively synchronized projects
   */
  getActiveSyncProjects(): string[] {
    return Array.from(this.activeProjects);
  }

  /**
   * Check if a project is being synchronized
   */
  isSyncActive(projectPath: string): boolean {
    return this.activeProjects.has(projectPath);
  }

  /**
   * Manually trigger a sync check for a project
   */
  async triggerSyncCheck(projectPath: string): Promise<void> {
    if (!this.activeProjects.has(projectPath)) {
      throw new Error(`Project ${projectPath} is not being synchronized`);
    }

    try {
      await this.loadDocumentCache(projectPath);
      this.emit('syncCheckCompleted', { projectPath, timestamp: new Date() });
    } catch (error) {
      this.emit('syncError', {
        projectPath,
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'SYNC_CHECK_ERROR',
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Get cached document content
   */
  getCachedDocument(projectPath: string, documentType: string): string | null {
    const cacheKey = `${projectPath}:${documentType}`;
    const cached = this.documentCache.get(cacheKey);
    return cached ? cached.content : null;
  }

  /**
   * Set up event handlers for file watcher
   */
  private setupFileWatcherEvents(): void {
    // Handle specific document changes
    this.fileWatcher.on('requirementsChanged', (event) => {
      this.handleDocumentChange(event.projectPath, 'requirements', 'requirements.md');
    });

    this.fileWatcher.on('designChanged', (event) => {
      this.handleDocumentChange(event.projectPath, 'design', 'design.md');
    });

    this.fileWatcher.on('tasksChanged', (event) => {
      this.handleDocumentChange(event.projectPath, 'tasks', 'tasks.md');
    });

    this.fileWatcher.on('configChanged', (event) => {
      this.handleDocumentChange(event.projectPath, 'config', 'config.json');
    });

    this.fileWatcher.on('progressChanged', (event) => {
      this.handleProgressChange(event.projectPath);
    });

    this.fileWatcher.on('contextChanged', (event) => {
      this.handleContextChange(event.projectPath, event.fileName, event.type);
    });

    // Handle file watcher lifecycle events
    this.fileWatcher.on('watcherStarted', (event) => {
      console.log(`File watcher started for project: ${event.projectPath}`);
      this.emit('watcherStarted', event);
    });

    this.fileWatcher.on('watcherStopped', (event) => {
      console.log(`File watcher stopped for project: ${event.projectPath}`);
      this.emit('watcherStopped', event);
    });

    this.fileWatcher.on('watcherReady', (event) => {
      console.log(`File watcher ready for project: ${event.projectPath}`);
      this.emit('watcherReady', event);
    });

    // Handle file watcher errors
    this.fileWatcher.on('watcherError', (event) => {
      console.error(`File watcher error for project ${event.projectPath}:`, event.error);
      this.emit('syncError', {
        projectPath: event.projectPath,
        error: event.error,
        type: event.type,
        timestamp: event.timestamp || new Date()
      });
    });

    // Handle integrity warnings
    this.fileWatcher.on('integrityWarning', (event) => {
      console.warn(`File integrity warning for ${event.filePath}:`, event.warnings);
      this.emit('integrityWarning', {
        projectPath: event.projectPath,
        filePath: event.filePath,
        errors: event.errors,
        warnings: event.warnings,
        timestamp: event.timestamp || new Date()
      });
    });

    // Handle general file changes for debugging
    this.fileWatcher.on('fileChanged', (event) => {
      console.log(`File changed: ${event.relativePath} (${event.type}) in project ${event.projectPath}`);
    });
  }

  /**
   * Handle document changes and emit UI update events
   */
  private async handleDocumentChange(
    projectPath: string, 
    documentType: 'requirements' | 'design' | 'tasks' | 'config',
    fileName: string
  ): Promise<void> {
    try {
      const filePath = `${projectPath}/.ai-project/${fileName}`;
      const content = await FileSystemManager.readMarkdownFile(filePath);
      
      // Update cache
      const cacheKey = `${projectPath}:${documentType}`;
      this.documentCache.set(cacheKey, {
        content,
        lastModified: new Date()
      });

      // Emit document update event
      const updateEvent: DocumentUpdateEvent = {
        type: 'document_updated',
        projectPath,
        data: {
          documentType,
          content,
          filePath
        },
        timestamp: new Date()
      };

      this.emit('documentUpdated', updateEvent);

      // If tasks changed, also check for progress updates
      if (documentType === 'tasks') {
        await this.handleProgressChange(projectPath);
      }

    } catch (error) {
      this.emit('syncError', {
        projectPath,
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'DOCUMENT_SYNC_ERROR',
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle progress changes and calculate updated progress
   */
  private async handleProgressChange(projectPath: string): Promise<void> {
    try {
      const progressPath = `${projectPath}/.ai-project/progress.json`;
      const tasksPath = `${projectPath}/.ai-project/tasks.md`;

      // Read current progress and tasks
      const [progressContent, tasksContent] = await Promise.all([
        FileSystemManager.readMarkdownFile(progressPath),
        FileSystemManager.readMarkdownFile(tasksPath)
      ]);

      const progressData = JSON.parse(progressContent);
      
      // Parse tasks to calculate current progress
      const taskProgress = this.parseTaskProgress(tasksContent);
      
      // Update progress data
      const updatedProgress = {
        ...progressData,
        totalTasks: taskProgress.total,
        completedTasks: taskProgress.completed,
        percentage: taskProgress.total > 0 ? Math.round((taskProgress.completed / taskProgress.total) * 100) : 0,
        lastUpdated: new Date().toISOString()
      };

      // Emit progress update event
      const progressEvent: ProgressUpdateEvent = {
        type: 'progress_updated',
        projectPath,
        data: updatedProgress,
        timestamp: new Date()
      };

      this.emit('progressUpdated', progressEvent);

    } catch (error) {
      this.emit('syncError', {
        projectPath,
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'PROGRESS_SYNC_ERROR',
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle context directory changes
   */
  private async handleContextChange(
    projectPath: string, 
    fileName: string, 
    changeType: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir'
  ): Promise<void> {
    try {
      const filePath = `${projectPath}/.ai-project/context/${fileName}`;
      
      let action: 'added' | 'modified' | 'removed';
      switch (changeType) {
        case 'add':
        case 'addDir':
          action = 'added';
          break;
        case 'change':
          action = 'modified';
          break;
        case 'unlink':
        case 'unlinkDir':
          action = 'removed';
          break;
        default:
          action = 'modified';
      }

      // Emit context update event
      const contextEvent: ContextUpdateEvent = {
        type: 'context_updated',
        projectPath,
        data: {
          fileName,
          action,
          filePath
        },
        timestamp: new Date()
      };

      this.emit('contextUpdated', contextEvent);

    } catch (error) {
      this.emit('syncError', {
        projectPath,
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'CONTEXT_SYNC_ERROR',
        timestamp: new Date()
      });
    }
  }

  /**
   * Load initial document cache for a project
   */
  private async loadDocumentCache(projectPath: string): Promise<void> {
    const documents = ['requirements.md', 'design.md', 'tasks.md', 'config.json'];
    
    for (const doc of documents) {
      try {
        const filePath = `${projectPath}/.ai-project/${doc}`;
        const content = await FileSystemManager.readMarkdownFile(filePath);
        
        const documentType = doc.replace('.md', '').replace('.json', '');
        const cacheKey = `${projectPath}:${documentType}`;
        
        this.documentCache.set(cacheKey, {
          content,
          lastModified: new Date()
        });
      } catch (error) {
        // Document might not exist yet, which is okay
        console.warn(`Could not load ${doc} for project ${projectPath}:`, error);
      }
    }
  }

  /**
   * Parse task progress from tasks.md content
   */
  private parseTaskProgress(tasksContent: string): { total: number; completed: number } {
    // Match task checkboxes: - [ ] or - [x]
    const taskPattern = /^[\s]*-[\s]*\[([x\s])\]/gm;
    const matches = Array.from(tasksContent.matchAll(taskPattern));
    
    const total = matches.length;
    const completed = matches.filter(match => match[1].toLowerCase() === 'x').length;
    
    return { total, completed };
  }

  /**
   * Get synchronization statistics
   */
  getSyncStats(): {
    activeProjects: number;
    cachedDocuments: number;
    watcherStats: Record<string, { filesWatched: number; isReady: boolean }>;
  } {
    return {
      activeProjects: this.activeProjects.size,
      cachedDocuments: this.documentCache.size,
      watcherStats: this.fileWatcher.getWatcherStats()
    };
  }
}

/**
 * Global singleton instance for real-time synchronization
 */
export const globalSyncService = new RealtimeSyncService();