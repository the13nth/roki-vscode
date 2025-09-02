"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const vscode = require("vscode");
class AuthService {
    static getInstance() {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }
    constructor() {
        // No initialization needed - settings are accessed on demand
    }
    getConfig() {
        return vscode.workspace.getConfiguration('aiProjectManager');
    }
    async updateUserSettings(user) {
        const config = this.getConfig();
        await config.update('userId', user.id, vscode.ConfigurationTarget.Global);
        await config.update('userEmail', user.email, vscode.ConfigurationTarget.Global);
        await config.update('userName', user.name, vscode.ConfigurationTarget.Global);
    }
    async clearUserSettings() {
        const config = this.getConfig();
        await config.update('userId', '', vscode.ConfigurationTarget.Global);
        await config.update('userEmail', '', vscode.ConfigurationTarget.Global);
        await config.update('userName', '', vscode.ConfigurationTarget.Global);
        await config.update('authToken', '', vscode.ConfigurationTarget.Global);
    }
    async login() {
        try {
            const config = this.getConfig();
            const dashboardUrl = config.get('dashboardUrl', 'http://localhost:3000');
            // Show input box for the user to paste the auth token
            const authToken = await vscode.window.showInputBox({
                prompt: '🔑 Authentication Token Required',
                placeHolder: 'Paste the token from the browser here...',
                password: true,
                ignoreFocusOut: true,
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Please paste a valid authentication token';
                    }
                    return null;
                }
            });
            if (!authToken) {
                return false;
            }
            // Show loading message
            vscode.window.showInformationMessage('🔍 Verifying token...');
            // Verify the token with the dashboard
            const response = await fetch(`${dashboardUrl}/api/auth/verify-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                }
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Token verification failed: ${response.status} ${response.statusText}`);
            }
            const userData = await response.json();
            const user = {
                id: userData.userId,
                email: userData.email,
                name: userData.name,
                accessToken: authToken
            };
            // Save token and user info to settings
            await config.update('authToken', authToken, vscode.ConfigurationTarget.Global);
            await this.updateUserSettings(user);
            vscode.window.showInformationMessage(`✅ Successfully logged in as ${user.name}`);
            return true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Login failed';
            vscode.window.showErrorMessage(`Login failed: ${errorMessage}`);
            return false;
        }
    }
    async logout() {
        await this.clearUserSettings();
        vscode.window.showInformationMessage('Successfully logged out');
    }
    isAuthenticated() {
        const config = this.getConfig();
        const token = config.get('authToken', '');
        // Only check for token - userId might not be set immediately
        return token.length > 0;
    }
    getCurrentUser() {
        if (!this.isAuthenticated()) {
            return null;
        }
        const config = this.getConfig();
        return {
            id: config.get('userId', ''),
            email: config.get('userEmail', ''),
            name: config.get('userName', ''),
            accessToken: config.get('authToken', '')
        };
    }
    async refreshUserDetails() {
        try {
            if (!this.isAuthenticated()) {
                return null;
            }
            const config = this.getConfig();
            const dashboardUrl = config.get('dashboardUrl', 'http://localhost:3000');
            const token = config.get('authToken', '');
            // Fetch current user details from the dashboard
            const response = await fetch(`${dashboardUrl}/api/auth/verify-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch user details: ${response.status} ${response.statusText}`);
            }
            const userData = await response.json();
            const user = {
                id: userData.userId,
                email: userData.email,
                name: userData.name,
                accessToken: token
            };
            // Update local settings with fresh user data
            await this.updateUserSettings(user);
            return user;
        }
        catch (error) {
            console.error('Failed to refresh user details:', error);
            return null;
        }
    }
    getAuthHeaders() {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated');
        }
        const config = this.getConfig();
        const token = config.get('authToken', '');
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }
    async makeAuthenticatedRequest(url, options = {}) {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated');
        }
        const headers = {
            ...this.getAuthHeaders(),
            ...options.headers
        };
        return fetch(url, {
            ...options,
            headers
        });
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=authService.js.map