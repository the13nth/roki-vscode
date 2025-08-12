import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectDetectorImpl } from './lib/projectDetector';
import { ContextInjectorImpl } from './lib/contextInjector';
import { ProgressTrackerImpl } from './lib/progressTracker';
import { FileWatcherImpl } from './lib/fileWatcher';
import { SidebarProvider } from './lib/sidebarProvider';
import { VSCodeExtension } from './types';

// Add fetch type for Node.js
declare global {
    function fetch(input: string, init?: any): Promise<any>;
}

let extension: VSCodeExtension;
let sidebarProvider: SidebarProvider;

/**
 * Sets up global error handling for the extension
 */
function setupGlobalErrorHandling(): void {
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        vscode.window.showErrorMessage(`AI Project Manager: Unexpected error occurred. Check console for details.`);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
        vscode.window.showErrorMessage(`AI Project Manager: Critical error occurred. Extension may need to be reloaded.`);
    });
}

/**
 * Enhanced error handler with user-friendly messages and recovery suggestions
 */
function handleError(error: unknown, context: string, showToUser: boolean = true): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const fullMessage = `${context}: ${errorMessage}`;
    
    console.error(fullMessage, error);
    
    if (showToUser) {
        const suggestions = getErrorSuggestions(error, context);
        const message = suggestions ? `${fullMessage}\n\nSuggestion: ${suggestions}` : fullMessage;
        
        vscode.window.showErrorMessage(message, 'Retry', 'Report Issue').then(choice => {
            if (choice === 'Report Issue') {
                vscode.env.openExternal(vscode.Uri.parse('https://github.com/ai-project-manager/vscode-extension/issues'));
            }
        });
    }
}

/**
 * Provides user-friendly error suggestions based on error type and context
 */
function getErrorSuggestions(error: unknown, context: string): string | null {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('enoent') || message.includes('no such file')) {
            return 'Check if the project files exist and you have proper permissions.';
        }
        
        if (message.includes('eacces') || message.includes('permission denied')) {
            return 'Check file permissions or try running VS Code as administrator.';
        }
        
        if (message.includes('network') || message.includes('fetch')) {
            return 'Check your internet connection and dashboard URL in settings.';
        }
        
        if (message.includes('json') || message.includes('parse')) {
            return 'The project files may be corrupted. Try refreshing or recreating the project.';
        }
        
        if (context.includes('dashboard') || context.includes('sync')) {
            return 'Make sure the AI Project Manager dashboard is running on the correct port.';
        }
    }
    
    return null;
}

/**
 * Validates project structure and provides detailed feedback
 */
async function validateProjectStructure(): Promise<boolean> {
    try {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showWarningMessage('No workspace folder found. Open a folder to use AI Project Manager.');
            return false;
        }

        const kiroSpecsPath = path.join(workspaceFolder.uri.fsPath, '.kiro', 'specs', 'ai-project-manager');
        const hasKiroSpecs = fs.existsSync(kiroSpecsPath);
        const hasAiProject = extension.projectDetector.detectAiProject();

        if (!hasKiroSpecs && !hasAiProject) {
            const choice = await vscode.window.showInformationMessage(
                'No AI project detected in this workspace. Would you like to create one?',
                'Create Project',
                'Learn More',
                'Dismiss'
            );

            if (choice === 'Create Project') {
                await vscode.commands.executeCommand('aiProjectManager.createProject');
            } else if (choice === 'Learn More') {
                vscode.env.openExternal(vscode.Uri.parse('https://github.com/ai-project-manager/docs'));
            }
            return false;
        }

        return true;
    } catch (error) {
        handleError(error, 'Project structure validation');
        return false;
    }
}

