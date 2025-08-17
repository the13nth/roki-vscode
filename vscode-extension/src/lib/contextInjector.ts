import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ContextInjector, ProjectContext, ContextDocument, ProjectConfiguration } from '../types';

// Add fetch type for Node.js
declare global {
    function fetch(input: string, init?: any): Promise<any>;
}
import { ProjectDetectorImpl } from './projectDetector';

interface ContextPreferences {
    autoInject: boolean;
    maxContextSize: number;
    prioritizeRecent: boolean;
    includeProgress: boolean;
    includeCurrentTask: boolean;
    customPromptPrefix: string;
}

export class ContextInjectorImpl implements ContextInjector {
    private projectDetector = new ProjectDetectorImpl();
    private dashboardUrl = 'http://localhost:3000'; // TODO: Make configurable
    private contextPreferences: ContextPreferences;
    private aiChatWatcher?: vscode.Disposable;
    private statusBarItem?: vscode.StatusBarItem;
    
    constructor() {
        this.contextPreferences = this.loadContextPreferences();
        this.setupStatusBar();
        this.setupAIChatWatcher();
    }
    
    getCurrentContext(): ProjectContext {
        if (!this.projectDetector.detectAiProject()) {
            throw new Error('No AI project detected');
        }
        
        const structure = this.projectDetector.getProjectStructure();
        
        // Try to load specs from .kiro first, then fallback to .ai-project
        const requirementsSummary = this.getRequirementsSummaryFromMultipleSources(structure.requirementsPath);
        const designSummary = this.getDesignSummaryFromMultipleSources(structure.designPath);
        const tasksSummary = this.getTasksSummaryFromMultipleSources(structure.tasksPath);
        
        return {
            currentTask: this.getCurrentTask(),
            requirementsSummary: requirementsSummary,
            designSummary: designSummary,
            tasksSummary: tasksSummary,
            relevantContextDocs: this.loadContextDocuments(structure.contextDir),
            progressSummary: this.getProgressSummary(structure.progressPath)
        };
    }
    
    async formatContextForAI(): Promise<string> {
        try {
            const context = this.getCurrentContext();
            const currentFile = this.getCurrentFile();
            const workContext = await this.inferWorkContext();
            
            // Try to use intelligent context selection from dashboard
            const intelligentContext = await this.getIntelligentContext(currentFile, workContext);
            if (intelligentContext) {
                return this.applyUserPreferences(intelligentContext);
            }
            
            // Fallback to basic context formatting
            let formatted = this.contextPreferences.customPromptPrefix ? 
                `${this.contextPreferences.customPromptPrefix}\n\n` : '';
            
            formatted += '# AI Project Context\n\n';
            
            // Add current file context if available
            if (currentFile) {
                formatted += `## Current File: ${currentFile}\n`;
                if (workContext) {
                    formatted += `**Work Context:** ${workContext}\n\n`;
                }
            }
            
            formatted += '## Requirements Summary\n';
            formatted += context.requirementsSummary + '\n\n';
            
            if (context.designSummary && context.designSummary !== 'Design summary not available') {
                formatted += '## Design Summary\n';
                formatted += context.designSummary + '\n\n';
            }
            
            if (context.tasksSummary && context.tasksSummary !== 'Tasks summary not available') {
                formatted += '## Tasks Summary\n';
                formatted += context.tasksSummary + '\n\n';
            }
            
            if (this.contextPreferences.includeCurrentTask && context.currentTask) {
                formatted += '## Current Task\n';
                formatted += context.currentTask + '\n\n';
            }
            
            if (this.contextPreferences.includeProgress) {
                formatted += '## Progress Summary\n';
                formatted += context.progressSummary + '\n\n';
            }
            
            if (context.relevantContextDocs.length > 0) {
                formatted += '## Relevant Context Documents\n';
                const sortedDocs = this.contextPreferences.prioritizeRecent ? 
                    this.sortDocumentsByRelevance(context.relevantContextDocs) : 
                    context.relevantContextDocs;
                
                for (const doc of sortedDocs) {
                    formatted += `### ${doc.title}\n`;
                    formatted += `Category: ${doc.category}\n`;
                    if (doc.tags.length > 0) {
                        formatted += `Tags: ${doc.tags.join(', ')}\n`;
                    }
                    formatted += `Last Modified: ${doc.lastModified.toLocaleDateString()}\n\n`;
                    formatted += doc.content + '\n\n';
                }
            }
            
            // Trim to max context size if specified
            return this.trimToMaxSize(formatted);
        } catch (error) {
            console.error('Error formatting context for AI:', error);
            return 'Unable to load project context. Please ensure your project has the required files (requirements.md, design.md, tasks.md, progress.json) and try again.';
        }
    }
    
