// Conflict resolution mechanisms for simultaneous file modifications
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { EventEmitter } from 'events';

export interface FileConflict {
  id: string;
  filePath: string;
  projectPath: string;
  relativePath: string;
  localContent: string;
  remoteContent: string;
  baseContent?: string; // For three-way merge
  localTimestamp: Date;
  remoteTimestamp: Date;
  conflictType: 'simultaneous_edit' | 'external_change' | 'version_mismatch';
  description: string;
}

export interface ConflictResolution {
  conflictId: string;
  resolution: 'local' | 'remote' | 'merge' | 'manual';
  resolvedContent: string;
  resolvedBy: string;
  resolvedAt: Date;
}

export interface BackupInfo {
  filePath: string;
  backupPath: string;
  timestamp: Date;
  checksum: string;
  size: number;
}

export interface MergeResult {
  success: boolean;
  mergedContent: string;
  conflicts: Array<{
    lineNumber: number;
    localContent: string;
    remoteContent: string;
    baseContent?: string;
  }>;
  warnings: string[];
}

/**
 * Service for detecting and resolving file conflicts
 */
export class ConflictResolutionService extends EventEmitter {
  private activeConflicts: Map<string, FileConflict> = new Map();
  private backupDirectory: string;
  private maxBackups: number = 10;

  constructor(backupDirectory?: string) {
    super();
    this.backupDirectory = backupDirectory || path.join(process.cwd(), '.ai-project-backups');
    this.ensureBackupDirectory();
  }

