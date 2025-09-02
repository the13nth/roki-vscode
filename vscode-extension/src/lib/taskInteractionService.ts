import * as vscode from 'vscode';

export interface TaskItem {
    id: string;
    title: string;
    status: 'todo' | 'in-progress' | 'done';
    lineNumber: number;
    indentLevel: number;
    parentTask?: string;
    children: TaskItem[];
}

export interface TaskUpdate {
    taskId: string;
    newStatus: 'todo' | 'in-progress' | 'done';
    startedAt?: Date;
    completedAt?: Date;
    notes?: string;
}

export class TaskInteractionService {
    /**
     * Starts a task by copying it to the active chat/editor
     * This works like the "Add to Chat" feature
     */
    async startTask(taskTitle: string): Promise<boolean> {
        try {
            // Format the task for AI chat
            const formattedTask = this.formatTaskForChat(taskTitle);
            
            // Copy to clipboard for easy pasting
            await vscode.env.clipboard.writeText(formattedTask);
            
            // Try to insert directly into active editor if it's a chat-like document
            const success = await this.insertIntoActiveEditor(formattedTask);
            
            if (success) {
                vscode.window.showInformationMessage(`✅ Task "${taskTitle}" added to chat!`);
            } else {
                vscode.window.showInformationMessage(`✅ Task "${taskTitle}" copied to clipboard! Paste it into your chat.`);
            }
            
            return true;
        } catch (error) {
            console.error('Error starting task:', error);
            vscode.window.showErrorMessage(`❌ Failed to start task: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }

    /**
     * Formats a task title for AI chat context
     */
    private formatTaskForChat(taskTitle: string): string {
        const timestamp = new Date().toLocaleString();
        return `🎯 **Starting Task**: ${taskTitle}

**Task Details:**
- **Status**: In Progress
- **Started**: ${timestamp}
- **Priority**: High

**Next Steps:**
Please help me work on this task. I need guidance on:
1. Breaking down the task into smaller steps
2. Identifying potential challenges
3. Suggesting the best approach
4. Providing code examples if applicable

**Current Context:**
I'm working on this as part of my project development. Please provide actionable advice and next steps.`;
    }

    /**
     * Attempts to insert text directly into the active editor
     * This simulates the "Add to Chat" behavior
     */
    private async insertIntoActiveEditor(text: string): Promise<boolean> {
        try {
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor) {
                return false;
            }

            const document = activeEditor.document;
            
            // Check if this looks like a chat document
            if (this.isChatDocument(document)) {
                // Insert at the end of the document
                const lastLine = document.lineAt(document.lineCount - 1);
                const endPosition = lastLine.range.end;
                
                // Add a newline if the document doesn't end with one
                const insertText = document.lineCount > 0 && !lastLine.text.endsWith('\n') ? '\n' + text : text;
                
                await activeEditor.edit(editBuilder => {
                    editBuilder.insert(endPosition, insertText);
                });
                
                // Move cursor to the end
                const newPosition = new vscode.Position(document.lineCount, 0);
                activeEditor.selection = new vscode.Selection(newPosition, newPosition);
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error inserting into editor:', error);
            return false;
        }
    }

    /**
     * Determines if a document is likely a chat document
     */
    private isChatDocument(document: vscode.TextDocument): boolean {
        const fileName = document.fileName.toLowerCase();
        const content = document.getText().toLowerCase();
        
        // Check file name patterns
        const chatFileNamePatterns = [
            /chat/i,
            /copilot/i,
            /ai.*conversation/i,
            /untitled.*\d+/i,
            /conversation/i,
            /assistant/i
        ];
        
        // Check content patterns
        const chatContentPatterns = [
            /user:/i,
            /assistant:/i,
            /ai:/i,
            /bot:/i,
            /help me/i,
            /can you/i,
            /please/i
        ];
        
        const hasChatFileName = chatFileNamePatterns.some(pattern => pattern.test(fileName));
        const hasChatContent = chatContentPatterns.some(pattern => pattern.test(content));
        
        // Also consider empty or short documents as potential chat documents
        const isShortDocument = document.lineCount <= 5;
        const isEmptyDocument = document.getText().trim().length === 0;
        
        return hasChatFileName || hasChatContent || (isShortDocument && isEmptyDocument);
    }

    /**
     * Completes a task by copying completion message to chat
     */
    async completeTask(taskTitle: string): Promise<boolean> {
        try {
            const completionMessage = this.formatTaskCompletion(taskTitle);
            
            // Copy to clipboard
            await vscode.env.clipboard.writeText(completionMessage);
            
            // Try to insert into active editor
            const success = await this.insertIntoActiveEditor(completionMessage);
            
            if (success) {
                vscode.window.showInformationMessage(`✅ Task completion message added to chat!`);
            } else {
                vscode.window.showInformationMessage(`✅ Task completion message copied to clipboard!`);
            }
            
            return true;
        } catch (error) {
            console.error('Error completing task:', error);
            vscode.window.showErrorMessage(`❌ Failed to complete task: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }

    /**
     * Formats a task completion message for chat
     */
    private formatTaskCompletion(taskTitle: string): string {
        const timestamp = new Date().toLocaleString();
        return `✅ **Task Completed**: ${taskTitle}

**Completion Details:**
- **Status**: Completed
- **Finished**: ${timestamp}
- **Next**: Ready for next task

**Summary:**
This task has been successfully completed. I'm ready to move on to the next item in my project.`;
    }

    /**
     * Resets a task by copying reset message to chat
     */
    async resetTask(taskTitle: string): Promise<boolean> {
        try {
            const resetMessage = this.formatTaskReset(taskTitle);
            
            // Copy to clipboard
            await vscode.env.clipboard.writeText(resetMessage);
            
            // Try to insert into active editor
            const success = await this.insertIntoActiveEditor(resetMessage);
            
            if (success) {
                vscode.window.showInformationMessage(`🔄 Task reset message added to chat!`);
            } else {
                vscode.window.showInformationMessage(`🔄 Task reset message copied to clipboard!`);
            }
            
            return true;
        } catch (error) {
            console.error('Error resetting task:', error);
            vscode.window.showErrorMessage(`❌ Failed to reset task: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }

    /**
     * Formats a task reset message for chat
     */
    private formatTaskReset(taskTitle: string): string {
        const timestamp = new Date().toLocaleString();
        return `🔄 **Task Reset**: ${taskTitle}

**Reset Details:**
- **Status**: Reset to TODO
- **Reset Time**: ${timestamp}
- **Reason**: Task needs to be restarted

**Next Steps:**
I've reset this task. I may need to:
1. Reassess the approach
2. Break it down differently
3. Get additional guidance
4. Start fresh with new insights

**Current Status:**
Ready to begin this task again with a fresh perspective.`;
    }

    /**
     * Gets all uncompleted tasks from the current workspace
     * This is a simplified version that doesn't parse local files
     */
    getUncompletedTasks(): TaskItem[] {
        // Since we're not parsing local files, return a simple structure
        // The actual task data will come from the UI
        return [];
    }

    /**
     * Parses tasks from the current editor content
     * This is used when the custom editor is active
     */
    parseTasksFromContent(content: string): TaskItem[] {
        try {
            const lines = content.split('\n');
            const tasks: TaskItem[] = [];
            const taskStack: TaskItem[] = [];

            lines.forEach((line, index) => {
                const trimmedLine = line.trim();
                
                // Skip empty lines and non-task lines
                if (!trimmedLine || !trimmedLine.startsWith('- [')) {
                    return;
                }

                // Parse task line: - [ ] Task title or - [x] Task title
                const taskMatch = trimmedLine.match(/^- \[([ x])\] (.+)$/);
                if (!taskMatch) {
                    return;
                }

                const isCompleted = taskMatch[1] === 'x';
                const taskTitle = taskMatch[2];
                const indentLevel = (line.length - line.trimStart().length) / 2;
                
                const task: TaskItem = {
                    id: this.generateTaskId(taskTitle, index),
                    title: taskTitle,
                    status: isCompleted ? 'done' : 'todo',
                    lineNumber: index + 1,
                    indentLevel,
                    children: []
                };

                // Handle task hierarchy
                if (indentLevel === 0) {
                    // Root level task
                    tasks.push(task);
                    taskStack.length = 0;
                    taskStack.push(task);
                } else {
                    // Child task
                    const parentLevel = indentLevel - 1;
                    let parent = taskStack[parentLevel];
                    
                    if (parent) {
                        parent.children.push(task);
                        task.parentTask = parent.id;
                        taskStack[indentLevel] = task;
                    } else {
                        // Fallback: add to root if parent not found
                        tasks.push(task);
                        taskStack[indentLevel] = task;
                    }
                }
            });

            return tasks;
        } catch (error) {
            console.error('Error parsing tasks from content:', error);
            return [];
        }
    }

    /**
     * Generates a unique ID for a task based on title and line number
     */
    private generateTaskId(title: string, lineNumber: number): string {
        return `task_${lineNumber}_${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    }
}

