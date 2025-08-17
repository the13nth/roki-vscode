import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectDetectorImpl } from './projectDetector';
import { AuthService } from './authService';
import { ProgressData, ProjectStructure } from '../types';
import { ProjectLoader, CloudProject } from './projectLoader';

export class SidebarItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue?: string,
        public readonly command?: vscode.Command,
        public readonly tooltip?: string,
        iconPath?: vscode.ThemeIcon | { light: vscode.Uri; dark: vscode.Uri },
        public readonly description?: string
    ) {
        super(label, collapsibleState);
        this.tooltip = tooltip || label;
        this.contextValue = contextValue;
        this.command = command;
        this.iconPath = iconPath;
        this.description = description;
    }
}

export class SidebarProvider implements vscode.TreeDataProvider<SidebarItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SidebarItem | undefined | null | void> = new vscode.EventEmitter<SidebarItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SidebarItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private projectDetector = new ProjectDetectorImpl();
    private authService = AuthService.getInstance();
    private syncStatus: 'connected' | 'disconnected' | 'syncing' = 'disconnected';
    private lastSyncTime?: Date;
    private userProjects: CloudProject[] = [];
    private loginExpanded = false;
    private userDetailsExpanded = false;
    private userProjectsExpanded = true;

    constructor() {
        console.log('SidebarProvider constructor called');
        // Set up periodic refresh
        setInterval(() => {
            this.refresh();
        }, 5 * 60 * 1000); // Refresh every 5 minutes
        
        // Load user projects on initialization
        this.loadUserProjects();
        
        // Listen for configuration changes to refresh immediately
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('aiProjectManager.authToken') || 
                event.affectsConfiguration('aiProjectManager.userId') ||
                event.affectsConfiguration('aiProjectManager.userEmail')) {
                console.log('Auth configuration changed, refreshing sidebar');
                this.refresh();
            }
        });
    }

    refresh(): void {
        this.loadUserProjects().then(() => {
            this._onDidChangeTreeData.fire();
        });
    }

    private async loadUserProjects(): Promise<void> {
        try {
            if (this.authService.isAuthenticated()) {
                const projectLoader = ProjectLoader.getInstance();
                this.userProjects = await projectLoader.listUserProjects();
                console.log('Loaded user projects:', this.userProjects.length);
            } else {
                this.userProjects = [];
            }
        } catch (error) {
            console.error('Failed to load user projects:', error);
            this.userProjects = [];
        }
    }

    getTreeItem(element: SidebarItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: SidebarItem): Promise<SidebarItem[]> {
        console.log('getChildren called with element:', element?.label || 'root');
        
        // Debug authentication status
        const isAuthenticated = this.authService.isAuthenticated();
        const currentUser = this.authService.getCurrentUser();
        console.log('Auth service authenticated:', isAuthenticated);
        console.log('Current user:', currentUser?.email || 'none');
        
        // Check authentication status first
        if (!isAuthenticated) {
            console.log('Not authenticated, showing login screen');
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
                return this.getUserDetailsItems();
            case 'userProjects':
                return this.getUserProjectItems();
            case 'documents':
                return this.getDocumentItems();
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

    private getNotLoggedInItems(): SidebarItem[] {
        return [
            new SidebarItem(
                '🌐 Open Browser to Login',
                vscode.TreeItemCollapsibleState.None,
                'openBrowserLogin',
                {
                    command: 'aiProjectManager.openAuthSettings',
                    title: 'Open Browser to Login'
                },
                'Open browser to login and get authentication token',
                new vscode.ThemeIcon('globe')
            ),
            new SidebarItem(
                '📋 Enter Token',
                vscode.TreeItemCollapsibleState.None,
                'enterToken',
                {
                    command: 'aiProjectManager.enterToken',
                    title: 'Enter Token'
                },
                'Click to enter your authentication token',
                new vscode.ThemeIcon('key')
            ),
            new SidebarItem(
                '✅ Confirm Token',
                vscode.TreeItemCollapsibleState.None,
                'confirmToken',
                {
                    command: 'aiProjectManager.checkToken',
                    title: 'Confirm Token'
                },
                'Verify your authentication token',
                new vscode.ThemeIcon('check')
            ),
            new SidebarItem(
                '➕ Create Local Project',
                vscode.TreeItemCollapsibleState.None,
                'createLocalProject',
                {
                    command: 'aiProjectManager.createProject',
                    title: 'Create Local Project'
                },
                'Create a new AI project locally',
                new vscode.ThemeIcon('add')
            )
        ];
    }



    private getLoggedInRootItems(): SidebarItem[] {
        const items: SidebarItem[] = [];

        // User Details (collapsible)
        const user = this.authService.getCurrentUser();
        items.push(new SidebarItem(
            `👤 User Details`,
            vscode.TreeItemCollapsibleState.Collapsed,
            'userDetails',
            undefined,
            'Your account information',
            new vscode.ThemeIcon('account')
        ));

        // Check if we have a local project
        const hasLocalProject = this.projectDetector.detectAiProject();
        
        // Local Project Status (if exists)
        if (hasLocalProject) {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            const projectName = workspaceFolder?.name || 'Current Project';
            
            // Try to get project user information
            let projectUserInfo = '';
            try {
                const configPath = path.join(workspaceFolder!.uri.fsPath, '.kiro', 'specs', 'ai-project-manager', 'config.json');
                if (fs.existsSync(configPath)) {
                    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                    if (config.userEmail) {
                        projectUserInfo = ` • Created by: ${config.userEmail}`;
                    }
                }
            } catch (error) {
                console.error('Failed to read project config:', error);
            }
            
            items.push(new SidebarItem(
                `📂 Local Project: ${projectName}${projectUserInfo}`,
                vscode.TreeItemCollapsibleState.None,
                'localProject',
                undefined,
                'Currently loaded local project',
                new vscode.ThemeIcon('folder-opened')
            ));
        }

        // Cloud Projects (collapsible)
        items.push(new SidebarItem(
            `☁️ Cloud Projects (${this.userProjects.length})`,
            vscode.TreeItemCollapsibleState.Expanded,
            'userProjects',
            undefined,
            'Your projects from the cloud dashboard',
            new vscode.ThemeIcon('cloud')
        ));

        // Logout option
        items.push(new SidebarItem(
            '🚪 Logout',
            vscode.TreeItemCollapsibleState.None,
            'logout',
            {
                command: 'aiProjectManager.logout',
                title: 'Logout'
            },
            'Logout from your account',
            new vscode.ThemeIcon('sign-out')
        ));

        // Only show project-specific items if we have a local project
        if (hasLocalProject) {
            // Project Documents
            items.push(new SidebarItem(
                '📄 Project Documents',
                vscode.TreeItemCollapsibleState.Collapsed,
                'documents',
                undefined,
                'Requirements, Design, and Tasks documents',
                new vscode.ThemeIcon('file-text')
            ));

            // Progress Overview
            items.push(new SidebarItem(
                '📊 Progress Overview',
                vscode.TreeItemCollapsibleState.Collapsed,
                'progress',
                undefined,
                'Task completion progress',
                new vscode.ThemeIcon('graph')
            ));

            // Context Documents
            items.push(new SidebarItem(
                '🤖 Context Documents',
                vscode.TreeItemCollapsibleState.Collapsed,
                'context',
                undefined,
                'AI context documents',
                new vscode.ThemeIcon('library')
            ));

            // Quick Actions
            items.push(new SidebarItem(
                '⚡ Inject AI Context',
                vscode.TreeItemCollapsibleState.None,
                'contextAction',
                {
                    command: 'aiProjectManager.injectContext',
                    title: 'Inject AI Context'
                },
                'Inject project context for AI assistance',
                new vscode.ThemeIcon('robot')
            ));
        } else {
            // No local project - show options
            items.push(new SidebarItem(
                '📥 Load Project from Cloud',
                vscode.TreeItemCollapsibleState.None,
                'loadProject',
                {
                    command: 'aiProjectManager.loadProject',
                    title: 'Load Project from Cloud'
                },
                'Load a project from the cloud',
                new vscode.ThemeIcon('cloud-download')
            ));

            items.push(new SidebarItem(
                '➕ Create Local Project',
                vscode.TreeItemCollapsibleState.None,
                'createLocalProject',
                {
                    command: 'aiProjectManager.createProject',
                    title: 'Create Local Project'
                },
                'Create a new AI project locally',
                new vscode.ThemeIcon('add')
            ));
        }

        return items;
    }

    private getUserDetailsItems(): SidebarItem[] {
        const user = this.authService.getCurrentUser();
        if (!user) {
            return [
                new SidebarItem(
                    'No user data available',
                    vscode.TreeItemCollapsibleState.None,
                    'noUserData',
                    undefined,
                    'User information not available',
                    new vscode.ThemeIcon('info')
                )
            ];
        }

        return [
            new SidebarItem(
                `Name: ${user.name || 'Not set'}`,
                vscode.TreeItemCollapsibleState.None,
                'userName',
                undefined,
                'Your display name',
                new vscode.ThemeIcon('person')
            ),
            new SidebarItem(
                `Email: ${user.email || 'Not set'}`,
                vscode.TreeItemCollapsibleState.None,
                'userEmail',
                undefined,
                'Your email address',
                new vscode.ThemeIcon('mail')
            ),
            new SidebarItem(
                `User ID: ${user.id || 'Not set'}`,
                vscode.TreeItemCollapsibleState.None,
                'userId',
                undefined,
                'Your unique user identifier',
                new vscode.ThemeIcon('key')
            ),
            new SidebarItem(
                '🔄 Refresh Token',
                vscode.TreeItemCollapsibleState.None,
                'refreshToken',
                {
                    command: 'aiProjectManager.checkToken',
                    title: 'Refresh Token'
                },
                'Verify your authentication token',
                new vscode.ThemeIcon('refresh')
            )
        ];
    }

    private getUserProjectItems(): SidebarItem[] {
        if (this.userProjects.length === 0) {
            return [
                new SidebarItem(
                    'No cloud projects found',
                    vscode.TreeItemCollapsibleState.None,
                    'noCloudProjects',
                    undefined,
                    'No projects found in your cloud dashboard. Create one using the web dashboard.',
                    new vscode.ThemeIcon('info')
                ),
                new SidebarItem(
                    '🌐 Open Dashboard',
                    vscode.TreeItemCollapsibleState.None,
                    'openDashboard',
                    {
                        command: 'vscode.open',
                        title: 'Open Dashboard',
                        arguments: [vscode.Uri.parse('http://localhost:3000')]
                    },
                    'Open the web dashboard to create cloud projects',
                    new vscode.ThemeIcon('globe')
                ),
                new SidebarItem(
                    '📥 Load Project from Cloud',
                    vscode.TreeItemCollapsibleState.None,
                    'loadProject',
                    {
                        command: 'aiProjectManager.loadProject',
                        title: 'Load Project from Cloud'
                    },
                    'Load a project from the cloud dashboard',
                    new vscode.ThemeIcon('cloud-download')
                )
            ];
        }

        return this.userProjects.map(project => {
            const description = `${project.progress}% complete • ${this.getTimeAgo(project.lastModified)}`;
            
            return new SidebarItem(
                project.name,
                vscode.TreeItemCollapsibleState.None,
                'project',
                {
                    command: 'aiProjectManager.loadProject',
                    title: 'Load Project',
                    arguments: [project.id]
                },
                `${project.name} - ${project.description}`,
                new vscode.ThemeIcon('folder'),
                description
            );
        });
    }

    private getSyncItems(): SidebarItem[] {
        const items: SidebarItem[] = [];

        // Connection Status
        const statusIcon = this.syncStatus === 'connected' ? 
            new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed')) :
            this.syncStatus === 'syncing' ?
            new vscode.ThemeIcon('sync~spin', new vscode.ThemeColor('progressBar.background')) :
            new vscode.ThemeIcon('x', new vscode.ThemeColor('testing.iconFailed'));

        const statusText = this.syncStatus === 'connected' ? 'Connected' :
                          this.syncStatus === 'syncing' ? 'Syncing...' : 'Disconnected';

        items.push(new SidebarItem(
            statusText,
            vscode.TreeItemCollapsibleState.None,
            'syncStatus',
            undefined,
            `Dashboard connection: ${statusText}`,
            statusIcon
        ));

        // Last Sync Time
        if (this.lastSyncTime) {
            const timeAgo = this.getTimeAgo(this.lastSyncTime);
            items.push(new SidebarItem(
                `Last sync: ${timeAgo}`,
                vscode.TreeItemCollapsibleState.None,
                'lastSync',
                undefined,
                `Last synchronized: ${this.lastSyncTime.toLocaleString()}`,
                new vscode.ThemeIcon('clock')
            ));
        }

        // Dashboard URL
        const config = vscode.workspace.getConfiguration('aiProjectManager');
        const dashboardUrl = config.get('dashboardUrl', 'http://localhost:3000');
        items.push(new SidebarItem(
            'Open Dashboard',
            vscode.TreeItemCollapsibleState.None,
            'openDashboard',
            {
                command: 'vscode.open',
                title: 'Open Dashboard',
                arguments: [vscode.Uri.parse(dashboardUrl)]
            },
            `Open dashboard at ${dashboardUrl}`,
            new vscode.ThemeIcon('globe')
        ));

        return items;
    }

    private getDocumentItems(): SidebarItem[] {
        console.log('getDocumentItems called');
        const items: SidebarItem[] = [];
        
        try {
            // Check for .kiro/specs/ai-project-manager documents first
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            console.log('Workspace folder:', workspaceFolder?.uri.fsPath);
            
            if (workspaceFolder) {
                const kiroSpecsPath = path.join(workspaceFolder.uri.fsPath, '.kiro', 'specs', 'ai-project-manager');
                console.log('Checking Kiro specs path:', kiroSpecsPath);
                
                if (fs.existsSync(kiroSpecsPath)) {
                    console.log('Kiro specs path exists');
                    const kiroDocuments = [
                        { name: 'Requirements', filename: 'requirements.md', icon: 'list-unordered' },
                        { name: 'Design', filename: 'design.md', icon: 'organization' },
                        { name: 'Tasks', filename: 'tasks.md', icon: 'tasklist' },
                        { name: 'Progress', filename: 'progress.json', icon: 'graph' }
                    ];

                    for (const doc of kiroDocuments) {
                        const docPath = path.join(kiroSpecsPath, doc.filename);
                        console.log('Checking document:', docPath);
                        const exists = fs.existsSync(docPath);
                        
                        if (exists) {
                            console.log('Document exists:', doc.name);
                            const stats = fs.statSync(docPath);
                            const lastModified = stats.mtime;
                            const description = `Modified ${this.getTimeAgo(lastModified)}`;

                            items.push(new SidebarItem(
                                doc.name,
                                vscode.TreeItemCollapsibleState.None,
                                'document',
                                {
                                    command: 'aiProjectManager.openDocument',
                                    title: `Open ${doc.name}`,
                                    arguments: [docPath]
                                },
                                `${doc.name} document - ${description}`,
                                new vscode.ThemeIcon(doc.icon),
                                description
                            ));
                        } else {
                            console.log('Document does not exist:', doc.name);
                        }
                    }
                } else {
                    console.log('Kiro specs path does not exist');
                }
            }
            
            // Fallback to traditional .ai-project structure if no Kiro specs found
            if (items.length === 0) {
                console.log('No Kiro specs found, trying traditional structure');
                try {
                    const structure = this.projectDetector.getProjectStructure();
                    console.log('Project structure:', structure);
                    
                    const documents = [
                        { name: 'Requirements', path: structure.requirementsPath, icon: 'list-unordered' },
                        { name: 'Design', path: structure.designPath, icon: 'organization' },
                        { name: 'Tasks', path: structure.tasksPath, icon: 'tasklist' }
                    ];

                    for (const doc of documents) {
                        const exists = fs.existsSync(doc.path);
                        const stats = exists ? fs.statSync(doc.path) : null;
                        const lastModified = stats ? stats.mtime : null;
                        
                        const description = lastModified ? 
                            `Modified ${this.getTimeAgo(lastModified)}` : 
                            'Not found';

                        items.push(new SidebarItem(
                            doc.name,
                            vscode.TreeItemCollapsibleState.None,
                            'document',
                            {
                                command: 'aiProjectManager.openDocument',
                                title: `Open ${doc.name}`,
                                arguments: [doc.path]
                            },
                            `${doc.name} document - ${description}`,
                            new vscode.ThemeIcon(doc.icon),
                            description
                        ));
                    }
                } catch (structureError) {
                    console.error('Error getting project structure:', structureError);
                }
            }

            if (items.length === 0) {
                console.log('No documents found at all');
                return [
                    new SidebarItem(
                        'No documents found',
                        vscode.TreeItemCollapsibleState.None,
                        'noDocuments',
                        undefined,
                        'No project documents found in workspace',
                        new vscode.ThemeIcon('info')
                    )
                ];
            }

            console.log('Returning', items.length, 'document items');
            return items;
        } catch (error) {
            console.error('Error in getDocumentItems:', error);
            return [
                new SidebarItem(
                    `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    vscode.TreeItemCollapsibleState.None,
                    'error',
                    undefined,
                    'Failed to load project documents',
                    new vscode.ThemeIcon('error')
                )
            ];
        }
    }

    private getProjectItems(): SidebarItem[] {
        try {
            if (this.userProjects.length === 0) {
                return [
                    new SidebarItem(
                        'No projects found',
                        vscode.TreeItemCollapsibleState.None,
                        'noProjects',
                        undefined,
                        'No cloud projects found',
                        new vscode.ThemeIcon('info')
                    )
                ];
            }

            return this.userProjects.map(project => {
                const description = `${project.progress}% complete • ${this.getTimeAgo(project.lastModified)}`;
                
                return new SidebarItem(
                    project.name,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'project',
                    {
                        command: 'aiProjectManager.loadProject',
                        title: 'Load Project',
                        arguments: [project.id]
                    },
                    `${project.name} - ${project.description}`,
                    new vscode.ThemeIcon('folder'),
                    description
                );
            });
        } catch (error) {
            console.error('Error in getProjectItems:', error);
            return [
                new SidebarItem(
                    `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    vscode.TreeItemCollapsibleState.None,
                    'error',
                    undefined,
                    'Failed to load projects',
                    new vscode.ThemeIcon('error')
                )
            ];
        }
    }

    private getProgressItems(): SidebarItem[] {
        try {
            let progressPath: string;
            
            // Check for Kiro specs progress first
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (workspaceFolder) {
                const kiroProgressPath = path.join(workspaceFolder.uri.fsPath, '.kiro', 'specs', 'ai-project-manager', 'progress.json');
                if (fs.existsSync(kiroProgressPath)) {
                    progressPath = kiroProgressPath;
                } else {
                    // Fallback to traditional structure
                    const structure = this.projectDetector.getProjectStructure();
                    progressPath = structure.progressPath;
                }
            } else {
                const structure = this.projectDetector.getProjectStructure();
                progressPath = structure.progressPath;
            }
            
            if (!fs.existsSync(progressPath)) {
                return [
                    new SidebarItem(
                        'No progress data',
                        vscode.TreeItemCollapsibleState.None,
                        'noProgress',
                        undefined,
                        'Progress tracking not initialized',
                        new vscode.ThemeIcon('info')
                    )
                ];
            }

            const progressContent = fs.readFileSync(progressPath, 'utf-8');
            const progress: ProgressData = JSON.parse(progressContent);

            const items: SidebarItem[] = [];

            // Overall Progress
            items.push(new SidebarItem(
                `${progress.percentage}% Complete`,
                vscode.TreeItemCollapsibleState.None,
                'overallProgress',
                undefined,
                `${progress.completedTasks} of ${progress.totalTasks} tasks completed`,
                new vscode.ThemeIcon('graph'),
                `${progress.completedTasks}/${progress.totalTasks} tasks`
            ));

            // Recent Activity
            if (progress.recentActivity && progress.recentActivity.length > 0) {
                items.push(new SidebarItem(
                    'Recent Activity',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'recentActivity',
                    undefined,
                    'Recently completed tasks',
                    new vscode.ThemeIcon('history')
                ));
            }

            return items;
        } catch (error) {
            return [
                new SidebarItem(
                    'Error loading progress',
                    vscode.TreeItemCollapsibleState.None,
                    'error',
                    undefined,
                    'Failed to load progress data',
                    new vscode.ThemeIcon('error')
                )
            ];
        }
    }

    private getContextItems(): SidebarItem[] {
        try {
            const structure = this.projectDetector.getProjectStructure();
            const contextDir = structure.contextDir;
            
            if (!fs.existsSync(contextDir)) {
                return [
                    new SidebarItem(
                        'No context documents',
                        vscode.TreeItemCollapsibleState.None,
                        'noContext',
                        undefined,
                        'No context documents found',
                        new vscode.ThemeIcon('info')
                    )
                ];
            }

            const files = fs.readdirSync(contextDir).filter(file => file.endsWith('.md'));
            
            if (files.length === 0) {
                return [
                    new SidebarItem(
                        'No context documents',
                        vscode.TreeItemCollapsibleState.None,
                        'noContext',
                        undefined,
                        'No markdown files in context directory',
                        new vscode.ThemeIcon('info')
                    )
                ];
            }

            return files.map(file => {
                const filePath = path.join(contextDir, file);
                const stats = fs.statSync(filePath);
                const lastModified = this.getTimeAgo(stats.mtime);

                return new SidebarItem(
                    file.replace('.md', ''),
                    vscode.TreeItemCollapsibleState.None,
                    'contextDocument',
                    {
                        command: 'aiProjectManager.openDocument',
                        title: `Open ${file}`,
                        arguments: [filePath]
                    },
                    `Context document - Modified ${lastModified}`,
                    new vscode.ThemeIcon('file'),
                    lastModified
                );
            });
        } catch (error) {
            return [
                new SidebarItem(
                    'Error loading context',
                    vscode.TreeItemCollapsibleState.None,
                    'error',
                    undefined,
                    'Failed to load context documents',
                    new vscode.ThemeIcon('error')
                )
            ];
        }
    }

    private getTimeAgo(date: Date): string {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }

    // Public methods for updating sync status
    setSyncStatus(status: 'connected' | 'disconnected' | 'syncing'): void {
        this.syncStatus = status;
        if (status === 'connected') {
            this.lastSyncTime = new Date();
        }
        this.refresh();
    }

    updateLastSyncTime(): void {
        this.lastSyncTime = new Date();
        this.refresh();
    }


    
    private getRecentActivityItems(): SidebarItem[] {
        try {
            const structure = this.projectDetector.getProjectStructure();
            const progressPath = structure.progressPath;
            
            if (!fs.existsSync(progressPath)) {
                return [];
            }

            const progressContent = fs.readFileSync(progressPath, 'utf-8');
            const progress: ProgressData = JSON.parse(progressContent);

            if (!progress.recentActivity || progress.recentActivity.length === 0) {
                return [
                    new SidebarItem(
                        'No recent activity',
                        vscode.TreeItemCollapsibleState.None,
                        'noActivity',
                        undefined,
                        'No tasks completed recently',
                        new vscode.ThemeIcon('info')
                    )
                ];
            }

            // Add recent activity items (limit to 5)
            return progress.recentActivity.slice(0, 5).map(activity => {
                const completedAt = new Date(activity.completedAt);
                return new SidebarItem(
                    activity.title,
                    vscode.TreeItemCollapsibleState.None,
                    'activityItem',
                    undefined,
                    `Completed ${this.getTimeAgo(completedAt)} by ${activity.completedBy}`,
                    new vscode.ThemeIcon('check'),
                    this.getTimeAgo(completedAt)
                );
            });
        } catch (error) {
            return [
                new SidebarItem(
                    'Error loading activity',
                    vscode.TreeItemCollapsibleState.None,
                    'error',
                    undefined,
                    'Failed to load recent activity',
                    new vscode.ThemeIcon('error')
                )
            ];
        }
    }
}