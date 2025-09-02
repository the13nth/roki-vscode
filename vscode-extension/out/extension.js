"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const projectDetector_1 = require("./lib/projectDetector");
const contextInjector_1 = require("./lib/contextInjector");
const progressTracker_1 = require("./lib/progressTracker");
const fileWatcher_1 = require("./lib/fileWatcher");
const sidebarProvider_1 = require("./lib/sidebarProvider");
const authService_1 = require("./lib/authService");
const projectLoader_1 = require("./lib/projectLoader");
const syncService_1 = require("./lib/syncService");
const projectStateUpdater_1 = require("./lib/projectStateUpdater");
const taskDocumentProvider_1 = require("./lib/taskDocumentProvider");
let extension;
let sidebarProvider;
/**
 * Sets up global error handling for the extension
 */
function setupGlobalErrorHandling() {
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        vscode.window.showErrorMessage(`AI Project Manager: Unexpected error occurred. Check console for details.`);
    });
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
        vscode.window.showErrorMessage(`AI Project Manager: Critical error occurred. Extension may need to be reloaded.`);
    });
}
/**
 * Enhanced error handler with user-friendly messages and recovery suggestions
 */
function handleError(error, context, showToUser = true) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const fullMessage = `${context}: ${errorMessage}`;
    console.error(fullMessage, error);
    if (showToUser) {
        const suggestions = getErrorSuggestions(error, context);
        const message = suggestions ? `${fullMessage}\n\nSuggestion: ${suggestions}` : fullMessage;
        vscode.window.showErrorMessage(message, 'Retry', 'Report Issue').then(choice => {
            if (choice === 'Report Issue') {
                vscode.env.openExternal(vscode.Uri.parse('https://github.com/ai-project-manager/vscode-extension/issues'));
            }
        });
    }
}
/**
 * Provides user-friendly error suggestions based on error type and context
 */
function getErrorSuggestions(error, context) {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes('enoent') || message.includes('no such file')) {
            return 'Check if the project files exist and you have proper permissions.';
        }
        if (message.includes('eacces') || message.includes('permission denied')) {
            return 'Check file permissions or try running VS Code as administrator.';
        }
        if (message.includes('network') || message.includes('fetch')) {
            return 'Check your internet connection and dashboard URL in settings.';
        }
        if (message.includes('json') || message.includes('parse')) {
            return 'The project files may be corrupted. Try refreshing or recreating the project.';
        }
        if (context.includes('dashboard') || context.includes('sync')) {
            return 'Make sure the AI Project Manager dashboard is running on the correct port.';
        }
    }
    return null;
}
/**
 * Validates project structure and provides detailed feedback
 */
