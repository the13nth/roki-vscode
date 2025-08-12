// Server-side file watcher implementation using chokidar
import { EventEmitter } from 'events';
import chokidar, { FSWatcher } from 'chokidar';
import path from 'path';
import { promises as fs } from 'fs';
import crypto from 'crypto';

export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  path: string;
  projectPath: string;
  relativePath: string;
  timestamp: Date;
}

export interface FileIntegrityResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  checksum?: string;
}

export interface WatcherOptions {
  debounceMs?: number;
  enableIntegrityCheck?: boolean;
  ignoreInitial?: boolean;
  persistent?: boolean;
}

interface WatcherInfo {
  watcher: FSWatcher;
  debounceTimers: Map<string, NodeJS.Timeout>;
  filesWatched: number;
  isReady: boolean;
  lastActivity: Date;
}

/**
 * Server-side file watcher implementation using chokidar
 */
export class ProjectFileWatcher extends EventEmitter {
  private watchers: Map<string, WatcherInfo> = new Map();
  private readonly debounceMs: number;
  private readonly enableIntegrityCheck: boolean;
  private readonly options: WatcherOptions;

  constructor(options: WatcherOptions = {}) {
    super();
    this.debounceMs = options.debounceMs || 300;
    this.enableIntegrityCheck = options.enableIntegrityCheck ?? true;
    this.options = {
      ignoreInitial: true,
      persistent: true,
      ...options
    };
  }

  /**
   * Start watching a project directory for changes
   */
  async watchProject(projectPath: string): Promise<void> {
    try {
      // Check if already watching
      if (this.watchers.has(projectPath)) {
        console.log(`Already watching project: ${projectPath}`);
        return;
      }

      let watchDir: string;
      let watchPattern: string;

      // First check if this is an imported project in our internal directory
      const internalProjectPath = path.join(process.cwd(), '.ai-project', 'projects', path.basename(projectPath));
      const internalConfigPath = path.join(internalProjectPath, 'config.json');
      
      if (await this.fileExists(internalConfigPath)) {
        // This is an imported project
        console.log(`Found imported project at ${internalProjectPath}`);
        watchDir = internalProjectPath;
        watchPattern = path.join(internalProjectPath, '**/*');
      } else {
        // Check if this is a direct project or has .ai-project/.kiro subfolder
        const configPath = path.join(projectPath, 'config.json');
        const isDirectProject = await this.fileExists(configPath);
        
        if (isDirectProject) {
          // Direct project: files are directly in projectPath
          watchDir = projectPath;
          watchPattern = path.join(projectPath, '**/*');
        } else {
          // Try .ai-project first
          const aiProjectDir = path.join(projectPath, '.ai-project');
          const hasAiProject = await this.directoryExists(aiProjectDir);
          
          if (hasAiProject) {
            watchDir = aiProjectDir;
            watchPattern = path.join(aiProjectDir, '**/*');
          } else {
            // Try .kiro/specs/ai-project-manager
            const kiroProjectDir = path.join(projectPath, '.kiro', 'specs', 'ai-project-manager');
            const hasKiroProject = await this.directoryExists(kiroProjectDir);
            
            if (hasKiroProject) {
              watchDir = kiroProjectDir;
              watchPattern = path.join(kiroProjectDir, '**/*');
            } else {
              throw new Error(`Project directory not found. Checked:\n- ${aiProjectDir}\n- ${kiroProjectDir}`);
            }
          }
        }
      }
      const watcher = chokidar.watch(watchPattern, {
        ignored: [
          '**/.git/**',
          '**/node_modules/**',
          '**/*.tmp',
          '**/*.backup.*',
          '**/.*' // Ignore hidden files except .ai-project
        ],
        ignoreInitial: this.options.ignoreInitial,
        persistent: this.options.persistent,
        depth: 10,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 50
        }
      });

      const watcherInfo: WatcherInfo = {
        watcher,
        debounceTimers: new Map(),
        filesWatched: 0,
        isReady: false,
        lastActivity: new Date()
      };

      // Set up event handlers
      this.setupWatcherEvents(watcher, projectPath, watcherInfo);

      // Store watcher info
      this.watchers.set(projectPath, watcherInfo);

      console.log(`Started watching project: ${projectPath}`);
      this.emit('watcherStarted', { projectPath, timestamp: new Date() });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to start watching project ${projectPath}:`, error);
      
      this.emit('watcherError', {
        projectPath,
        error: errorMessage,
        type: 'WATCHER_START_ERROR',
        timestamp: new Date()
      });
      
      throw new Error(`Failed to start watching project: ${errorMessage}`);
    }
  }

  /**
   * Stop watching a specific project
   */
  async stopWatching(projectPath: string): Promise<void> {
    const watcherInfo = this.watchers.get(projectPath);
    
    if (!watcherInfo) {
      console.log(`Project not being watched: ${projectPath}`);
      return;
    }

    try {
      // Clear any pending debounce timers
      for (const timer of watcherInfo.debounceTimers.values()) {
        clearTimeout(timer);
      }
      watcherInfo.debounceTimers.clear();

      // Close the watcher
      await watcherInfo.watcher.close();
      
      // Remove from watchers map
      this.watchers.delete(projectPath);

      console.log(`Stopped watching project: ${projectPath}`);
      this.emit('watcherStopped', { projectPath, timestamp: new Date() });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error stopping watcher for ${projectPath}:`, error);
      