    async selectRelevantDocs(currentFile: string): Promise<ContextDocument[]> {
        if (!this.projectDetector.detectAiProject()) {
            return [];
        }
        
        try {
            const workContext = await this.inferWorkContext();
            const intelligentDocs = await this.getIntelligentDocumentSelection(currentFile, workContext);
            
            if (intelligentDocs && intelligentDocs.length > 0) {
                return intelligentDocs;
            }
        } catch (error) {
            console.warn('Failed to get intelligent document selection, falling back to basic selection:', error);
        }
        
        // Fallback to basic selection
        const structure = this.projectDetector.getProjectStructure();
        const allDocs = this.loadContextDocuments(structure.contextDir);
        
        return allDocs
            .map(doc => ({
                ...doc,
                relevanceScore: this.calculateRelevanceScore(doc, currentFile)
            }))
            .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
            .slice(0, 5);
    }
    
    private getRequirementsSummaryFromMultipleSources(projectPath: string): string {
        // Try .kiro/specs/ai-project-manager first
        const kiroRequirementsPath = path.join(projectPath, '.kiro', 'specs', 'ai-project-manager', 'requirements.md');
        if (fs.existsSync(kiroRequirementsPath)) {
            return this.getRequirementsSummary(kiroRequirementsPath);
        }
        
        // Fallback to .ai-project
        const aiProjectRequirementsPath = path.join(projectPath, '.ai-project', 'requirements.md');
        if (fs.existsSync(aiProjectRequirementsPath)) {
            return this.getRequirementsSummary(aiProjectRequirementsPath);
        }
        
        return 'Requirements summary not available';
    }
    
    private getDesignSummaryFromMultipleSources(projectPath: string): string {
        // Try .kiro/specs/ai-project-manager first
        const kiroDesignPath = path.join(projectPath, '.kiro', 'specs', 'ai-project-manager', 'design.md');
        if (fs.existsSync(kiroDesignPath)) {
            return this.getRequirementsSummary(kiroDesignPath); // Reuse the same logic
        }
        
        // Fallback to .ai-project
        const aiProjectDesignPath = path.join(projectPath, '.ai-project', 'design.md');
        if (fs.existsSync(aiProjectDesignPath)) {
            return this.getRequirementsSummary(aiProjectDesignPath); // Reuse the same logic
        }
        
        return 'Design summary not available';
    }
    
    private getTasksSummaryFromMultipleSources(projectPath: string): string {
        // Try .kiro/specs/ai-project-manager first
        const kiroTasksPath = path.join(projectPath, '.kiro', 'specs', 'ai-project-manager', 'tasks.md');
        if (fs.existsSync(kiroTasksPath)) {
            return this.getRequirementsSummary(kiroTasksPath); // Reuse the same logic
        }
        
        // Fallback to .ai-project
        const aiProjectTasksPath = path.join(projectPath, '.ai-project', 'tasks.md');
        if (fs.existsSync(aiProjectTasksPath)) {
            return this.getRequirementsSummary(aiProjectTasksPath); // Reuse the same logic
        }
        
        return 'Tasks summary not available';
    }
    
    private getRequirementsSummary(requirementsPath: string): string {
        try {
            const content = fs.readFileSync(requirementsPath, 'utf-8');
            // Extract first few lines or introduction section
            const lines = content.split('\n');
            const introIndex = lines.findIndex(line => line.toLowerCase().includes('introduction'));
            
            if (introIndex !== -1 && introIndex + 1 < lines.length) {
                return lines.slice(introIndex, introIndex + 10).join('\n');
            }
            
            return lines.slice(0, 10).join('\n');
        } catch {
            return 'Requirements summary not available';
        }
    }
    
