import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ProgressTracker, ProgressData, ActivityItem } from '../types';
import { ProjectDetectorImpl } from './projectDetector';
import { exec } from 'child_process';
import { promisify } from 'util';

// Add fetch type for Node.js
declare global {
    function fetch(input: string, init?: any): Promise<any>;
}

interface ParsedTask {
  id: string;
  title: string;
  level: number;
  isCompleted: boolean;
  isSubtask: boolean;
  parentId?: string;
  requirements?: string[];
  details?: string[];
}

interface GitCommit {
  hash: string;
  message: string;
  date: Date;
  files: string[];
}

interface CodePattern {
  pattern: RegExp;
  taskKeywords: string[];
  confidence: number;
}

export class ProgressTrackerImpl implements ProgressTracker {
    private projectDetector = new ProjectDetectorImpl();
    private execAsync = promisify(exec);
    private fileWatcher?: vscode.FileSystemWatcher;
    private lastAnalysis = new Map<string, number>();
    
    // Patterns that indicate task completion
    private readonly completionPatterns: CodePattern[] = [
        {
            pattern: /test.*\.spec\.(js|ts|jsx|tsx)$/,
            taskKeywords: ['test', 'testing', 'spec', 'unit'],
            confidence: 0.9
        },
        {
            pattern: /component.*\.(jsx|tsx)$/,
            taskKeywords: ['component', 'ui', 'interface', 'frontend'],
            confidence: 0.8
        },
        {
            pattern: /api.*\.(js|ts)$/,
            taskKeywords: ['api', 'endpoint', 'backend', 'server'],
            confidence: 0.8
        },
        {
            pattern: /\.config\.(js|ts|json)$/,
            taskKeywords: ['config', 'setup', 'configuration'],
            confidence: 0.7
        },
        {
            pattern: /README\.md$/i,
            taskKeywords: ['document', 'documentation', 'readme'],
            confidence: 0.6
        }
    ];
    
    updateProgress(): void {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) return;
        
        // Check for Kiro specs first
        const kiroSpecsPath = path.join(workspaceFolder.uri.fsPath, '.kiro', 'specs', 'ai-project-manager');
        let tasksPath: string;
        let progressPath: string;
        
        if (fs.existsSync(kiroSpecsPath)) {
            tasksPath = path.join(kiroSpecsPath, 'tasks.md');
            progressPath = path.join(kiroSpecsPath, 'progress.json');
        } else if (this.projectDetector.detectAiProject()) {
            const structure = this.projectDetector.getProjectStructure();
            tasksPath = structure.tasksPath;
            progressPath = structure.progressPath;
        } else {
            return;
        }
        
        const tasks = this.parseTasksFromFile(tasksPath);
        const previousProgress = this.readProgressData(progressPath);
        
        const progressData = this.calculateProgress(tasks, previousProgress);
        
