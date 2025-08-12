import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectDetector, ProjectStructure, ValidationResult, ProjectConfiguration } from '../types';

export class ProjectDetectorError extends Error {
    constructor(message: string, public code: string) {
        super(message);
        this.name = 'ProjectDetectorError';
    }
}

export class ProjectDetectorImpl implements ProjectDetector {
    private static readonly AI_PROJECT_DIR = '.ai-project';
    private static readonly KIRO_DIR = '.kiro';
    private static readonly REQUIRED_FILES = ['config.json', 'requirements.md', 'design.md', 'tasks.md', 'progress.json'];
    private static readonly MAX_SCAN_DEPTH = 3;

    /**
     * Detects .ai-project folders in the current workspace
     * Scans workspace folders and their subdirectories up to MAX_SCAN_DEPTH
     */
    detectAiProject(): boolean {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return false;
        }

        // Check each workspace folder
        for (const folder of workspaceFolders) {
            if (this.scanForAiProject(folder.uri.fsPath, 0)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Recursively scans directory for .ai-project folders
     */
    private scanForAiProject(dirPath: string, depth: number): boolean {
        if (depth > ProjectDetectorImpl.MAX_SCAN_DEPTH) {
            return false;
        }

        try {
            // Check if current directory has .ai-project or .kiro
            const aiProjectPath = path.join(dirPath, ProjectDetectorImpl.AI_PROJECT_DIR);
            const kiroPath = path.join(dirPath, ProjectDetectorImpl.KIRO_DIR);
            
            // Check .ai-project folder
            if (fs.existsSync(aiProjectPath) && fs.statSync(aiProjectPath).isDirectory()) {
                // Verify it has at least config.json
                const configPath = path.join(aiProjectPath, 'config.json');
                if (fs.existsSync(configPath)) {
                    return true;
                }
            }
            
            // Check .kiro folder for ai-project-manager specs
            if (fs.existsSync(kiroPath) && fs.statSync(kiroPath).isDirectory()) {
                // Look for specs/ai-project-manager folder
                const specsPath = path.join(kiroPath, 'specs', 'ai-project-manager');
                if (fs.existsSync(specsPath) && fs.statSync(specsPath).isDirectory()) {
                    return true;
                }
            }

            // Scan subdirectories
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                    const subDirPath = path.join(dirPath, entry.name);
                    if (this.scanForAiProject(subDirPath, depth + 1)) {
                        return true;
                    }
                }
            }

            return false;
        } catch (error) {
            // Ignore permission errors and continue scanning
            return false;
        }
    }

    /**
     * Finds all .ai-project directories in workspace
     */
    findAllAiProjects(): string[] {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return [];
        }

        const projects: string[] = [];
        for (const folder of workspaceFolders) {
            this.collectAiProjects(folder.uri.fsPath, 0, projects);
        }

