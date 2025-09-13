"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SidebarProvider = exports.SidebarItem = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const projectDetector_1 = require("./projectDetector");
const authService_1 = require("./authService");
const projectLoader_1 = require("./projectLoader");
class SidebarItem extends vscode.TreeItem {
    constructor(label, collapsibleState, contextValue, command, tooltip, iconPath, description) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.contextValue = contextValue;
        this.command = command;
        this.tooltip = tooltip;
        this.description = description;
        this.tooltip = tooltip || label;
        this.contextValue = contextValue;
        this.command = command;
        this.iconPath = iconPath;
        this.description = description;
    }
}
exports.SidebarItem = SidebarItem;
class SidebarProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.projectDetector = new projectDetector_1.ProjectDetectorImpl();
        this.authService = authService_1.AuthService.getInstance();
        this.syncStatus = 'disconnected';
        this.userProjects = [];
        this.loginExpanded = false;
        this.userDetailsExpanded = false;
        this.userProjectsExpanded = true;
        this.selectedProjectId = null; // Track selected cloud project
        // Optimization: Add debouncing and smart refresh logic
        this.refreshTimeout = null;
        this.lastRefreshTime = 0;
        this.MIN_REFRESH_INTERVAL = 30000; // 30 seconds minimum between refreshes
        this.MAX_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes maximum
        this.refreshCount = 0;
        // Set up smart periodic refresh with adaptive intervals
        this.setupSmartRefresh();
        // Load user projects on initialization
        this.loadUserProjects();
        // Listen for configuration changes to refresh immediately
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('aiProjectManager.authToken') ||
                event.affectsConfiguration('aiProjectManager.userId') ||
                event.affectsConfiguration('aiProjectManager.userEmail')) {
                this.smartRefresh();
            }
        });
    }
    refresh() {
        this.loadUserProjects().then(() => {
            this._onDidChangeTreeData.fire();
        });
    }
    /**
     * Smart refresh with debouncing and rate limiting
     */
    smartRefresh() {
        const now = Date.now();
        // Check if we're within the minimum refresh interval
        if (now - this.lastRefreshTime < this.MIN_REFRESH_INTERVAL) {
            // Clear existing timeout and set a new one
            if (this.refreshTimeout) {
                clearTimeout(this.refreshTimeout);
            }
            this.refreshTimeout = setTimeout(() => {
                this.performRefresh();
            }, this.MIN_REFRESH_INTERVAL - (now - this.lastRefreshTime));
            return;
        }
        // Perform immediate refresh if enough time has passed
        this.performRefresh();
    }
    /**
     * Setup smart refresh with adaptive intervals
     */
    setupSmartRefresh() {
        // Start with shorter intervals and gradually increase
        const refreshInterval = Math.min(this.MIN_REFRESH_INTERVAL + (this.refreshCount * 30000), // Add 30s per refresh
        this.MAX_REFRESH_INTERVAL);
        setTimeout(() => {
            this.performRefresh();
            this.setupSmartRefresh(); // Schedule next refresh
        }, refreshInterval);
    }
    /**
     * Perform the actual refresh operation
     */
    async performRefresh() {
        const now = Date.now();
        this.lastRefreshTime = now;
        this.refreshCount++;
        try {
            await this.loadUserProjects();
            this._onDidChangeTreeData.fire();
            // Adjust refresh interval based on activity
            if (this.refreshCount > 10) {
                // After 10 refreshes, use maximum interval
                this.refreshCount = 10;
            }
        }
        catch (error) {
            console.error('Smart refresh failed:', error);
            // On error, reduce refresh count to try more frequently
            this.refreshCount = Math.max(0, this.refreshCount - 2);
        }
    }
    // Method to set the selected project
    setSelectedProject(projectId) {
        this.selectedProjectId = projectId;
        this._onDidChangeTreeData.fire();
    }
    // Method to get the selected project
    getSelectedProject() {
        return this.selectedProjectId;
    }
    // Method to get user projects
    getUserProjects() {
        return this.userProjects;
    }
    async loadUserProjects() {
        try {
            if (this.authService.isAuthenticated()) {
                const projectLoader = projectLoader_1.ProjectLoader.getInstance();
                this.userProjects = await projectLoader.listUserProjects();
                // If no project is selected and we have projects, select the first one
                if (!this.selectedProjectId && this.userProjects.length > 0) {
                    this.selectedProjectId = this.userProjects[0].id;
                }
            }
            else {
                this.userProjects = [];
                this.selectedProjectId = null;
            }
        }
        catch (error) {
            console.error('Failed to load user projects:', error);
            this.userProjects = [];
            this.selectedProjectId = null;
        }
    }
    /**
     * Refreshes cloud project progress with real-time data
     */
    async refreshCloudProjectProgress() {
        try {
            if (this.authService.isAuthenticated()) {
                // Use smart refresh to avoid unnecessary calls
                this.smartRefresh();
            }
        }
        catch (error) {
            console.error('Failed to refresh cloud project progress:', error);
        }
    }
    getTreeItem(element) {
        return element;
    }
    async getChildren(element) {
        const isAuthenticated = this.authService.isAuthenticated();
        const currentUser = this.authService.getCurrentUser();
        // Check authentication status first
        if (!isAuthenticated) {
            // Only return root items when not authenticated, no children
            if (!element) {
                return this.getNotLoggedInItems();
            }
            // If we have an element and not authenticated, return empty array to prevent recursion
            return [];
        }
        // Logged in - show second screen
        if (!element) {
            return this.getLoggedInRootItems();
        }
        // Child items based on parent
        switch (element.contextValue) {
            case 'userDetails':
                return await this.getUserDetailsItems();
            case 'userProjects':
                return this.getUserProjectItems();
            case 'progress':
                return this.getProgressItems();
            case 'context':
                return this.getContextItems();
            case 'sync':
                return this.getSyncItems();
            case 'recentActivity':
                return this.getRecentActivityItems();
            default:
                return [];
        }
    }
    getNotLoggedInItems() {
        return [
            new SidebarItem('🌐 Open Browser to Login', vscode.TreeItemCollapsibleState.None, 'openBrowserLogin', {
                command: 'aiProjectManager.openAuthSettings',
                title: 'Open Browser to Login'
            }, 'Open browser to login and get authentication token', new vscode.ThemeIcon('globe')),
            new SidebarItem('Enter Token', vscode.TreeItemCollapsibleState.None, 'enterToken', {
                command: 'aiProjectManager.enterToken',
                title: 'Enter Token'
            }, 'Click to enter your authentication token', new vscode.ThemeIcon('key')),
            new SidebarItem('Confirm Token', vscode.TreeItemCollapsibleState.None, 'confirmToken', {
                command: 'aiProjectManager.checkToken',
                title: 'Confirm Token'
            }, 'Verify your authentication token', new vscode.ThemeIcon('check')),
            new SidebarItem('Create Local Project', vscode.TreeItemCollapsibleState.None, 'createLocalProject', {
                command: 'aiProjectManager.createProject',
                title: 'Create Local Project'
            }, 'Create a new AI project locally', new vscode.ThemeIcon('add'))
        ];
    }
    getLoggedInRootItems() {
        const items = [];
        // User Details (collapsible)
        const user = this.authService.getCurrentUser();
        items.push(new SidebarItem(`👤 User Details${user ? ` • ${user.name || user.email}` : ''}`, vscode.TreeItemCollapsibleState.Collapsed, 'userDetails', undefined, 'Your account information', new vscode.ThemeIcon('account')));
        // Check if we have a local project
        const hasLocalProject = this.projectDetector.detectAiProject();
        // Local Project Status (if exists) - but prioritize cloud projects
        if (hasLocalProject) {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            const projectName = workspaceFolder?.name || 'Current Project';
            // Try to get project user information
            let projectUserInfo = '';
            try {
                const configPath = path.join(workspaceFolder.uri.fsPath, '.kiro', 'specs', 'ai-project-manager', 'config.json');
                if (fs.existsSync(configPath)) {
                    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                    if (config.userEmail) {
                        projectUserInfo = ` • Created by: ${config.userEmail}`;
                    }
                }
            }
            catch (error) {
                console.error('Failed to read project config:', error);
            }
            items.push(new SidebarItem(`📂 Local Project: ${projectName}${projectUserInfo}`, vscode.TreeItemCollapsibleState.None, 'localProject', undefined, 'Currently loaded local project', new vscode.ThemeIcon('folder-opened')));
        }
        // Cloud Projects (collapsible) - always show this first
        items.push(new SidebarItem(`Cloud Projects (${this.userProjects.length})`, vscode.TreeItemCollapsibleState.Expanded, 'userProjects', undefined, 'Your projects from the cloud dashboard', new vscode.ThemeIcon('cloud')));
        // Progress Overview - show for selected project or local project
        if (this.selectedProjectId || hasLocalProject) {
            const selectedProject = this.userProjects.find(p => p.id === this.selectedProjectId);
            const projectName = selectedProject ? selectedProject.name : 'Current Project';
            items.push(new SidebarItem(`Progress Overview${selectedProject ? ` (${projectName})` : ''}`, vscode.TreeItemCollapsibleState.Collapsed, 'progress', undefined, selectedProject ? `Progress for ${projectName}` : 'Task completion progress', new vscode.ThemeIcon('graph')));
        }
        // Context Documents - show for selected project or local project
        if (this.selectedProjectId || hasLocalProject) {
            const selectedProject = this.userProjects.find(p => p.id === this.selectedProjectId);
            const projectName = selectedProject ? selectedProject.name : 'Current Project';
            items.push(new SidebarItem(`Context Documents${selectedProject ? ` (${projectName})` : ''}`, vscode.TreeItemCollapsibleState.Collapsed, 'context', undefined, selectedProject ? `Context for ${projectName}` : 'AI context documents', new vscode.ThemeIcon('library')));
        }
        // Quick Actions
        items.push(new SidebarItem('Inject AI Context', vscode.TreeItemCollapsibleState.None, 'contextAction', {
            command: 'aiProjectManager.injectContext',
            title: 'Inject AI Context'
        }, 'Inject project context for AI assistance', new vscode.ThemeIcon('robot')));
        items.push(new SidebarItem('Update Project State', vscode.TreeItemCollapsibleState.None, 'updateStateAction', {
            command: 'aiProjectManager.updateProjectState',
            title: 'Update Project State'
        }, 'Update tasks, requirements, and design with current progress', new vscode.ThemeIcon('sync')));
        items.push(new SidebarItem('Refresh Cloud Progress', vscode.TreeItemCollapsibleState.None, 'refreshCloudProgress', {
            command: 'aiProjectManager.refreshCloudProgress',
            title: 'Refresh Cloud Progress'
        }, 'Refresh cloud project progress with real-time data', new vscode.ThemeIcon('refresh')));
        items.push(new SidebarItem('Project Dashboard', vscode.TreeItemCollapsibleState.None, 'openTaskEditor', {
            command: 'aiProjectManager.openTaskEditor',
            title: 'Project Dashboard'
        }, 'Open project dashboard with tasks, requirements, and design', new vscode.ThemeIcon('dashboard')));
        // Logout option
        items.push(new SidebarItem('Logout', vscode.TreeItemCollapsibleState.None, 'logout', {
            command: 'aiProjectManager.logout',
            title: 'Logout'
        }, 'Logout from your account', new vscode.ThemeIcon('sign-out')));
        return items;
    }
    async getUserDetailsItems() {
        // Try to refresh user details first
        let user = await this.authService.refreshUserDetails();
        // If refresh failed, fall back to stored user data
        if (!user) {
            user = this.authService.getCurrentUser();
        }
        if (!user) {
            return [
                new SidebarItem('No user data available', vscode.TreeItemCollapsibleState.None, 'noUserData', undefined, 'User information not available', new vscode.ThemeIcon('info'))
            ];
        }
        return [
            new SidebarItem(`Name: ${user.name || 'Not set'}`, vscode.TreeItemCollapsibleState.None, 'userName', undefined, 'Your display name', new vscode.ThemeIcon('person')),
            new SidebarItem(`Email: ${user.email || 'Not set'}`, vscode.TreeItemCollapsibleState.None, 'userEmail', undefined, 'Your email address', new vscode.ThemeIcon('mail')),
            new SidebarItem(`User ID: ${user.id || 'Not set'}`, vscode.TreeItemCollapsibleState.None, 'userId', undefined, 'Your unique user identifier', new vscode.ThemeIcon('key')),
            new SidebarItem('Refresh User Details', vscode.TreeItemCollapsibleState.None, 'refreshUserDetails', {
                command: 'aiProjectManager.refreshUserDetails',
                title: 'Refresh User Details'
            }, 'Fetch latest user information from dashboard', new vscode.ThemeIcon('refresh'))
        ];
    }
    getUserProjectItems() {
        if (this.userProjects.length === 0) {
            return [
                new SidebarItem('No cloud projects found', vscode.TreeItemCollapsibleState.None, 'noCloudProjects', undefined, 'No projects found in your cloud dashboard. Create one using the web dashboard.', new vscode.ThemeIcon('info')),
                new SidebarItem('Open Dashboard', vscode.TreeItemCollapsibleState.None, 'openDashboard', {
                    command: 'vscode.open',
                    title: 'Open Dashboard',
                    arguments: [vscode.Uri.parse('http://localhost:3000')]
                }, 'Open the web dashboard to create cloud projects', new vscode.ThemeIcon('globe')),
                new SidebarItem('Load Project from Cloud', vscode.TreeItemCollapsibleState.None, 'loadProject', {
                    command: 'aiProjectManager.loadProject',
                    title: 'Load Project from Cloud'
                }, 'Load a project from the cloud dashboard', new vscode.ThemeIcon('cloud-download'))
            ];
        }
        return this.userProjects.map(project => {
            const description = `${project.progress}% complete • ${this.getTimeAgo(project.lastModified)}`;
            const isSelected = project.id === this.selectedProjectId;
            return new SidebarItem(`${isSelected ? '● ' : ''}${project.name}`, vscode.TreeItemCollapsibleState.None, 'project', {
                command: 'aiProjectManager.selectProject',
                title: 'Select Project',
                arguments: [project.id]
            }, `${project.name} - ${project.description}`, new vscode.ThemeIcon('folder'), description);
        });
    }
    getSyncItems() {
        const items = [];
        // Connection Status
        const statusIcon = this.syncStatus === 'connected' ?
            new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed')) :
            this.syncStatus === 'syncing' ?
                new vscode.ThemeIcon('sync~spin', new vscode.ThemeColor('progressBar.background')) :
                new vscode.ThemeIcon('x', new vscode.ThemeColor('testing.iconFailed'));
        const statusText = this.syncStatus === 'connected' ? 'Connected' :
            this.syncStatus === 'syncing' ? 'Syncing...' : 'Disconnected';
        items.push(new SidebarItem(statusText, vscode.TreeItemCollapsibleState.None, 'syncStatus', undefined, `Dashboard connection: ${statusText}`, statusIcon));
        // Last Sync Time
        if (this.lastSyncTime) {
            const timeAgo = this.getTimeAgo(this.lastSyncTime);
            items.push(new SidebarItem(`Last sync: ${timeAgo}`, vscode.TreeItemCollapsibleState.None, 'lastSync', undefined, `Last synchronized: ${this.lastSyncTime.toLocaleString()}`, new vscode.ThemeIcon('clock')));
        }
        // Dashboard URL
        const config = vscode.workspace.getConfiguration('aiProjectManager');
        const dashboardUrl = config.get('dashboardUrl', 'http://localhost:3000');
        items.push(new SidebarItem('Open Dashboard', vscode.TreeItemCollapsibleState.None, 'openDashboard', {
            command: 'vscode.open',
            title: 'Open Dashboard',
            arguments: [vscode.Uri.parse(dashboardUrl)]
        }, `Open dashboard at ${dashboardUrl}`, new vscode.ThemeIcon('globe')));
        return items;
    }
    getProgressItems() {
        try {
            let progressPath;
            // Check for Kiro specs progress first
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (workspaceFolder) {
                const kiroProgressPath = path.join(workspaceFolder.uri.fsPath, '.kiro', 'specs', 'ai-project-manager', 'progress.json');
                if (fs.existsSync(kiroProgressPath)) {
                    progressPath = kiroProgressPath;
                }
                else {
                    // Fallback to traditional structure
                    const structure = this.projectDetector.getProjectStructure();
                    progressPath = structure.progressPath;
                }
            }
            else {
                const structure = this.projectDetector.getProjectStructure();
                progressPath = structure.progressPath;
            }
            if (!fs.existsSync(progressPath)) {
                return [
                    new SidebarItem('No progress data', vscode.TreeItemCollapsibleState.None, 'noProgress', undefined, 'Progress tracking not initialized', new vscode.ThemeIcon('info'))
                ];
            }
            const progressContent = fs.readFileSync(progressPath, 'utf-8');
            const progress = JSON.parse(progressContent);
            const items = [];
            // Overall Progress
            items.push(new SidebarItem(`${progress.percentage}% Complete`, vscode.TreeItemCollapsibleState.None, 'overallProgress', undefined, `${progress.completedTasks} of ${progress.totalTasks} tasks completed`, new vscode.ThemeIcon('graph'), `${progress.completedTasks}/${progress.totalTasks} tasks`));
            // Recent Activity
            if (progress.recentActivity && progress.recentActivity.length > 0) {
                items.push(new SidebarItem('Recent Activity', vscode.TreeItemCollapsibleState.Collapsed, 'recentActivity', undefined, 'Recently completed tasks', new vscode.ThemeIcon('history')));
            }
            return items;
        }
        catch (error) {
            return [
                new SidebarItem('Error loading progress', vscode.TreeItemCollapsibleState.None, 'error', undefined, 'Failed to load progress data', new vscode.ThemeIcon('error'))
            ];
        }
    }
    getContextItems() {
        try {
            // Check if we have a workspace folder
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                return [
                    new SidebarItem('No workspace folder', vscode.TreeItemCollapsibleState.None, 'noWorkspace', undefined, 'Open a workspace folder to view context documents', new vscode.ThemeIcon('info'))
                ];
            }
            // Check if we have an AI project
            if (!this.projectDetector.detectAiProject()) {
                return [
                    new SidebarItem('No AI project detected', vscode.TreeItemCollapsibleState.None, 'noProject', undefined, 'No AI project structure found in current workspace', new vscode.ThemeIcon('info'))
                ];
            }
            const structure = this.projectDetector.getProjectStructure();
            const contextDir = structure.contextDir;
            if (!fs.existsSync(contextDir)) {
                // Try to create the context directory
                try {
                    fs.mkdirSync(contextDir, { recursive: true });
                    return [
                        new SidebarItem('Context directory created', vscode.TreeItemCollapsibleState.None, 'contextCreated', undefined, 'Context directory created. Add markdown files to get started.', new vscode.ThemeIcon('info'))
                    ];
                }
                catch (mkdirError) {
                    return [
                        new SidebarItem('Cannot create context directory', vscode.TreeItemCollapsibleState.None, 'contextError', undefined, `Failed to create context directory: ${mkdirError instanceof Error ? mkdirError.message : 'Unknown error'}`, new vscode.ThemeIcon('error'))
                    ];
                }
            }
            const files = fs.readdirSync(contextDir).filter(file => file.endsWith('.md'));
            if (files.length === 0) {
                return [
                    new SidebarItem('No context documents', vscode.TreeItemCollapsibleState.None, 'noContext', undefined, 'No markdown files in context directory. Add .md files to get started.', new vscode.ThemeIcon('info')),
                    new SidebarItem('Create Sample Context', vscode.TreeItemCollapsibleState.None, 'createContext', {
                        command: 'aiProjectManager.createProject',
                        title: 'Create Sample Context'
                    }, 'Create a sample context document to get started', new vscode.ThemeIcon('add'))
                ];
            }
            return files.map(file => {
                const filePath = path.join(contextDir, file);
                const stats = fs.statSync(filePath);
                const lastModified = this.getTimeAgo(stats.mtime);
                return new SidebarItem(file.replace('.md', ''), vscode.TreeItemCollapsibleState.None, 'contextDocument', {
                    command: 'aiProjectManager.openDocument',
                    title: `Open ${file}`,
                    arguments: [filePath]
                }, `Context document - Modified ${lastModified}`, new vscode.ThemeIcon('file'), lastModified);
            });
        }
        catch (error) {
            console.error('Error in getContextItems:', error);
            return [
                new SidebarItem('Error loading context', vscode.TreeItemCollapsibleState.None, 'error', undefined, `Failed to load context documents: ${error instanceof Error ? error.message : 'Unknown error'}`, new vscode.ThemeIcon('error'))
            ];
        }
    }
    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffMins < 1)
            return 'just now';
        if (diffMins < 60)
            return `${diffMins}m ago`;
        if (diffHours < 24)
            return `${diffHours}h ago`;
        if (diffDays < 7)
            return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }
    // Public methods for updating sync status
    setSyncStatus(status) {
        this.syncStatus = status;
        if (status === 'connected') {
            this.lastSyncTime = new Date();
        }
        this.refresh();
    }
    updateLastSyncTime() {
        this.lastSyncTime = new Date();
        this.refresh();
    }
    getRecentActivityItems() {
        try {
            // Check if we have a workspace folder
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                return [
                    new SidebarItem('No workspace folder', vscode.TreeItemCollapsibleState.None, 'noWorkspace', undefined, 'Open a workspace folder to view recent activity', new vscode.ThemeIcon('info'))
                ];
            }
            // Check if we have an AI project
            if (!this.projectDetector.detectAiProject()) {
                return [
                    new SidebarItem('No AI project detected', vscode.TreeItemCollapsibleState.None, 'noProject', undefined, 'No AI project structure found in current workspace', new vscode.ThemeIcon('info'))
                ];
            }
            const structure = this.projectDetector.getProjectStructure();
            const progressPath = structure.progressPath;
            if (!fs.existsSync(progressPath)) {
                return [
                    new SidebarItem('No progress data', vscode.TreeItemCollapsibleState.None, 'noProgress', undefined, 'No progress data found. Complete some tasks to see activity.', new vscode.ThemeIcon('info'))
                ];
            }
            const progressContent = fs.readFileSync(progressPath, 'utf-8');
            const progress = JSON.parse(progressContent);
            if (!progress.recentActivity || progress.recentActivity.length === 0) {
                return [
                    new SidebarItem('No recent activity', vscode.TreeItemCollapsibleState.None, 'noActivity', undefined, 'No tasks completed recently. Complete some tasks to see activity here.', new vscode.ThemeIcon('info'))
                ];
            }
            // Add recent activity items (limit to 5)
            return progress.recentActivity.slice(0, 5).map(activity => {
                const completedAt = new Date(activity.completedAt);
                return new SidebarItem(activity.title, vscode.TreeItemCollapsibleState.None, 'activityItem', undefined, `Completed ${this.getTimeAgo(completedAt)} by ${activity.completedBy}`, new vscode.ThemeIcon('check'), this.getTimeAgo(completedAt));
            });
        }
        catch (error) {
            console.error('Error in getRecentActivityItems:', error);
            return [
                new SidebarItem('Error loading activity', vscode.TreeItemCollapsibleState.None, 'error', undefined, `Failed to load recent activity: ${error instanceof Error ? error.message : 'Unknown error'}`, new vscode.ThemeIcon('error'))
            ];
        }
    }
}
exports.SidebarProvider = SidebarProvider;
//# sourceMappingURL=sidebarProvider.js.map