import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectDetectorImpl } from './projectDetector';
import { ProgressTrackerImpl } from './progressTracker';
import { ProjectStructure, ProgressData } from '../types';

export interface ProjectStateUpdate {
    tasks: TaskUpdate[];
    requirements: RequirementUpdate[];
    design: DesignUpdate[];
    progress: ProgressData;
    lastUpdated: Date;
}

export interface TaskUpdate {
    id: string;
    title: string;
    status: 'todo' | 'in-progress' | 'review' | 'done';
    progress: number;
    lastModified: Date;
    evidence: string[];
}

export interface RequirementUpdate {
    id: string;
    title: string;
    status: 'pending' | 'in-progress' | 'completed' | 'blocked';
    progress: number;
    lastModified: Date;
    evidence: string[];
}

export interface DesignUpdate {
    id: string;
    title: string;
    status: 'draft' | 'review' | 'approved' | 'implemented';
    progress: number;
    lastModified: Date;
    evidence: string[];
}

export class ProjectStateUpdater {
    private projectDetector = new ProjectDetectorImpl();
    private progressTracker = new ProgressTrackerImpl();

    /**
     * Updates the project state by analyzing current files and progress
     */
    async updateProjectState(): Promise<ProjectStateUpdate> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }

        const projectStructure = this.getProjectStructure(workspaceFolder.uri.fsPath);
        if (!projectStructure) {
            throw new Error('No AI project structure detected');
        }

        // Analyze current project state
        const tasks = await this.analyzeTasks(projectStructure);
        const requirements = await this.analyzeRequirements(projectStructure);
        const design = await this.analyzeDesign(projectStructure);
        const progress = this.progressTracker.getProgressData(projectStructure.progressPath);

        const update: ProjectStateUpdate = {
            tasks,
            requirements,
            design,
            progress,
            lastUpdated: new Date()
        };

        // Update the project files
        await this.updateProjectFiles(projectStructure, update);

        return update;
    }

    /**
     * Analyzes tasks based on file patterns and content
     */
    private async analyzeTasks(projectStructure: ProjectStructure): Promise<TaskUpdate[]> {
        const tasks: TaskUpdate[] = [];
        const tasksPath = projectStructure.tasksPath;

        if (!fs.existsSync(tasksPath)) {
            return tasks;
        }

        const content = fs.readFileSync(tasksPath, 'utf-8');
        const lines = content.split('\n');
        let currentTask: Partial<TaskUpdate> | null = null;

        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Detect task headers (lines starting with # or ##)
            if (trimmedLine.startsWith('#')) {
                if (currentTask && currentTask.title) {
                    tasks.push(currentTask as TaskUpdate);
                }
                
                const level = trimmedLine.match(/^#+/)?.[0].length || 1;
                const title = trimmedLine.replace(/^#+\s*/, '').trim();
                
                currentTask = {
                    id: this.generateId(title),
                    title,
                    status: 'todo',
                    progress: 0,
                    lastModified: new Date(),
                    evidence: []
                };
            }
            
            // Detect task status indicators
            if (currentTask && trimmedLine.includes('[x]')) {
                currentTask.status = 'done';
                currentTask.progress = 100;
            } else if (currentTask && trimmedLine.includes('[ ]')) {
                currentTask.status = 'todo';
                currentTask.progress = 0;
            } else if (currentTask && trimmedLine.includes('🔄')) {
                currentTask.status = 'in-progress';
                currentTask.progress = 50;
            } else if (currentTask && trimmedLine.includes('📋')) {
                currentTask.status = 'review';
                currentTask.progress = 75;
            }

            // Detect evidence of progress
            if (currentTask && this.detectProgressEvidence(trimmedLine)) {
                if (currentTask.evidence) {
                    currentTask.evidence.push(trimmedLine);
                }
                if (currentTask.status === 'todo') {
                    currentTask.status = 'in-progress';
                    currentTask.progress = 25;
                }
            }
        }

        // Add the last task
        if (currentTask && currentTask.title) {
            tasks.push(currentTask as TaskUpdate);
        }

        return tasks;
    }

    /**
     * Analyzes requirements based on file patterns and content
     */
    private async analyzeRequirements(projectStructure: ProjectStructure): Promise<RequirementUpdate[]> {
        const requirements: RequirementUpdate[] = [];
        const requirementsPath = projectStructure.requirementsPath;

        if (!fs.existsSync(requirementsPath)) {
            return requirements;
        }

        const content = fs.readFileSync(requirementsPath, 'utf-8');
        const lines = content.split('\n');

        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Detect requirement headers
            if (trimmedLine.startsWith('###') && trimmedLine.includes('Requirement')) {
                const title = trimmedLine.replace(/^###\s*/, '').trim();
                const requirement: RequirementUpdate = {
                    id: this.generateId(title),
                    title,
                    status: 'pending',
                    progress: 0,
                    lastModified: new Date(),
                    evidence: []
                };

                // Look for acceptance criteria and status indicators
                const nextLines = lines.slice(lines.indexOf(line) + 1);
                for (const nextLine of nextLines) {
                    if (nextLine.trim().startsWith('###')) break;
                    
                    if (nextLine.includes('✅') || nextLine.includes('WHEN') && nextLine.includes('THEN')) {
                        requirement.evidence.push(nextLine.trim());
                        requirement.progress += 20;
                    }
                }

                if (requirement.progress >= 100) {
                    requirement.status = 'completed';
                    requirement.progress = 100;
                } else if (requirement.progress > 0) {
                    requirement.status = 'in-progress';
                }

                requirements.push(requirement);
            }
        }

        return requirements;
    }

    /**
     * Analyzes design documents based on file patterns and content
     */
    private async analyzeDesign(projectStructure: ProjectStructure): Promise<DesignUpdate[]> {
        const design: DesignUpdate[] = [];
        const designPath = projectStructure.designPath;

        if (!fs.existsSync(designPath)) {
            return design;
        }

        const content = fs.readFileSync(designPath, 'utf-8');
        const lines = content.split('\n');

        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Detect design section headers
            if (trimmedLine.startsWith('##') && !trimmedLine.startsWith('###')) {
                const title = trimmedLine.replace(/^##\s*/, '').trim();
                const designItem: DesignUpdate = {
                    id: this.generateId(title),
                    title,
                    status: 'draft',
                    progress: 0,
                    lastModified: new Date(),
                    evidence: []
                };

                // Look for implementation evidence
                const nextLines = lines.slice(lines.indexOf(line) + 1);
                for (const nextLine of nextLines) {
                    if (nextLine.trim().startsWith('##')) break;
                    
                    if (nextLine.includes('✅') || nextLine.includes('Implemented') || nextLine.includes('Complete')) {
                        designItem.evidence.push(nextLine.trim());
                        designItem.progress += 25;
                    }
                }

                if (designItem.progress >= 100) {
                    designItem.status = 'implemented';
                    designItem.progress = 100;
                } else if (designItem.progress >= 75) {
                    designItem.status = 'approved';
                } else if (designItem.progress >= 50) {
                    designItem.status = 'review';
                }

                design.push(designItem);
            }
        }

        return design;
    }

    /**
     * Updates project files with the new state information
     */
    private async updateProjectFiles(projectStructure: ProjectStructure, update: ProjectStateUpdate): Promise<void> {
        // Update tasks.md
        if (fs.existsSync(projectStructure.tasksPath)) {
            await this.updateTasksFile(projectStructure.tasksPath, update.tasks);
        }

        // Update requirements.md
        if (fs.existsSync(projectStructure.requirementsPath)) {
            await this.updateRequirementsFile(projectStructure.requirementsPath, update.requirements);
        }

        // Update design.md
        if (fs.existsSync(projectStructure.designPath)) {
            await this.updateDesignFile(projectStructure.designPath, update.design);
        }

        // Update progress.json
        fs.writeFileSync(projectStructure.progressPath, JSON.stringify(update.progress, null, 2));

        // Create a summary file
        await this.createProjectStateSummary(projectStructure, update);
    }

    /**
     * Updates the tasks.md file with current progress
     */
    private async updateTasksFile(tasksPath: string, tasks: TaskUpdate[]): Promise<void> {
        let content = fs.readFileSync(tasksPath, 'utf-8');
        
        for (const task of tasks) {
            const taskRegex = new RegExp(`(^#+\\s*${this.escapeRegex(task.title)}.*$)`, 'gm');
            const match = content.match(taskRegex);
            
            if (match) {
                let newLine = match[0];
                
                // Update status indicators
                if (task.status === 'done') {
                    newLine = newLine.replace(/\[ \]/, '[x]');
                } else if (task.status === 'in-progress') {
                    newLine = newLine.replace(/\[ \]/, '🔄');
                } else if (task.status === 'review') {
                    newLine = newLine.replace(/\[ \]/, '📋');
                }
                
                // Add progress indicator
                if (task.progress > 0) {
                    newLine += ` (${task.progress}% complete)`;
                }
                
                content = content.replace(match[0], newLine);
            }
        }
        
        fs.writeFileSync(tasksPath, content);
    }

    /**
     * Updates the requirements.md file with current progress
     */
    private async updateRequirementsFile(requirementsPath: string, requirements: RequirementUpdate[]): Promise<void> {
        let content = fs.readFileSync(requirementsPath, 'utf-8');
        
        for (const requirement of requirements) {
            const reqRegex = new RegExp(`(^###\\s*${this.escapeRegex(requirement.title)}.*$)`, 'gm');
            const match = content.match(reqRegex);
            
            if (match) {
                let newLine = match[0];
                
                // Add status indicator
                if (requirement.status === 'completed') {
                    newLine += ' ✅';
                } else if (requirement.status === 'in-progress') {
                    newLine += ' 🔄';
                } else if (requirement.status === 'blocked') {
                    newLine += ' ⚠️';
                }
                
                // Add progress indicator
                if (requirement.progress > 0) {
                    newLine += ` (${requirement.progress}% complete)`;
                }
                
                content = content.replace(match[0], newLine);
            }
        }
        
        fs.writeFileSync(requirementsPath, content);
    }

    /**
     * Updates the design.md file with current progress
     */
    private async updateDesignFile(designPath: string, design: DesignUpdate[]): Promise<void> {
        let content = fs.readFileSync(designPath, 'utf-8');
        
        for (const designItem of design) {
            const designRegex = new RegExp(`(^##\\s*${this.escapeRegex(designItem.title)}.*$)`, 'gm');
            const match = content.match(designRegex);
            
            if (match) {
                let newLine = match[0];
                
                // Add status indicator
                if (designItem.status === 'implemented') {
                    newLine += ' ✅';
                } else if (designItem.status === 'approved') {
                    newLine += ' ✅';
                } else if (designItem.status === 'review') {
                    newLine += ' 🔍';
                }
                
                // Add progress indicator
                if (designItem.progress > 0) {
                    newLine += ` (${designItem.progress}% complete)`;
                }
                
                content = content.replace(match[0], newLine);
            }
        }
        
        fs.writeFileSync(designPath, content);
    }

    /**
     * Creates a project state summary file
     */
    private async createProjectStateSummary(projectStructure: ProjectStructure, update: ProjectStateUpdate): Promise<void> {
        const summaryPath = path.join(path.dirname(projectStructure.progressPath), 'project-state-summary.md');
        
        const summary = `# Project State Summary

**Last Updated:** ${update.lastUpdated.toLocaleString()}

## Overall Progress
- **Tasks:** ${update.tasks.filter(t => t.status === 'done').length}/${update.tasks.length} completed
- **Requirements:** ${update.requirements.filter(r => r.status === 'completed').length}/${update.requirements.length} completed
- **Design:** ${update.design.filter(d => d.status === 'implemented').length}/${update.design.length} implemented

## Task Status
${update.tasks.map(task => `- ${task.title}: ${task.status} (${task.progress}%)`).join('\n')}

## Requirement Status
${update.requirements.map(req => `- ${req.title}: ${req.status} (${req.progress}%)`).join('\n')}

## Design Status
${update.design.map(design => `- ${design.title}: ${design.status} (${design.progress}%)`).join('\n')}

## Recent Evidence
${update.tasks.flatMap(t => t.evidence).slice(0, 10).map(evidence => `- ${evidence}`).join('\n')}
`;

        fs.writeFileSync(summaryPath, summary);
    }

    /**
     * Detects evidence of progress in a line of text
     */
    private detectProgressEvidence(line: string): boolean {
        const progressIndicators = [
            '✅', '✓', 'done', 'complete', 'finished', 'implemented',
            'test', 'spec', 'component', 'api', 'config', 'readme',
            'deploy', 'build', 'compile', 'run', 'execute'
        ];
        
        return progressIndicators.some(indicator => 
            line.toLowerCase().includes(indicator.toLowerCase())
        );
    }

    /**
     * Generates a unique ID for an item
     */
    private generateId(title: string): string {
        return title.toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    /**
     * Escapes regex special characters
     */
    private escapeRegex(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Gets the project structure for a given path
     */
    private getProjectStructure(workspacePath: string): ProjectStructure | null {
        // Check for Kiro specs first
        const kiroSpecsPath = path.join(workspacePath, '.kiro', 'specs', 'ai-project-manager');
        if (fs.existsSync(kiroSpecsPath)) {
                    return {
            tasksPath: path.join(kiroSpecsPath, 'tasks.md'),
            requirementsPath: path.join(kiroSpecsPath, 'requirements.md'),
            designPath: path.join(kiroSpecsPath, 'design.md'),
            progressPath: path.join(kiroSpecsPath, 'progress.json'),
            configPath: path.join(kiroSpecsPath, 'config.json'),
            contextDir: path.join(kiroSpecsPath, 'context'),
            isValid: true
        };
        }

        // Check for AI project structure
        if (this.projectDetector.detectAiProject()) {
            return this.projectDetector.getProjectStructure();
        }

        return null;
    }
}