  /**
   * Detect potential conflicts when a file is about to be modified
   */
  async detectConflict(
    filePath: string,
    newContent: string,
    lastKnownTimestamp?: Date
  ): Promise<FileConflict | null> {
    try {
      // Check if file exists and get current state
      const fileExists = await this.fileExists(filePath);
      if (!fileExists) {
        return null; // No conflict if file doesn't exist
      }

      const currentStats = await fs.stat(filePath);
      const currentContent = await fs.readFile(filePath, 'utf-8');

      // Check if file was modified since last known timestamp
      if (lastKnownTimestamp && currentStats.mtime > lastKnownTimestamp) {
        // Potential conflict detected
        const conflictId = this.generateConflictId(filePath);
        const projectPath = this.extractProjectPath(filePath);
        const relativePath = path.relative(path.join(projectPath, '.ai-project'), filePath);

        const conflict: FileConflict = {
          id: conflictId,
          filePath,
          projectPath,
          relativePath,
          localContent: newContent,
          remoteContent: currentContent,
          localTimestamp: new Date(),
          remoteTimestamp: currentStats.mtime,
          conflictType: 'simultaneous_edit',
          description: `File was modified externally while local changes were pending`
        };

        // Try to load base content for three-way merge
        const baseContent = await this.getBaseContent(filePath);
        if (baseContent) {
          conflict.baseContent = baseContent;
        }

        this.activeConflicts.set(conflictId, conflict);
        this.emit('conflictDetected', conflict);

        return conflict;
      }

      return null; // No conflict detected
    } catch (error) {
      console.error(`Error detecting conflict for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Resolve a conflict with the specified resolution strategy
   */
  async resolveConflict(
    conflictId: string,
    resolution: 'local' | 'remote' | 'merge' | 'manual',
    manualContent?: string,
    resolvedBy: string = 'user'
  ): Promise<ConflictResolution> {
    const conflict = this.activeConflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict not found: ${conflictId}`);
    }

    try {
      // Create backup before resolving
      await this.createBackup(conflict.filePath);

      let resolvedContent: string;

      switch (resolution) {
        case 'local':
          resolvedContent = conflict.localContent;
          break;
        case 'remote':
          resolvedContent = conflict.remoteContent;
          break;
        case 'merge':
          const mergeResult = await this.performThreeWayMerge(conflict);
          if (!mergeResult.success) {
            throw new Error(`Automatic merge failed: ${mergeResult.warnings.join(', ')}`);
          }
          resolvedContent = mergeResult.mergedContent;
          break;
        case 'manual':
          if (!manualContent) {
            throw new Error('Manual content is required for manual resolution');
          }
          resolvedContent = manualContent;
          break;
        default:
          throw new Error(`Invalid resolution strategy: ${resolution}`);
      }

      // Write resolved content atomically
      await this.writeFileAtomically(conflict.filePath, resolvedContent);

      const conflictResolution: ConflictResolution = {
        conflictId,
        resolution,
        resolvedContent,
        resolvedBy,
        resolvedAt: new Date()
      };

      // Remove from active conflicts
      this.activeConflicts.delete(conflictId);

      this.emit('conflictResolved', conflictResolution);

      return conflictResolution;
    } catch (error) {
      this.emit('conflictResolutionError', {
        conflictId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Perform three-way merge using base, local, and remote content
   */
  async performThreeWayMerge(conflict: FileConflict): Promise<MergeResult> {
    const { localContent, remoteContent, baseContent } = conflict;

    if (!baseContent) {
      // Fallback to two-way merge
      return this.performTwoWayMerge(localContent, remoteContent);
    }

    try {
      const localLines = localContent.split('\n');
      const remoteLines = remoteContent.split('\n');
      const baseLines = baseContent.split('\n');

      const mergedLines: string[] = [];
      const conflicts: MergeResult['conflicts'] = [];
      const warnings: string[] = [];

      let localIndex = 0;
      let remoteIndex = 0;
      let baseIndex = 0;

      while (localIndex < localLines.length || remoteIndex < remoteLines.length || baseIndex < baseLines.length) {
        const localLine = localLines[localIndex] || '';
        const remoteLine = remoteLines[remoteIndex] || '';
        const baseLine = baseLines[baseIndex] || '';

        // Simple line-by-line comparison
        if (localLine === remoteLine) {
          // Both sides have the same content
          mergedLines.push(localLine);
          localIndex++;
          remoteIndex++;
          baseIndex++;
        } else if (localLine === baseLine) {
          // Local unchanged, use remote
          mergedLines.push(remoteLine);
          localIndex++;
          remoteIndex++;
          baseIndex++;
        } else if (remoteLine === baseLine) {
          // Remote unchanged, use local
          mergedLines.push(localLine);
          localIndex++;
          remoteIndex++;
          baseIndex++;
        } else {
          // Conflict detected
          conflicts.push({
            lineNumber: mergedLines.length + 1,
            localContent: localLine,
            remoteContent: remoteLine,
            baseContent: baseLine
          });

          // Add conflict markers
          mergedLines.push('<<<<<<< LOCAL');
          mergedLines.push(localLine);
          mergedLines.push('=======');
          mergedLines.push(remoteLine);
          mergedLines.push('>>>>>>> REMOTE');

          localIndex++;
          remoteIndex++;
          baseIndex++;
        }
      }

      const success = conflicts.length === 0;
      if (!success) {
        warnings.push(`${conflicts.length} conflicts detected that require manual resolution`);
      }

      return {
        success,
        mergedContent: mergedLines.join('\n'),
        conflicts,
        warnings
      };
    } catch (error) {
      return {
        success: false,
        mergedContent: localContent, // Fallback to local content
        conflicts: [],
        warnings: [`Merge failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Perform simple two-way merge when base content is not available
   */
  private performTwoWayMerge(localContent: string, remoteContent: string): MergeResult {
    const localLines = localContent.split('\n');
    const remoteLines = remoteContent.split('\n');
    const mergedLines: string[] = [];
    const conflicts: MergeResult['conflicts'] = [];

    const maxLines = Math.max(localLines.length, remoteLines.length);

    for (let i = 0; i < maxLines; i++) {
      const localLine = localLines[i] || '';
      const remoteLine = remoteLines[i] || '';

      if (localLine === remoteLine) {
        mergedLines.push(localLine);
      } else {
        // Conflict detected
        conflicts.push({
          lineNumber: i + 1,
          localContent: localLine,
          remoteContent: remoteLine
        });

        // Add conflict markers
        mergedLines.push('<<<<<<< LOCAL');
        mergedLines.push(localLine);
        mergedLines.push('=======');
        mergedLines.push(remoteLine);
        mergedLines.push('>>>>>>> REMOTE');
      }
    }

    return {
      success: conflicts.length === 0,
      mergedContent: mergedLines.join('\n'),
      conflicts,
      warnings: conflicts.length > 0 ? [`${conflicts.length} conflicts require manual resolution`] : []
    };
  }

  /**
   * Create a backup of a file before modification
   */
  async createBackup(filePath: string): Promise<BackupInfo> {
    try {
      const content = await fs.readFile(filePath);
      const checksum = crypto.createHash('sha256').update(content).digest('hex');
      const stats = await fs.stat(filePath);
      
      const timestamp = new Date();
      const backupFileName = `${path.basename(filePath)}.backup.${timestamp.getTime()}.${checksum.substring(0, 8)}`;
      const backupPath = path.join(this.backupDirectory, backupFileName);

      await fs.copyFile(filePath, backupPath);

      const backupInfo: BackupInfo = {
        filePath,
        backupPath,
        timestamp,
        checksum,
        size: stats.size
      };

      // Clean up old backups
      await this.cleanupOldBackups(filePath);

      this.emit('backupCreated', backupInfo);

      return backupInfo;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('backupError', { filePath, error: errorMessage });
      throw new Error(`Failed to create backup: ${errorMessage}`);
    }
  }

  /**
   * Restore a file from backup
   */
  async restoreFromBackup(backupPath: string, targetPath?: string): Promise<void> {
    try {
      const target = targetPath || this.extractOriginalPath(backupPath);
      
      // Verify backup exists
      await fs.access(backupPath);
      
      // Create backup of current file before restore
      if (await this.fileExists(target)) {
        await this.createBackup(target);
      }

      // Restore from backup
      await fs.copyFile(backupPath, target);

      this.emit('fileRestored', { backupPath, targetPath: target });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('restoreError', { backupPath, error: errorMessage });
      throw new Error(`Failed to restore from backup: ${errorMessage}`);
    }
  }

  /**
   * Get list of available backups for a file
   */
  async getBackupsForFile(filePath: string): Promise<BackupInfo[]> {
    try {
      const fileName = path.basename(filePath);
      const files = await fs.readdir(this.backupDirectory);
      
      const backupFiles = files.filter(file => 
        file.startsWith(`${fileName}.backup.`)
      );

      const backups: BackupInfo[] = [];

      for (const backupFile of backupFiles) {
        try {
          const backupPath = path.join(this.backupDirectory, backupFile);
          const stats = await fs.stat(backupPath);
          
          // Extract timestamp from filename
          const timestampMatch = backupFile.match(/\.backup\.(\d+)\./);
          const timestamp = timestampMatch ? new Date(parseInt(timestampMatch[1])) : stats.mtime;
          
          // Calculate checksum
          const content = await fs.readFile(backupPath);
          const checksum = crypto.createHash('sha256').update(content).digest('hex');

          backups.push({
            filePath,
            backupPath,
            timestamp,
            checksum,
            size: stats.size
          });
        } catch (error) {
          console.warn(`Failed to process backup file ${backupFile}:`, error);
        }
      }

      // Sort by timestamp (newest first)
      return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      console.error(`Failed to get backups for ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Get all active conflicts
   */
  getActiveConflicts(): FileConflict[] {
    return Array.from(this.activeConflicts.values());
  }

  /**
   * Get a specific conflict by ID
   */
  getConflict(conflictId: string): FileConflict | null {
    return this.activeConflicts.get(conflictId) || null;
  }

  /**
   * Clear all active conflicts (use with caution)
   */
  clearAllConflicts(): void {
    this.activeConflicts.clear();
    this.emit('allConflictsCleared');
  }

  // Private helper methods

  private async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.backupDirectory, { recursive: true });
    } catch (error) {
      console.error('Failed to create backup directory:', error);
    }
  }

  private generateConflictId(filePath: string): string {
    const timestamp = Date.now();
    const hash = crypto.createHash('md5').update(filePath).digest('hex').substring(0, 8);
    return `conflict_${timestamp}_${hash}`;
  }

  private extractProjectPath(filePath: string): string {
    const aiProjectIndex = filePath.indexOf('.ai-project');
    if (aiProjectIndex === -1) {
      return path.dirname(filePath);
    }
    return filePath.substring(0, aiProjectIndex - 1);
  }

  private async getBaseContent(filePath: string): Promise<string | null> {
    try {
      // Try to get the most recent backup as base content
      const backups = await this.getBackupsForFile(filePath);
      if (backups.length > 0) {
        return await fs.readFile(backups[0].backupPath, 'utf-8');
      }
      return null;
    } catch (error) {
      console.warn(`Failed to get base content for ${filePath}:`, error);
      return null;
    }
  }

  private async writeFileAtomically(filePath: string, content: string): Promise<void> {
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    try {
      await fs.writeFile(tempPath, content, 'utf-8');
      await fs.rename(tempPath, filePath);
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  private async cleanupOldBackups(filePath: string): Promise<void> {
    try {
      const backups = await this.getBackupsForFile(filePath);
      const backupsToDelete = backups.slice(this.maxBackups);

      for (const backup of backupsToDelete) {
        try {
          await fs.unlink(backup.backupPath);
        } catch (error) {
          console.warn(`Failed to delete old backup ${backup.backupPath}:`, error);
        }
      }
    } catch (error) {
      console.warn(`Failed to cleanup old backups for ${filePath}:`, error);
    }
  }

  private extractOriginalPath(backupPath: string): string {
    const backupFileName = path.basename(backupPath);
    const originalFileName = backupFileName.split('.backup.')[0];
    return path.join(path.dirname(backupPath), originalFileName);
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Global singleton instance for conflict resolution
 */
export const globalConflictResolver = new ConflictResolutionService();