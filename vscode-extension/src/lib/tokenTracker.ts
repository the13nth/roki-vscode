import * as vscode from 'vscode';

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  timestamp: string;
  projectId: string;
  analysisType: string;
  sessionId: string;
}

export class VSCodeTokenTracker {
  private static instance: VSCodeTokenTracker;
  private sessionId: string;
  private getDashboardUrl(): string {
    const config = vscode.workspace.getConfiguration('aiProjectManager');
    return config.get('dashboardUrl', 'http://localhost:3000');
  }

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  static getInstance(): VSCodeTokenTracker {
    if (!VSCodeTokenTracker.instance) {
      VSCodeTokenTracker.instance = new VSCodeTokenTracker();
    }
    return VSCodeTokenTracker.instance;
  }

  private generateSessionId(): string {
    return `vscode_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    // Using Gemini 1.5 Flash pricing as default
    const inputCost = (inputTokens / 1000) * 0.000125;
    const outputCost = (outputTokens / 1000) * 0.000375;
    return inputCost + outputCost;
  }

  async trackContextInjection(
    projectId: string,
    contextLength: number,
    analysisType: string = 'context-injection'
  ): Promise<void> {
    try {
      // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
      const estimatedTokens = Math.ceil(contextLength / 4);
      
      await this.trackTokenUsage(
        projectId,
        estimatedTokens,
        0, // No output tokens for context injection
        analysisType
      );
    } catch (error) {
      console.error('Error tracking context injection:', error);
    }
  }

  async trackTokenUsage(
    projectId: string,
    inputTokens: number,
    outputTokens: number,
    analysisType: string
  ): Promise<void> {
    try {
      const cost = this.calculateCost(inputTokens, outputTokens);
      const timestamp = new Date().toISOString();

      const tokenUsage: TokenUsage = {
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
    } catch (error) {
      console.error('Error tracking token usage from VS Code:', error);
    }
  }

  private async sendToDashboard(tokenUsage: TokenUsage): Promise<void> {
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
    } catch (error) {
      console.warn('Error sending token usage to dashboard:', error);
    }
  }

  async showUsageSummary(projectId: string): Promise<void> {
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

      const action = await vscode.window.showInformationMessage(
        message,
        'View Details',
        'OK'
      );

      if (action === 'View Details') {
        vscode.env.openExternal(vscode.Uri.parse(`${this.getDashboardUrl()}/profile?tab=usage`));
      }
    } catch (error) {
      vscode.window.showErrorMessage('Error fetching token usage data');
      console.error('Error showing usage summary:', error);
    }
  }
}