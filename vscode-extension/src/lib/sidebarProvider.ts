import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectDetectorImpl } from './projectDetector';
import { AuthService } from './authService';
import { ProgressData, ProjectStructure } from '../types';
import { ProjectLoader, CloudProject } from './projectLoader';
import { SyncService, SyncStatus } from './syncService';

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
    private syncService = SyncService.getInstance();
    private syncStatus: 'connected' | 'disconnected' | 'syncing' = 'disconnected';
    private lastSyncTime?: Date;
    private userProjects: CloudProject[] = [];
    private loginExpanded = false;
    private userDetailsExpanded = false;
    private userProjectsExpanded = true;
    private selectedProjectId: string | null = null; // Track selected cloud project
    private projectLocalPaths: Map<string, string> = new Map(); // Track local paths for projects

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

    // Method to set the selected project
    setSelectedProject(projectId: string | null): void {
        this.selectedProjectId = projectId;
        this._onDidChangeTreeData.fire();
    }

    // Method to get the selected project
    getSelectedProject(): string | null {
        return this.selectedProjectId;
    }

    // Method to get user projects
    getUserProjects(): CloudProject[] {
        return this.userProjects;
    }

    private async loadUserProjects(): Promise<void> {
        try {
            if (this.authService.isAuthenticated()) {
                const projectLoader = ProjectLoader.getInstance();
                this.userProjects = await projectLoader.listUserProjects();
                console.log('Loaded user projects:', this.userProjects.length);
                console.log('User projects:', this.userProjects.map(p => ({ id: p.id, name: p.name })));
                
                // If no project is selected and we have projects, select the first one
                if (!this.selectedProjectId && this.userProjects.length > 0) {
                    this.selectedProjectId = this.userProjects[0].id;
                    console.log('Auto-selected project:', this.selectedProjectId);
                }
            } else {
                this.userProjects = [];
                this.selectedProjectId = null;
            }
        } catch (error) {
            console.error('Failed to load user projects:', error);
            this.userProjects = [];
            this.selectedProjectId = null;
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
                return await this.getDocumentItems();
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
        
        // Local Project Status (if exists) - but prioritize cloud projects
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

        // Cloud Projects (collapsible) - always show this first
        items.push(new SidebarItem(
            `☁️ Cloud Projects (${this.userProjects.length})`,
            vscode.TreeItemCollapsibleState.Expanded,
            'userProjects',
            undefined,
            'Your projects from the cloud dashboard',
            new vscode.ThemeIcon('cloud')
        ));

        // Project Documents - now shows cloud documents for selected project
        if (this.selectedProjectId || hasLocalProject) {
            const selectedProject = this.userProjects.find(p => p.id === this.selectedProjectId);
            const projectName = selectedProject ? selectedProject.name : 'Current Project';
            
            items.push(new SidebarItem(
                `📄 Project Documents${selectedProject ? ` (${projectName})` : ''}`,
                vscode.TreeItemCollapsibleState.Collapsed,
                'documents',
                undefined,
                selectedProject ? `Documents for ${projectName}` : 'Requirements, Design, and Tasks documents',
                new vscode.ThemeIcon('file-text')
            ));
        }

        // Progress Overview - show for selected project or local project
        if (this.selectedProjectId || hasLocalProject) {
            const selectedProject = this.userProjects.find(p => p.id === this.selectedProjectId);
            const projectName = selectedProject ? selectedProject.name : 'Current Project';
            
            items.push(new SidebarItem(
                `📊 Progress Overview${selectedProject ? ` (${projectName})` : ''}`,
                vscode.TreeItemCollapsibleState.Collapsed,
                'progress',
                undefined,
                selectedProject ? `Progress for ${projectName}` : 'Task completion progress',
                new vscode.ThemeIcon('graph')
            ));
        }

        // Context Documents - show for selected project or local project
        if (this.selectedProjectId || hasLocalProject) {
            const selectedProject = this.userProjects.find(p => p.id === this.selectedProjectId);
            const projectName = selectedProject ? selectedProject.name : 'Current Project';
            
            items.push(new SidebarItem(
                `🤖 Context Documents${selectedProject ? ` (${projectName})` : ''}`,
                vscode.TreeItemCollapsibleState.Collapsed,
                'context',
                undefined,
                selectedProject ? `Context for ${projectName}` : 'AI context documents',
                new vscode.ThemeIcon('library')
            ));
        }

        // Sync Actions (only show if project is selected)
        if (this.selectedProjectId) {
            const syncStatus = this.syncService.getSyncStatus(this.selectedProjectId);
            const statusText = syncStatus ? 
                (syncStatus.status === 'synced' ? '✅ Synced' :
                 syncStatus.status === 'syncing' ? '🔄 Syncing' :
                 syncStatus.status === 'error' ? '❌ Error' : '⚠️ Conflict') : '❓ Unknown';
            
            items.push(new SidebarItem(
                `🔄 Sync Status: ${statusText}`,
                vscode.TreeItemCollapsibleState.None,
                'syncStatus',
                {
                    command: 'aiProjectManager.showSyncStatus',
                    title: 'Show Sync Status'
                },
                syncStatus ? `Last sync: ${syncStatus.lastSync.toLocaleString()}` : 'No sync data available',
                new vscode.ThemeIcon('sync')
            ));

            items.push(new SidebarItem(
                '🔄 Force Sync',
                vscode.TreeItemCollapsibleState.None,
                'forceSync',
                {
                    command: 'aiProjectManager.forceSync',
                    title: 'Force Sync'
                },
                'Force sync between local and cloud documents',
                new vscode.ThemeIcon('sync-ignored')
            ));

            items.push(new SidebarItem(
                '🔍 Check Cloud Changes',
                vscode.TreeItemCollapsibleState.None,
                'checkCloudChanges',
                {
                    command: 'aiProjectManager.checkCloudChanges',
                    title: 'Check Cloud Changes'
                },
                'Check for changes in cloud documents',
                new vscode.ThemeIcon('search')
            ));
        }

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
            const isSelected = project.id === this.selectedProjectId;
            
            return new SidebarItem(
                `${isSelected ? '✅ ' : ''}${project.name}`,
                vscode.TreeItemCollapsibleState.None,
                'project',
                {
                    command: 'aiProjectManager.selectProject',
                    title: 'Select Project',
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

    private async getDocumentItems(): Promise<SidebarItem[]> {
        console.log('getDocumentItems called');
        
        try {
            // If we have a selected cloud project, fetch documents from cloud
            if (this.selectedProjectId && this.authService.isAuthenticated()) {
                console.log('Fetching documents for selected project:', this.selectedProjectId);
                return await this.getCloudDocumentItems();
            }
            
            // No cloud project selected - show message
            console.log('No cloud project selected');
            return [
                new SidebarItem(
                    'No cloud project selected',
                    vscode.TreeItemCollapsibleState.None,
                    'noCloudProject',
                    undefined,
                    'Select a cloud project to view its documents',
                    new vscode.ThemeIcon('info')
                )
            ];
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

    private async getCloudDocumentItems(): Promise<SidebarItem[]> {
        try {
            const config = vscode.workspace.getConfiguration('aiProjectManager');
            const dashboardUrl = config.get('dashboardUrl', 'http://localhost:3000');
            
            console.log('Fetching cloud documents from:', `${dashboardUrl}/api/projects/${this.selectedProjectId}/documents`);
            console.log('Selected project ID:', this.selectedProjectId);
            console.log('Auth service authenticated:', this.authService.isAuthenticated());
            
            // Check if we have a valid project ID
            if (!this.selectedProjectId) {
                throw new Error('No project selected');
            }
            
            // Check authentication
            if (!this.authService.isAuthenticated()) {
                throw new Error('Not authenticated');
            }
            
            // Try to find the project by name if the ID looks like a workspace name
            let projectId = this.selectedProjectId;
            if (!this.isValidUUID(projectId)) {
                console.log('Project ID looks like a workspace name, trying to find by name');
                const projectByName = this.userProjects.find(p => p.name.toLowerCase() === projectId.toLowerCase());
                if (projectByName) {
                    projectId = projectByName.id;
                    console.log('Found project by name, using ID:', projectId);
                } else {
                    throw new Error(`Project "${projectId}" not found in cloud projects`);
                }
            }
            
            // Fetch project documents from cloud using VS Code-specific endpoint
            const response = await this.authService.makeAuthenticatedRequest(
                `${dashboardUrl}/api/vscode/projects/${projectId}/documents`
            );
            
            console.log('Response status:', response.status, response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response body:', errorText);
                throw new Error(`Failed to fetch project documents: ${response.status} ${response.statusText} - ${errorText}`);
            }
            
            const documents = await response.json();
            console.log('Received documents:', documents);
            
            // Download documents to local folder
            await this.downloadDocumentsToLocal(projectId, documents);
            
            const items: SidebarItem[] = [];
            
            // Map cloud documents to sidebar items
            const documentTypes = [
                { key: 'requirements', name: 'Requirements', icon: 'list-unordered' },
                { key: 'design', name: 'Design', icon: 'organization' },
                { key: 'tasks', name: 'Tasks', icon: 'tasklist' }
            ];
            
            for (const docType of documentTypes) {
                if (documents[docType.key] && documents[docType.key].exists) {
                    const lastModified = documents[docType.key].lastModified ? 
                        new Date(documents[docType.key].lastModified) : new Date();
                    
                    // Get local file path
                    const localFilePath = this.getLocalDocumentPath(projectId, docType.key);
                    
                    items.push(new SidebarItem(
                        docType.name,
                        vscode.TreeItemCollapsibleState.None,
                        'localDocument',
                        {
                            command: 'aiProjectManager.openLocalDocument',
                            title: `Open ${docType.name}`,
                            arguments: [localFilePath]
                        },
                        `${docType.name} - Modified ${this.getTimeAgo(lastModified)}`,
                        new vscode.ThemeIcon(docType.icon),
                        `Modified ${this.getTimeAgo(lastModified)}`
                    ));
                }
            }
            
            if (items.length === 0) {
                return [
                    new SidebarItem(
                        'No cloud documents',
                        vscode.TreeItemCollapsibleState.None,
                        'noCloudDocuments',
                        undefined,
                        'No documents found for this project in the cloud',
                        new vscode.ThemeIcon('info')
                    )
                ];
            }
            
            return items;
        } catch (error) {
            console.error('Error fetching cloud documents:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return [
                new SidebarItem(
                    `Error fetching cloud documents: ${errorMessage}`,
                    vscode.TreeItemCollapsibleState.None,
                    'error',
                    undefined,
                    'Failed to load documents from cloud',
                    new vscode.ThemeIcon('error')
                )
            ];
        }
    }

    // Helper method to check if a string is a valid UUID
    private isValidUUID(str: string): boolean {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
    }

    /**
     * Download documents to local folder with numbered folders if needed
     */
    private async downloadDocumentsToLocal(projectId: string, documents: any): Promise<void> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('No workspace folder open');
            }

            const basePath = workspaceFolder.uri.fsPath;
            const projectName = this.userProjects.find(p => p.id === projectId)?.name || 'project';
            
            // Find available folder number
            let folderNumber = 1;
            let localPath = path.join(basePath, `${projectName}-${projectId}`);
            
            while (fs.existsSync(localPath)) {
                folderNumber++;
                localPath = path.join(basePath, `${projectName}-${projectId}-${folderNumber}`);
            }
            
            console.log(`Creating local folder: ${localPath}`);
            
            // Create the local folder structure
            const kiroSpecsPath = path.join(localPath, '.kiro', 'specs', 'ai-project-manager');
            fs.mkdirSync(kiroSpecsPath, { recursive: true });
            
            // Write documents to local files
            const documentTypes = [
                { key: 'requirements', filename: 'requirements.md' },
                { key: 'design', filename: 'design.md' },
                { key: 'tasks', filename: 'tasks.md' }
            ];
            
            for (const docType of documentTypes) {
                if (documents[docType.key] && documents[docType.key].content) {
                    const filePath = path.join(kiroSpecsPath, docType.filename);
                    fs.writeFileSync(filePath, documents[docType.key].content);
                    console.log(`Downloaded ${docType.filename} to ${filePath}`);
                }
            }
            
            // Create a metadata file to track the project
            const metadata = {
                projectId: projectId,
                projectName: projectName,
                downloadedAt: new Date().toISOString(),
                folderNumber: folderNumber
            };
            fs.writeFileSync(path.join(kiroSpecsPath, 'metadata.json'), JSON.stringify(metadata, null, 2));
            
            // Store the local path for this project
            this.projectLocalPaths.set(projectId, localPath);
            
            vscode.window.showInformationMessage(`✅ Downloaded project documents to: ${path.basename(localPath)}`);
            
        } catch (error) {
            console.error('Error downloading documents to local:', error);
            throw error;
        }
    }

    /**
     * Get local document path for a project and document type
     */
    private getLocalDocumentPath(projectId: string, documentType: string): string {
        const localPath = this.projectLocalPaths.get(projectId);
        if (!localPath) {
            throw new Error(`No local path found for project ${projectId}`);
        }
        
        const filename = `${documentType}.md`;
        return path.join(localPath, '.kiro', 'specs', 'ai-project-manager', filename);
    }

    private getLocalDocumentItems(): SidebarItem[] {
        console.log('getLocalDocumentItems called');
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
            console.error('Error in getLocalDocumentItems:', error);
            return [
                new SidebarItem(
                    `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    vscode.TreeItemCollapsibleState.None,
                    'error',
                    undefined,
                    'Failed to load local project documents',
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