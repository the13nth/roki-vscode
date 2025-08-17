"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectLoader = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const authService_1 = require("./authService");
class ProjectLoader {
    static getInstance() {
        if (!ProjectLoader.instance) {
            ProjectLoader.instance = new ProjectLoader();
        }
        return ProjectLoader.instance;
    }
    constructor() {
        this.authService = authService_1.AuthService.getInstance();
    }
    async listUserProjects() {
        if (!this.authService.isAuthenticated()) {
            throw new Error('Not authenticated');
        }
        const config = vscode.workspace.getConfiguration('aiProjectManager');
        const dashboardUrl = config.get('dashboardUrl', 'http://localhost:3000');
        console.log('Fetching projects from:', `${dashboardUrl}/api/vscode/projects`);
        // First, let's test if the server is reachable
        try {
            const testResponse = await fetch(`${dashboardUrl}/api/auth/verify-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authService.getCurrentUser()?.accessToken || ''}`
                }
            });
            console.log('Server test response:', testResponse.status);
        }
        catch (error) {
            console.error('Server test failed:', error);
            throw new Error(`Cannot reach the dashboard server at ${dashboardUrl}. Please make sure the server is running.`);
        }
        const response = await this.authService.makeAuthenticatedRequest(`${dashboardUrl}/api/vscode/projects`);
        console.log('Response status:', response.status, response.statusText);
        if (!response.ok) {
            // Try to get the response text to see what's being returned
            const responseText = await response.text();
            console.error('Error response body:', responseText);
            if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
                throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}. This might be an authentication issue or the server is not running.`);
            }
            throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText}`);
        }
        const responseText = await response.text();
        console.log('Response body:', responseText);
        let projects;
        try {
            projects = JSON.parse(responseText);
        }
        catch (parseError) {
            console.error('Failed to parse JSON:', parseError);
            console.error('Response text:', responseText);
            throw new Error(`Invalid JSON response from server: ${responseText.substring(0, 100)}...`);
        }
        if (!Array.isArray(projects)) {
            throw new Error(`Expected array of projects, got: ${typeof projects}`);
        }
        return projects.map((project) => ({
            id: project.id || project._id,
            name: project.name,
            description: project.description || '',
            lastModified: new Date(project.lastModified || project.updatedAt || Date.now()),
            progress: project.progress || 0
        }));
    }
    async loadProjectToWorkspace(projectId) {
        if (!this.authService.isAuthenticated()) {
            throw new Error('Not authenticated');
        }
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder open. Please open a folder first.');
        }
        const config = vscode.workspace.getConfiguration('aiProjectManager');
        const dashboardUrl = config.get('dashboardUrl', 'http://localhost:3000');
        // Fetch project data
        const response = await this.authService.makeAuthenticatedRequest(`${dashboardUrl}/api/projects/${projectId}/export`);
        if (!response.ok) {
            throw new Error(`Failed to load project: ${response.statusText}`);
        }
        const projectData = await response.json();
        const projectFiles = projectData.files;
        // Create project structure in workspace
        await this.createProjectStructure(workspaceFolder.uri.fsPath, projectData.project, projectFiles);
        vscode.window.showInformationMessage(`✅ Project "${projectData.project.name}" loaded successfully!`);
    }
    async createProjectStructure(workspacePath, project, files) {
        // Create .kiro/specs/ai-project-manager directory
        const kiroSpecsPath = path.join(workspacePath, '.kiro', 'specs', 'ai-project-manager');
        if (!fs.existsSync(kiroSpecsPath)) {
            fs.mkdirSync(kiroSpecsPath, { recursive: true });
        }
        // Create .ai-project directory for compatibility
        const aiProjectPath = path.join(workspacePath, '.ai-project');
        if (!fs.existsSync(aiProjectPath)) {
            fs.mkdirSync(aiProjectPath, { recursive: true });
        }
        // Get current user information if authenticated
        const authService = authService_1.AuthService.getInstance();
        const currentUser = authService.getCurrentUser();
        // Enhance config with user information if not already present
        let enhancedConfig = { ...files.config };
        if (currentUser && !enhancedConfig.userId) {
            enhancedConfig = {
                ...enhancedConfig,
                userId: currentUser.id,
                userEmail: currentUser.email,
                userName: currentUser.name,
                lastModifiedBy: currentUser.email,
                lastModified: new Date().toISOString()
            };
        }
        // Write project files
        fs.writeFileSync(path.join(kiroSpecsPath, 'requirements.md'), files.requirements);
        fs.writeFileSync(path.join(kiroSpecsPath, 'design.md'), files.design);
        fs.writeFileSync(path.join(kiroSpecsPath, 'tasks.md'), files.tasks);
        // Write enhanced config to both locations
        const configContent = JSON.stringify(enhancedConfig, null, 2);
        fs.writeFileSync(path.join(kiroSpecsPath, 'config.json'), configContent);
        fs.writeFileSync(path.join(aiProjectPath, 'config.json'), configContent);
        // Create context directory and files
        const contextDir = path.join(aiProjectPath, 'context');
        if (!fs.existsSync(contextDir)) {
            fs.mkdirSync(contextDir, { recursive: true });
        }
        // Write context documents
        for (const doc of files.contextDocs) {
            const docPath = path.join(contextDir, doc.filename);
            fs.writeFileSync(docPath, doc.content);
        }
        // Create initial progress.json with user information
        const initialProgress = {
            totalTasks: 0,
            completedTasks: 0,
            percentage: 0,
            lastUpdated: new Date().toISOString(),
            recentActivity: [],
            milestones: [],
            // Include user information if authenticated
            ...(currentUser && {
                lastUpdatedBy: currentUser.email,
                createdBy: currentUser.email
            })
        };
        fs.writeFileSync(path.join(kiroSpecsPath, 'progress.json'), JSON.stringify(initialProgress, null, 2));
        fs.writeFileSync(path.join(aiProjectPath, 'progress.json'), JSON.stringify(initialProgress, null, 2));
    }
    async showProjectPicker() {
        try {
            const projects = await this.listUserProjects();
            if (projects.length === 0) {
                vscode.window.showInformationMessage('No projects found. Create a project first using the web dashboard.', 'Open Dashboard').then(choice => {
                    if (choice === 'Open Dashboard') {
                        const config = vscode.workspace.getConfiguration('aiProjectManager');
                        const dashboardUrl = config.get('dashboardUrl', 'http://localhost:3000');
                        vscode.env.openExternal(vscode.Uri.parse(dashboardUrl));
                    }
                });
                return undefined;
            }
            const quickPickItems = projects.map(project => ({
                label: project.name,
                description: project.description,
                detail: `Last modified: ${project.lastModified.toLocaleDateString()} • Progress: ${project.progress}%`,
                projectId: project.id
            }));
            const selected = await vscode.window.showQuickPick(quickPickItems, {
                placeHolder: 'Select a project to load into this workspace',
                matchOnDescription: true,
                matchOnDetail: true
            });
            return selected?.projectId;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load projects';
            vscode.window.showErrorMessage(`Failed to load projects: ${errorMessage}`);
            return undefined;
        }
    }
    async getProjectDetails(projectId) {
        try {
            if (!this.authService.isAuthenticated()) {
                throw new Error('Not authenticated');
            }
            const config = vscode.workspace.getConfiguration('aiProjectManager');
            const dashboardUrl = config.get('dashboardUrl', 'http://localhost:3000');
            const response = await this.authService.makeAuthenticatedRequest(`${dashboardUrl}/api/projects/${projectId}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch project details: ${response.status} ${response.statusText}`);
            }
            const project = await response.json();
            return {
                name: project.name,
                description: project.description,
                requirements: project.requirements
            };
        }
        catch (error) {
            console.error('Error fetching project details:', error);
            return null;
        }
    }
}
exports.ProjectLoader = ProjectLoader;
//# sourceMappingURL=projectLoader.js.map