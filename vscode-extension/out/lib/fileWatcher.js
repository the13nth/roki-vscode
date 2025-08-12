"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileWatcherImpl = void 0;
const chokidar = require("chokidar");
const path = require("path");
class FileWatcherImpl {
    constructor() {
        this.watcher = null;
        this.callbacks = [];
    }
    startWatching(projectPath) {
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
    stopWatching() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
        this.callbacks = [];
    }
    onFileChange(callback) {
        this.callbacks.push(callback);
    }
    notifyCallbacks(filePath) {
        for (const callback of this.callbacks) {
            try {
                callback(filePath);
            }
            catch (error) {
                console.error('Error in file change callback:', error);
            }
        }
    }
}
exports.FileWatcherImpl = FileWatcherImpl;
//# sourceMappingURL=fileWatcher.js.map