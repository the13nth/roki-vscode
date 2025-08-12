"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const projectDetector_1 = require("./lib/projectDetector");
const contextInjector_1 = require("./lib/contextInjector");
const progressTracker_1 = require("./lib/progressTracker");
const fileWatcher_1 = require("./lib/fileWatcher");
let extension;
async function connectToDashboard() {
    if (!extension.projectDetector.detectAiProject()) {
        throw new Error('No AI project detected');
    }
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        throw new Error('No workspace folder found');
    }
    // Get project ID from workspace folder name or generate one
    const projectId = workspaceFolder.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const dashboardUrl = 'http://localhost:3000';
    const response = await fetch(`${dashboardUrl}/api/projects/${projectId}/vscode`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            version: vscode.version,
            workspacePath: workspaceFolder.uri.fsPath,
            timestamp: new Date().toISOString()
        })
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to connect to dashboard`);
    }
}
async function activate(context) {
    console.log('AI Project Manager extension is now active!');
    // Initialize extension components
    const projectDetector = new projectDetector_1.ProjectDetectorImpl();
    const contextInjector = new contextInjector_1.ContextInjectorImpl();
    const progressTracker = new progressTracker_1.ProgressTrackerImpl();
    const fileWatcher = new fileWatcher_1.FileWatcherImpl();
    extension = {
        projectDetector,
        contextInjector,
        progressTracker,
        fileWatcher
    };
    // Register commands
    const injectContextCommand = vscode.commands.registerCommand('aiProjectManager.injectContext', async () => {
        if (extension.projectDetector.detectAiProject()) {
            try {
                const formattedContext = await extension.contextInjector.formatContextForAI();
                // Copy to clipboard
                await vscode.env.clipboard.writeText(formattedContext);
                vscode.window.showInformationMessage('AI Context copied to clipboard!');
                console.log('Formatted context:', formattedContext);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                vscode.window.showErrorMessage(`Failed to inject context: ${errorMessage}`);
            }
        }
        else {
            vscode.window.showWarningMessage('No AI project detected in current workspace');
        }
    });
    const detectProjectCommand = vscode.commands.registerCommand('aiProjectManager.detectProject', () => {
        const isDetected = extension.projectDetector.detectAiProject();
        if (isDetected) {
            const structure = extension.projectDetector.getProjectStructure();
            vscode.window.showInformationMessage(`AI Project detected at: ${structure.configPath}`);
        }
        else {
            vscode.window.showInformationMessage('No AI project found in current workspace');
        }
    });
    const connectToDashboardCommand = vscode.commands.registerCommand('aiProjectManager.connectToDashboard', async () => {
        try {
            await connectToDashboard();
            vscode.window.showInformationMessage('✅ Connected to AI Project Dashboard!');
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });
    context.subscriptions.push(injectContextCommand, detectProjectCommand, connectToDashboardCommand);
    // Start file watching and auto progress tracking if project is detected
    if (extension.projectDetector.detectAiProject()) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            extension.fileWatcher.startWatching(workspaceFolder.uri.fsPath);
            // Start automatic progress tracking
            if (extension.progressTracker.startAutoTracking) {
                extension.progressTracker.startAutoTracking();
            }
            // Auto-connect to dashboard
            try {
                await connectToDashboard();
                vscode.window.showInformationMessage('🎯 AI Project Manager activated! Connected to dashboard.');
            }
            catch {
                vscode.window.showInformationMessage('🎯 AI Project Manager activated! Auto-tracking enabled.');
            }
        }
    }
    else {
        vscode.window.showWarningMessage('⚠️ No AI project detected in current workspace');
    }
    // Set up periodic heartbeat to maintain connection
    const heartbeatInterval = setInterval(async () => {
        if (extension.projectDetector.detectAiProject()) {
            try {
                await connectToDashboard();
            }
            catch {
                // Silently fail heartbeat
            }
        }
    }, 15000); // Every 15 seconds
    context.subscriptions.push({ dispose: () => clearInterval(heartbeatInterval) });
}
function deactivate() {
    if (extension?.fileWatcher) {
        extension.fileWatcher.stopWatching();
    }
    if (extension?.progressTracker.stopAutoTracking) {
        extension.progressTracker.stopAutoTracking();
    }
}
//# sourceMappingURL=extension.js.map