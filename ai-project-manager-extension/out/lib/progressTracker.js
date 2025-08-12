"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressTrackerImpl = void 0;
const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const projectDetector_1 = require("./projectDetector");
const child_process_1 = require("child_process");
const util_1 = require("util");
class ProgressTrackerImpl {
    constructor() {
        this.projectDetector = new projectDetector_1.ProjectDetectorImpl();
        this.execAsync = (0, util_1.promisify)(child_process_1.exec);
        this.lastAnalysis = new Map();
        // Patterns that indicate task completion
        this.completionPatterns = [
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
    }
    updateProgress() {
        if (!this.projectDetector.detectAiProject()) {
            return;
        }
        const structure = this.projectDetector.getProjectStructure();
        const tasks = this.parseTasksFromFile(structure.tasksPath);
        const previousProgress = this.readProgressData(structure.progressPath);
        const progressData = this.calculateProgress(tasks, previousProgress);
        try {
            fs.writeFileSync(structure.progressPath, JSON.stringify(progressData, null, 2));
        }
        catch (error) {
            console.error('Failed to update progress:', error);
        }
    }
    /**
     * Starts automatic progress tracking by monitoring file changes and git commits
     */
    async startAutoTracking() {
        if (!this.projectDetector.detectAiProject()) {
            return;
        }
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder)
            return;
        // Set up file watcher for source code changes
        const pattern = new vscode.RelativePattern(workspaceFolder, '**/*.{js,ts,jsx,tsx,py,java,cpp,cs}');
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
        // Set up periodic analysis (every 5 minutes)
        setInterval(() => {
            this.analyzeRecentCommits();
        }, 5 * 60 * 1000);
        console.log('Auto progress tracking started');
    }
    /**
     * Stops automatic progress tracking
     */
    stopAutoTracking() {
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
            this.fileWatcher = undefined;
        }
        console.log('Auto progress tracking stopped');
    }
    detectTaskCompletion(filePath) {
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
                /README\.md$/i, // Documentation
                /package\.json$/, // Package configuration
                /\.config\.(js|ts|json)$/ // Configuration files
            ];
            const hasCompletionIndicator = completionIndicators.some(pattern => pattern.test(fileName));
            return recentlyModified && hasCompletionIndicator;
        }
        catch {
            return false;
        }
    }
    syncWithDashboard() {
        // Update progress and let file watcher notify dashboard
        this.updateProgress();
    }
    /**
     * Analyzes file changes to infer task completion
     */
    async analyzeFileChange(filePath, changeType) {
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
            const matchingPatterns = this.completionPatterns.filter(pattern => pattern.pattern.test(relativePath));
            if (matchingPatterns.length === 0)
                return;
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
        }
        catch (error) {
            console.error('Error analyzing file change:', error);
        }
    }
    /**
     * Analyzes recent git commits for completed features
     */
    async analyzeRecentCommits() {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder)
                return;
            const commits = await this.getRecentCommits(workspaceFolder.uri.fsPath);
            const structure = this.projectDetector.getProjectStructure();
            const tasks = this.parseTasksFromFile(structure.tasksPath);
            for (const commit of commits) {
                const relevantTasks = this.findTasksFromCommitMessage(tasks, commit.message);
                for (const task of relevantTasks) {
                    if (!task.isCompleted) {
                        const confidence = this.calculateCommitConfidence(commit, task);
                        if (confidence > 0.8) {
                            await this.proposeTaskCompletion(task, `git:${commit.hash}`, confidence);
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error('Error analyzing git commits:', error);
        }
    }
    /**
     * Gets recent git commits
     */
    async getRecentCommits(projectPath) {
        try {
            const { stdout } = await this.execAsync('git log --oneline --since="7 days ago" --name-only --pretty=format:"%H|%s|%ad" --date=iso', { cwd: projectPath });
            const commits = [];
            const lines = stdout.split('\n').filter(line => line.trim());
            let currentCommit = null;
            for (const line of lines) {
                if (line.includes('|')) {
                    // New commit line
                    if (currentCommit) {
                        commits.push(currentCommit);
                    }
                    const [hash, message, dateStr] = line.split('|');
                    currentCommit = {
                        hash,
                        message,
                        date: new Date(dateStr),
                        files: []
                    };
                }
                else if (currentCommit && line.trim()) {
                    // File line
                    currentCommit.files = currentCommit.files || [];
                    currentCommit.files.push(line.trim());
                }
            }
            if (currentCommit) {
                commits.push(currentCommit);
            }
            return commits.slice(0, 20); // Last 20 commits
        }
        catch (error) {
            console.warn('Git not available or no commits found:', error);
            return [];
        }
    }
    /**
     * Finds tasks relevant to specific keywords and file path
     */
    findRelevantTasks(tasks, keywords, filePath) {
        return tasks.filter(task => {
            const taskText = `${task.title} ${task.details?.join(' ') || ''}`.toLowerCase();
            const fileName = path.basename(filePath).toLowerCase();
            // Check if task mentions any of the keywords
            const hasKeywordMatch = keywords.some(keyword => taskText.includes(keyword.toLowerCase()));
            // Check if filename relates to task
            const hasFileMatch = taskText.includes(fileName.replace(/\.[^.]+$/, ''));
            return hasKeywordMatch || hasFileMatch;
        });
    }
    /**
     * Finds tasks from git commit message
     */
    findTasksFromCommitMessage(tasks, commitMessage) {
        const message = commitMessage.toLowerCase();
        return tasks.filter(task => {
            const taskText = task.title.toLowerCase();
            const taskId = task.id.toLowerCase();
            // Look for direct task ID reference
            if (message.includes(taskId))
                return true;
            // Look for task title words (at least 2 matching words)
            const taskWords = taskText.split(/\s+/).filter(word => word.length > 3);
            const messageWords = message.split(/\s+/);
            const matchingWords = taskWords.filter(word => messageWords.some(msgWord => msgWord.includes(word) || word.includes(msgWord)));
            return matchingWords.length >= 2;
        });
    }
    /**
     * Calculates confidence score for task completion based on file changes
     */
    async calculateCompletionConfidence(task, filePath, changeType) {
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
        }
        catch (error) {
            // File might not be readable
        }
        return Math.min(confidence, 1.0);
    }
    /**
     * Calculates confidence score for task completion based on git commit
     */
    calculateCommitConfidence(commit, task) {
        let confidence = 0;
        const message = commit.message.toLowerCase();
        // Look for completion keywords in commit message
        const completionKeywords = ['complete', 'finish', 'implement', 'add', 'create', 'build', 'done'];
        if (completionKeywords.some(keyword => message.includes(keyword))) {
            confidence += 0.3;
        }
        // Look for task-specific keywords
        const taskWords = task.title.toLowerCase().split(/\s+/);
        const matchingWords = taskWords.filter(word => word.length > 3 && message.includes(word));
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
    async proposeTaskCompletion(task, source, confidence) {
        const message = `Task "${task.title}" appears to be completed (confidence: ${Math.round(confidence * 100)}%)\nSource: ${source}`;
        if (confidence >= 0.9) {
            // Auto-complete with high confidence
            this.completeTaskWithAutoDetection(task.id, task.title);
            vscode.window.showInformationMessage(`✅ Auto-completed task: ${task.title}`);
        }
        else {
            // Ask user for confirmation
            const choice = await vscode.window.showInformationMessage(message, 'Mark Complete', 'Ignore');
            if (choice === 'Mark Complete') {
                this.completeTaskWithAutoDetection(task.id, task.title);
            }
        }
    }
    /**
     * Marks a task as completed with auto-detection tracking
     */
    completeTaskWithAutoDetection(taskId, taskTitle) {
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
            const updatedProgress = this.updateProgressWithHistory(currentProgress, taskId, taskTitle, 'auto-detection');
            fs.writeFileSync(structure.progressPath, JSON.stringify(updatedProgress, null, 2));
        }
        catch (error) {
            console.error('Failed to complete task with auto-detection:', error);
        }
    }
    parseTasksFromFile(tasksPath) {
        try {
            const content = fs.readFileSync(tasksPath, 'utf-8');
            return this.parseTasksMarkdown(content);
        }
        catch {
            return [];
        }
    }
    parseTasksMarkdown(content) {
        const tasks = [];
        const lines = content.split('\n');
        let currentParentId;
        let taskCounter = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Skip empty lines and headers
            if (!line.trim() || line.startsWith('#')) {
                continue;
            }
            // Check if this is a task line
            const taskMatch = line.match(/^(\s*)-\s*\[([ x])\]\s*(\d+(?:\.\d+)?)?\s*(.+)$/);
            if (taskMatch) {
                const [, indent, status, taskId, title] = taskMatch;
                const level = Math.floor(indent.length / 2);
                const isCompleted = status.toLowerCase() === 'x';
                taskCounter++;
                const trimmedTaskId = taskId ? taskId.trim() : `task-${taskCounter}`;
                const trimmedTitle = title ? title.trim() : '';
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
                }
                else if (!isSubtask) {
                    currentParentId = undefined;
                }
                // Extract requirements and details
                const requirements = [];
                const details = [];
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
                const task = {
                    id: taskId,
                    title: title.trim(),
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
    calculateProgress(tasks, previousProgress) {
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => task.isCompleted).length;
        const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        // Generate recent activity by comparing with previous progress
        const recentActivity = [];
        if (previousProgress) {
            const previousCompletedIds = new Set(previousProgress.recentActivity.map(activity => activity.taskId));
            const newlyCompleted = tasks.filter(task => task.isCompleted && !previousCompletedIds.has(task.id));
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
                .filter(activity => tasks.find(t => t.id === activity.taskId && t.isCompleted) ||
                (new Date().getTime() - new Date(activity.completedAt).getTime()) < 7 * 24 * 60 * 60 * 1000)
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
    readProgressData(progressPath) {
        try {
            const content = fs.readFileSync(progressPath, 'utf-8');
            const data = JSON.parse(content);
            return {
                ...data,
                lastUpdated: new Date(data.lastUpdated),
                recentActivity: data.recentActivity.map((activity) => ({
                    ...activity,
                    completedAt: new Date(activity.completedAt)
                }))
            };
        }
        catch {
            return undefined;
        }
    }
    updateTaskCompletion(content, taskId, isCompleted) {
        const lines = content.split('\n');
        const updatedLines = [];
        for (const line of lines) {
            const taskMatch = line.match(/^(\s*)-\s*\[([ x])\]\s*(.+)$/);
            if (taskMatch) {
                const [, indent, , taskText] = taskMatch;
                const taskNumberMatch = taskText.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
                const currentTaskId = taskNumberMatch ? taskNumberMatch[1] : null;
                if (currentTaskId === taskId) {
                    const status = isCompleted ? 'x' : ' ';
                    updatedLines.push(`${indent}- [${status}] ${taskText}`);
                }
                else {
                    updatedLines.push(line);
                }
            }
            else {
                updatedLines.push(line);
            }
        }
        return updatedLines.join('\n');
    }
    updateProgressWithHistory(currentProgress, taskId, taskTitle, completedBy = 'auto-detection') {
        const newActivity = {
            taskId,
            title: taskTitle,
            completedAt: new Date(),
            completedBy
        };
        const existingActivity = currentProgress?.recentActivity || [];
        const filteredActivity = existingActivity.filter(activity => activity.taskId !== taskId);
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
}
exports.ProgressTrackerImpl = ProgressTrackerImpl;
//# sourceMappingURL=progressTracker.js.map