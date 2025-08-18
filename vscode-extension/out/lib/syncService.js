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
            console.log(`📥 Downloading cloud documents for project ${projectId} to ${localPath}`);
            const config = vscode.workspace.getConfiguration('aiProjectManager');
            const dashboardUrl = config.get('dashboardUrl', 'http://localhost:3000');
            // Fetch documents from cloud using VS Code-specific endpoint
            const response = await this.authService.makeAuthenticatedRequest(`${dashboardUrl}/api/vscode/projects/${projectId}/documents`);
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`API Error Response: ${errorText}`);
                throw new Error(`Failed to fetch cloud documents: ${response.status} ${response.statusText}. Response: ${errorText}`);
            }
            const responseText = await response.text();
            console.log(`API Response: ${responseText}`);
            let documents;
            try {
                documents = JSON.parse(responseText);
            }
            catch (parseError) {
                console.error('JSON Parse Error:', parseError);
                console.error('Response was not valid JSON:', responseText);
                throw new Error(`Invalid JSON response from server: ${responseText.substring(0, 200)}...`);
            }
            // Create local directory structure
            const kiroSpecsPath = path.join(localPath, '.kiro', 'specs', 'ai-project-manager');
            console.log(`📁 Creating directory structure: ${kiroSpecsPath}`);
            if (!fs.existsSync(kiroSpecsPath)) {
                fs.mkdirSync(kiroSpecsPath, { recursive: true });
                console.log(`✅ Created directory: ${kiroSpecsPath}`);
            }
            else {
                console.log(`📁 Directory already exists: ${kiroSpecsPath}`);
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
                    console.log(`💾 Downloaded and saved: ${doc.filename} to ${filePath}`);
                }
                else {
                    console.log(`⚠️ No content found for ${doc.key}`);
                }
            }
            // Update sync status
            this.syncStatus.set(projectId, {
                lastSync: new Date(),
                status: 'synced',
                message: 'Documents downloaded successfully'
            });
            console.log(`✅ Successfully downloaded cloud documents for project ${projectId}`);
            console.log(`📂 Documents saved to: ${kiroSpecsPath}`);
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
            // Upload each document to cloud using VS Code-specific endpoint
            for (const [docType, docData] of Object.entries(documents)) {
                const response = await this.authService.makeAuthenticatedRequest(`${dashboardUrl}/api/vscode/projects/${projectId}/documents/${docType}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(docData)
                });
                if (!response.ok) {
                    throw new Error(`Failed to upload ${docType}: ${response.status} ${response.statusText}`);
                }
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
     * Start file watching for automatic sync
     */
    startFileWatching(projectId, localPath) {
        try {
            // Stop existing watcher if any
            this.stopFileWatching(projectId);
            const kiroSpecsPath = path.join(localPath, '.kiro', 'specs', 'ai-project-manager');
            // Watch for changes in project files
            const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(kiroSpecsPath, '*.md'));
            watcher.onDidChange(async (uri) => {
                console.log(`File changed: ${uri.fsPath}`);
                try {
                    await this.uploadLocalDocuments(projectId, localPath);
                }
                catch (error) {
                    console.error('Error syncing file change:', error);
                }
            });
            this.fileWatchers.set(projectId, watcher);
            console.log(`Started file watching for project ${projectId}`);
        }
        catch (error) {
            console.error('Error starting file watching:', error);
        }
    }
    /**
     * Stop file watching
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
     * Check for cloud changes
     */
    async checkCloudChanges(projectId, localPath) {
        try {
            const config = vscode.workspace.getConfiguration('aiProjectManager');
            const dashboardUrl = config.get('dashboardUrl', 'http://localhost:3000');
            const response = await this.authService.makeAuthenticatedRequest(`${dashboardUrl}/api/vscode/projects/${projectId}/sync/status`);
            if (!response.ok) {
                throw new Error(`Failed to check cloud changes: ${response.status} ${response.statusText}`);
            }
            const status = await response.json();
            if (status.hasChanges) {
                console.log(`Cloud changes detected for project ${projectId}, downloading...`);
                await this.downloadCloudDocuments(projectId, localPath);
                return true;
            }
            return false;
        }
        catch (error) {
            console.error('Error checking cloud changes:', error);
            return false;
        }
    }
    /**
     * Create backup of local files
     */
    async createBackup(kiroSpecsPath) {
        try {
            const backupPath = path.join(kiroSpecsPath, 'backup');
            if (!fs.existsSync(backupPath)) {
                fs.mkdirSync(backupPath, { recursive: true });
            }
            const files = ['requirements.md', 'design.md', 'tasks.md'];
            for (const file of files) {
                const sourcePath = path.join(kiroSpecsPath, file);
                const backupFilePath = path.join(backupPath, `${file}.backup.${Date.now()}`);
                if (fs.existsSync(sourcePath)) {
                    fs.copyFileSync(sourcePath, backupFilePath);
                }
            }
        }
        catch (error) {
            console.error('Error creating backup:', error);
        }
    }
    /**
     * Get sync status for a project
     */
    getSyncStatus(projectId) {
        return this.syncStatus.get(projectId) || {
            status: 'unknown',
            lastSync: null,
            message: 'No sync status available'
        };
    }
    /**
     * Force sync for a project
     */
    async forceSync(projectId, localPath) {
        try {
            console.log(`Force syncing project ${projectId}`);
            await this.uploadLocalDocuments(projectId, localPath);
            await this.downloadCloudDocuments(projectId, localPath);
        }
        catch (error) {
            console.error('Error force syncing:', error);
            throw error;
        }
    }
    /**
     * Check if there are cloud changes
     */
    async hasCloudChanges(projectId) {
        try {
            const config = vscode.workspace.getConfiguration('aiProjectManager');
            const dashboardUrl = config.get('dashboardUrl', 'http://localhost:3000');
            const response = await this.authService.makeAuthenticatedRequest(`${dashboardUrl}/api/vscode/projects/${projectId}/sync/status`);
            if (!response.ok) {
                return false;
            }
            const status = await response.json();
            return status.hasChanges || false;
        }
        catch (error) {
            console.error('Error checking cloud changes:', error);
            return false;
        }
    }
    /**
     * Dispose all resources
     */
    dispose() {
        // Stop all file watchers
        for (const [projectId, watcher] of this.fileWatchers) {
            watcher.dispose();
        }
        this.fileWatchers.clear();
        this.syncStatus.clear();
    }
}
exports.SyncService = SyncService;
//# sourceMappingURL=syncService.js.map