    private getProgressSummary(progressPath: string): string {
        try {
            const content = fs.readFileSync(progressPath, 'utf-8');
            const progress = JSON.parse(content);
            
            return `Progress: ${progress.completedTasks}/${progress.totalTasks} tasks completed (${progress.percentage}%)`;
        } catch {
            return 'Progress information not available';
        }
    }
    
    private loadContextDocuments(contextDir: string): ContextDocument[] {
        try {
            if (!fs.existsSync(contextDir)) {
                return [];
            }
            
            const files = fs.readdirSync(contextDir);
            const documents: ContextDocument[] = [];
            
            for (const file of files) {
                if (file.endsWith('.md')) {
                    const filePath = path.join(contextDir, file);
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const stats = fs.statSync(filePath);
                    
                    documents.push({
                        id: file,
                        filename: file,
                        title: this.extractTitle(content) || file,
                        content,
                        tags: this.extractTags(content),
                        category: this.inferCategory(file, content),
                        lastModified: stats.mtime
                    });
                }
            }
            
            return documents;
        } catch {
            return [];
        }
    }
    
    private extractTitle(content: string): string | null {
        const titleMatch = content.match(/^#\s+(.+)$/m);
        return titleMatch ? titleMatch[1] : null;
    }
    
    private extractTags(content: string): string[] {
        const tagMatch = content.match(/tags:\s*\[(.*?)\]/i);
        if (tagMatch) {
            return tagMatch[1].split(',').map(tag => tag.trim().replace(/['"]/g, ''));
        }
        return [];
    }
    
    private inferCategory(filename: string, content: string): ContextDocument['category'] {
        const lower = filename.toLowerCase();
        const contentLower = content.toLowerCase();
        
        if (lower.includes('api') || contentLower.includes('endpoint') || contentLower.includes('swagger')) {
            return 'api';
        }
        if (lower.includes('design') || contentLower.includes('mockup') || contentLower.includes('wireframe')) {
            return 'design';
        }
        if (lower.includes('research') || contentLower.includes('user study') || contentLower.includes('analysis')) {
            return 'research';
        }
        if (lower.includes('requirement') || contentLower.includes('user story') || contentLower.includes('acceptance criteria')) {
            return 'requirements';
        }
        
        return 'other';
    }
    
    private calculateRelevanceScore(doc: ContextDocument, currentFile: string): number {
        let score = 0;
        const currentFileName = path.basename(currentFile).toLowerCase();
        
        // Score based on filename similarity
        if (doc.filename.toLowerCase().includes(currentFileName.split('.')[0])) {
            score += 10;
        }
        
        // Score based on tags
        score += doc.tags.length * 2;
        
        // Score based on category
        if (doc.category === 'api' && currentFileName.includes('api')) score += 5;
        if (doc.category === 'design' && currentFileName.includes('component')) score += 5;
        
        // Score based on recent modification
        const daysSinceModified = (Date.now() - doc.lastModified.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceModified < 7) score += 3;
        
        return score;
    }
    
    private getCurrentFile(): string {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            return vscode.workspace.asRelativePath(activeEditor.document.uri);
        }
        return '';
    }
    
    private async inferWorkContext(): Promise<string> {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) return '';
        
        const document = activeEditor.document;
        const selection = activeEditor.selection;
        
        // Get currently selected text or surrounding context
        let workContext = '';
        
        if (!selection.isEmpty) {
            workContext = document.getText(selection);
        } else {
            // Get function/class context around cursor
            const position = selection.active;
            const line = document.lineAt(position.line);
            const lineText = line.text.toLowerCase();
            
            // Extract context keywords from current line and surrounding lines
            const contextKeywords = [];
            const startLine = Math.max(0, position.line - 5);
            const endLine = Math.min(document.lineCount - 1, position.line + 5);
            
            for (let i = startLine; i <= endLine; i++) {
                const text = document.lineAt(i).text.toLowerCase();
                
                // Extract function names, class names, variable names
                const functionMatch = text.match(/(?:function|const|let|var)\s+(\w+)/);
                if (functionMatch) contextKeywords.push(functionMatch[1]);
                
                const classMatch = text.match(/class\s+(\w+)/);
                if (classMatch) contextKeywords.push(classMatch[1]);
                
                // Extract API endpoints
                const apiMatch = text.match(/['"](\/api\/[\w/-]+)['"]/);
                if (apiMatch) contextKeywords.push(apiMatch[1]);
                
                // Extract component names
                const componentMatch = text.match(/<(\w+)/);
                if (componentMatch) contextKeywords.push(componentMatch[1]);
            }
            
            workContext = contextKeywords.join(' ');
        }
        
        // Add file-based context
        const fileName = path.basename(document.fileName);
        workContext += ` ${fileName}`;
        
        // Add workspace folder context
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (workspaceFolder) {
            const relativePath = vscode.workspace.asRelativePath(document.uri);
            const pathParts = relativePath.split('/');
            workContext += ` ${pathParts.slice(0, -1).join(' ')}`;
        }
        
        return workContext.trim();
    }
    
    private async getIntelligentContext(currentFile: string, workContext: string): Promise<string | null> {
        try {
            const structure = this.projectDetector.getProjectStructure();
            const projectId = await this.getProjectId(structure.configPath);
            
            if (!projectId) return null;
            
            const response = await fetch(`${this.dashboardUrl}/api/projects/${projectId}/context/select`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    currentFile,
                    workContext,
                    maxTokens: 8000,
                    maxDocuments: 5
                })
            });
            
            if (!response.ok) {
                console.warn('Failed to get intelligent context:', response.statusText);
                // Update sidebar sync status on failure
                vscode.commands.executeCommand('aiProjectManager.setSyncStatus', 'disconnected');
                return null;
            }
            
            // Update sidebar sync status on success
            vscode.commands.executeCommand('aiProjectManager.setSyncStatus', 'connected');
            
            const data = await response.json() as { formattedContext: string };
            return data.formattedContext;
        } catch (error) {
            console.warn('Error getting intelligent context:', error);
            return null;
        }
    }
    
    private async getIntelligentDocumentSelection(currentFile: string, workContext: string): Promise<ContextDocument[] | null> {
        try {
            const structure = this.projectDetector.getProjectStructure();
            const projectId = await this.getProjectId(structure.configPath);
            
            if (!projectId) return null;
            
            const response = await fetch(`${this.dashboardUrl}/api/projects/${projectId}/context/select`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    currentFile,
                    workContext,
                    maxTokens: 8000,
                    maxDocuments: 5
                })
            });
            