async function connectToDashboard(): Promise<void> {
    if (!extension.projectDetector.detectAiProject()) {
        throw new Error('No AI project detected');
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        throw new Error('No workspace folder found');
    }

    // Update sidebar status
    sidebarProvider?.setSyncStatus('syncing');

    try {
        // Get project ID from workspace folder name or generate one
        const projectId = workspaceFolder.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        const config = vscode.workspace.getConfiguration('aiProjectManager');
        const dashboardUrl = config.get('dashboardUrl', 'http://localhost:3000');

        const response = await fetch(`${dashboardUrl}/api/projects/${projectId}/vscode`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                version: vscode.version,
                workspacePath: workspaceFolder.uri.fsPath,
                timestamp: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: Failed to connect to dashboard`);
        }

        // Update sidebar status on success
        sidebarProvider?.setSyncStatus('connected');
    } catch (error) {
        // Update sidebar status on failure
        sidebarProvider?.setSyncStatus('disconnected');
        throw error;
    }
}

export async function activate(context: vscode.ExtensionContext) {
    console.log('AI Project Manager extension is now active!');
    
    try {
        // Initialize error handling
        setupGlobalErrorHandling();
        
        // Debug: Show activation message
        vscode.window.showInformationMessage('🤖 AI Project Manager extension activated!');
    } catch (error) {
        console.error('Error during extension initialization:', error);
    }
    
    // Initialize extension components
    const projectDetector = new ProjectDetectorImpl();
    const contextInjector = new ContextInjectorImpl();
    const progressTracker = new ProgressTrackerImpl();
    const fileWatcher = new FileWatcherImpl();
    
    extension = {
        projectDetector,
        contextInjector,
        progressTracker,
        fileWatcher
    };
    
    // Initialize sidebar provider
    sidebarProvider = new SidebarProvider();
    console.log('Sidebar provider initialized');
    
    // Register sidebar tree data provider
    const treeDataProvider = vscode.window.createTreeView('aiProjectManagerSidebar', {
        treeDataProvider: sidebarProvider,
        showCollapseAll: true
    });
    console.log('Tree data provider registered');
    
    // Try to make the view visible
    try {
        await vscode.commands.executeCommand('setContext', 'aiProjectManagerSidebar.visible', true);
        console.log('Set sidebar visible context');
    } catch (error) {
        console.log('Failed to set sidebar context:', error);
    }
    
    // Set context for when project is detected
    const hasProject = projectDetector.detectAiProject();
    await vscode.commands.executeCommand('setContext', 'aiProjectManager.hasProject', hasProject);
    
    // Register commands
    const injectContextCommand = vscode.commands.registerCommand('aiProjectManager.injectContext', async () => {
        if (extension.projectDetector.detectAiProject()) {
            try {
                const formattedContext = await extension.contextInjector.formatContextForAI();
                
                // Always copy to clipboard for manual pasting
                await vscode.env.clipboard.writeText(formattedContext);
                vscode.window.showInformationMessage('🤖 AI Context copied to clipboard! You can now paste it manually.');
                console.log('Formatted context:', formattedContext);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                vscode.window.showErrorMessage(`Failed to inject context: ${errorMessage}`);
            }
        } else {
            vscode.window.showWarningMessage('No AI project detected in current workspace');
        }
    });
    
    const detectProjectCommand = vscode.commands.registerCommand('aiProjectManager.detectProject', () => {
        const isDetected = extension.projectDetector.detectAiProject();
        if (isDetected) {
            const structure = extension.projectDetector.getProjectStructure();
            vscode.window.showInformationMessage(`AI Project detected at: ${structure.configPath}`);
        } else {
            vscode.window.showInformationMessage('No AI project found in current workspace');
        }
    });

    const connectToDashboardCommand = vscode.commands.registerCommand('aiProjectManager.connectToDashboard', async () => {
        try {
            await connectToDashboard();
            vscode.window.showInformationMessage('✅ Connected to AI Project Dashboard!');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });
    
    const toggleAutoInjectCommand = vscode.commands.registerCommand('aiProjectManager.toggleAutoInject', async () => {
        if (extension.contextInjector && 'toggleAutoInject' in extension.contextInjector) {
            await (extension.contextInjector as any).toggleAutoInject();
        }
    });
    
    const openContextPreferencesCommand = vscode.commands.registerCommand('aiProjectManager.openContextPreferences', async () => {
        if (extension.contextInjector && 'openContextPreferences' in extension.contextInjector) {
            await (extension.contextInjector as any).openContextPreferences();
        }
    });
    
    const autoInjectContextCommand = vscode.commands.registerCommand('aiProjectManager.autoInjectContext', async () => {
        if (extension.contextInjector && 'autoInjectContext' in extension.contextInjector) {
            await (extension.contextInjector as any).autoInjectContext();
        }
    });
    
    const refreshSidebarCommand = vscode.commands.registerCommand('aiProjectManager.refreshSidebar', () => {
        sidebarProvider.refresh();
        vscode.window.showInformationMessage('AI Project Manager sidebar refreshed');
    });
    
    const openDocumentCommand = vscode.commands.registerCommand('aiProjectManager.openDocument', async (filePath: string) => {
        try {
            if (filePath && require('fs').existsSync(filePath)) {
                const document = await vscode.workspace.openTextDocument(filePath);
                await vscode.window.showTextDocument(document);
            } else {
                vscode.window.showErrorMessage('Document not found: ' + filePath);
            }
        } catch (error) {
            vscode.window.showErrorMessage('Failed to open document: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    });
    
    const setSyncStatusCommand = vscode.commands.registerCommand('aiProjectManager.setSyncStatus', (status: 'connected' | 'disconnected' | 'syncing') => {
        sidebarProvider?.setSyncStatus(status);
    });
    
    const showSidebarCommand = vscode.commands.registerCommand('aiProjectManager.showSidebar', async () => {
        try {
            await vscode.commands.executeCommand('aiProjectManagerSidebar.focus');
            vscode.window.showInformationMessage('AI Project Manager sidebar should now be visible');
        } catch (error) {
            handleError(error, 'Show sidebar');
        }
    });
    
    const createProjectCommand = vscode.commands.registerCommand('aiProjectManager.createProject', async () => {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('Please open a workspace folder first');
                return;
            }

            const projectName = await vscode.window.showInputBox({
                prompt: 'Enter project name',
                placeHolder: 'my-ai-project',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Project name cannot be empty';
                    }
                    if (!/^[a-zA-Z0-9-_\s]+$/.test(value)) {
                        return 'Project name can only contain letters, numbers, spaces, hyphens, and underscores';
                    }
                    return null;
                }
            });

            if (!projectName) return;

            const template = await vscode.window.showQuickPick([
                { label: 'Web Application', description: 'Frontend/fullstack web project' },
                { label: 'API/Backend', description: 'REST API or backend service' },
                { label: 'Mobile App', description: 'Mobile application project' },
                { label: 'Library/Package', description: 'Reusable library or package' },
                { label: 'Data Science', description: 'ML/AI or data analysis project' },
                { label: 'Custom', description: 'Start with basic template' }
            ], {
                placeHolder: 'Select project template'
            });

            if (!template) return;

            await createProjectStructure(workspaceFolder.uri.fsPath, projectName, template.label);
            
            vscode.window.showInformationMessage(
                `✅ AI Project "${projectName}" created successfully!`,
                'Open Dashboard',
                'View Files'
            ).then(choice => {
                if (choice === 'Open Dashboard') {
                    vscode.commands.executeCommand('aiProjectManager.connectToDashboard');
                } else if (choice === 'View Files') {
                    vscode.commands.executeCommand('workbench.files.action.refreshFilesExplorer');
                }
            });

        } catch (error) {
            handleError(error, 'Create project');
        }
    });
    
    const validateProjectCommand = vscode.commands.registerCommand('aiProjectManager.validateProject', async () => {
        try {
            const isValid = await validateProjectStructure();
            if (isValid) {
                vscode.window.showInformationMessage('✅ Project structure is valid');
            }
        } catch (error) {
            handleError(error, 'Validate project');
        }
    });
    
    const repairProjectCommand = vscode.commands.registerCommand('aiProjectManager.repairProject', async () => {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }

            const choice = await vscode.window.showWarningMessage(
                'This will attempt to repair missing project files. Continue?',
                'Repair',
                'Cancel'
            );

            if (choice !== 'Repair') return;

            await repairProjectStructure(workspaceFolder.uri.fsPath);
            vscode.window.showInformationMessage('✅ Project repair completed');
            
        } catch (error) {
            handleError(error, 'Repair project');
        }
    });
    
    context.subscriptions.push(
        injectContextCommand, 
        detectProjectCommand, 
        connectToDashboardCommand,
        toggleAutoInjectCommand,
        openContextPreferencesCommand,
        autoInjectContextCommand,
        refreshSidebarCommand,
        openDocumentCommand,
        setSyncStatusCommand,
        showSidebarCommand,
        createProjectCommand,
        validateProjectCommand,
        repairProjectCommand,
        treeDataProvider
    );
    
    // Start file watching and auto progress tracking if project is detected
    if (extension.projectDetector.detectAiProject()) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            extension.fileWatcher.startWatching(workspaceFolder.uri.fsPath);
            
            // Start automatic progress tracking
            if (extension.progressTracker.startAutoTracking) {
                await extension.progressTracker.startAutoTracking();
            }
            
            // Auto-connect to dashboard
            try {
                await connectToDashboard();
                vscode.window.showInformationMessage('🎯 AI Project Manager activated! Connected to dashboard.');
            } catch {
                vscode.window.showInformationMessage('🎯 AI Project Manager activated! Auto-tracking enabled.');
            }
        }
    } else {
        vscode.window.showWarningMessage('⚠️ No AI project detected in current workspace');
    }

    // Set up periodic heartbeat to maintain connection
    const heartbeatInterval = setInterval(async () => {
        if (extension.projectDetector.detectAiProject()) {
            try {
                await connectToDashboard();
            } catch {
                // Silently fail heartbeat
            }
        }
    }, 15000); // Every 15 seconds

    context.subscriptions.push({ dispose: () => clearInterval(heartbeatInterval) });
}

/**
 * Creates a new AI project structure with templates
 */
async function createProjectStructure(workspacePath: string, projectName: string, template: string): Promise<void> {
    const kiroSpecsPath = path.join(workspacePath, '.kiro', 'specs', 'ai-project-manager');
    
    // Create directory structure
    if (!fs.existsSync(kiroSpecsPath)) {
        fs.mkdirSync(kiroSpecsPath, { recursive: true });
    }

    // Create requirements.md
    const requirementsTemplate = getRequirementsTemplate(projectName, template);
    fs.writeFileSync(path.join(kiroSpecsPath, 'requirements.md'), requirementsTemplate);

    // Create design.md
    const designTemplate = getDesignTemplate(projectName, template);
    fs.writeFileSync(path.join(kiroSpecsPath, 'design.md'), designTemplate);

    // Create tasks.md
    const tasksTemplate = getTasksTemplate(projectName, template);
    fs.writeFileSync(path.join(kiroSpecsPath, 'tasks.md'), tasksTemplate);

    // Create initial progress.json
    const initialProgress = {
        totalTasks: 0,
        completedTasks: 0,
        percentage: 0,
        lastUpdated: new Date().toISOString(),
        recentActivity: [],
        milestones: []
    };
    fs.writeFileSync(path.join(kiroSpecsPath, 'progress.json'), JSON.stringify(initialProgress, null, 2));

    // Create context directory
    const contextDir = path.join(workspacePath, '.ai-project', 'context');
    if (!fs.existsSync(contextDir)) {
        fs.mkdirSync(contextDir, { recursive: true });
    }

    // Create sample context document
    const contextTemplate = getContextTemplate(projectName, template);
    fs.writeFileSync(path.join(contextDir, 'project-overview.md'), contextTemplate);
}

/**
 * Repairs missing project files
 */
async function repairProjectStructure(workspacePath: string): Promise<void> {
    const kiroSpecsPath = path.join(workspacePath, '.kiro', 'specs', 'ai-project-manager');
    
    if (!fs.existsSync(kiroSpecsPath)) {
        fs.mkdirSync(kiroSpecsPath, { recursive: true });
    }

    const files = [
        { name: 'requirements.md', template: '# Requirements Document\n\n## Introduction\n\n## Requirements\n' },
        { name: 'design.md', template: '# Design Document\n\n## Overview\n\n## Architecture\n' },
        { name: 'tasks.md', template: '# Implementation Plan\n\n- [ ] 1. Initial setup\n' },
        { name: 'progress.json', template: JSON.stringify({
            totalTasks: 0,
            completedTasks: 0,
            percentage: 0,
            lastUpdated: new Date().toISOString(),
            recentActivity: [],
            milestones: []
        }, null, 2) }
    ];

    for (const file of files) {
        const filePath = path.join(kiroSpecsPath, file.name);
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, file.template);
        }
    }
}

/**
 * Template generators
 */
function getRequirementsTemplate(projectName: string, template: string): string {
    return `# ${projectName} - Requirements Document

## Introduction

${projectName} is a ${template.toLowerCase()} project that aims to...

## Requirements

### Requirement 1

**User Story:** As a user, I want to...

#### Acceptance Criteria

1. WHEN... THEN...
2. WHEN... THEN...

### Requirement 2

**User Story:** As a user, I want to...

#### Acceptance Criteria

1. WHEN... THEN...
2. WHEN... THEN...
`;
}

function getDesignTemplate(projectName: string, template: string): string {
    return `# ${projectName} - Design Document

## Overview

This document outlines the design and architecture for ${projectName}.

## Architecture

### System Architecture

Describe the overall system architecture...

### Technology Stack

- **Frontend:** 
- **Backend:** 
- **Database:** 
- **Deployment:** 

## User Interface Design

### Wireframes

Describe the UI/UX design...

### User Flow

1. User lands on...
2. User navigates to...
3. User completes...
`;
}

function getTasksTemplate(projectName: string, template: string): string {
    const templateTasks = getTemplateSpecificTasks(template);
    
    return `# ${projectName} - Implementation Plan

## Setup and Configuration

- [ ] 1. Set up project structure
  - Create project directories and files
  - Initialize version control
  - Set up development environment
  - Configure build tools and dependencies

${templateTasks}

## Testing and Deployment

- [ ] 10. Implement testing
  - Write unit tests
  - Add integration tests
  - Set up continuous integration

- [ ] 11. Prepare for deployment
  - Configure production environment
  - Set up deployment pipeline
  - Create documentation
`;
}

function getTemplateSpecificTasks(template: string): string {
    switch (template) {
        case 'Web Application':
            return `
## Frontend Development

- [ ] 2. Set up frontend framework
  - Initialize React/Vue/Angular project
  - Configure routing
  - Set up state management
  - Configure styling system

- [ ] 3. Implement core components
  - Create layout components
  - Build reusable UI components
  - Implement navigation
  - Add responsive design

## Backend Development

- [ ] 4. Set up backend API
  - Initialize server framework
  - Configure database connection
  - Set up authentication
  - Create API endpoints

- [ ] 5. Implement business logic
  - Create data models
  - Implement CRUD operations
  - Add validation and error handling
  - Set up middleware
`;

        case 'API/Backend':
            return `
## API Development

- [ ] 2. Design API structure
  - Define API endpoints
  - Create data models
  - Set up database schema
  - Configure authentication

- [ ] 3. Implement core functionality
  - Create CRUD operations
  - Add business logic
  - Implement validation
  - Set up error handling

- [ ] 4. Add advanced features
  - Implement caching
  - Add rate limiting
  - Set up logging
  - Create API documentation
`;

        case 'Mobile App':
            return `
## Mobile Development

- [ ] 2. Set up mobile framework
  - Initialize React Native/Flutter project
  - Configure navigation
  - Set up state management
  - Configure build tools

- [ ] 3. Implement core screens
  - Create main navigation
  - Build key user interfaces
  - Add form handling
  - Implement data persistence

- [ ] 4. Add platform features
  - Integrate device APIs
  - Add push notifications
  - Implement offline support
  - Configure app store deployment
`;

        default:
            return `
## Core Development

- [ ] 2. Implement core functionality
  - Define main features
  - Create core modules
  - Add configuration
  - Set up data handling

- [ ] 3. Add advanced features
  - Implement additional functionality
  - Add integrations
  - Create utilities
  - Optimize performance
`;
    }
}

function getContextTemplate(projectName: string, template: string): string {
    return `# ${projectName} - Project Overview

## Project Description

${projectName} is a ${template.toLowerCase()} project that...

## Key Features

- Feature 1: Description
- Feature 2: Description
- Feature 3: Description

## Technical Details

### Architecture
Brief description of the system architecture...

### Dependencies
List of main dependencies and their purposes...

### Configuration
Important configuration details...

## Development Notes

### Getting Started
Steps to set up the development environment...

### Common Tasks
Frequently used commands and procedures...

### Troubleshooting
Common issues and their solutions...
`;
}

export function deactivate() {
    if (extension?.fileWatcher) {
        extension.fileWatcher.stopWatching();
    }
    
    if (extension?.progressTracker.stopAutoTracking) {
        extension.progressTracker.stopAutoTracking();
    }
    
    if (extension?.contextInjector && 'dispose' in extension.contextInjector) {
        (extension.contextInjector as any).dispose();
    }
}