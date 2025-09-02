import * as vscode from 'vscode';
import { TaskInteractionService, TaskItem } from './taskInteractionService';

export class TaskDocumentProvider implements vscode.CustomTextEditorProvider {
    public static readonly viewType = 'aiProjectManager.taskDocument';
    private taskInteractionService = new TaskInteractionService();

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new TaskDocumentProvider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider(
            TaskDocumentProvider.viewType,
            provider
        );
        return providerRegistration;
    }

    constructor(private readonly context: vscode.ExtensionContext) {}

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        // Set up the webview
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'media')
            ]
        };

        // Set the webview's initial html content
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

        // Handle messages from the webview
        webviewPanel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.type) {
                    case 'startTask':
                        await this.handleStartTask(message.taskTitle);
                        break;
                    case 'completeTask':
                        await this.handleCompleteTask(message.taskTitle);
                        break;
                    case 'resetTask':
                        await this.handleResetTask(message.taskTitle);
                        break;
                    case 'refresh':
                        this.updateWebview(webviewPanel.webview, document);
                        break;
                    case 'loadRequirements':
                        await this.loadRequirements(webviewPanel.webview);
                        break;
                    case 'loadDesign':
                        await this.loadDesign(webviewPanel.webview);
                        break;
                }
            }
        );

        // Update the webview when the document changes
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                this.updateWebview(webviewPanel.webview, document);
            }
        });

        // Update the webview when the document is saved
        const saveDocumentSubscription = vscode.workspace.onDidSaveTextDocument(e => {
            if (e.uri.toString() === document.uri.toString()) {
                this.updateWebview(webviewPanel.webview, document);
            }
        });

        // Clean up subscriptions when the webview is disposed
        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
            saveDocumentSubscription.dispose();
        });

        // Initial update - always succeed regardless of project structure
        this.updateWebview(webviewPanel.webview, document);
    }

    private async handleStartTask(taskTitle: string): Promise<void> {
        try {
            const success = await this.taskInteractionService.startTask(taskTitle);
            if (success) {
                // The service already shows success message
                // No need to refresh the webview since we're not modifying local files
            } else {
                vscode.window.showErrorMessage(`❌ Failed to start task`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`❌ Error starting task: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async handleCompleteTask(taskTitle: string): Promise<void> {
        try {
            const success = await this.taskInteractionService.completeTask(taskTitle);
            if (success) {
                // The service already shows success message
                // No need to refresh the webview since we're not modifying local files
            } else {
                vscode.window.showErrorMessage(`❌ Failed to complete task`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`❌ Error completing task: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async handleResetTask(taskTitle: string): Promise<void> {
        try {
            const success = await this.taskInteractionService.resetTask(taskTitle);
            if (success) {
                // The service already shows success message
                // No need to refresh the webview since we're not modifying local files
            } else {
                vscode.window.showErrorMessage(`❌ Failed to reset task`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`❌ Error resetting task: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private async loadRequirements(webview: vscode.Webview): Promise<void> {
        try {
            // Try to find requirements.md in the workspace
            const requirementsFiles = await vscode.workspace.findFiles('**/requirements.md', '**/node_modules/**');
            
            if (requirementsFiles.length === 0) {
                webview.postMessage({
                    type: 'requirementsLoaded',
                    error: 'No requirements.md file found in the workspace. Create one to view requirements.'
                });
                return;
            }

            // Read the first requirements.md file found
            const requirementsFile = requirementsFiles[0];
            const content = await vscode.workspace.fs.readFile(requirementsFile);
            const requirementsText = Buffer.from(content).toString('utf8');

            // Convert markdown to HTML for display
            const htmlContent = this.convertMarkdownToHtml(requirementsText);

            webview.postMessage({
                type: 'requirementsLoaded',
                content: htmlContent
            });
        } catch (error) {
            webview.postMessage({
                type: 'requirementsLoaded',
                error: `Failed to load requirements: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }
    }

    private async loadDesign(webview: vscode.Webview): Promise<void> {
        try {
            // Try to find design.md in the workspace
            const designFiles = await vscode.workspace.findFiles('**/design.md', '**/node_modules/**');
            
            if (designFiles.length === 0) {
                webview.postMessage({
                    type: 'designLoaded',
                    error: 'No design.md file found in the workspace. Create one to view design documentation.'
                });
                return;
            }

            // Read the first design.md file found
            const designFile = designFiles[0];
            const content = await vscode.workspace.fs.readFile(designFile);
            const designText = Buffer.from(content).toString('utf8');

            // Convert markdown to HTML for display
            const htmlContent = this.convertMarkdownToHtml(designText);

            webview.postMessage({
                type: 'designLoaded',
                content: htmlContent
            });
        } catch (error) {
            webview.postMessage({
                type: 'designLoaded',
                error: `Failed to load design: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }
    }

    private convertMarkdownToHtml(markdown: string): string {
        // Simple markdown to HTML conversion
        let html = markdown
            // Headers
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            // Bold and italic
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Code blocks
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Lists
            .replace(/^\* (.*$)/gim, '<li>$1</li>')
            .replace(/^- (.*$)/gim, '<li>$1</li>')
            .replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>')
            // Paragraphs
            .replace(/\n\n/g, '</p><p>')
            .replace(/^(?!<[h|li|pre|ul|ol])(.*$)/gim, '<p>$1</p>')
            // Clean up empty paragraphs
            .replace(/<p><\/p>/g, '')
            .replace(/<p>(.*?)<\/p>/g, (match, content) => {
                if (content.trim() === '') return '';
                return match;
            });

        // Wrap lists properly
        html = html
            .replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>')
            .replace(/<\/ul>\s*<ul>/g, '');

        return html;
    }

    private updateWebview(webview: vscode.Webview, document: vscode.TextDocument): void {
        try {
            // Always parse tasks from the current document content, regardless of project structure
            const content = document.getText();
            const tasks = this.taskInteractionService.parseTasksFromContent(content);
            
            webview.postMessage({
                type: 'update',
                tasks: tasks,
                content: content
            });
        } catch (error) {
            console.error('Error updating webview:', error);
            // Even if there's an error, show a basic message to the user
            webview.postMessage({
                type: 'update',
                tasks: [],
                content: document.getText(),
                error: 'Error parsing tasks, but you can still use the editor'
            });
        }
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>AI Project Manager - Project Dashboard</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        margin: 0;
                        padding: 20px;
                        background-color: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                    }
                    
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                        padding-bottom: 10px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                    }
                    
                    .title {
                        font-size: 24px;
                        font-weight: 600;
                        color: var(--vscode-editor-foreground);
                    }
                    
                    .subtitle {
                        font-size: 14px;
                        color: var(--vscode-descriptionForeground);
                        margin-top: 5px;
                    }
                    
                    .refresh-btn {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 8px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                    }
                    
                    .refresh-btn:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    
                    .info-box {
                        background: var(--vscode-notificationsInfoBackground);
                        border: 1px solid var(--vscode-notificationsInfoBorder);
                        border-radius: 6px;
                        padding: 15px;
                        margin-bottom: 20px;
                        color: var(--vscode-notificationsInfoForeground);
                    }
                    
                    .task-container {
                        margin-bottom: 20px;
                    }
                    
                    .task-item {
                        margin-bottom: 15px;
                        padding: 15px;
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 6px;
                        background-color: var(--vscode-editor-background);
                    }
                    
                    .task-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        margin-bottom: 10px;
                    }
                    
                    .task-title {
                        font-size: 16px;
                        font-weight: 500;
                        color: var(--vscode-editor-foreground);
                        flex: 1;
                        margin-right: 15px;
                    }
                    
                    .task-actions {
                        display: flex;
                        gap: 8px;
                        flex-shrink: 0;
                    }
                    
                    .task-btn {
                        padding: 6px 12px;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                        font-weight: 500;
                        transition: all 0.2s;
                    }
                    
                    .start-btn {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                    }
                    
                    .start-btn:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    
                    .complete-btn {
                        background: var(--vscode-testing-iconPassed);
                        color: white;
                    }
                    
                    .complete-btn:hover {
                        background: var(--vscode-testing-iconPassed);
                        opacity: 0.8;
                    }
                    
                    .reset-btn {
                        background: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                    }
                    
                    .reset-btn:hover {
                        background: var(--vscode-button-secondaryHoverBackground);
                    }
                    
                    .task-status {
                        display: inline-block;
                        padding: 4px 8px;
                        border-radius: 12px;
                        font-size: 11px;
                        font-weight: 500;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    
                    .status-todo {
                        background: var(--vscode-badge-background);
                        color: var(--vscode-badge-foreground);
                    }
                    
                    .status-in-progress {
                        background: var(--vscode-progressBar-background);
                        color: white;
                    }
                    
                    .status-done {
                        background: var(--vscode-testing-iconPassed);
                        color: white;
                    }
                    
                    .dashboard-tabs {
                        margin-top: 24px;
                    }
                    
                    .tab-navigation {
                        display: flex;
                        gap: 1px;
                        margin-bottom: 24px;
                        background: var(--vscode-panel-border);
                        border-radius: 8px;
                        padding: 4px;
                    }
                    
                    .tab-nav-btn {
                        background: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                        border: none;
                        padding: 12px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                        transition: all 0.2s ease;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        flex: 1;
                        justify-content: center;
                    }
                    
                    .tab-nav-btn:hover {
                        background: var(--vscode-list-hoverBackground);
                    }
                    
                    .tab-nav-btn.active {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                    }
                    
                    .tab-icon {
                        font-size: 16px;
                    }
                    
                    .tab-label {
                        font-weight: 600;
                    }
                    
                    .tab-panel {
                        display: none;
                    }
                    
                    .tab-panel.active {
                        display: block;
                    }
                    
                    .tab-header {
                        margin-bottom: 24px;
                        padding-bottom: 16px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                    }
                    
                    .tab-title {
                        font-size: 24px;
                        font-weight: 700;
                        color: var(--vscode-editor-foreground);
                        margin: 0 0 8px 0;
                    }
                    
                    .tab-subtitle {
                        font-size: 14px;
                        color: var(--vscode-descriptionForeground);
                        margin: 0;
                        line-height: 1.5;
                    }
                    
                    .task-tabs {
                        display: flex;
                        gap: 1px;
                        margin-bottom: 20px;
                        background: var(--vscode-panel-border);
                        border-radius: 6px;
                        padding: 2px;
                    }
                    
                    .task-tab-btn {
                        background: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                        border: none;
                        padding: 8px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 13px;
                        font-weight: 500;
                        transition: all 0.2s ease;
                        flex: 1;
                    }
                    
                    .task-tab-btn:hover {
                        background: var(--vscode-list-hoverBackground);
                    }
                    
                    .task-tab-btn.active {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                    }
                    
                    .task-tab-content {
                        display: none;
                    }
                    
                    .task-tab-content.active {
                        display: block;
                    }
                    
                    .content-container {
                        min-height: 200px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    
                    .placeholder-content {
                        text-align: center;
                        padding: 40px 20px;
                        color: var(--vscode-descriptionForeground);
                    }
                    
                    .placeholder-icon {
                        font-size: 48px;
                        margin-bottom: 16px;
                        opacity: 0.6;
                    }
                    
                    .placeholder-content h4 {
                        font-size: 18px;
                        font-weight: 600;
                        color: var(--vscode-editor-foreground);
                        margin: 0 0 8px 0;
                    }
                    
                    .placeholder-content p {
                        font-size: 14px;
                        margin: 0 0 20px 0;
                        line-height: 1.5;
                    }
                    
                    .placeholder-btn {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 10px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                        transition: all 0.2s ease;
                    }
                    
                    .placeholder-btn:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    
                    .markdown-content {
                        background: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 8px;
                        padding: 20px;
                        max-height: 600px;
                        overflow-y: auto;
                    }
                    
                    .markdown-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                        padding-bottom: 16px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                    }
                    
                    .markdown-header h4 {
                        margin: 0;
                        font-size: 18px;
                        font-weight: 600;
                        color: var(--vscode-editor-foreground);
                    }
                    
                    .markdown-body {
                        font-family: var(--vscode-editor-font-family);
                        font-size: 14px;
                        line-height: 1.6;
                        color: var(--vscode-editor-foreground);
                    }
                    
                    .markdown-body h1, .markdown-body h2, .markdown-body h3 {
                        margin-top: 24px;
                        margin-bottom: 16px;
                        font-weight: 600;
                        color: var(--vscode-editor-foreground);
                    }
                    
                    .markdown-body h1 { font-size: 24px; }
                    .markdown-body h2 { font-size: 20px; }
                    .markdown-body h3 { font-size: 18px; }
                    
                    .markdown-body p {
                        margin-bottom: 16px;
                    }
                    
                    .markdown-body ul, .markdown-body ol {
                        margin-bottom: 16px;
                        padding-left: 24px;
                    }
                    
                    .markdown-body li {
                        margin-bottom: 8px;
                    }
                    
                    .markdown-body code {
                        background: var(--vscode-textCodeBlock-background);
                        color: var(--vscode-textCodeBlock-foreground);
                        padding: 2px 6px;
                        border-radius: 4px;
                        font-family: var(--vscode-editor-font-family);
                        font-size: 13px;
                    }
                    
                    .markdown-body pre {
                        background: var(--vscode-textCodeBlock-background);
                        border: 1px solid var(--vscode-panel-border);
                        border-radius: 6px;
                        padding: 16px;
                        overflow-x: auto;
                        margin-bottom: 16px;
                    }
                    
                    .markdown-body pre code {
                        background: none;
                        padding: 0;
                        border-radius: 0;
                    }
                    
                    .completed-task-item {
                        opacity: 0.8;
                        background-color: var(--vscode-editor-inactiveSelectionBackground);
                    }
                    
                    .completed-task-item .task-title {
                        text-decoration: line-through;
                        color: var(--vscode-descriptionForeground);
                    }
                    
                    .completed-task-item .task-status {
                        background: var(--vscode-testing-iconPassed);
                        color: white;
                    }
                    
                    .task-children {
                        margin-left: 20px;
                        margin-top: 10px;
                        padding-left: 15px;
                        border-left: 2px solid var(--vscode-panel-border);
                    }
                    
                    .child-task {
                        margin-bottom: 10px;
                        padding: 10px;
                        background-color: var(--vscode-editor-inactiveSelectionBackground);
                        border-radius: 4px;
                    }
                    
                    .no-tasks {
                        text-align: center;
                        padding: 40px;
                        color: var(--vscode-descriptionForeground);
                        font-style: italic;
                    }
                    
                    .loading {
                        text-align: center;
                        padding: 40px;
                        color: var(--vscode-descriptionForeground);
                    }
                    
                    .error-message {
                        background: var(--vscode-notificationsErrorBackground);
                        border: 1px solid var(--vscode-notificationsErrorBorder);
                        border-radius: 6px;
                        padding: 15px;
                        margin-bottom: 20px;
                        color: var(--vscode-notificationsErrorForeground);
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <div class="title">📊 Project Dashboard</div>
                        <div class="subtitle">Manage your project tasks, requirements, and design</div>
                    </div>
                    <button class="refresh-btn" onclick="refreshTasks()">
                        🔄 Refresh
                    </button>
                </div>
                
                <div class="info-box">
                    💡 <strong>How it works:</strong> When you click "Start Task", the task details are automatically copied to your clipboard and inserted into any open AI chat. This works just like the "Add to Chat" feature!
                </div>
                
                <div id="errorContainer" style="display: none;"></div>
                
                <div class="dashboard-tabs">
                    <div class="tab-navigation">
                        <button class="tab-nav-btn active" onclick="switchTab('tasks')">
                            <span class="tab-icon">📋</span>
                            <span class="tab-label">Tasks</span>
                        </button>
                        <button class="tab-nav-btn" onclick="switchTab('requirements')">
                            <span class="tab-icon">📋</span>
                            <span class="tab-label">Requirements</span>
                        </button>
                        <button class="tab-nav-btn" onclick="switchTab('design')">
                            <span class="tab-icon">🎨</span>
                            <span class="tab-label">Design</span>
                        </button>
                    </div>
                    
                    <div id="tasksTab" class="tab-panel active">
                        <div class="tab-header">
                            <h3 class="tab-title">Task Management</h3>
                            <p class="tab-subtitle">Track and manage your project tasks</p>
                        </div>
                        
                        <div class="task-tabs">
                            <button class="task-tab-btn active" onclick="switchTaskTab('active')">
                                📋 Active Tasks
                            </button>
                            <button class="task-tab-btn" onclick="switchTaskTab('completed')">
                                ✅ Completed Tasks
                            </button>
                        </div>
                        
                        <div id="activeTaskTab" class="task-tab-content active">
                            <div id="uncompletedTaskContainer" class="task-container">
                                Loading tasks...
                            </div>
                        </div>
                        
                        <div id="completedTaskTab" class="task-tab-content">
                            <div id="completedTaskContainer" class="task-container">
                                Loading tasks...
                            </div>
                        </div>
                    </div>
                    
                    <div id="requirementsTab" class="tab-panel">
                        <div class="tab-header">
                            <h3 class="tab-title">Project Requirements</h3>
                            <p class="tab-subtitle">View and manage project requirements</p>
                        </div>
                        <div id="requirementsContainer" class="content-container">
                            <div class="placeholder-content">
                                <div class="placeholder-icon">📋</div>
                                <h4>Requirements Management</h4>
                                <p>Requirements will be loaded from your requirements.md file</p>
                                <button class="placeholder-btn" onclick="loadRequirements()">Load Requirements</button>
                            </div>
                        </div>
                    </div>
                    
                    <div id="designTab" class="tab-panel">
                        <div class="tab-header">
                            <h3 class="tab-title">System Design</h3>
                            <p class="tab-subtitle">View and manage system architecture</p>
                        </div>
                        <div id="designContainer" class="content-container">
                            <div class="placeholder-content">
                                <div class="placeholder-icon">🎨</div>
                                <h4>Design Documentation</h4>
                                <p>Design documents will be loaded from your design.md file</p>
                                <button class="placeholder-btn" onclick="loadDesign()">Load Design</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <script>
                    const vscode = acquireVsCodeApi();
                    let currentTasks = [];
                    
                    // Handle messages from the extension
                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.type) {
                            case 'update':
                                currentTasks = message.tasks || [];
                                if (message.error) {
                                    showError(message.error);
                                } else {
                                    hideError();
                                }
                                renderTasks(currentTasks);
                                break;
                            case 'requirementsLoaded':
                                if (message.error) {
                                    document.getElementById('requirementsContainer').innerHTML = \`
                                        <div class="placeholder-content">
                                            <div class="placeholder-icon">⚠️</div>
                                            <h4>Error Loading Requirements</h4>
                                            <p>\${message.error}</p>
                                            <button class="placeholder-btn" onclick="loadRequirements()">Retry</button>
                                        </div>
                                    \`;
                                } else {
                                    document.getElementById('requirementsContainer').innerHTML = \`
                                        <div class="markdown-content">
                                            <div class="markdown-header">
                                                <h4>📋 Project Requirements</h4>
                                                <button class="placeholder-btn" onclick="loadRequirements()">🔄 Reload</button>
                                            </div>
                                            <div class="markdown-body">
                                                \${message.content}
                                            </div>
                                        </div>
                                    \`;
                                }
                                break;
                            case 'designLoaded':
                                if (message.error) {
                                    document.getElementById('designContainer').innerHTML = \`
                                        <div class="placeholder-content">
                                            <div class="placeholder-icon">⚠️</div>
                                            <h4>Error Loading Design</h4>
                                            <p>\${message.error}</p>
                                            <button class="placeholder-btn" onclick="loadDesign()">Retry</button>
                                        </div>
                                    \`;
                                } else {
                                    document.getElementById('designContainer').innerHTML = \`
                                        <div class="markdown-content">
                                            <div class="placeholder-icon">🎨</div>
                                            <h4>System Design</h4>
                                            <button class="placeholder-btn" onclick="loadDesign()">🔄 Reload</button>
                                        </div>
                                        <div class="markdown-body">
                                            \${message.content}
                                        </div>
                                    \`;
                                }
                                break;
                        }
                    });
                    
                    function showError(errorMessage) {
                        const errorContainer = document.getElementById('errorContainer');
                        errorContainer.innerHTML = \`
                            <div class="error-message">
                                ⚠️ <strong>Note:</strong> \${errorMessage}
                            </div>
                        \`;
                        errorContainer.style.display = 'block';
                    }
                    
                    function hideError() {
                        const errorContainer = document.getElementById('errorContainer');
                        errorContainer.style.display = 'none';
                    }
                    
                    function renderTasks(tasks) {
                        if (!tasks || tasks.length === 0) {
                            document.getElementById('uncompletedTaskContainer').innerHTML = '<div class="no-tasks">No tasks found. Create some tasks in your tasks.md file.</div>';
                            document.getElementById('completedTaskContainer').innerHTML = '<div class="no-tasks">No completed tasks yet.</div>';
                            return;
                        }
                        
                        const uncompletedTasks = tasks.filter(task => task.status !== 'done');
                        const completedTasks = tasks.filter(task => task.status === 'done');
                        
                        // Render uncompleted tasks
                        const uncompletedContainer = document.getElementById('uncompletedTaskContainer');
                        if (uncompletedTasks.length === 0) {
                            uncompletedContainer.innerHTML = '<div class="no-tasks">🎉 All tasks completed! Great job!</div>';
                        } else {
                            uncompletedContainer.innerHTML = uncompletedTasks.map(task => renderTask(task, false)).join('');
                        }
                        
                        // Render completed tasks
                        const completedContainer = document.getElementById('completedTaskContainer');
                        if (completedTasks.length === 0) {
                            completedContainer.innerHTML = '<div class="no-tasks">No completed tasks yet. Start working on your tasks!</div>';
                        } else {
                            completedContainer.innerHTML = completedTasks.map(task => renderTask(task, true)).join('');
                        }
                    }
                    
                    function renderTask(task, isCompleted = false) {
                        const statusClass = \`status-\${task.status}\`;
                        const statusText = task.status === 'todo' ? 'TODO' : 
                                         task.status === 'in-progress' ? 'IN PROGRESS' : 'DONE';
                        
                        let actionButtons = '';
                        if (!isCompleted) {
                            if (task.status === 'todo') {
                                actionButtons = \`
                                    <button class="task-btn start-btn" onclick="startTask('\${task.title}')">
                                        ▶️ Start Task
                                    </button>
                                \`;
                            } else if (task.status === 'in-progress') {
                                actionButtons = \`
                                    <button class="task-btn complete-btn" onclick="completeTask('\${task.title}')">
                                        ✅ Complete
                                    </button>
                                    <button class="task-btn reset-btn" onclick="resetTask('\${task.title}')">
                                        🔄 Reset
                                    </button>
                                \`;
                            }
                        }
                        
                        let childrenHtml = '';
                        if (task.children && task.children.length > 0) {
                            if (isCompleted) {
                                // Show all completed children for completed tasks
                                const completedChildren = task.children.filter(child => child.status === 'done');
                                if (completedChildren.length > 0) {
                                    childrenHtml = \`
                                        <div class="task-children">
                                            \${completedChildren.map(child => renderChildTask(child, true)).join('')}
                                        </div>
                                    \`;
                                }
                            } else {
                                // Show uncompleted children for active tasks
                                const uncompletedChildren = task.children.filter(child => child.status !== 'done');
                                if (uncompletedChildren.length > 0) {
                                    childrenHtml = \`
                                        <div class="task-children">
                                            \${uncompletedChildren.map(child => renderChildTask(child, false)).join('')}
                                        </div>
                                    \`;
                                }
                            }
                        }
                        
                        const taskClass = isCompleted ? 'task-item completed-task-item' : 'task-item';
                        
                        return \`
                            <div class="\${taskClass}">
                                <div class="task-header">
                                    <div class="task-title">\${task.title}</div>
                                    <div class="task-actions">
                                        <span class="task-status \${statusClass}">\${statusText}</span>
                                        \${actionButtons}
                                    </div>
                                </div>
                                \${childrenHtml}
                            </div>
                        \`;
                    }
                    
                    function renderChildTask(task, isCompleted = false) {
                        const statusClass = \`status-\${task.status}\`;
                        const statusText = task.status === 'todo' ? 'TODO' : 
                                         task.status === 'in-progress' ? 'IN PROGRESS' : 'DONE';
                        
                        let actionButtons = '';
                        if (!isCompleted) {
                            if (task.status === 'todo') {
                                actionButtons = \`
                                    <button class="task-btn start-btn" onclick="startTask('\${task.title}')">
                                        ▶️ Start
                                    </button>
                                \`;
                            } else if (task.status === 'in-progress') {
                                actionButtons = \`
                                    <button class="task-btn complete-btn" onclick="completeTask('\${task.title}')">
                                        ✅ Complete
                                    </button>
                                    <button class="task-btn reset-btn" onclick="resetTask('\${task.title}')">
                                        🔄 Reset
                                    </button>
                                \`;
                            }
                        }
                        
                        const childClass = isCompleted ? 'child-task completed-task-item' : 'child-task';
                        
                        return \`
                            <div class="\${childClass}">
                                <div class="task-header">
                                    <div class="task-title">\${task.title}</div>
                                    <div class="task-actions">
                                        <span class="task-status \${statusClass}">\${statusText}</span>
                                        \${actionButtons}
                                    </div>
                                </div>
                            </div>
                        \`;
                    }
                    
                    function startTask(taskTitle) {
                        vscode.postMessage({
                            type: 'startTask',
                            taskTitle: taskTitle
                        });
                    }
                    
                    function completeTask(taskTitle) {
                        vscode.postMessage({
                            type: 'completeTask',
                            taskTitle: taskTitle
                        });
                    }
                    
                    function resetTask(taskTitle) {
                        vscode.postMessage({
                            type: 'resetTask',
                            taskTitle: taskTitle
                        });
                    }
                    
                    function switchTab(tabName) {
                        // Update main tab navigation
                        document.querySelectorAll('.tab-nav-btn').forEach(btn => {
                            btn.classList.remove('active');
                        });
                        document.querySelector(\`[onclick="switchTab('\${tabName}')"]\`).classList.add('active');
                        
                        // Update tab panels
                        document.querySelectorAll('.tab-panel').forEach(panel => {
                            panel.classList.remove('active');
                        });
                        document.getElementById(\`\${tabName}Tab\`).classList.add('active');
                    }
                    
                    function switchTaskTab(tabName) {
                        // Update task tab buttons
                        document.querySelectorAll('.task-tab-btn').forEach(btn => {
                            btn.classList.remove('active');
                        });
                        document.querySelector(\`[onclick="switchTaskTab('\${tabName}')"]\`).classList.add('active');
                        
                        // Update task tab content
                        document.querySelectorAll('.task-tab-content').forEach(content => {
                            content.classList.remove('active');
                        });
                        document.getElementById(\`\${tabName}TaskTab\`).classList.add('active');
                    }
                    
                    function loadRequirements() {
                        // Show loading state
                        document.getElementById('requirementsContainer').innerHTML = \`
                            <div class="placeholder-content">
                                <div class="placeholder-icon">⏳</div>
                                <h4>Loading Requirements...</h4>
                                <p>Fetching requirements from your requirements.md file</p>
                            </div>
                        \`;
                        
                        // Request requirements content from the extension
                        vscode.postMessage({
                            type: 'loadRequirements'
                        });
                    }
                    
                    function loadDesign() {
                        // Show loading state
                        document.getElementById('designContainer').innerHTML = \`
                            <div class="placeholder-content">
                                <div class="placeholder-icon">⏳</div>
                                <h4>Loading Design...</h4>
                                <p>Fetching design from your design.md file</p>
                            </div>
                        \`;
                        
                        // Request design content from the extension
                        vscode.postMessage({
                            type: 'loadDesign'
                        });
                    }
                    
                    function refreshTasks() {
                        vscode.postMessage({
                            type: 'refresh'
                        });
                    }
                </script>
            </body>
            </html>
        `;
    }
}

