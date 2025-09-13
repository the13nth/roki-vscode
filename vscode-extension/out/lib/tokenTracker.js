"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VSCodeTokenTracker = void 0;
const vscode = require("vscode");
class VSCodeTokenTracker {
    getDashboardUrl() {
        const config = vscode.workspace.getConfiguration('aiProjectManager');
        return config.get('dashboardUrl', 'http://localhost:3000');
    }
    constructor() {
        this.sessionId = this.generateSessionId();
    }
    static getInstance() {
        if (!VSCodeTokenTracker.instance) {
            VSCodeTokenTracker.instance = new VSCodeTokenTracker();
        }
        return VSCodeTokenTracker.instance;
    }
    generateSessionId() {
        return `vscode_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    calculateCost(inputTokens, outputTokens) {
        // Using Gemini 1.5 Flash pricing as default
        const inputCost = (inputTokens / 1000) * 0.000125;
        const outputCost = (outputTokens / 1000) * 0.000375;
        return inputCost + outputCost;
    }
    async trackContextInjection(projectId, contextLength, analysisType = 'context-injection') {
        try {
            // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
            const estimatedTokens = Math.ceil(contextLength / 4);
            await this.trackTokenUsage(projectId, estimatedTokens, 0, // No output tokens for context injection
            analysisType);
        }
        catch (error) {
            console.error('Error tracking context injection:', error);
        }
    }
    async trackTokenUsage(projectId, inputTokens, outputTokens, analysisType) {
        try {
            const cost = this.calculateCost(inputTokens, outputTokens);
            const timestamp = new Date().toISOString();
            const tokenUsage = {
                inputTokens,
                outputTokens,
                totalTokens: inputTokens + outputTokens,
                cost,
                timestamp,
                projectId,
                analysisType,
                sessionId: this.sessionId
            };
            // Send to dashboard API
            await this.sendToDashboard(tokenUsage);
            console.log('Token usage tracked from VS Code:', tokenUsage);
        }
        catch (error) {
            console.error('Error tracking token usage from VS Code:', error);
        }
    }
    async sendToDashboard(tokenUsage) {
        try {
            const response = await fetch(`${this.getDashboardUrl()}/api/token-usage/track`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(tokenUsage)
            });
            if (!response.ok) {
                console.warn('Failed to send token usage to dashboard:', response.statusText);
            }
        }
        catch (error) {
            console.warn('Error sending token usage to dashboard:', error);
        }
    }
    async showUsageSummary(projectId) {
        try {
            const response = await fetch(`${this.getDashboardUrl()}/api/token-usage?projectId=${projectId}&timeRange=7d`);
            if (!response.ok) {
                vscode.window.showErrorMessage('Failed to fetch token usage data');
                return;
            }
            const data = await response.json();
            const totals = data.totals;
            const message = `Token Usage (Last 7 days):
Total Tokens: ${totals.totalTokens.toLocaleString()}
Total Cost: $${totals.totalCost.toFixed(4)}
Requests: ${totals.requestCount}
Sessions: ${totals.uniqueSessions}`;
            const action = await vscode.window.showInformationMessage(message, 'View Details', 'OK');
            if (action === 'View Details') {
                vscode.env.openExternal(vscode.Uri.parse(`${this.getDashboardUrl()}/profile?tab=usage`));
            }
        }
        catch (error) {
            vscode.window.showErrorMessage('Error fetching token usage data');
            console.error('Error showing usage summary:', error);
        }
    }
}
exports.VSCodeTokenTracker = VSCodeTokenTracker;
//# sourceMappingURL=tokenTracker.js.map