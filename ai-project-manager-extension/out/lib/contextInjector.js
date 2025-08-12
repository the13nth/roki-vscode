"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextInjectorImpl = void 0;
const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const projectDetector_1 = require("./projectDetector");
class ContextInjectorImpl {
    constructor() {
        this.projectDetector = new projectDetector_1.ProjectDetectorImpl();
        this.dashboardUrl = 'http://localhost:3000'; // TODO: Make configurable
    }
    getCurrentContext() {
        if (!this.projectDetector.detectAiProject()) {
            throw new Error('No AI project detected');
        }
        const structure = this.projectDetector.getProjectStructure();
        return {
            requirementsSummary: this.getRequirementsSummary(structure.requirementsPath),
            relevantContextDocs: this.loadContextDocuments(structure.contextDir),
            progressSummary: this.getProgressSummary(structure.progressPath)
        };
    }
    async formatContextForAI() {
        try {
            const context = this.getCurrentContext();
            const currentFile = this.getCurrentFile();
            const workContext = await this.inferWorkContext();
            // Try to use intelligent context selection from dashboard
            const intelligentContext = await this.getIntelligentContext(currentFile, workContext);
            if (intelligentContext) {
                return intelligentContext;
            }
            // Fallback to basic context formatting
            let formatted = '# AI Project Context\n\n';
            formatted += '## Requirements Summary\n';
            formatted += context.requirementsSummary + '\n\n';
            if (context.currentTask) {
                formatted += '## Current Task\n';
                formatted += context.currentTask + '\n\n';
            }
            formatted += '## Progress Summary\n';
            formatted += context.progressSummary + '\n\n';
            if (context.relevantContextDocs.length > 0) {
                formatted += '## Relevant Context Documents\n';
                for (const doc of context.relevantContextDocs) {
                    formatted += `### ${doc.title}\n`;
                    formatted += `Category: ${doc.category}\n`;
                    formatted += `Tags: ${doc.tags.join(', ')}\n\n`;
                    formatted += doc.content + '\n\n';
                }
            }
            return formatted;
        }
        catch (error) {
            console.error('Error formatting context for AI:', error);
            return 'Error loading project context. Please check the AI Project Manager dashboard.';
        }
    }
    async selectRelevantDocs(currentFile) {
        if (!this.projectDetector.detectAiProject()) {
            return [];
        }
        try {
            const workContext = await this.inferWorkContext();
            const intelligentDocs = await this.getIntelligentDocumentSelection(currentFile, workContext);
            if (intelligentDocs && intelligentDocs.length > 0) {
                return intelligentDocs;
            }
        }
        catch (error) {
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
    getRequirementsSummary(requirementsPath) {
        try {
            const content = fs.readFileSync(requirementsPath, 'utf-8');
            // Extract first few lines or introduction section
            const lines = content.split('\n');
            const introIndex = lines.findIndex(line => line.toLowerCase().includes('introduction'));
            if (introIndex !== -1 && introIndex + 1 < lines.length) {
                return lines.slice(introIndex, introIndex + 10).join('\n');
            }
            return lines.slice(0, 10).join('\n');
        }
        catch {
            return 'Requirements summary not available';
        }
    }
    getProgressSummary(progressPath) {
        try {
            const content = fs.readFileSync(progressPath, 'utf-8');
            const progress = JSON.parse(content);
            return `Progress: ${progress.completedTasks}/${progress.totalTasks} tasks completed (${progress.percentage}%)`;
        }
        catch {
            return 'Progress information not available';
        }
    }
    loadContextDocuments(contextDir) {
        try {
            if (!fs.existsSync(contextDir)) {
                return [];
            }
            const files = fs.readdirSync(contextDir);
            const documents = [];
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
        }
        catch {
            return [];
        }
    }
    extractTitle(content) {
        const titleMatch = content.match(/^#\s+(.+)$/m);
        return titleMatch ? titleMatch[1] : null;
    }
    extractTags(content) {
        const tagMatch = content.match(/tags:\s*\[(.*?)\]/i);
        if (tagMatch) {
            return tagMatch[1].split(',').map(tag => tag.trim().replace(/['"]/g, ''));
        }
        return [];
    }
    inferCategory(filename, content) {
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
    calculateRelevanceScore(doc, currentFile) {
        let score = 0;
        const currentFileName = path.basename(currentFile).toLowerCase();
        // Score based on filename similarity
        if (doc.filename.toLowerCase().includes(currentFileName.split('.')[0])) {
            score += 10;
        }
        // Score based on tags
        score += doc.tags.length * 2;
        // Score based on category
        if (doc.category === 'api' && currentFileName.includes('api'))
            score += 5;
        if (doc.category === 'design' && currentFileName.includes('component'))
            score += 5;
        // Score based on recent modification
        const daysSinceModified = (Date.now() - doc.lastModified.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceModified < 7)
            score += 3;
        return score;
    }
    getCurrentFile() {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            return vscode.workspace.asRelativePath(activeEditor.document.uri);
        }
        return '';
    }
    async inferWorkContext() {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor)
            return '';
        const document = activeEditor.document;
        const selection = activeEditor.selection;
        // Get currently selected text or surrounding context
        let workContext = '';
        if (!selection.isEmpty) {
            workContext = document.getText(selection);
        }
        else {
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
                if (functionMatch)
                    contextKeywords.push(functionMatch[1]);
                const classMatch = text.match(/class\s+(\w+)/);
                if (classMatch)
                    contextKeywords.push(classMatch[1]);
                // Extract API endpoints
                const apiMatch = text.match(/['"](\/api\/[\w/-]+)['"]/);
                if (apiMatch)
                    contextKeywords.push(apiMatch[1]);
                // Extract component names
                const componentMatch = text.match(/<(\w+)/);
                if (componentMatch)
                    contextKeywords.push(componentMatch[1]);
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
    async getIntelligentContext(currentFile, workContext) {
        try {
            const structure = this.projectDetector.getProjectStructure();
            const projectId = await this.getProjectId(structure.configPath);
            if (!projectId)
                return null;
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
                return null;
            }
            const data = await response.json();
            return data.formattedContext;
        }
        catch (error) {
            console.warn('Error getting intelligent context:', error);
            return null;
        }
    }
    async getIntelligentDocumentSelection(currentFile, workContext) {
        try {
            const structure = this.projectDetector.getProjectStructure();
            const projectId = await this.getProjectId(structure.configPath);
            if (!projectId)
                return null;
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
            const data = await response.json();
            return data.selectedDocuments;
        }
        catch (error) {
            console.warn('Error getting intelligent document selection:', error);
            return null;
        }
    }
    async getProjectId(configPath) {
        try {
            const configContent = fs.readFileSync(configPath, 'utf-8');
            const config = JSON.parse(configContent);
            return config.projectId || null;
        }
        catch (error) {
            console.warn('Failed to get project ID:', error);
            return null;
        }
    }
}
exports.ContextInjectorImpl = ContextInjectorImpl;
//# sourceMappingURL=contextInjector.js.map