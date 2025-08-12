import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectDetectorImpl } from './projectDetector';
import { ProgressData, ProjectStructure } from '../types';

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
    private syncStatus: 'connected' | 'disconnected' | 'syncing' = 'disconnected';
    private lastSyncTime?: Date;

    constructor() {
        console.log('SidebarProvider constructor called');
        // Set up periodic refresh
        setInterval(() => {
            this.refresh();
        }, 30000); // Refresh every 30 seconds
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: SidebarItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: SidebarItem): Promise<SidebarItem[]> {
        console.log('getChildren called with element:', element?.label || 'root');
        
        if (!this.projectDetector.detectAiProject()) {
            console.log('No AI project detected, showing warning');
            return [
                new SidebarItem(
                    'No AI Project Detected',
                    vscode.TreeItemCollapsibleState.None,
                    'noProject',
                    undefined,
                    'No .ai-project folder found in workspace',
                    new vscode.ThemeIcon('warning', new vscode.ThemeColor('problemsWarningIcon.foreground'))
                )
            ];
        }

        if (!element) {
            // Root level items
            return this.getRootItems();
        }

        // Child items based on parent
        switch (element.contextValue) {
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

    private getRootItems(): SidebarItem[] {
        const items: SidebarItem[] = [];

        // Sync Status
        items.push(new SidebarItem(
            'Sync Status',
            vscode.TreeItemCollapsibleState.Expanded,
            'sync',
            undefined,
            'Dashboard synchronization status',
            new vscode.ThemeIcon('sync')
        ));

        // Project Documents
        items.push(new SidebarItem(
            'Project Documents',
            vscode.TreeItemCollapsibleState.Expanded,
            'documents',
            undefined,
            'Requirements, Design, and Tasks documents',
            new vscode.ThemeIcon('file-text')
        ));

        // Progress Overview
        items.push(new SidebarItem(
            'Progress Overview',
            vscode.TreeItemCollapsibleState.Collapsed,
            'progress',
            undefined,
            'Task completion progress',
            new vscode.ThemeIcon('graph')
        ));

        // Context Documents
        items.push(new SidebarItem(
            'Context Documents',
            vscode.TreeItemCollapsibleState.Collapsed,
            'context',
            undefined,
            'AI context documents',
            new vscode.ThemeIcon('library')
        ));

        // Quick Actions
        items.push(new SidebarItem(
            'Inject AI Context',
            vscode.TreeItemCollapsibleState.None,
            'contextAction',
            {
                command: 'aiProjectManager.injectContext',
                title: 'Inject AI Context'
            },
            'Inject project context for AI assistance',
            new vscode.ThemeIcon('robot')
        ));

        return items;
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