      this.emit('watcherError', {
        projectPath,
        error: errorMessage,
        type: 'WATCHER_STOP_ERROR',
        timestamp: new Date()
      });
    }
  }

  /**
   * Stop all watchers
   */
  async stopAllWatchers(): Promise<void> {
    const projectPaths = Array.from(this.watchers.keys());
    await Promise.all(projectPaths.map(projectPath => this.stopWatching(projectPath)));
  }

  /**
   * Get list of currently watched projects
   */
  getWatchedProjects(): string[] {
    return Array.from(this.watchers.keys());
  }

  /**
   * Check if a project is being watched
   */
  isWatching(projectPath: string): boolean {
    return this.watchers.has(projectPath);
  }

  /**
   * Get watcher statistics
   */
  getWatcherStats(): { [projectPath: string]: { filesWatched: number, isReady: boolean } } {
    const stats: { [projectPath: string]: { filesWatched: number, isReady: boolean } } = {};
    
    for (const [projectPath, watcherInfo] of this.watchers.entries()) {
      stats[projectPath] = {
        filesWatched: watcherInfo.filesWatched,
        isReady: watcherInfo.isReady
      };
    }
    
    return stats;
  }

  /**
   * Validate file integrity using checksum
   */
  async validateFileIntegrity(filePath: string): Promise<FileIntegrityResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if file exists and is readable
      await fs.access(filePath, fs.constants.R_OK);
      
      // Calculate checksum
      const content = await fs.readFile(filePath);
      const checksum = crypto.createHash('sha256').update(content).digest('hex');

      // Basic validation checks
      const stats = await fs.stat(filePath);
      
      // Check file size (warn if too large)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (stats.size > maxSize) {
        warnings.push(`File is large (${Math.round(stats.size / 1024 / 1024)}MB)`);
      }

      // Check if file is empty
      if (stats.size === 0) {
        warnings.push('File is empty');
      }

      // For markdown files, check basic structure
      if (filePath.endsWith('.md')) {
        const contentStr = content.toString('utf-8');
        if (!contentStr.includes('#')) {
          warnings.push('Markdown file has no headers');
        }
      }

      // For JSON files, validate JSON structure
      if (filePath.endsWith('.json')) {
        try {
          JSON.parse(content.toString('utf-8'));
        } catch {
          errors.push('Invalid JSON format');
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        checksum
      };

    } catch (error) {
      errors.push(`File integrity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        isValid: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Set up event handlers for a chokidar watcher
   */
  private setupWatcherEvents(watcher: FSWatcher, projectPath: string, watcherInfo: WatcherInfo): void {
    // Handle watcher ready event
    watcher.on('ready', () => {
      watcherInfo.isReady = true;
      watcherInfo.filesWatched = Object.keys(watcher.getWatched()).length;
      console.log(`Watcher ready for project: ${projectPath} (${watcherInfo.filesWatched} files)`);
      this.emit('watcherReady', { projectPath, filesWatched: watcherInfo.filesWatched });
    });

    // Handle file/directory events with debouncing
    const handleFileEvent = (eventType: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir') => {
      return (filePath: string) => {
        watcherInfo.lastActivity = new Date();
        this.handleDebouncedFileChange(eventType, filePath, projectPath, watcherInfo);
      };
    };

    watcher.on('add', handleFileEvent('add'));
    watcher.on('change', handleFileEvent('change'));
    watcher.on('unlink', handleFileEvent('unlink'));
    watcher.on('addDir', handleFileEvent('addDir'));
    watcher.on('unlinkDir', handleFileEvent('unlinkDir'));

    // Handle watcher errors
    watcher.on('error', (error) => {
      console.error(`Watcher error for project ${projectPath}:`, error);
      this.emit('watcherError', {
        projectPath,
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'WATCHER_ERROR',
        timestamp: new Date()
      });
    });
  }

  /**
   * Handle file changes with debouncing to prevent excessive updates
   */
  private handleDebouncedFileChange(
    eventType: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir',
    filePath: string,
    projectPath: string,
    watcherInfo: WatcherInfo
  ): void {
    // Clear existing timer for this file
    const existingTimer = watcherInfo.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounced timer
    const timer = setTimeout(async () => {
      watcherInfo.debounceTimers.delete(filePath);
      await this.processFileChange(eventType, filePath, projectPath);
    }, this.debounceMs);

    watcherInfo.debounceTimers.set(filePath, timer);
  }

  /**
   * Process a file change event after debouncing
   */
  private async processFileChange(
    eventType: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir',
    filePath: string,
    projectPath: string
  ): Promise<void> {
    try {
      let relativePath: string;

      // First check if this is an imported project in our internal directory
      const internalProjectPath = path.join(process.cwd(), '.ai-project', 'projects', path.basename(projectPath));
      const internalConfigPath = path.join(internalProjectPath, 'config.json');
      
      if (await this.fileExists(internalConfigPath)) {
        // This is an imported project
        relativePath = path.relative(internalProjectPath, filePath);
      } else {
        // Check if this is a direct project or has .ai-project/.kiro subfolder
        const configPath = path.join(projectPath, 'config.json');
        const isDirectProject = await this.fileExists(configPath);
        
        if (isDirectProject) {
          // Direct project: files are directly in projectPath
          relativePath = path.relative(projectPath, filePath);
        } else {
          // Try .ai-project first
          const aiProjectDir = path.join(projectPath, '.ai-project');
          const hasAiProject = await this.directoryExists(aiProjectDir);
          
          if (hasAiProject) {
            relativePath = path.relative(aiProjectDir, filePath);
          } else {
            // Try .kiro/specs/ai-project-manager
            const kiroProjectDir = path.join(projectPath, '.kiro', 'specs', 'ai-project-manager');
            const hasKiroProject = await this.directoryExists(kiroProjectDir);
            
            if (hasKiroProject) {
              relativePath = path.relative(kiroProjectDir, filePath);
            } else {
              throw new Error(`Project directory not found. Checked:\n- ${aiProjectDir}\n- ${kiroProjectDir}`);
            }
          }
        }
      }
      
      // Create file change event
      const changeEvent: FileChangeEvent = {
        type: eventType,
        path: filePath,
        projectPath,
        relativePath,
        timestamp: new Date()
      };

      // Emit general file change event
      this.emit('fileChanged', changeEvent);

      // Validate file integrity if enabled and file exists
      if (this.enableIntegrityCheck && (eventType === 'add' || eventType === 'change')) {
        try {
          const integrityResult = await this.validateFileIntegrity(filePath);
          
          if (!integrityResult.isValid || integrityResult.warnings.length > 0) {
            this.emit('integrityWarning', {
              projectPath,
              filePath,
              errors: integrityResult.errors,
              warnings: integrityResult.warnings,
              timestamp: new Date()
            });
          }
        } catch (error) {
          console.warn(`Integrity check failed for ${filePath}:`, error);
        }
      }

      // Emit specific events based on file type
      const fileName = path.basename(filePath);
      
      if (fileName === 'requirements.md') {
        this.emit('requirementsChanged', { ...changeEvent, fileName });
      } else if (fileName === 'design.md') {
        this.emit('designChanged', { ...changeEvent, fileName });
      } else if (fileName === 'tasks.md') {
        this.emit('tasksChanged', { ...changeEvent, fileName });
      } else if (fileName === 'config.json') {
        this.emit('configChanged', { ...changeEvent, fileName });
      } else if (fileName === 'progress.json') {
        this.emit('progressChanged', { ...changeEvent, fileName });
      } else if (relativePath.startsWith('context/')) {
        this.emit('contextChanged', { ...changeEvent, fileName, type: eventType });
      }

      console.log(`File ${eventType}: ${relativePath} in project ${projectPath}`);

    } catch (error) {
      console.error(`Error processing file change for ${filePath}:`, error);
      this.emit('watcherError', {
        projectPath,
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'FILE_PROCESS_ERROR',
        timestamp: new Date()
      });
    }
  }

  /**
   * Check if a directory exists
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Check if a file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      return stats.isFile();
    } catch {
      return false;
    }
  }
}

/**
 * Singleton instance for global file watching (client-side stub)
 */
export const globalFileWatcher = new ProjectFileWatcher({
  debounceMs: 300,
  enableIntegrityCheck: true,
  ignoreInitial: true,
  persistent: true
});