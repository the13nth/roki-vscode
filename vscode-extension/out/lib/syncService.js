"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncService = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const authService_1 = require("./authService");
class SyncService {
    static getInstance() {
        if (!SyncService.instance) {
            SyncService.instance = new SyncService();
        }
        return SyncService.instance;
    }
    constructor() {
        this.syncStatus = new Map();
        this.fileWatchers = new Map();
        this.authService = authService_1.AuthService.getInstance();
    }
    /**
     * Download cloud documents to local folder
     */
    async downloadCloudDocuments(projectId, localPath) {
        try {
            console.log(`Downloading cloud documents for project ${projectId} to ${localPath}`);
            const config = vscode.workspace.getConfiguration('aiProjectManager');
            const dashboardUrl = config.get('dashboardUrl', 'http://localhost:3000');
            // Fetch documents from cloud using VS Code-specific endpoint
            const response = await this.authService.makeAuthenticatedRequest(`${dashboardUrl}/api/vscode/projects/${projectId}/documents`);
            if (!response.ok) {
                throw new Error(`Failed to fetch cloud documents: ${response.status} ${response.statusText}`);
            }
            const documents = await response.json();
            // Create local directory structure
            const kiroSpecsPath = path.join(localPath, '.kiro', 'specs', 'ai-project-manager');
            if (!fs.existsSync(kiroSpecsPath)) {
                fs.mkdirSync(kiroSpecsPath, { recursive: true });
            }
            // Create backup before updating
            await this.createBackup(kiroSpecsPath);
            // Write documents to local files
            const documentFiles = [
                { key: 'requirements', filename: 'requirements.md' },
                { key: 'design', filename: 'design.md' },
                { key: 'tasks', filename: 'tasks.md' }
            ];
            for (const doc of documentFiles) {
                if (documents[doc.key] && documents[doc.key].content) {
                    const filePath = path.join(kiroSpecsPath, doc.filename);
                    fs.writeFileSync(filePath, documents[doc.key].content);
                    console.log(`Downloaded ${doc.filename}`);
                }
            }
            // Update sync status
            this.syncStatus.set(projectId, {
                lastSync: new Date(),
                status: 'synced',
                message: 'Documents downloaded successfully'
            });
            console.log(`Successfully downloaded cloud documents for project ${projectId}`);
        }
        catch (error) {
            console.error('Error downloading cloud documents:', error);
            this.syncStatus.set(projectId, {
                lastSync: new Date(),
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * Upload local documents to cloud
     */
    async uploadLocalDocuments(projectId, localPath) {
        try {
            console.log(`Uploading local documents for project ${projectId} from ${localPath}`);
            const config = vscode.workspace.getConfiguration('aiProjectManager');
            const dashboardUrl = config.get('dashboardUrl', 'http://localhost:3000');
            // Read local documents
            const kiroSpecsPath = path.join(localPath, '.kiro', 'specs', 'ai-project-manager');
            const documents = {};
            const documentFiles = [
                { key: 'requirements', filename: 'requirements.md' },
                { key: 'design', filename: 'design.md' },
                { key: 'tasks', filename: 'tasks.md' }
            ];
            for (const doc of documentFiles) {
                const filePath = path.join(kiroSpecsPath, doc.filename);
                if (fs.existsSync(filePath)) {
                    documents[doc.key] = {
                        content: fs.readFileSync(filePath, 'utf-8'),
                        lastModified: fs.statSync(filePath).mtime.toISOString()
                    };
                }
            }
            // Upload each document to cloud
            for (const [docType, docData] of Object.entries(documents)) {
                const response = await this.authService.makeAuthenticatedRequest(`${dashboardUrl}/api/projects/${projectId}/documents/${docType}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        content: docData.content,
                        lastKnownTimestamp: docData.lastModified
                    })
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Failed to upload ${docType}: ${response.status} ${response.statusText} - ${errorText}`);
                }
                console.log(`Uploaded ${docType} to cloud`);
            }
            // Update sync status
            this.syncStatus.set(projectId, {
                lastSync: new Date(),
                status: 'synced',
                message: 'Documents uploaded successfully'
            });
            console.log(`Successfully uploaded local documents for project ${projectId}`);
        }
        catch (error) {
            console.error('Error uploading local documents:', error);
            this.syncStatus.set(projectId, {
                lastSync: new Date(),
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * Start watching local files for changes
     */
    startFileWatching(projectId, localPath) {
        console.log(`Starting file watching for project ${projectId} at ${localPath}`);
        // Stop existing watcher if any
        this.stopFileWatching(projectId);
        const kiroSpecsPath = path.join(localPath, '.kiro', 'specs', 'ai-project-manager');
        // Create watcher for document files
        const watcher = vscode.workspace.createFileSystemWatcher(path.join(kiroSpecsPath, '*.md'));
        // Handle file changes
        watcher.onDidChange(async (uri) => {
            console.log(`File changed: ${uri.fsPath}`);
            await this.handleLocalFileChange(projectId, localPath, uri.fsPath);
        });
        watcher.onDidCreate(async (uri) => {
            console.log(`File created: ${uri.fsPath}`);
            await this.handleLocalFileChange(projectId, localPath, uri.fsPath);
        });
        watcher.onDidDelete(async (uri) => {
            console.log(`File deleted: ${uri.fsPath}`);
            await this.handleLocalFileChange(projectId, localPath, uri.fsPath);
        });
        this.fileWatchers.set(projectId, watcher);
    }
    /**
     * Stop watching local files
     */
    stopFileWatching(projectId) {
        const watcher = this.fileWatchers.get(projectId);
        if (watcher) {
            watcher.dispose();
            this.fileWatchers.delete(projectId);
            console.log(`Stopped file watching for project ${projectId}`);
        }
    }
    /**
     * Handle local file changes
     */
    async handleLocalFileChange(projectId, localPath, filePath) {
        try {
            // Debounce rapid changes
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log(`Handling local file change: ${filePath}`);
            // Update sync status
            this.syncStatus.set(projectId, {
                lastSync: new Date(),
                status: 'syncing',
                message: 'Syncing local changes to cloud...'
            });
            // Upload the changed file to cloud
            await this.uploadLocalDocuments(projectId, localPath);
            vscode.window.showInformationMessage(`✅ Local changes synced to cloud`);
        }
        catch (error) {
            console.error('Error handling local file change:', error);
            vscode.window.showErrorMessage(`❌ Failed to sync local changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
            this.syncStatus.set(projectId, {
                lastSync: new Date(),
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * Check for cloud changes and update local files
     */
    async checkCloudChanges(projectId, localPath) {
        try {
            console.log(`Checking for cloud changes for project ${projectId}`);
            const config = vscode.workspace.getConfiguration('aiProjectManager');
            const dashboardUrl = config.get('dashboardUrl', 'http://localhost:3000');
            // Fetch current cloud documents using VS Code-specific endpoint
            const response = await this.authService.makeAuthenticatedRequest(`${dashboardUrl}/api/vscode/projects/${projectId}/documents`);
            if (!response.ok) {
                throw new Error(`Failed to fetch cloud documents: ${response.status} ${response.statusText}`);
            }
            const cloudDocuments = await response.json();
            // Read local documents
            const kiroSpecsPath = path.join(localPath, '.kiro', 'specs', 'ai-project-manager');
            const localDocuments = {};
            const documentFiles = [
                { key: 'requirements', filename: 'requirements.md' },
                { key: 'design', filename: 'design.md' },
                { key: 'tasks', filename: 'tasks.md' }
            ];
            for (const doc of documentFiles) {
                const filePath = path.join(kiroSpecsPath, doc.filename);
                if (fs.existsSync(filePath)) {
                    localDocuments[doc.key] = {
                        content: fs.readFileSync(filePath, 'utf-8'),
                        lastModified: fs.statSync(filePath).mtime
                    };
                }
            }
            // Check for changes
            let hasChanges = false;
            for (const doc of documentFiles) {
                const cloudDoc = cloudDocuments[doc.key];
                const localDoc = localDocuments[doc.key];
                if (cloudDoc && cloudDoc.content && (!localDoc || cloudDoc.content !== localDoc.content)) {
                    hasChanges = true;
                    break;
                }
            }
            if (hasChanges) {
                console.log(`Cloud changes detected for project ${projectId}`);
                // Create backup before updating
                await this.createBackup(kiroSpecsPath);
                // Update local files
                for (const doc of documentFiles) {
                    if (cloudDocuments[doc.key] && cloudDocuments[doc.key].content) {
                        const filePath = path.join(kiroSpecsPath, doc.filename);
                        fs.writeFileSync(filePath, cloudDocuments[doc.key].content);
                        console.log(`Updated local ${doc.filename} from cloud`);
                    }
                }
                vscode.window.showInformationMessage(`✅ Cloud changes synced to local files`);
                // Update sync status
                this.syncStatus.set(projectId, {
                    lastSync: new Date(),
                    status: 'synced',
                    message: 'Cloud changes synced to local files'
                });
            }
            return hasChanges;
        }
        catch (error) {
            console.error('Error checking cloud changes:', error);
            this.syncStatus.set(projectId, {
                lastSync: new Date(),
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    /**
     * Create backup of local documents
     */
    async createBackup(kiroSpecsPath) {
        try {
            const backupDir = path.join(kiroSpecsPath, 'backups');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(backupDir, `backup-${timestamp}`);
            if (!fs.existsSync(backupPath)) {
                fs.mkdirSync(backupPath, { recursive: true });
            }
            const documentFiles = ['requirements.md', 'design.md', 'tasks.md'];
            for (const filename of documentFiles) {
                const sourcePath = path.join(kiroSpecsPath, filename);
                const backupFilePath = path.join(backupPath, filename);
                if (fs.existsSync(sourcePath)) {
                    fs.copyFileSync(sourcePath, backupFilePath);
                }
            }
            console.log(`Created backup at: ${backupPath}`);
            // Keep only last 5 backups
            const backups = fs.readdirSync(backupDir)
                .filter(dir => dir.startsWith('backup-'))
                .sort()
                .reverse();
            if (backups.length > 5) {
                for (const oldBackup of backups.slice(5)) {
                    const oldBackupPath = path.join(backupDir, oldBackup);
                    fs.rmSync(oldBackupPath, { recursive: true, force: true });
                    console.log(`Removed old backup: ${oldBackup}`);
                }
            }
        }
        catch (error) {
            console.error('Error creating backup:', error);
            // Don't throw error for backup failures
        }
    }
    /**
     * Get sync status for a project
     */
    getSyncStatus(projectId) {
        return this.syncStatus.get(projectId);
    }
    /**
     * Force sync for a project
     */
    async forceSync(projectId, localPath) {
        try {
            console.log(`Force syncing project ${projectId}`);
            this.syncStatus.set(projectId, {
                lastSync: new Date(),
                status: 'syncing',
                message: 'Force syncing...'
            });
            // Download from cloud first
            await this.downloadCloudDocuments(projectId, localPath);
            // Then upload local changes
            await this.uploadLocalDocuments(projectId, localPath);
            vscode.window.showInformationMessage(`✅ Force sync completed for project ${projectId}`);
        }
        catch (error) {
            console.error('Error during force sync:', error);
            vscode.window.showErrorMessage(`❌ Force sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }
    /**
     * Cleanup resources
     */
    dispose() {
        for (const [projectId, watcher] of this.fileWatchers) {
            watcher.dispose();
        }
        this.fileWatchers.clear();
        this.syncStatus.clear();
    }
}
exports.SyncService = SyncService;
//# sourceMappingURL=syncService.js.map