            if (!response.ok) {
                console.warn('Failed to get intelligent document selection:', response.statusText);
                return null;
            }
            
            const data = await response.json() as { selectedDocuments: ContextDocument[] };
            return data.selectedDocuments;
        } catch (error) {
            console.warn('Error getting intelligent document selection:', error);
            return null;
        }
    }
    
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
     * Sets up status bar item for context injection status
     */
    private setupStatusBar(): void {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right, 
            100
        );
        this.statusBarItem.command = 'aiProjectManager.toggleAutoInject';
        this.updateStatusBar();
        this.statusBarItem.show();
    }
    
    /**
     * Updates status bar based on current preferences
     */
    private updateStatusBar(): void {
        if (!this.statusBarItem) return;
        
        const isAutoInject = this.contextPreferences.autoInject;
        this.statusBarItem.text = `$(robot) AI Context: ${isAutoInject ? 'Auto' : 'Manual'}`;
        this.statusBarItem.tooltip = isAutoInject ? 
            'Auto-inject context enabled. Click to disable.' : 
            'Auto-inject context disabled. Click to enable.';
    }
    
    /**
     * Sets up AI chat watcher for automatic context injection
     */
    private setupAIChatWatcher(): void {
        // Monitor when AI chat/copilot is activated
        this.aiChatWatcher = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
            if (this.contextPreferences.autoInject && editor) {
                await this.checkForAIChatActivation(editor);
            }
        });
    }
    
    /**
     * Checks if AI chat is being activated and injects context
     */
    private async checkForAIChatActivation(editor: vscode.TextEditor): Promise<void> {
        // Check if this looks like an AI chat activation
        const document = editor.document;
        const fileName = path.basename(document.fileName).toLowerCase();
        
        // Common AI chat file patterns
        const aiChatPatterns = [
            /copilot/i,
            /chat/i,
            /ai.*conversation/i,
            /untitled.*\d+/i // Often used for AI chats
        ];
        
        const isAIChat = aiChatPatterns.some(pattern => pattern.test(fileName)) ||
                        document.languageId === 'plaintext' && document.getText().trim() === '';
        
        if (isAIChat) {
            await this.autoInjectContext();
        }
    }
    
    /**
     * Automatically injects context when AI chat is detected
     */
    async autoInjectContext(): Promise<void> {
        try {
            if (!this.projectDetector.detectAiProject()) {
                return;
            }
            
            const formattedContext = await this.formatContextForAI();
            
            // Always copy to clipboard for manual pasting
            await vscode.env.clipboard.writeText(formattedContext);
            vscode.window.showInformationMessage('🤖 AI context copied to clipboard! You can now paste it manually.', { modal: false });
        } catch (error) {
            console.error('Auto-inject failed:', error);
            vscode.window.showWarningMessage('Failed to auto-inject AI context');
        }
    }
    
    /**
     * Toggles auto-injection preference
     */
    async toggleAutoInject(): Promise<void> {
        this.contextPreferences.autoInject = !this.contextPreferences.autoInject;
        await this.saveContextPreferences();
        this.updateStatusBar();
        
        const status = this.contextPreferences.autoInject ? 'enabled' : 'disabled';
        vscode.window.showInformationMessage(`AI context auto-injection ${status}`);
    }
    
    /**
     * Opens context preferences configuration
     */
    async openContextPreferences(): Promise<void> {
        const options = [
            'Toggle Auto-Injection',
            'Set Max Context Size',
            'Toggle Recent Priority',
            'Toggle Progress Include',
            'Toggle Current Task',
            'Set Custom Prompt Prefix'
        ];
        
        const choice = await vscode.window.showQuickPick(options, {
            placeHolder: 'Select context preference to modify'
        });
        
        switch (choice) {
            case 'Toggle Auto-Injection':
                await this.toggleAutoInject();
                break;
            case 'Set Max Context Size':
                await this.setMaxContextSize();
                break;
            case 'Toggle Recent Priority':
                this.contextPreferences.prioritizeRecent = !this.contextPreferences.prioritizeRecent;
                await this.saveContextPreferences();
                break;
            case 'Toggle Progress Include':
                this.contextPreferences.includeProgress = !this.contextPreferences.includeProgress;
                await this.saveContextPreferences();
                break;
            case 'Toggle Current Task':
                this.contextPreferences.includeCurrentTask = !this.contextPreferences.includeCurrentTask;
                await this.saveContextPreferences();
                break;
            case 'Set Custom Prompt Prefix':
                await this.setCustomPromptPrefix();
                break;
        }
    }
    
    /**
     * Sets maximum context size
     */
    private async setMaxContextSize(): Promise<void> {
        const input = await vscode.window.showInputBox({
            prompt: 'Enter maximum context size (characters)',
            value: this.contextPreferences.maxContextSize.toString(),
            validateInput: (value) => {
                const num = parseInt(value);
                return isNaN(num) || num < 1000 ? 'Please enter a number >= 1000' : null;
            }
        });
        
        if (input) {
            this.contextPreferences.maxContextSize = parseInt(input);
            await this.saveContextPreferences();
            vscode.window.showInformationMessage(`Max context size set to ${input} characters`);
        }
    }
    
    /**
     * Sets custom prompt prefix
     */
    private async setCustomPromptPrefix(): Promise<void> {
        const input = await vscode.window.showInputBox({
            prompt: 'Enter custom prompt prefix (optional)',
            value: this.contextPreferences.customPromptPrefix,
            placeHolder: 'e.g., "You are a senior developer helping with..."'
        });
        
        if (input !== undefined) {
            this.contextPreferences.customPromptPrefix = input;
            await this.saveContextPreferences();
            vscode.window.showInformationMessage('Custom prompt prefix updated');
        }
    }
    
    /**
     * Loads context preferences from workspace or global settings
     */
    private loadContextPreferences(): ContextPreferences {
        const config = vscode.workspace.getConfiguration('aiProjectManager');
        
        return {
            autoInject: config.get('autoInject', true),
            maxContextSize: config.get('maxContextSize', 8000),
            prioritizeRecent: config.get('prioritizeRecent', true),
            includeProgress: config.get('includeProgress', true),
            includeCurrentTask: config.get('includeCurrentTask', true),
            customPromptPrefix: config.get('customPromptPrefix', '')
        };
    }
    
    /**
     * Saves context preferences to workspace settings
     */
    private async saveContextPreferences(): Promise<void> {
        const config = vscode.workspace.getConfiguration('aiProjectManager');
        
        await config.update('autoInject', this.contextPreferences.autoInject);
        await config.update('maxContextSize', this.contextPreferences.maxContextSize);
        await config.update('prioritizeRecent', this.contextPreferences.prioritizeRecent);
        await config.update('includeProgress', this.contextPreferences.includeProgress);
        await config.update('includeCurrentTask', this.contextPreferences.includeCurrentTask);
        await config.update('customPromptPrefix', this.contextPreferences.customPromptPrefix);
    }
    
    /**
     * Applies user preferences to formatted context
     */
    private applyUserPreferences(context: string): string {
        let result = context;
        
        if (this.contextPreferences.customPromptPrefix) {
            result = `${this.contextPreferences.customPromptPrefix}\n\n${result}`;
        }
        
        return this.trimToMaxSize(result);
    }
    
    /**
     * Trims context to maximum size while preserving structure
     */
    private trimToMaxSize(context: string): string {
        if (context.length <= this.contextPreferences.maxContextSize) {
            return context;
        }
        
        // Try to trim intelligently by removing less important sections
        const sections = context.split('\n## ');
        const header = sections[0];
        const otherSections = sections.slice(1);
        
        let result = header;
        let currentLength = header.length;
        
        // Prioritize sections: Current Task > Requirements > Progress > Context Docs
        const sectionPriority = [
            'Current Task',
            'Requirements Summary', 
            'Current File',
            'Progress Summary',
            'Relevant Context Documents'
        ];
        
        for (const priority of sectionPriority) {
            const section = otherSections.find(s => s.startsWith(priority));
            if (section) {
                const sectionText = '\n## ' + section;
                if (currentLength + sectionText.length <= this.contextPreferences.maxContextSize) {
                    result += sectionText;
                    currentLength += sectionText.length;
                }
            }
        }
        
        if (result.length > this.contextPreferences.maxContextSize) {
            result = result.substring(0, this.contextPreferences.maxContextSize - 50) + 
                    '\n\n[Context truncated to fit size limit]';
        }
        
        return result;
    }
    
    /**
     * Sorts documents by relevance and recency
     */
    private sortDocumentsByRelevance(docs: ContextDocument[]): ContextDocument[] {
        return docs.sort((a, b) => {
            // Primary sort by relevance score
            const scoreA = a.relevanceScore || 0;
            const scoreB = b.relevanceScore || 0;
            
            if (scoreA !== scoreB) {
                return scoreB - scoreA;
            }
            
            // Secondary sort by recency if prioritizeRecent is enabled
            if (this.contextPreferences.prioritizeRecent) {
                return b.lastModified.getTime() - a.lastModified.getTime();
            }
            
            return 0;
        });
    }
    
    /**
     * Gets current task from tasks.md
     */
    private getCurrentTask(): string | undefined {
        try {
            const structure = this.projectDetector.getProjectStructure();
            const tasksContent = fs.readFileSync(structure.tasksPath, 'utf-8');
            
            // Find the first incomplete task
            const lines = tasksContent.split('\n');
            for (const line of lines) {
                const taskMatch = line.match(/^(\s*)-\s*\[\s\]\s*(.+)$/);
                if (taskMatch) {
                    return taskMatch[2].trim();
                }
            }
            
            return undefined;
        } catch {
            return undefined;
        }
    }
    
    /**
     * Disposes resources
     */
    dispose(): void {
        this.aiChatWatcher?.dispose();
        this.statusBarItem?.dispose();
    }
}