import * as chokidar from 'chokidar';
import * as path from 'path';
import { FileWatcher } from '../types';

export class FileWatcherImpl implements FileWatcher {
    private watcher: chokidar.FSWatcher | null = null;
    private callbacks: Array<(filePath: string) => void> = [];
    
    startWatching(projectPath: string): void {
        if (this.watcher) {
            this.stopWatching();
        }
        
        const aiProjectPath = path.join(projectPath, '.ai-project');
        
        this.watcher = chokidar.watch(aiProjectPath, {
            ignored: /(^|[\/\\])\../, // ignore dotfiles
            persistent: true,
            ignoreInitial: true
        });
        
        this.watcher
            .on('change', (filePath) => {
                console.log(`File changed: ${filePath}`);
                this.notifyCallbacks(filePath);
            })
            .on('add', (filePath) => {
                console.log(`File added: ${filePath}`);
                this.notifyCallbacks(filePath);
            })
            .on('unlink', (filePath) => {
                console.log(`File removed: ${filePath}`);
                this.notifyCallbacks(filePath);
            })
            .on('error', (error) => {
                console.error('File watcher error:', error);
            });
    }
    
    stopWatching(): void {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
        this.callbacks = [];
    }
    
    onFileChange(callback: (filePath: string) => void): void {
        this.callbacks.push(callback);
    }
    
    private notifyCallbacks(filePath: string): void {
        for (const callback of this.callbacks) {
            try {
                callback(filePath);
            } catch (error) {
                console.error('Error in file change callback:', error);
            }
        }
    }
}