        try {
            fs.writeFileSync(progressPath, JSON.stringify(progressData, null, 2));
            
            // Notify sidebar of progress update
            this.notifySidebarUpdate();
        } catch (error) {
            console.error('Failed to update progress:', error);
        }
    }
    
    /**
     * Starts automatic progress tracking by monitoring file changes and git commits
     */
    async startAutoTracking(): Promise<void> {
        if (!this.projectDetector.detectAiProject()) {
            return;
        }
        
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) return;
        
        // Set up file watcher for source code changes
        const pattern = new vscode.RelativePattern(workspaceFolder, '**/*.{js,ts,jsx,tsx,py,java,cpp,cs,md,json,yml,yaml}');
        this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);
        
        // Monitor file changes
        this.fileWatcher.onDidChange(async (uri) => {
            await this.analyzeFileChange(uri.fsPath, 'change');
        });
        
        this.fileWatcher.onDidCreate(async (uri) => {
            await this.analyzeFileChange(uri.fsPath, 'create');
        });
        
        // Analyze recent git commits
        await this.analyzeRecentCommits();
        
        // Set up periodic analysis (every 5 minutes for commits, every 10 minutes for workspace)
        setInterval(async () => {
            await this.analyzeRecentCommits();
        }, 5 * 60 * 1000);
        
        // Start workspace monitoring
        await this.monitorWorkspaceChanges();
        
        // Sync with dashboard on startup
        await this.syncWithDashboard();
        
    }
    
    /**
     * Stops automatic progress tracking
     */
    stopAutoTracking(): void {
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
            this.fileWatcher = undefined;
        }
    }
    
    detectTaskCompletion(filePath: string): boolean {
        // Enhanced implementation with git analysis and file pattern matching
        try {
            const stats = fs.statSync(filePath);
            const now = Date.now();
            const fileModified = stats.mtime.getTime();
            
            // Consider file as indicating task completion if modified within last 5 minutes
            const recentlyModified = (now - fileModified) < (5 * 60 * 1000);
            
            // Additional checks for specific file patterns that indicate completion
            const fileName = path.basename(filePath);
            const completionIndicators = [
                /\.test\.(js|ts|jsx|tsx)$/, // Test files
                /\.spec\.(js|ts|jsx|tsx)$/, // Spec files
                /README\.md$/i,             // Documentation
                /package\.json$/,           // Package configuration
                /\.config\.(js|ts|json)$/   // Configuration files
            ];
            
            const hasCompletionIndicator = completionIndicators.some(pattern => 
                pattern.test(fileName)
            );
            
            return recentlyModified && hasCompletionIndicator;
        } catch {
            return false;
        }
    }
    
    async syncWithDashboard(): Promise<void> {
        // Update progress and sync with dashboard
        this.updateProgress();
        
        try {
            const structure = this.projectDetector.getProjectStructure();
            const projectId = await this.getProjectId(structure.configPath);
            
            if (projectId) {
                const progressData = this.readProgressData(structure.progressPath);
                if (progressData) {
                    await this.sendProgressToDashboard(projectId, progressData);
                }
            }
        } catch (error) {
            console.warn('Failed to sync with dashboard:', error);
        }
    }
    
    /**
     * Analyzes file changes to infer task completion
     */
    private async analyzeFileChange(filePath: string, changeType: 'change' | 'create'): Promise<void> {
        try {
            const relativePath = vscode.workspace.asRelativePath(filePath);
            const now = Date.now();
            
            // Throttle analysis to prevent excessive processing
            const lastAnalysisTime = this.lastAnalysis.get(filePath) || 0;
            if (now - lastAnalysisTime < 30000) { // 30 seconds throttle
                return;
            }
            this.lastAnalysis.set(filePath, now);
            
            // Find matching patterns
            const matchingPatterns = this.completionPatterns.filter(pattern => 
                pattern.pattern.test(relativePath)
            );
            
            if (matchingPatterns.length === 0) return;
            
            // Get current tasks
            const structure = this.projectDetector.getProjectStructure();
            const tasks = this.parseTasksFromFile(structure.tasksPath);
            
            // Find tasks that might be completed by this file change
            for (const pattern of matchingPatterns) {
                const relevantTasks = this.findRelevantTasks(tasks, pattern.taskKeywords, filePath);
                
                for (const task of relevantTasks) {
                    if (!task.isCompleted) {
                        const confidence = await this.calculateCompletionConfidence(task, filePath, changeType);
                        
                        if (confidence > 0.7) {
                            await this.proposeTaskCompletion(task, filePath, confidence);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error analyzing file change:', error);
        }
    }
    
    /**
     * Analyzes recent git commits for completed features
     */
    private async analyzeRecentCommits(): Promise<void> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) return;
            
            const commits = await this.getRecentCommits(workspaceFolder.uri.fsPath);
            
            for (const commit of commits) {
                // Use enhanced commit analysis
                await this.analyzeCommitForTaskCompletion(commit);
            }
            
            // Sync progress after analyzing commits
            await this.syncWithDashboard();
        } catch (error) {
            console.error('Error analyzing git commits:', error);
        }
    }
    
    /**
     * Gets recent git commits
     */
    private async getRecentCommits(projectPath: string): Promise<GitCommit[]> {
        try {
            const { stdout } = await this.execAsync(
                'git log --oneline --since="7 days ago" --name-only --pretty=format:"%H|%s|%ad" --date=iso',
                { cwd: projectPath }
            );
            
            const commits: GitCommit[] = [];
            const lines = stdout.split('\n').filter(line => line.trim());
            
            let currentCommit: Partial<GitCommit> | null = null;
            
            for (const line of lines) {
                if (line.includes('|')) {
                    // New commit line
                    if (currentCommit) {
                        commits.push(currentCommit as GitCommit);
                    }
                    
                    const [hash, message, dateStr] = line.split('|');
                    currentCommit = {
                        hash,
                        message,
                        date: new Date(dateStr),
                        files: []
                    };
                } else if (currentCommit && line.trim()) {
                    // File line
                    currentCommit.files = currentCommit.files || [];
                    currentCommit.files.push(line.trim());
                }
            }
            
            if (currentCommit) {
                commits.push(currentCommit as GitCommit);
            }
            
            return commits.slice(0, 20); // Last 20 commits
        } catch (error) {
            console.warn('Git not available or no commits found:', error);
            return [];
        }
    }
    
    /**
     * Finds tasks relevant to specific keywords and file path
     */
    private findRelevantTasks(tasks: ParsedTask[], keywords: string[], filePath: string): ParsedTask[] {
        return tasks.filter(task => {
            const taskText = `${task.title} ${task.details?.join(' ') || ''}`.toLowerCase();
            const fileName = path.basename(filePath).toLowerCase();
            
            // Check if task mentions any of the keywords
            const hasKeywordMatch = keywords.some(keyword => 
                taskText.includes(keyword.toLowerCase())
            );
            
            // Check if filename relates to task
            const hasFileMatch = taskText.includes(fileName.replace(/\.[^.]+$/, ''));
            
            return hasKeywordMatch || hasFileMatch;
        });
    }
    
    /**
     * Finds tasks from git commit message
     */
    private findTasksFromCommitMessage(tasks: ParsedTask[], commitMessage: string): ParsedTask[] {
        const message = commitMessage.toLowerCase();
        
        return tasks.filter(task => {
            const taskText = task.title.toLowerCase();
            const taskId = task.id.toLowerCase();
            
            // Look for direct task ID reference
            if (message.includes(taskId)) return true;
            
            // Look for task title words (at least 2 matching words)
            const taskWords = taskText.split(/\s+/).filter(word => word.length > 3);
            const messageWords = message.split(/\s+/);
            
            const matchingWords = taskWords.filter(word => 
                messageWords.some(msgWord => msgWord.includes(word) || word.includes(msgWord))
            );
            
            return matchingWords.length >= 2;
        });
    }
    
    /**
     * Calculates confidence score for task completion based on file changes
     */
    private async calculateCompletionConfidence(
        task: ParsedTask, 
        filePath: string, 
        changeType: 'change' | 'create'
    ): Promise<number> {
        let confidence = 0;
        
        // Base confidence from change type
        confidence += changeType === 'create' ? 0.3 : 0.1;
        
        // Check file content for completion indicators
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            
            // Look for test patterns
            if (/describe|it\s*\(|test\s*\(|expect\s*\(/i.test(content)) {
                confidence += 0.4;
            }
            
            // Look for implementation patterns
            if (/export\s+(default\s+)?function|export\s+(default\s+)?class/i.test(content)) {
                confidence += 0.3;
            }
            
            // Look for documentation
            if (/\/\*\*|@param|@returns|@description/i.test(content)) {
                confidence += 0.2;
            }
            
        } catch (error) {
            // File might not be readable
        }
        
        return Math.min(confidence, 1.0);
    }
    
    /**
     * Calculates confidence score for task completion based on git commit
     */
    private calculateCommitConfidence(commit: GitCommit, task: ParsedTask): number {
        let confidence = 0;
        
        const message = commit.message.toLowerCase();
        
        // Look for completion keywords in commit message
        const completionKeywords = ['complete', 'finish', 'implement', 'add', 'create', 'build', 'done'];
        if (completionKeywords.some(keyword => message.includes(keyword))) {
            confidence += 0.3;
        }
        
        // Look for task-specific keywords
        const taskWords = task.title.toLowerCase().split(/\s+/);
        const matchingWords = taskWords.filter(word => 
            word.length > 3 && message.includes(word)
        );
        confidence += (matchingWords.length / taskWords.length) * 0.5;
        
        // Bonus for multiple files in commit (indicates substantial work)
        if (commit.files.length > 3) {
            confidence += 0.2;
        }
        
        return Math.min(confidence, 1.0);
    }
    
    /**
     * Proposes task completion to user and auto-completes if confidence is high
     */
    private async proposeTaskCompletion(task: ParsedTask, source: string, confidence: number): Promise<void> {
        const message = `Task "${task.title}" appears to be completed (confidence: ${Math.round(confidence * 100)}%)\nSource: ${source}`;
        
        if (confidence >= 0.9) {
            // Auto-complete with high confidence
            this.completeTaskWithAutoDetection(task.id, task.title);
            vscode.window.showInformationMessage(`✅ Auto-completed task: ${task.title}`);
        } else {
            // Ask user for confirmation
            const choice = await vscode.window.showInformationMessage(
                message,
                'Mark Complete',
                'Ignore'
            );
            
            if (choice === 'Mark Complete') {
                this.completeTaskWithAutoDetection(task.id, task.title);
            }
        }
    }
    
    /**
     * Marks a task as completed with auto-detection tracking
     */
    completeTaskWithAutoDetection(taskId: string, taskTitle: string): void {
        if (!this.projectDetector.detectAiProject()) {
            return;
        }
        
        const structure = this.projectDetector.getProjectStructure();
        
        try {
            // Update tasks.md
            const tasksContent = fs.readFileSync(structure.tasksPath, 'utf-8');
            const updatedContent = this.updateTaskCompletion(tasksContent, taskId, true);
            fs.writeFileSync(structure.tasksPath, updatedContent);
            
            // Update progress with auto-detection marker
            const currentProgress = this.readProgressData(structure.progressPath);
            const updatedProgress = this.updateProgressWithHistory(
                currentProgress,
                taskId,
                taskTitle,
                'auto-detection'
            );
            
            fs.writeFileSync(structure.progressPath, JSON.stringify(updatedProgress, null, 2));
        } catch (error) {
            console.error('Failed to complete task with auto-detection:', error);
        }
    }
    
    private parseTasksFromFile(tasksPath: string): ParsedTask[] {
        try {
            const content = fs.readFileSync(tasksPath, 'utf-8');
            return this.parseTasksMarkdown(content);
        } catch {
            return [];
        }
    }
    
    private parseTasksMarkdown(content: string): ParsedTask[] {
        const tasks: ParsedTask[] = [];
        const lines = content.split('\n');
        let currentParentId: string | undefined;
        let taskCounter = 0;
        

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Skip empty lines and headers
            if (!line.trim() || line.startsWith('#')) {
                continue;
            }

            // Check if this is a task line using the same regex as web dashboard
            const taskMatch = line.match(/^[\s]*-[\s]*\[([x\s])\]/);
            if (taskMatch) {
                const status = taskMatch[1];
                const isCompleted = status.toLowerCase() === 'x';
                
                // Calculate indentation level (count leading spaces/tabs)
                const leadingWhitespace = line.match(/^(\s*)/)?.[1] || '';
                const level = leadingWhitespace.length;
                
                // Extract task text after the checkbox
                const taskText = line.replace(/^[\s]*-[\s]*\[[x\s]\][\s]*/, '').trim();
                
                // Extract task ID and title from the task text
                const taskIdMatch = taskText.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
                const taskId = taskIdMatch ? taskIdMatch[1] : `task-${taskCounter + 1}`;
                const title = taskIdMatch ? taskIdMatch[2] : taskText;
                
                taskCounter++;

                const trimmedTaskId = taskId.trim();
                const trimmedTitle = title.trim();
                

                // Determine if this is a subtask
                const isSubtask = level > 0 || trimmedTaskId.includes('.');
                
                // Set parent ID for subtasks
                if (isSubtask && level === 1) {
                    for (let j = tasks.length - 1; j >= 0; j--) {
                        if (!tasks[j].isSubtask) {
                            currentParentId = tasks[j].id;
                            break;
                        }
                    }
                } else if (!isSubtask) {
                    currentParentId = undefined;
                }

                // Extract requirements and details
                const requirements: string[] = [];
                const details: string[] = [];
                
                for (let j = i + 1; j < lines.length; j++) {
                    const nextLine = lines[j];
                    
                    if (nextLine.match(/^(\s*)-\s*\[([ x])\]/)) {
                        break;
                    }
                    
                    const reqMatch = nextLine.match(/_Requirements:\s*([^_]+)_/);
                    if (reqMatch) {
                        requirements.push(...reqMatch[1].split(',').map(r => r.trim()));
                    }
                    
                    const detailMatch = nextLine.match(/^\s*-\s+(.+)$/);
                    if (detailMatch && !nextLine.includes('_Requirements:')) {
                        details.push(detailMatch[1]);
                    }
                }

                const task: ParsedTask = {
                    id: trimmedTaskId,
                    title: trimmedTitle,
                    level,
                    isCompleted,
                    isSubtask,
                    parentId: currentParentId,
                    requirements: requirements.length > 0 ? requirements : undefined,
                    details: details.length > 0 ? details : undefined
                };

                tasks.push(task);
            }
        }

        return tasks;
    }
    
    private calculateProgress(tasks: ParsedTask[], previousProgress?: ProgressData): ProgressData {
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => task.isCompleted).length;
        const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        // Generate recent activity by comparing with previous progress
        const recentActivity: ActivityItem[] = [];
        
        if (previousProgress) {
            const previousCompletedIds = new Set(
                previousProgress.recentActivity.map(activity => activity.taskId)
            );
            
            const newlyCompleted = tasks.filter(task => 
                task.isCompleted && !previousCompletedIds.has(task.id)
            );
            
            for (const task of newlyCompleted) {
                recentActivity.push({
                    taskId: task.id,
                    title: task.title,
                    completedAt: new Date(),
                    completedBy: 'auto-detection'
                });
            }
            
            // Keep some previous activity (last 10 items)
            const existingActivity = previousProgress.recentActivity
                .filter(activity => 
                    tasks.find(t => t.id === activity.taskId && t.isCompleted) ||
                    (new Date().getTime() - new Date(activity.completedAt).getTime()) < 7 * 24 * 60 * 60 * 1000
                )
                .slice(0, 10 - recentActivity.length);
            
            recentActivity.push(...existingActivity);
        }
        
        return {
            totalTasks,
            completedTasks,
            percentage,
            lastUpdated: new Date(),
            recentActivity: recentActivity.slice(0, 10),
            milestones: previousProgress?.milestones || []
        };
    }
    
    /**
     * Gets project ID from config file
     */
    private async getProjectId(configPath: string): Promise<string | null> {
        try {
            const configContent = fs.readFileSync(configPath, 'utf-8');
            const config = JSON.parse(configContent);
            return config.projectId || null;
        } catch (error) {
            console.warn('Failed to get project ID:', error);
            return null;
        }
    }
    
    /**
     * Sends progress data to dashboard via API
     */
    private async sendProgressToDashboard(projectId: string, progressData: ProgressData): Promise<void> {
        try {
            const dashboardUrl = vscode.workspace.getConfiguration('aiProjectManager').get('dashboardUrl', 'http://localhost:3000');
            
            const response = await fetch(`${dashboardUrl}/api/projects/${projectId}/progress`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...progressData,
                    source: 'vscode-extension',
                    timestamp: new Date().toISOString()
                })
            });
            
            if (!response.ok) {
                console.warn('Failed to sync progress with dashboard:', response.statusText);
            } else {
            }
        } catch (error) {
            console.warn('Error syncing progress with dashboard:', error);
        }
    }
    
    /**
     * Enhanced git commit analysis with better pattern matching
     */
    private async analyzeCommitForTaskCompletion(commit: GitCommit): Promise<void> {
        try {
            const structure = this.projectDetector.getProjectStructure();
            const tasks = this.parseTasksFromFile(structure.tasksPath);
            
            // Analyze commit message for task completion patterns
            const completionPatterns = [
                /complete[ds]?\s+task\s+(\d+(?:\.\d+)?)/i,
                /finish[es]?\s+task\s+(\d+(?:\.\d+)?)/i,
                /implement[s]?\s+task\s+(\d+(?:\.\d+)?)/i,
                /closes?\s+#(\d+(?:\.\d+)?)/i,
                /fixes?\s+#(\d+(?:\.\d+)?)/i,
                /resolves?\s+#(\d+(?:\.\d+)?)/i
            ];
            
            for (const pattern of completionPatterns) {
                const match = commit.message.match(pattern);
                if (match) {
                    const taskId = match[1];
                    const task = tasks.find(t => t.id === taskId);
                    
                    if (task && !task.isCompleted) {
                        await this.proposeTaskCompletion(task, `git:${commit.hash}`, 0.95);
                    }
                }
            }
            
            // Analyze changed files for task completion indicators
            await this.analyzeCommitFiles(commit, tasks);
        } catch (error) {
            console.error('Error analyzing commit for task completion:', error);
        }
    }
    
    /**
     * Analyzes files in a commit to infer task completion
     */
    private async analyzeCommitFiles(commit: GitCommit, tasks: ParsedTask[]): Promise<void> {
        const fileAnalysis = new Map<string, number>();
        
        // Analyze each file in the commit
        for (const file of commit.files) {
            const confidence = this.calculateFileCompletionConfidence(file, commit);
            if (confidence > 0.5) {
                fileAnalysis.set(file, confidence);
            }
        }
        
        // Find tasks that might be completed by these file changes
        for (const [file, confidence] of fileAnalysis) {
            const relevantTasks = this.findTasksRelatedToFile(tasks, file);
            
            for (const task of relevantTasks) {
                if (!task.isCompleted) {
                    const combinedConfidence = Math.min(confidence + 0.2, 1.0);
                    if (combinedConfidence > 0.7) {
                        await this.proposeTaskCompletion(task, `git:${commit.hash}:${file}`, combinedConfidence);
                    }
                }
            }
        }
    }
    
    /**
     * Calculates confidence that a file change indicates task completion
     */
    private calculateFileCompletionConfidence(filePath: string, commit: GitCommit): number {
        let confidence = 0;
        const fileName = path.basename(filePath).toLowerCase();
        const fileExt = path.extname(filePath).toLowerCase();
        
        // Test files indicate completion
        if (fileName.includes('test') || fileName.includes('spec')) {
            confidence += 0.4;
        }
        
        // Component/implementation files
        if (['.tsx', '.jsx', '.ts', '.js', '.py', '.java', '.cpp'].includes(fileExt)) {
            confidence += 0.3;
        }
        
        // Configuration files
        if (fileName.includes('config') || fileName.includes('setup')) {
            confidence += 0.2;
        }
        
        // Documentation files
        if (fileName.includes('readme') || fileName.includes('doc')) {
            confidence += 0.2;
        }
        
        // Multiple files in commit suggest substantial work
        if (commit.files.length > 3) {
            confidence += 0.1;
        }
        
        // Commit message analysis
        const message = commit.message.toLowerCase();
        const completionKeywords = ['implement', 'complete', 'finish', 'add', 'create', 'build', 'done'];
        if (completionKeywords.some(keyword => message.includes(keyword))) {
            confidence += 0.2;
        }
        
        return Math.min(confidence, 1.0);
    }
    
    /**
     * Finds tasks related to a specific file
     */
    private findTasksRelatedToFile(tasks: ParsedTask[], filePath: string): ParsedTask[] {
        const fileName = path.basename(filePath, path.extname(filePath)).toLowerCase();
        const fileDir = path.dirname(filePath).toLowerCase();
        
        return tasks.filter(task => {
            const taskText = `${task.title} ${task.details?.join(' ') || ''}`.toLowerCase();
            
            // Direct filename match
            if (taskText.includes(fileName)) {
                return true;
            }
            
            // Directory/module match
            const dirParts = fileDir.split('/');
            if (dirParts.some(part => part.length > 2 && taskText.includes(part))) {
                return true;
            }
            
            // Technology/framework match
            const techKeywords = ['react', 'vue', 'angular', 'node', 'express', 'api', 'component', 'service'];
            for (const keyword of techKeywords) {
                if (taskText.includes(keyword) && (filePath.includes(keyword) || fileName.includes(keyword))) {
                    return true;
                }
            }
            
            return false;
        });
    }
    
    /**
     * Enhanced task completion detection with git integration
     */
    async detectTaskCompletionFromGit(filePath: string): Promise<boolean> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) return false;
            
            // Get recent commits that modified this file
            const relativePath = vscode.workspace.asRelativePath(filePath);
            const { stdout } = await this.execAsync(
                `git log --oneline -n 5 --follow -- "${relativePath}"`,
                { cwd: workspaceFolder.uri.fsPath }
            );
            
            if (!stdout.trim()) return false;
            
            const commits = stdout.split('\n').filter(line => line.trim());
            
            // Check if recent commits indicate task completion
            for (const commitLine of commits) {
                const message = commitLine.substring(8); // Remove hash
                
                const completionIndicators = [
                    /complete[ds]?/i,
                    /finish[es]?/i,
                    /implement[s]?/i,
                    /done/i,
                    /ready/i,
                    /working/i
                ];
                
                if (completionIndicators.some(pattern => pattern.test(message))) {
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            console.warn('Git analysis failed:', error);
            return false;
        }
    }
    
    /**
     * Monitors workspace for significant code changes that indicate task completion
     */
    private async monitorWorkspaceChanges(): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) return;
        
        // Set up periodic analysis of workspace changes
        setInterval(async () => {
            try {
                await this.analyzeWorkspaceProgress();
            } catch (error) {
                console.error('Workspace analysis failed:', error);
            }
        }, 10 * 60 * 1000); // Every 10 minutes
    }
    
    /**
     * Analyzes overall workspace progress
     */
    private async analyzeWorkspaceProgress(): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) return;
        
        try {
            // Get git statistics
            const { stdout: diffStat } = await this.execAsync(
                'git diff --stat HEAD~1 HEAD',
                { cwd: workspaceFolder.uri.fsPath }
            );
            
            if (diffStat.trim()) {
                const lines = diffStat.split('\n');
                const summary = lines[lines.length - 1];
                
                // Parse insertions and deletions
                const match = summary.match(/(\d+)\s+insertions?\(\+\),\s*(\d+)\s+deletions?\(-\)/);
                if (match) {
                    const insertions = parseInt(match[1]);
                    const deletions = parseInt(match[2]);
                    
                    // Significant changes might indicate task completion
                    if (insertions > 50 || (insertions > 20 && deletions > 10)) {
                        await this.suggestProgressReview();
                    }
                }
            }
        } catch (error) {
            // Git not available or no changes
        }
    }
    
    /**
     * Suggests user review progress after significant changes
     */
    private async suggestProgressReview(): Promise<void> {
        const choice = await vscode.window.showInformationMessage(
            '📊 Significant code changes detected. Would you like to review task progress?',
            'Review Progress',
            'Update Tasks',
            'Dismiss'
        );
        
        switch (choice) {
            case 'Review Progress':
                vscode.commands.executeCommand('aiProjectManager.connectToDashboard');
                break;
            case 'Update Tasks':
                this.updateProgress();
                await this.syncWithDashboard();
                vscode.window.showInformationMessage('✅ Progress updated and synced with dashboard');
                break;
        }
    }
    
    private readProgressData(progressPath: string): ProgressData | undefined {
        try {
            const content = fs.readFileSync(progressPath, 'utf-8');
            const data = JSON.parse(content);
            
            return {
                ...data,
                lastUpdated: new Date(data.lastUpdated),
                recentActivity: data.recentActivity.map((activity: any) => ({
                    ...activity,
                    completedAt: new Date(activity.completedAt)
                }))
            };
        } catch {
            return undefined;
        }
    }
    
    private updateTaskCompletion(content: string, taskId: string, isCompleted: boolean): string {
        const lines = content.split('\n');
        const updatedLines: string[] = [];

        for (const line of lines) {
            const taskMatch = line.match(/^(\s*)-\s*\[([ x])\]\s*(.+)$/);
            if (taskMatch) {
                const [, indent, , taskText] = taskMatch;
                const taskNumberMatch = taskText.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
                const currentTaskId = taskNumberMatch ? taskNumberMatch[1] : null;
                
                if (currentTaskId === taskId) {
                    const status = isCompleted ? 'x' : ' ';
                    updatedLines.push(`${indent}- [${status}] ${taskText}`);
                } else {
                    updatedLines.push(line);
                }
            } else {
                updatedLines.push(line);
            }
        }

        return updatedLines.join('\n');
    }
    
    private updateProgressWithHistory(
        currentProgress: ProgressData | undefined,
        taskId: string,
        taskTitle: string,
        completedBy: 'manual' | 'auto-detection' = 'auto-detection'
    ): ProgressData {
        const newActivity: ActivityItem = {
            taskId,
            title: taskTitle,
            completedAt: new Date(),
            completedBy
        };

        const existingActivity = currentProgress?.recentActivity || [];
        const filteredActivity = existingActivity.filter(
            activity => activity.taskId !== taskId
        );
        
        const updatedActivity = [newActivity, ...filteredActivity].slice(0, 10);

        return {
            totalTasks: currentProgress?.totalTasks || 0,
            completedTasks: currentProgress?.completedTasks || 0,
            percentage: currentProgress?.percentage || 0,
            lastUpdated: new Date(),
            recentActivity: updatedActivity,
            milestones: currentProgress?.milestones || []
        };
    }
    
    /**
     * Notifies sidebar of progress updates
     */
    private notifySidebarUpdate(): void {
        // Trigger sidebar refresh
        vscode.commands.executeCommand('aiProjectManager.refreshSidebar');
    }

    /**
     * Public method to get progress data for a specific path
     */
    getProgressData(progressPath: string): ProgressData {
        const data = this.readProgressData(progressPath);
        if (data) {
            return data;
        }
        
        return {
            totalTasks: 0,
            completedTasks: 0,
            percentage: 0,
            lastUpdated: new Date(),
            recentActivity: []
        };
    }
}