async function validateProjectStructure() {
    try {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showWarningMessage('No workspace folder found. Open a folder to use AI Project Manager.');
            return false;
        }
        const kiroSpecsPath = path.join(workspaceFolder.uri.fsPath, '.kiro', 'specs', 'ai-project-manager');
        const hasKiroSpecs = fs.existsSync(kiroSpecsPath);
        const hasAiProject = extension.projectDetector.detectAiProject();
        if (!hasKiroSpecs && !hasAiProject) {
            const choice = await vscode.window.showInformationMessage('No AI project detected in this workspace. Would you like to create one?', 'Create Project', 'Learn More', 'Dismiss');
            if (choice === 'Create Project') {
                await vscode.commands.executeCommand('aiProjectManager.createProject');
            }
            else if (choice === 'Learn More') {
                vscode.env.openExternal(vscode.Uri.parse('https://github.com/ai-project-manager/docs'));
            }
            return false;
        }
        return true;
    }
    catch (error) {
        handleError(error, 'Project structure validation');
        return false;
    }
}
async function connectToDashboard() {
    if (!extension.projectDetector.detectAiProject()) {
        throw new Error('No AI project detected');
    }
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        throw new Error('No workspace folder found');
    }
    // Update sidebar status
    sidebarProvider?.setSyncStatus('syncing');
    try {
        // Get project ID from workspace folder name or generate one
        const projectId = workspaceFolder.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        const config = vscode.workspace.getConfiguration('aiProjectManager');
        const dashboardUrl = config.get('dashboardUrl', 'http://localhost:3000');
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
        // Update sidebar status on success
        sidebarProvider?.setSyncStatus('connected');
    }
    catch (error) {
        // Update sidebar status on failure
        sidebarProvider?.setSyncStatus('disconnected');
        throw error;
    }
}
async function activate(context) {
    console.log('AI Project Manager extension is now active!');
    try {
        // Store extension context globally for auth service
        global.aiProjectManagerContext = context;
        // Initialize error handling
        setupGlobalErrorHandling();
        // Debug: Show activation message
        vscode.window.showInformationMessage('🤖 AI Project Manager extension activated!');
        // Debug: Check auth service initialization
        const authService = authService_1.AuthService.getInstance();
        console.log('Auth service initialized, authenticated:', authService.isAuthenticated());
        if (authService.isAuthenticated()) {
            const user = authService.getCurrentUser();
            console.log('Current user:', user?.name, user?.email);
        }
    }
    catch (error) {
        console.error('Error during extension initialization:', error);
    }
    // Initialize extension components
    const projectDetector = new projectDetector_1.ProjectDetectorImpl();
    const contextInjector = new contextInjector_1.ContextInjectorImpl();
    const progressTracker = new progressTracker_1.ProgressTrackerImpl();
    const fileWatcher = new fileWatcher_1.FileWatcherImpl();
    const projectStateUpdater = new projectStateUpdater_1.ProjectStateUpdater();
    extension = {
        projectDetector,
        contextInjector,
        progressTracker,
        fileWatcher
    };
    // Initialize sidebar provider
    sidebarProvider = new sidebarProvider_1.SidebarProvider();
    console.log('Sidebar provider initialized');
    // Register sidebar tree data provider
    const treeDataProvider = vscode.window.createTreeView('aiProjectManagerSidebar', {
        treeDataProvider: sidebarProvider,
        showCollapseAll: true
    });
    console.log('Tree data provider registered');
    // Register custom editor provider for tasks.md
    const taskDocumentProvider = taskDocumentProvider_1.TaskDocumentProvider.register(context);
    console.log('Task document provider registered');
    // Try to make the view visible
    try {
        await vscode.commands.executeCommand('setContext', 'aiProjectManagerSidebar.visible', true);
        console.log('Set sidebar visible context');
    }
    catch (error) {
        console.log('Failed to set sidebar context:', error);
    }
    // Set context for when project is detected
    const hasProject = projectDetector.detectAiProject();
    await vscode.commands.executeCommand('setContext', 'aiProjectManager.hasProject', hasProject);
    // Register commands
    const injectContextCommand = vscode.commands.registerCommand('aiProjectManager.injectContext', async () => {
        if (extension.projectDetector.detectAiProject()) {
            try {
                const formattedContext = await extension.contextInjector.formatContextForAI();
                // Always copy to clipboard for manual pasting
                await vscode.env.clipboard.writeText(formattedContext);
                vscode.window.showInformationMessage('🤖 AI Context copied to clipboard! You can now paste it manually.');
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
    const toggleAutoInjectCommand = vscode.commands.registerCommand('aiProjectManager.toggleAutoInject', async () => {
        if (extension.contextInjector && 'toggleAutoInject' in extension.contextInjector) {
            await extension.contextInjector.toggleAutoInject();
        }
    });
    const openContextPreferencesCommand = vscode.commands.registerCommand('aiProjectManager.openContextPreferences', async () => {
        if (extension.contextInjector && 'openContextPreferences' in extension.contextInjector) {
            await extension.contextInjector.openContextPreferences();
        }
    });
    const autoInjectContextCommand = vscode.commands.registerCommand('aiProjectManager.autoInjectContext', async () => {
        if (extension.contextInjector && 'autoInjectContext' in extension.contextInjector) {
            await extension.contextInjector.autoInjectContext();
        }
    });
    const refreshSidebarCommand = vscode.commands.registerCommand('aiProjectManager.refreshSidebar', () => {
        sidebarProvider.refresh();
        vscode.window.showInformationMessage('AI Project Manager sidebar refreshed');
    });
    const forceRefreshCommand = vscode.commands.registerCommand('aiProjectManager.forceRefresh', async () => {
        try {
            // Force reload user projects
            await sidebarProvider.refresh();
            // Check authentication status
            const authService = authService_1.AuthService.getInstance();
            const isAuthenticated = authService.isAuthenticated();
            const user = authService.getCurrentUser();
            vscode.window.showInformationMessage(`Sidebar refreshed. Auth: ${isAuthenticated ? 'Yes' : 'No'}, User: ${user?.email || 'None'}`);
        }
        catch (error) {
            handleError(error, 'Force refresh');
        }
    });
    const openDocumentCommand = vscode.commands.registerCommand('aiProjectManager.openDocument', async (filePath) => {
        try {
            if (filePath && require('fs').existsSync(filePath)) {
                const document = await vscode.workspace.openTextDocument(filePath);
                await vscode.window.showTextDocument(document);
            }
            else {
                vscode.window.showErrorMessage('Document not found: ' + filePath);
            }
        }
        catch (error) {
            vscode.window.showErrorMessage('Failed to open document: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    });
    const setSyncStatusCommand = vscode.commands.registerCommand('aiProjectManager.setSyncStatus', (status) => {
        sidebarProvider?.setSyncStatus(status);
    });
    const showSidebarCommand = vscode.commands.registerCommand('aiProjectManager.showSidebar', async () => {
        try {
            await vscode.commands.executeCommand('aiProjectManagerSidebar.focus');
            vscode.window.showInformationMessage('AI Project Manager sidebar should now be visible');
        }
        catch (error) {
            handleError(error, 'Show sidebar');
        }
    });
    const createProjectCommand = vscode.commands.registerCommand('aiProjectManager.createProject', async () => {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('Please open a workspace folder first');
                return;
            }
            const projectName = await vscode.window.showInputBox({
                prompt: 'Enter project name',
                placeHolder: 'my-ai-project',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Project name cannot be empty';
                    }
                    if (!/^[a-zA-Z0-9-_\s]+$/.test(value)) {
                        return 'Project name can only contain letters, numbers, spaces, hyphens, and underscores';
                    }
                    return null;
                }
            });
            if (!projectName)
                return;
            const template = await vscode.window.showQuickPick([
                { label: 'Web Application', description: 'Frontend/fullstack web project' },
                { label: 'API/Backend', description: 'REST API or backend service' },
                { label: 'Mobile App', description: 'Mobile application project' },
                { label: 'Library/Package', description: 'Reusable library or package' },
                { label: 'Data Science', description: 'ML/AI or data analysis project' },
                { label: 'Custom', description: 'Start with basic template' }
            ], {
                placeHolder: 'Select project template'
            });
            if (!template)
                return;
            await createProjectStructure(workspaceFolder.uri.fsPath, projectName, template.label);
            vscode.window.showInformationMessage(`✅ AI Project "${projectName}" created successfully!`, 'Open Dashboard', 'View Files').then(choice => {
                if (choice === 'Open Dashboard') {
                    vscode.commands.executeCommand('aiProjectManager.connectToDashboard');
                }
                else if (choice === 'View Files') {
                    vscode.commands.executeCommand('workbench.files.action.refreshFilesExplorer');
                }
            });
        }
        catch (error) {
            handleError(error, 'Create project');
        }
    });
    const validateProjectCommand = vscode.commands.registerCommand('aiProjectManager.validateProject', async () => {
        try {
            const isValid = await validateProjectStructure();
            if (isValid) {
                vscode.window.showInformationMessage('✅ Project structure is valid');
            }
        }
        catch (error) {
            handleError(error, 'Validate project');
        }
    });
    const repairProjectCommand = vscode.commands.registerCommand('aiProjectManager.repairProject', async () => {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }
            const choice = await vscode.window.showWarningMessage('This will attempt to repair missing project files. Continue?', 'Repair', 'Cancel');
            if (choice !== 'Repair')
                return;
            await repairProjectStructure(workspaceFolder.uri.fsPath);
            vscode.window.showInformationMessage('✅ Project repair completed');
        }
        catch (error) {
            handleError(error, 'Repair project');
        }
    });
    const updateProjectUserInfoCommand = vscode.commands.registerCommand('aiProjectManager.updateProjectUserInfo', async () => {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }
            const authService = authService_1.AuthService.getInstance();
            if (!authService.isAuthenticated()) {
                vscode.window.showWarningMessage('Please login first to update project user information.');
                return;
            }
            const currentUser = authService.getCurrentUser();
            if (!currentUser) {
                vscode.window.showErrorMessage('No user information available');
                return;
            }
            await updateProjectWithUserInfo(workspaceFolder.uri.fsPath, currentUser);
            vscode.window.showInformationMessage(`✅ Project updated with user information for ${currentUser.email}`);
        }
        catch (error) {
            handleError(error, 'Update project user info');
        }
    });
    // Authentication commands
    const loginCommand = vscode.commands.registerCommand('aiProjectManager.login', async () => {
        try {
            const authService = authService_1.AuthService.getInstance();
            const success = await authService.login();
            if (success) {
                // Refresh sidebar to show projects
                sidebarProvider.refresh();
            }
        }
        catch (error) {
            handleError(error, 'Login');
        }
    });
    const logoutCommand = vscode.commands.registerCommand('aiProjectManager.logout', async () => {
        try {
            const authService = authService_1.AuthService.getInstance();
            await authService.logout();
            // Refresh sidebar
            sidebarProvider.refresh();
        }
        catch (error) {
            handleError(error, 'Logout');
        }
    });
    // Project loading commands
    const loadProjectCommand = vscode.commands.registerCommand('aiProjectManager.loadProject', async (projectId) => {
        try {
            const authService = authService_1.AuthService.getInstance();
            if (!authService.isAuthenticated()) {
                const choice = await vscode.window.showInformationMessage('You need to login first to load projects from the cloud.', 'Login', 'Cancel');
                if (choice === 'Login') {
                    await vscode.commands.executeCommand('aiProjectManager.login');
                }
                return;
            }
            const projectLoader = projectLoader_1.ProjectLoader.getInstance();
            let selectedProjectId = projectId;
            // If no project ID provided, show project picker
            if (!selectedProjectId) {
                selectedProjectId = await projectLoader.showProjectPicker();
            }
            if (selectedProjectId) {
                await projectLoader.loadProjectToWorkspace(selectedProjectId);
                // Refresh file explorer and sidebar
                await vscode.commands.executeCommand('workbench.files.action.refreshFilesExplorer');
                sidebarProvider.refresh();
            }
        }
        catch (error) {
            handleError(error, 'Load project');
        }
    });
    const loadProjectRequirementsCommand = vscode.commands.registerCommand('aiProjectManager.loadProjectRequirements', async (projectId) => {
        try {
            const authService = authService_1.AuthService.getInstance();
            if (!authService.isAuthenticated()) {
                vscode.window.showWarningMessage('Please login first to view project requirements.');
                return;
            }
            const projectLoader = projectLoader_1.ProjectLoader.getInstance();
            const project = await projectLoader.getProjectDetails(projectId);
            if (project) {
                // Create a new document with the project requirements
                const document = await vscode.workspace.openTextDocument({
                    content: `# ${project.name}\n\n${project.description}\n\n## Requirements\n\n${project.requirements || 'No requirements available'}`,
                    language: 'markdown'
                });
                await vscode.window.showTextDocument(document);
            }
        }
        catch (error) {
            handleError(error, 'Load project requirements');
        }
    });
    // New command to select a cloud project
    const selectProjectCommand = vscode.commands.registerCommand('aiProjectManager.selectProject', async (projectId) => {
        try {
            // Set the selected project in the sidebar provider
            sidebarProvider.setSelectedProject(projectId);
            // Show confirmation
            const selectedProject = sidebarProvider.getUserProjects().find(p => p.id === projectId);
            if (selectedProject) {
                vscode.window.showInformationMessage(`✅ Selected project: ${selectedProject.name}`);
            }
        }
        catch (error) {
            handleError(error, 'Select project');
        }
    });
    // New command to open cloud documents
    const openCloudDocumentCommand = vscode.commands.registerCommand('aiProjectManager.openCloudDocument', async (projectId, documentType) => {
        try {
            const authService = authService_1.AuthService.getInstance();
            if (!authService.isAuthenticated()) {
                vscode.window.showWarningMessage('Please login first to view cloud documents.');
                return;
            }
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showWarningMessage('Please open a workspace folder first to save documents locally.');
                return;
            }
            const config = vscode.workspace.getConfiguration('aiProjectManager');
            const dashboardUrl = config.get('dashboardUrl', 'http://localhost:3000');
            // Fetch the specific document from cloud using VS Code-specific endpoint
            const response = await authService.makeAuthenticatedRequest(`${dashboardUrl}/api/vscode/projects/${projectId}/documents/${documentType}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
            }
            const documentData = await response.json();
            const content = documentData.content || '';
            // Create local directory structure
            const kiroSpecsPath = path.join(workspaceFolder.uri.fsPath, '.kiro', 'specs', 'ai-project-manager');
            if (!fs.existsSync(kiroSpecsPath)) {
                fs.mkdirSync(kiroSpecsPath, { recursive: true });
                console.log(`✅ Created directory: ${kiroSpecsPath}`);
            }
            // Determine filename based on document type
            let filename;
            switch (documentType) {
                case 'requirements':
                    filename = 'requirements.md';
                    break;
                case 'design':
                    filename = 'design.md';
                    break;
                case 'tasks':
                    filename = 'tasks.md';
                    break;
                default:
                    filename = `${documentType}.md`;
            }
            // Save the document to the local file system
            const filePath = path.join(kiroSpecsPath, filename);
            fs.writeFileSync(filePath, content, 'utf8');
            // Open the document from the local file system
            const document = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(document);
            // Refresh the sidebar to show the newly saved document
            sidebarProvider.refresh();
            vscode.window.showInformationMessage(`📄 Opened and saved ${documentType} from cloud to ${filePath}`);
        }
        catch (error) {
            handleError(error, 'Open cloud document');
        }
    });
    // New command to open local documents
    const openLocalDocumentCommand = vscode.commands.registerCommand('aiProjectManager.openLocalDocument', async (filePath) => {
        try {
            if (!filePath || !fs.existsSync(filePath)) {
                vscode.window.showErrorMessage('Document not found: ' + filePath);
                return;
            }
            const document = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(document);
            vscode.window.showInformationMessage(`📄 Opened local document: ${path.basename(filePath)}`);
        }
        catch (error) {
            handleError(error, 'Open local document');
        }
    });
    // Sync commands
    const forceSyncCommand = vscode.commands.registerCommand('aiProjectManager.forceSync', async () => {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }
            const syncService = syncService_1.SyncService.getInstance();
            // Get project ID from workspace or selected project
            const projectId = sidebarProvider?.getSelectedProject();
            if (!projectId) {
                vscode.window.showErrorMessage('No project selected for sync');
                return;
            }
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "🔄 Force syncing project...",
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0 });
                await syncService.forceSync(projectId, workspaceFolder.uri.fsPath);
                progress.report({ increment: 100 });
            });
        }
        catch (error) {
            handleError(error, 'Force sync');
        }
    });
    const checkCloudChangesCommand = vscode.commands.registerCommand('aiProjectManager.checkCloudChanges', async () => {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }
            const syncService = syncService_1.SyncService.getInstance();
            // Get project ID from workspace or selected project
            const projectId = sidebarProvider?.getSelectedProject();
            if (!projectId) {
                vscode.window.showErrorMessage('No project selected for sync');
                return;
            }
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "🔍 Checking for cloud changes...",
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0 });
                const hasChanges = await syncService.checkCloudChanges(projectId, workspaceFolder.uri.fsPath);
                progress.report({ increment: 100 });
                if (!hasChanges) {
                    vscode.window.showInformationMessage('✅ No cloud changes detected');
                }
            });
        }
        catch (error) {
            handleError(error, 'Check cloud changes');
        }
    });
    const showSyncStatusCommand = vscode.commands.registerCommand('aiProjectManager.showSyncStatus', async () => {
        try {
            const projectId = sidebarProvider?.getSelectedProject();
            if (!projectId) {
                vscode.window.showErrorMessage('No project selected');
                return;
            }
            const syncService = syncService_1.SyncService.getInstance();
            const syncStatus = syncService.getSyncStatus(projectId);
            if (syncStatus) {
                const statusText = syncStatus.status === 'synced' ? '✅ Synced' :
                    syncStatus.status === 'syncing' ? '🔄 Syncing' :
                        syncStatus.status === 'error' ? '❌ Error' : '⚠️ Conflict';
                vscode.window.showInformationMessage(`${statusText}\nLast sync: ${syncStatus.lastSync?.toLocaleString() || 'Never'}\n${syncStatus.message || ''}`);
            }
            else {
                vscode.window.showInformationMessage('No sync status available for this project');
            }
        }
        catch (error) {
            handleError(error, 'Show sync status');
        }
    });
    const listProjectsCommand = vscode.commands.registerCommand('aiProjectManager.listProjects', async () => {
        try {
            const authService = authService_1.AuthService.getInstance();
            if (!authService.isAuthenticated()) {
                vscode.window.showWarningMessage('Please login first to view your projects.');
                return;
            }
            const projectLoader = projectLoader_1.ProjectLoader.getInstance();
            const projects = await projectLoader.listUserProjects();
            if (projects.length === 0) {
                vscode.window.showInformationMessage('No projects found. Create one using the web dashboard.');
                return;
            }
            const projectList = projects.map(p => `• ${p.name} - ${p.description} (${p.progress}% complete)`).join('\n');
            vscode.window.showInformationMessage(`Your Projects:\n${projectList}`);
        }
        catch (error) {
            handleError(error, 'List projects');
        }
    });
    // Authentication settings command
    const openAuthSettingsCommand = vscode.commands.registerCommand('aiProjectManager.openAuthSettings', async () => {
        try {
            // Open browser first to get the token
            const config = vscode.workspace.getConfiguration('aiProjectManager');
            const dashboardUrl = config.get('dashboardUrl', 'http://localhost:3000');
            const loginUrl = `${dashboardUrl}/auth/vscode-login`;
            await vscode.env.openExternal(vscode.Uri.parse(loginUrl));
            // Wait a moment for browser to open
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Show instructions
            vscode.window.showInformationMessage('🌐 Browser opened! Copy the token from the browser and click "Enter Token" in the sidebar to continue.', 'OK');
        }
        catch (error) {
            handleError(error, 'Open auth settings');
        }
    });
    const enterTokenCommand = vscode.commands.registerCommand('aiProjectManager.enterToken', async () => {
        try {
            const config = vscode.workspace.getConfiguration('aiProjectManager');
            // Prompt user to paste token
            const token = await vscode.window.showInputBox({
                prompt: 'Paste your authentication token from the browser',
                placeHolder: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                password: true,
                ignoreFocusOut: true,
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Token cannot be empty';
                    }
                    if (!value.startsWith('eyJ')) {
                        return 'Token should start with "eyJ" (JWT format)';
                    }
                    return null;
                }
            });
            if (token) {
                // Save token to settings
                await config.update('authToken', token, vscode.ConfigurationTarget.Global);
                // Show success message
                vscode.window.showInformationMessage('✅ Token saved! Click "Confirm Token" to verify it.', 'Confirm Now').then(choice => {
                    if (choice === 'Confirm Now') {
                        vscode.commands.executeCommand('aiProjectManager.checkToken');
                    }
                });
                // Refresh sidebar to show updated state
                sidebarProvider.refresh();
            }
        }
        catch (error) {
            handleError(error, 'Enter token');
        }
    });
    // Check token command
    const checkTokenCommand = vscode.commands.registerCommand('aiProjectManager.checkToken', async () => {
        try {
            const authService = authService_1.AuthService.getInstance();
            const config = vscode.workspace.getConfiguration('aiProjectManager');
            const token = config.get('authToken', '');
            if (!token) {
                const choice = await vscode.window.showWarningMessage('No authentication token found. Would you like to set one up?', 'Set Up Token', 'Cancel');
                if (choice === 'Set Up Token') {
                    await vscode.commands.executeCommand('aiProjectManager.openAuthSettings');
                }
                return;
            }
            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "🔍 Verifying token...",
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0 });
                // Verify the token
                const dashboardUrl = config.get('dashboardUrl', 'http://localhost:3000');
                const response = await fetch(`${dashboardUrl}/api/auth/verify-token`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });
                progress.report({ increment: 50 });
                if (response.ok) {
                    const userData = await response.json();
                    const user = {
                        id: userData.userId,
                        email: userData.email,
                        name: userData.name,
                        accessToken: token
                    };
                    // Update user settings and ensure they're saved
                    await authService.updateUserSettings(user);
                    progress.report({ increment: 100 });
                    // Force a configuration update to trigger sidebar refresh
                    await config.update('authToken', token, vscode.ConfigurationTarget.Global);
                    vscode.window.showInformationMessage(`✅ Welcome, ${user.name}! Your projects are now available.`, 'View Projects').then(choice => {
                        if (choice === 'View Projects') {
                            sidebarProvider.refresh();
                        }
                    });
                    // Force immediate sidebar refresh
                    setTimeout(() => {
                        sidebarProvider.refresh();
                    }, 100);
                }
                else {
                    const errorData = await response.text();
                    console.error('Token verification failed:', response.status, errorData);
                    vscode.window.showErrorMessage('❌ Token verification failed. The token may be expired or invalid.', 'Try Again', 'Clear Token').then(choice => {
                        if (choice === 'Try Again') {
                            vscode.commands.executeCommand('aiProjectManager.checkToken');
                        }
                        else if (choice === 'Clear Token') {
                            config.update('authToken', '', vscode.ConfigurationTarget.Global);
                            authService.clearUserSettings();
                            sidebarProvider.refresh();
                        }
                    });
                }
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Token verification failed';
            vscode.window.showErrorMessage(`❌ ${errorMessage}`, 'Try Again', 'Clear Token').then(choice => {
                if (choice === 'Try Again') {
                    vscode.commands.executeCommand('aiProjectManager.checkToken');
                }
                else if (choice === 'Clear Token') {
                    const config = vscode.workspace.getConfiguration('aiProjectManager');
                    config.update('authToken', '', vscode.ConfigurationTarget.Global);
                    authService_1.AuthService.getInstance().clearUserSettings();
                    sidebarProvider.refresh();
                }
            });
        }
    });
    // Update project state command
    const updateProjectStateCommand = vscode.commands.registerCommand('aiProjectManager.updateProjectState', async () => {
        try {
            if (!extension.projectDetector.detectAiProject()) {
                vscode.window.showWarningMessage('No AI project detected in current workspace');
                return;
            }
            vscode.window.showInformationMessage('🔄 Updating project state...');
            const update = await projectStateUpdater.updateProjectState();
            // Show success message with summary
            const completedTasks = update.tasks.filter((t) => t.status === 'done').length;
            const completedRequirements = update.requirements.filter((r) => r.status === 'completed').length;
            const implementedDesigns = update.design.filter((d) => d.status === 'implemented').length;
            const message = `✅ Project state updated successfully!\n\n` +
                `📋 Tasks: ${completedTasks}/${update.tasks.length} completed\n` +
                `📝 Requirements: ${completedRequirements}/${update.requirements.length} completed\n` +
                `🎨 Design: ${implementedDesigns}/${update.design.length} implemented\n` +
                `📊 Overall Progress: ${update.progress.percentage}%`;
            vscode.window.showInformationMessage(message);
            // Refresh the sidebar to show updated progress
            sidebarProvider.refresh();
            // Also refresh cloud project progress to sync with local changes
            try {
                await sidebarProvider.refreshCloudProjectProgress();
            }
            catch (cloudRefreshError) {
                console.warn('Failed to refresh cloud progress:', cloudRefreshError);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to update project state: ${errorMessage}`);
        }
    });
    const refreshCloudProgressCommand = vscode.commands.registerCommand('aiProjectManager.refreshCloudProgress', async () => {
        try {
            vscode.window.showInformationMessage('🔄 Refreshing cloud project progress...');
            await sidebarProvider.refreshCloudProjectProgress();
            vscode.window.showInformationMessage('✅ Cloud project progress refreshed!');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to refresh cloud progress: ${errorMessage}`);
        }
    });
    const refreshUserDetailsCommand = vscode.commands.registerCommand('aiProjectManager.refreshUserDetails', async () => {
        try {
            vscode.window.showInformationMessage('🔄 Refreshing user details...');
            const authService = authService_1.AuthService.getInstance();
            const user = await authService.refreshUserDetails();
            if (user) {
                vscode.window.showInformationMessage(`✅ User details refreshed! Welcome, ${user.name}!`);
                // Refresh the sidebar to show updated user details
                sidebarProvider.refresh();
            }
            else {
                vscode.window.showErrorMessage('❌ Failed to refresh user details. Please check your authentication.');
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to refresh user details: ${errorMessage}`);
        }
    });
    const openTaskEditorCommand = vscode.commands.registerCommand('aiProjectManager.openTaskEditor', async () => {
        try {
            // Try to find a tasks.md file in the workspace
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showWarningMessage('No workspace folder found. Open a folder to use the task editor.');
                return;
            }
            // Look for tasks.md files in the workspace
            const tasksFiles = await vscode.workspace.findFiles('**/tasks.md', '**/node_modules/**');
            if (tasksFiles.length === 0) {
                // If no tasks.md found, offer to create one
                const createChoice = await vscode.window.showInformationMessage('No tasks.md file found. Would you like to create one?', 'Create tasks.md', 'Cancel');
                if (createChoice === 'Create tasks.md') {
                    const newTasksUri = vscode.Uri.joinPath(workspaceFolder.uri, 'tasks.md');
                    const newDocument = await vscode.workspace.openTextDocument(newTasksUri);
                    await vscode.window.showTextDocument(newDocument);
                    // Add some initial content
                    const edit = new vscode.WorkspaceEdit();
                    edit.insert(newTasksUri, new vscode.Position(0, 0), `# Project Tasks

## TODO
- [ ] Add your first task here
- [ ] Another task to complete

## IN PROGRESS
- [ ] Task currently being worked on

## COMPLETED
- [x] Example completed task
`);
                    await vscode.workspace.applyEdit(edit);
                    vscode.window.showInformationMessage('📋 Created tasks.md file! You can now use the task editor.');
                }
                return;
            }
            // Use the first tasks.md file found
            const tasksUri = tasksFiles[0];
            // Open the tasks.md file with the custom editor
            await vscode.commands.executeCommand('vscode.openWith', tasksUri, 'aiProjectManager.taskDocument');
            vscode.window.showInformationMessage('📋 Task editor opened! Use the interactive buttons to manage your tasks.');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to open task editor: ${errorMessage}`);
        }
    });
    context.subscriptions.push(injectContextCommand, detectProjectCommand, connectToDashboardCommand, toggleAutoInjectCommand, openContextPreferencesCommand, autoInjectContextCommand, refreshSidebarCommand, forceRefreshCommand, openDocumentCommand, setSyncStatusCommand, showSidebarCommand, createProjectCommand, validateProjectCommand, repairProjectCommand, updateProjectUserInfoCommand, loginCommand, logoutCommand, loadProjectCommand, listProjectsCommand, loadProjectRequirementsCommand, selectProjectCommand, openCloudDocumentCommand, openLocalDocumentCommand, forceSyncCommand, checkCloudChangesCommand, showSyncStatusCommand, openAuthSettingsCommand, enterTokenCommand, checkTokenCommand, updateProjectStateCommand, refreshCloudProgressCommand, refreshUserDetailsCommand, openTaskEditorCommand, treeDataProvider, taskDocumentProvider);
    // Start file watching and auto progress tracking if project is detected
    if (extension.projectDetector.detectAiProject()) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            extension.fileWatcher.startWatching(workspaceFolder.uri.fsPath);
            // Start automatic progress tracking
            if (extension.progressTracker.startAutoTracking) {
                await extension.progressTracker.startAutoTracking();
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
    // Listen for auth token changes in settings
    const authService = authService_1.AuthService.getInstance();
    const config = vscode.workspace.getConfiguration('aiProjectManager');
    // Check if there's a token in settings on startup
    const existingToken = config.get('authToken', '');
    if (existingToken && !authService.isAuthenticated()) {
        // Try to verify the existing token
        try {
            const dashboardUrl = config.get('dashboardUrl', 'http://localhost:3000');
            const response = await fetch(`${dashboardUrl}/api/auth/verify-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${existingToken}`
                }
            });
            if (response.ok) {
                const userData = await response.json();
                const user = {
                    id: userData.userId,
                    email: userData.email,
                    name: userData.name,
                    accessToken: existingToken
                };
                await authService.updateUserSettings(user);
                vscode.window.showInformationMessage(`✅ Welcome back, ${user.name}!`);
                sidebarProvider.refresh();
            }
            else {
                // Token is invalid, clear it
                await config.update('authToken', '', vscode.ConfigurationTarget.Global);
                await authService.clearUserSettings();
            }
        }
        catch (error) {
            console.error('Failed to verify existing token:', error);
            // Clear invalid token
            await config.update('authToken', '', vscode.ConfigurationTarget.Global);
            await authService.clearUserSettings();
        }
    }
    context.subscriptions.push({ dispose: () => clearInterval(heartbeatInterval) });
}
/**
 * Generates a unique project ID
 */
function generateProjectId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
/**
 * Creates a new AI project structure with templates
 */
async function createProjectStructure(workspacePath, projectName, template) {
    const kiroSpecsPath = path.join(workspacePath, '.kiro', 'specs', 'ai-project-manager');
    // Create directory structure
    if (!fs.existsSync(kiroSpecsPath)) {
        fs.mkdirSync(kiroSpecsPath, { recursive: true });
    }
    // Get current user information if authenticated
    const authService = authService_1.AuthService.getInstance();
    const currentUser = authService.getCurrentUser();
    // Generate a unique project ID
    const projectId = generateProjectId();
    // Create project configuration with user information
    const projectConfig = {
        projectId: projectId,
        name: projectName,
        description: `A ${template.toLowerCase()} project created with AI Project Manager`,
        template: template.toLowerCase().replace(/\s+/g, '-'),
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        aiModel: "gpt-4",
        // Include user information if authenticated
        ...(currentUser && {
            userId: currentUser.id,
            userEmail: currentUser.email,
            userName: currentUser.name,
            createdBy: currentUser.email
        }),
        technologyStack: {
            backend: "node-express",
            frontend: "react",
            uiFramework: "material-ui",
            authentication: "firebase-auth",
            hosting: "google-cloud"
        },
        contextPreferences: {
            maxContextSize: 8000,
            prioritizeRecent: true,
            includeProgress: true
        }
    };
    // Create requirements.md
    const requirementsTemplate = getRequirementsTemplate(projectName, template);
    fs.writeFileSync(path.join(kiroSpecsPath, 'requirements.md'), requirementsTemplate);
    // Create design.md
    const designTemplate = getDesignTemplate(projectName, template);
    fs.writeFileSync(path.join(kiroSpecsPath, 'design.md'), designTemplate);
    // Create tasks.md
    const tasksTemplate = getTasksTemplate(projectName, template);
    fs.writeFileSync(path.join(kiroSpecsPath, 'tasks.md'), tasksTemplate);
    // Create initial progress.json with user information
    const initialProgress = {
        totalTasks: 0,
        completedTasks: 0,
        percentage: 0,
        lastUpdated: new Date().toISOString(),
        recentActivity: [],
        milestones: [],
        // Include user information if authenticated
        ...(currentUser && {
            lastUpdatedBy: currentUser.email,
            createdBy: currentUser.email
        })
    };
    fs.writeFileSync(path.join(kiroSpecsPath, 'progress.json'), JSON.stringify(initialProgress, null, 2));
    // Create config.json with project and user information
    fs.writeFileSync(path.join(kiroSpecsPath, 'config.json'), JSON.stringify(projectConfig, null, 2));
    // Create context directory
    const contextDir = path.join(workspacePath, '.ai-project', 'context');
    if (!fs.existsSync(contextDir)) {
        fs.mkdirSync(contextDir, { recursive: true });
    }
    // Create sample context document
    const contextTemplate = getContextTemplate(projectName, template);
    fs.writeFileSync(path.join(contextDir, 'project-overview.md'), contextTemplate);
    // Log project creation
    console.log(`Created project "${projectName}" with ID: ${projectId}${currentUser ? ` for user: ${currentUser.email}` : ' (no user authentication)'}`);
}
/**
 * Repairs missing project files
 */
async function repairProjectStructure(workspacePath) {
    const kiroSpecsPath = path.join(workspacePath, '.kiro', 'specs', 'ai-project-manager');
    if (!fs.existsSync(kiroSpecsPath)) {
        fs.mkdirSync(kiroSpecsPath, { recursive: true });
    }
    // Get current user information if authenticated
    const authService = authService_1.AuthService.getInstance();
    const currentUser = authService.getCurrentUser();
    // Generate project ID if config doesn't exist
    let projectId = generateProjectId();
    let projectName = 'Repaired Project';
    // Try to read existing config to preserve project information
    const configPath = path.join(kiroSpecsPath, 'config.json');
    if (fs.existsSync(configPath)) {
        try {
            const existingConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            projectId = existingConfig.projectId || projectId;
            projectName = existingConfig.name || projectName;
        }
        catch (error) {
            console.error('Failed to read existing config:', error);
        }
    }
    const files = [
        { name: 'requirements.md', template: '# Requirements Document\n\n## Introduction\n\n## Requirements\n' },
        { name: 'design.md', template: '# Design Document\n\n## Overview\n\n## Architecture\n' },
        { name: 'tasks.md', template: '# Implementation Plan\n\n- [ ] 1. Initial setup\n' },
        { name: 'progress.json', template: JSON.stringify({
                totalTasks: 0,
                completedTasks: 0,
                percentage: 0,
                lastUpdated: new Date().toISOString(),
                recentActivity: [],
                milestones: [],
                // Include user information if authenticated
                ...(currentUser && {
                    lastUpdatedBy: currentUser.email,
                    createdBy: currentUser.email
                })
            }, null, 2) }
    ];
    for (const file of files) {
        const filePath = path.join(kiroSpecsPath, file.name);
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, file.template);
        }
    }
    // Create or update config.json with user information
    const projectConfig = {
        projectId: projectId,
        name: projectName,
        description: 'Project repaired by AI Project Manager',
        template: 'custom',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        aiModel: "gpt-4",
        // Include user information if authenticated
        ...(currentUser && {
            userId: currentUser.id,
            userEmail: currentUser.email,
            userName: currentUser.name,
            lastModifiedBy: currentUser.email
        }),
        technologyStack: {
            backend: "node-express",
            frontend: "react",
            uiFramework: "material-ui",
            authentication: "firebase-auth",
            hosting: "google-cloud"
        },
        contextPreferences: {
            maxContextSize: 8000,
            prioritizeRecent: true,
            includeProgress: true
        }
    };
    fs.writeFileSync(configPath, JSON.stringify(projectConfig, null, 2));
}
/**
 * Updates existing project with user information
 */
async function updateProjectWithUserInfo(workspacePath, user) {
    const kiroSpecsPath = path.join(workspacePath, '.kiro', 'specs', 'ai-project-manager');
    const configPath = path.join(kiroSpecsPath, 'config.json');
    const progressPath = path.join(kiroSpecsPath, 'progress.json');
    // Update config.json with user information
    if (fs.existsSync(configPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            const updatedConfig = {
                ...config,
                userId: user.id,
                userEmail: user.email,
                userName: user.name,
                lastModifiedBy: user.email,
                lastModified: new Date().toISOString()
            };
            fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2));
            console.log(`Updated config.json with user info for ${user.email}`);
        }
        catch (error) {
            console.error('Failed to update config.json:', error);
        }
    }
    // Update progress.json with user information
    if (fs.existsSync(progressPath)) {
        try {
            const progress = JSON.parse(fs.readFileSync(progressPath, 'utf-8'));
            const updatedProgress = {
                ...progress,
                lastUpdatedBy: user.email,
                lastUpdated: new Date().toISOString(),
                // Add createdBy if not present
                ...(progress.createdBy ? {} : { createdBy: user.email })
            };
            fs.writeFileSync(progressPath, JSON.stringify(updatedProgress, null, 2));
            console.log(`Updated progress.json with user info for ${user.email}`);
        }
        catch (error) {
            console.error('Failed to update progress.json:', error);
        }
    }
}
/**
 * Template generators
 */
function getRequirementsTemplate(projectName, template) {
    return `# ${projectName} - Requirements Document

## Introduction

${projectName} is a ${template.toLowerCase()} project that aims to...

## Requirements

### Requirement 1

**User Story:** As a user, I want to...

#### Acceptance Criteria

1. WHEN... THEN...
2. WHEN... THEN...

### Requirement 2

**User Story:** As a user, I want to...

#### Acceptance Criteria

1. WHEN... THEN...
2. WHEN... THEN...
`;
}
function getDesignTemplate(projectName, template) {
    return `# ${projectName} - Design Document

## Overview

This document outlines the design and architecture for ${projectName}.

## Architecture

### System Architecture

Describe the overall system architecture...

### Technology Stack

- **Frontend:** 
- **Backend:** 
- **Database:** 
- **Deployment:** 

## User Interface Design

### Wireframes

Describe the UI/UX design...

### User Flow

1. User lands on...
2. User navigates to...
3. User completes...
`;
}
function getTasksTemplate(projectName, template) {
    const templateTasks = getTemplateSpecificTasks(template);
    return `# ${projectName} - Implementation Plan

## Setup and Configuration

- [ ] 1. Set up project structure
  - Create project directories and files
  - Initialize version control
  - Set up development setup
  - Configure build tools and dependencies

${templateTasks}

## Testing and Deployment

- [ ] 10. Implement testing
  - Write unit tests
  - Add integration tests
  - Set up continuous integration

- [ ] 11. Prepare for deployment
  - Configure production environment
  - Set up deployment pipeline
  - Create documentation
`;
}
function getTemplateSpecificTasks(template) {
    switch (template) {
        case 'Web Application':
            return `
## Frontend Development

- [ ] 2. Set up frontend framework
  - Initialize React/Vue/Angular project
  - Configure routing
  - Set up state management
  - Configure styling system

- [ ] 3. Implement core components
  - Create layout components
  - Build reusable UI components
  - Implement navigation
  - Add responsive design

## Backend Development

- [ ] 4. Set up backend API
  - Initialize server framework
  - Configure database connection
  - Set up authentication
  - Create API endpoints

- [ ] 5. Implement business logic
  - Create data models
  - Implement CRUD operations
  - Add validation and error handling
  - Set up middleware
`;
        case 'API/Backend':
            return `
## API Development

- [ ] 2. Design API structure
  - Define API endpoints
  - Create data models
  - Set up database schema
  - Configure authentication

- [ ] 3. Implement core functionality
  - Create CRUD operations
  - Add business logic
  - Implement validation
  - Set up error handling

- [ ] 4. Add advanced features
  - Implement caching
  - Add rate limiting
  - Set up logging
  - Create API documentation
`;
        case 'Mobile App':
            return `
## Mobile Development

- [ ] 2. Set up mobile framework
  - Initialize React Native/Flutter project
  - Configure navigation
  - Set up state management
  - Configure build tools

- [ ] 3. Implement core screens
  - Create main navigation
  - Build key user interfaces
  - Add form handling
  - Implement data persistence

- [ ] 4. Add platform features
  - Integrate device APIs
  - Add push notifications
  - Implement offline support
  - Configure app store deployment
`;
        default:
            return `
## Core Development

- [ ] 2. Implement core functionality
  - Define main features
  - Create core modules
  - Add configuration
  - Set up data handling

- [ ] 3. Add advanced features
  - Implement additional functionality
  - Add integrations
  - Create utilities
  - Optimize performance
`;
    }
}
function getContextTemplate(projectName, template) {
    return `# ${projectName} - Project Overview

## Project Description

${projectName} is a ${template.toLowerCase()} project that...

## Key Features

- Feature 1: Description
- Feature 2: Description
- Feature 3: Description

## Technical Details

### Architecture
Brief description of the system architecture...

### Dependencies
List of main dependencies and their purposes...

### Configuration
Important configuration details...

## Development Notes

### Getting Started
Steps to set up the development setup...

### Common Tasks
Frequently used commands and procedures...

### Troubleshooting
Common issues and their solutions...
`;
}
function deactivate() {
    if (extension?.fileWatcher) {
        extension.fileWatcher.stopWatching();
    }
    if (extension?.progressTracker.stopAutoTracking) {
        extension.progressTracker.stopAutoTracking();
    }
    if (extension?.contextInjector && 'dispose' in extension.contextInjector) {
        extension.contextInjector.dispose();
    }
    // Cleanup sync service
    syncService_1.SyncService.getInstance().dispose();
}
//# sourceMappingURL=extension.js.map