        return projects;
    }

    /**
     * Recursively collects all .ai-project directories
     */
    private collectAiProjects(dirPath: string, depth: number, projects: string[]): void {
        if (depth > ProjectDetectorImpl.MAX_SCAN_DEPTH) {
            return;
        }

        try {
            const aiProjectPath = path.join(dirPath, ProjectDetectorImpl.AI_PROJECT_DIR);
            if (fs.existsSync(aiProjectPath) && fs.statSync(aiProjectPath).isDirectory()) {
                const configPath = path.join(aiProjectPath, 'config.json');
                if (fs.existsSync(configPath)) {
                    projects.push(aiProjectPath);
                }
            }

            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                    const subDirPath = path.join(dirPath, entry.name);
                    this.collectAiProjects(subDirPath, depth + 1, projects);
                }
            }
        } catch (error) {
            // Ignore permission errors and continue scanning
        }
    }
    
    /**
     * Gets project structure for the first detected .ai-project or .kiro project
     * If multiple projects exist, returns the first one found
     */
    getProjectStructure(): ProjectStructure {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new ProjectDetectorError('No workspace folders found', 'NO_WORKSPACE');
        }

        // First check for .kiro/specs/ai-project-manager structure
        for (const folder of workspaceFolders) {
            const kiroSpecsPath = path.join(folder.uri.fsPath, '.kiro', 'specs', 'ai-project-manager');
            if (fs.existsSync(kiroSpecsPath) && fs.statSync(kiroSpecsPath).isDirectory()) {
                const configPath = path.join(kiroSpecsPath, 'config.json');
                if (fs.existsSync(configPath)) {
                    return {
                        configPath: configPath,
                        requirementsPath: path.join(kiroSpecsPath, 'requirements.md'),
                        designPath: path.join(kiroSpecsPath, 'design.md'),
                        tasksPath: path.join(kiroSpecsPath, 'tasks.md'),
                        progressPath: path.join(kiroSpecsPath, 'progress.json'),
                        contextDir: path.join(kiroSpecsPath, 'context'),
                        isValid: this.validateProjectStructure(kiroSpecsPath)
                    };
                }
            }
        }

        // Fallback to .ai-project directories
        const aiProjects = this.findAllAiProjects();
        
        if (aiProjects.length === 0) {
            throw new ProjectDetectorError('No .ai-project or .kiro project found in workspace', 'NO_PROJECT_FOUND');
        }

        // Use the first project found (could be enhanced to let user choose)
        const aiProjectDir = aiProjects[0];
        
        return {
            configPath: path.join(aiProjectDir, 'config.json'),
            requirementsPath: path.join(aiProjectDir, 'requirements.md'),
            designPath: path.join(aiProjectDir, 'design.md'),
            tasksPath: path.join(aiProjectDir, 'tasks.md'),
            progressPath: path.join(aiProjectDir, 'progress.json'),
            contextDir: path.join(aiProjectDir, 'context'),
            isValid: this.validateProjectStructure(aiProjectDir)
        };
    }

    /**
     * Gets project structure for a specific .ai-project directory
     */
    getProjectStructureForPath(aiProjectDir: string): ProjectStructure {
        return {
            configPath: path.join(aiProjectDir, 'config.json'),
            requirementsPath: path.join(aiProjectDir, 'requirements.md'),
            designPath: path.join(aiProjectDir, 'design.md'),
            tasksPath: path.join(aiProjectDir, 'tasks.md'),
            progressPath: path.join(aiProjectDir, 'progress.json'),
            contextDir: path.join(aiProjectDir, 'context'),
            isValid: this.validateProjectStructure(aiProjectDir)
        };
    }
    
    /**
     * Validates project files with comprehensive error checking
     */
    validateProjectFiles(): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        try {
            const structure = this.getProjectStructure();
            
            // Validate required files exist and are readable
            const requiredFiles = [
                { path: structure.configPath, name: 'config.json' },
                { path: structure.requirementsPath, name: 'requirements.md' },
                { path: structure.designPath, name: 'design.md' },
                { path: structure.tasksPath, name: 'tasks.md' },
                { path: structure.progressPath, name: 'progress.json' }
            ];
            
            for (const file of requiredFiles) {
                if (!fs.existsSync(file.path)) {
                    errors.push(`Missing required file: ${file.name}`);
                } else {
                    try {
                        fs.accessSync(file.path, fs.constants.R_OK);
                    } catch {
                        errors.push(`Cannot read required file: ${file.name}`);
                    }
                }
            }
            
            // Validate context directory
            if (!fs.existsSync(structure.contextDir)) {
                warnings.push('Context directory not found - will be created automatically');
            } else if (!fs.statSync(structure.contextDir).isDirectory()) {
                errors.push('Context path exists but is not a directory');
            }

            // Validate config.json content
            if (fs.existsSync(structure.configPath)) {
                const configValidation = this.validateConfigFile(structure.configPath);
                errors.push(...configValidation.errors);
                warnings.push(...configValidation.warnings);
            }

            // Validate markdown files are not empty
            const markdownFiles = [
                { path: structure.requirementsPath, name: 'requirements.md' },
                { path: structure.designPath, name: 'design.md' },
                { path: structure.tasksPath, name: 'tasks.md' }
            ];

            for (const file of markdownFiles) {
                if (fs.existsSync(file.path)) {
                    try {
                        const content = fs.readFileSync(file.path, 'utf-8').trim();
                        if (content.length === 0) {
                            warnings.push(`${file.name} is empty`);
                        }
                    } catch {
                        warnings.push(`Could not read content of ${file.name}`);
                    }
                }
            }
            
            return {
                isValid: errors.length === 0,
                errors,
                warnings
            };
        } catch (error) {
            return {
                isValid: false,
                errors: [`Failed to validate project: ${error instanceof Error ? error.message : 'Unknown error'}`],
                warnings: []
            };
        }
    }

    /**
     * Validates and parses config.json file
     */
    validateConfigFile(configPath: string): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            const configContent = fs.readFileSync(configPath, 'utf-8');
            const config = JSON.parse(configContent) as ProjectConfiguration;

            // Validate required fields
            const requiredFields: (keyof ProjectConfiguration)[] = [
                'projectId', 'name', 'template', 'createdAt'
            ];

            for (const field of requiredFields) {
                if (!config[field]) {
                    errors.push(`Config missing required field: ${field}`);
                }
            }

            // Validate optional but recommended fields
            const recommendedFields: (keyof ProjectConfiguration)[] = [
                'description', 'lastModified', 'aiModel'
            ];

            for (const field of recommendedFields) {
                if (!config[field]) {
                    warnings.push(`Config missing recommended field: ${field}`);
                }
            }

            // Validate contextPreferences structure
            if (config.contextPreferences) {
                const prefs = config.contextPreferences;
                if (typeof prefs.maxContextSize !== 'number' || prefs.maxContextSize <= 0) {
                    warnings.push('Invalid maxContextSize in contextPreferences');
                }
                if (typeof prefs.prioritizeRecent !== 'boolean') {
                    warnings.push('Invalid prioritizeRecent in contextPreferences');
                }
                if (typeof prefs.includeProgress !== 'boolean') {
                    warnings.push('Invalid includeProgress in contextPreferences');
                }
            } else {
                warnings.push('Missing contextPreferences configuration');
            }

            // Validate date formats
            if (config.createdAt) {
                try {
                    new Date(config.createdAt);
                } catch {
                    errors.push('Invalid createdAt date format');
                }
            }

            if (config.lastModified) {
                try {
                    new Date(config.lastModified);
                } catch {
                    warnings.push('Invalid lastModified date format');
                }
            }

        } catch (error) {
            if (error instanceof SyntaxError) {
                errors.push('config.json contains invalid JSON');
            } else {
                errors.push(`Failed to validate config.json: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Parses config.json with fallback mechanisms
     */
    parseConfigFile(configPath: string): ProjectConfiguration | null {
        try {
            const configContent = fs.readFileSync(configPath, 'utf-8');
            const config = JSON.parse(configContent) as ProjectConfiguration;
            
            // Apply fallbacks for missing fields
            return this.applyConfigFallbacks(config);
        } catch (error) {
            console.warn(`Failed to parse config.json: ${error}`);
            return null;
        }
    }

    /**
     * Applies fallback values for missing configuration fields
     */
    private applyConfigFallbacks(config: Partial<ProjectConfiguration>): ProjectConfiguration {
        const now = new Date().toISOString();
        
        return {
            projectId: config.projectId || this.generateProjectId(),
            name: config.name || 'Unnamed Project',
            description: config.description || '',
            template: config.template || 'default',
            createdAt: config.createdAt || now,
            lastModified: config.lastModified || now,
            aiModel: config.aiModel || 'gpt-4',
            contextPreferences: {
                maxContextSize: config.contextPreferences?.maxContextSize || 8000,
                prioritizeRecent: config.contextPreferences?.prioritizeRecent ?? true,
                includeProgress: config.contextPreferences?.includeProgress ?? true
            }
        };
    }

    /**
     * Generates a unique project ID
     */
    private generateProjectId(): string {
        return `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Creates missing project files with fallback templates
     */
    async repairProjectStructure(aiProjectDir: string): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            // Ensure context directory exists
            const contextDir = path.join(aiProjectDir, 'context');
            if (!fs.existsSync(contextDir)) {
                fs.mkdirSync(contextDir, { recursive: true });
                warnings.push('Created missing context directory');
            }

            // Create missing files with basic templates
            const filesToCreate = [
                {
                    path: path.join(aiProjectDir, 'requirements.md'),
                    content: '# Requirements Document\n\n## Introduction\n\n## Requirements\n'
                },
                {
                    path: path.join(aiProjectDir, 'design.md'),
                    content: '# Design Document\n\n## Overview\n\n## Architecture\n'
                },
                {
                    path: path.join(aiProjectDir, 'tasks.md'),
                    content: '# Implementation Plan\n\n- [ ] Task 1\n- [ ] Task 2\n'
                },
                {
                    path: path.join(aiProjectDir, 'progress.json'),
                    content: JSON.stringify({
                        totalTasks: 0,
                        completedTasks: 0,
                        percentage: 0,
                        lastUpdated: new Date().toISOString(),
                        recentActivity: [],
                        milestones: []
                    }, null, 2)
                }
            ];

            for (const file of filesToCreate) {
                if (!fs.existsSync(file.path)) {
                    fs.writeFileSync(file.path, file.content, 'utf-8');
                    warnings.push(`Created missing file: ${path.basename(file.path)}`);
                }
            }

            // Create or repair config.json
            const configPath = path.join(aiProjectDir, 'config.json');
            if (!fs.existsSync(configPath)) {
                const defaultConfig: ProjectConfiguration = {
                    projectId: this.generateProjectId(),
                    name: path.basename(path.dirname(aiProjectDir)),
                    description: 'Auto-generated project configuration',
                    template: 'default',
                    createdAt: new Date().toISOString(),
                    lastModified: new Date().toISOString(),
                    aiModel: 'gpt-4',
                    contextPreferences: {
                        maxContextSize: 8000,
                        prioritizeRecent: true,
                        includeProgress: true
                    }
                };
                
                fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
                warnings.push('Created missing config.json with default values');
            }

        } catch (error) {
            errors.push(`Failed to repair project structure: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    
    /**
     * Basic validation of project structure (legacy method for backward compatibility)
     */
    private validateProjectStructure(aiProjectDir: string): boolean {
        try {
            for (const file of ProjectDetectorImpl.REQUIRED_FILES) {
                if (!fs.existsSync(path.join(aiProjectDir, file))) {
                    return false;
                }
            }
            
            const contextDir = path.join(aiProjectDir, 'context');
            return fs.existsSync(contextDir) && fs.statSync(contextDir).isDirectory();
        } catch {
            return false;
        }
    }
}