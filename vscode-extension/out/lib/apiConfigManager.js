"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiConfigManager = void 0;
const vscode = require("vscode");
const projectDetector_1 = require("./projectDetector");
class ApiConfigManager {
    getDashboardUrl() {
        const config = vscode.workspace.getConfiguration('aiProjectManager');
        return config.get('dashboardUrl', 'http://localhost:3000');
    }
    constructor() {
        this.projectDetector = new projectDetector_1.ProjectDetectorImpl();
    }
    static getInstance() {
        if (!ApiConfigManager.instance) {
            ApiConfigManager.instance = new ApiConfigManager();
        }
        return ApiConfigManager.instance;
    }
    /**
     * Gets the appropriate API configuration for the current project
     * Respects the user's API key selection (personal vs app default)
     */
    async getProjectApiConfig() {
        try {
            if (!this.projectDetector.detectAiProject()) {
                throw new Error('No AI project detected');
            }
            const structure = this.projectDetector.getProjectStructure();
            const projectId = await this.getProjectId(structure.configPath);
            if (!projectId) {
                console.warn('No project ID found, cannot get API configuration');
                return null;
            }
            // Get the API configuration from the dashboard
            // This will automatically respect the user's API key selection
            const response = await fetch(`${this.getDashboardUrl()}/api/projects/${projectId}/api-config`);
            if (!response.ok) {
                console.warn('Failed to get project API configuration:', response.statusText);
                return null;
            }
            const config = await response.json();
            // Validate that we have a complete configuration
            if (!config.provider || !config.apiKey || !config.model) {
                console.warn('Incomplete API configuration received');
                return null;
            }
            return config;
        }
        catch (error) {
            console.error('Error getting project API configuration:', error);
            return null;
        }
    }
    /**
     * Gets the API key selection for the current project
     */
    async getApiKeySelection() {
        try {
            if (!this.projectDetector.detectAiProject()) {
                throw new Error('No AI project detected');
            }
            const structure = this.projectDetector.getProjectStructure();
            const projectId = await this.getProjectId(structure.configPath);
            if (!projectId) {
                return null;
            }
            const response = await fetch(`${this.getDashboardUrl()}/api/projects/${projectId}/api-key-selection`);
            if (!response.ok) {
                console.warn('Failed to get API key selection:', response.statusText);
                return null;
            }
            return await response.json();
        }
        catch (error) {
            console.error('Error getting API key selection:', error);
            return null;
        }
    }
    /**
     * Sets the API key selection for the current project
     */
    async setApiKeySelection(usePersonalApiKey) {
        try {
            if (!this.projectDetector.detectAiProject()) {
                throw new Error('No AI project detected');
            }
            const structure = this.projectDetector.getProjectStructure();
            const projectId = await this.getProjectId(structure.configPath);
            if (!projectId) {
                return false;
            }
            const response = await fetch(`${this.getDashboardUrl()}/api/projects/${projectId}/api-key-selection`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ usePersonalApiKey })
            });
            if (!response.ok) {
                console.error('Failed to set API key selection:', response.statusText);
                return false;
            }
            return true;
        }
        catch (error) {
            console.error('Error setting API key selection:', error);
            return false;
        }
    }
    /**
     * Tests the current API configuration
     */
    async testApiConfiguration() {
        try {
            if (!this.projectDetector.detectAiProject()) {
                throw new Error('No AI project detected');
            }
            const structure = this.projectDetector.getProjectStructure();
            const projectId = await this.getProjectId(structure.configPath);
            if (!projectId) {
                return { success: false, message: 'No project ID found' };
            }
            const response = await fetch(`${this.getDashboardUrl()}/api/projects/${projectId}/api-test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            const result = await response.json();
            if (response.ok) {
                return { success: true, message: result.message || 'API connection successful' };
            }
            else {
                return { success: false, message: result.error || 'API connection failed' };
            }
        }
        catch (error) {
            return {
                success: false,
                message: `Error testing API configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    /**
     * Shows API configuration status in VS Code
     */
    async showApiConfigStatus() {
        try {
            const config = await this.getProjectApiConfig();
            const selection = await this.getApiKeySelection();
            if (!config) {
                vscode.window.showWarningMessage('No API configuration found for this project');
                return;
            }
            const keySource = selection?.usePersonalApiKey ? 'Personal' : 'App Default';
            const message = `API Config: ${config.provider} (${config.model}) - Using ${keySource} Key`;
            const action = await vscode.window.showInformationMessage(message, 'Test Connection', 'Switch Key Type', 'Open Dashboard');
            switch (action) {
                case 'Test Connection':
                    await this.testAndShowResult();
                    break;
                case 'Switch Key Type':
                    await this.showApiKeySelectionDialog();
                    break;
                case 'Open Dashboard':
                    vscode.env.openExternal(vscode.Uri.parse(`${this.getDashboardUrl()}/project/${await this.getProjectId()}/api`));
                    break;
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to get API configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Shows a dialog to switch between personal and app API keys
     */
    async showApiKeySelectionDialog() {
        try {
            const selection = await this.getApiKeySelection();
            const currentSelection = selection?.usePersonalApiKey ? 'Personal API Key' : 'App Default Key';
            const choice = await vscode.window.showQuickPick([
                {
                    label: 'Personal API Key',
                    description: 'Use your personal API key configured in your profile',
                    picked: selection?.usePersonalApiKey === true
                },
                {
                    label: 'App Default Key',
                    description: 'Use the application\'s default API key',
                    picked: selection?.usePersonalApiKey === false
                }
            ], {
                placeHolder: `Current selection: ${currentSelection}`,
                title: 'Select API Key Type'
            });
            if (choice) {
                const usePersonalApiKey = choice.label === 'Personal API Key';
                const success = await this.setApiKeySelection(usePersonalApiKey);
                if (success) {
                    vscode.window.showInformationMessage(`Switched to ${choice.label}`);
                }
                else {
                    vscode.window.showErrorMessage('Failed to update API key selection');
                }
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to switch API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Tests API configuration and shows result
     */
    async testAndShowResult() {
        const result = await this.testApiConfiguration();
        if (result.success) {
            vscode.window.showInformationMessage(`✅ ${result.message}`);
        }
        else {
            vscode.window.showErrorMessage(`❌ ${result.message}`);
        }
    }
    /**
     * Gets project ID from config file
     */
    async getProjectId(configPath) {
        try {
            if (!configPath) {
                const structure = this.projectDetector.getProjectStructure();
                configPath = structure.configPath;
            }
            const fs = require('fs');
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
exports.ApiConfigManager = ApiConfigManager;
//# sourceMappingURL=apiConfigManager.js.map