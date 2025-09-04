import { ProjectNotification } from '@/types';

export class NotificationService {
  private static async createNotification(notification: Omit<ProjectNotification, 'id' | 'timestamp' | 'isRead'>) {
    try {
      const response = await fetch('/api/user/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification),
      });

      if (!response.ok) {
        console.error('Failed to create notification:', await response.text());
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  // Project-related notifications
  static async notifyProjectCreated(userId: string, projectId: string, projectName: string) {
    await this.createNotification({
      projectId,
      projectName,
      type: 'project_created',
      message: `New project "${projectName}" has been created`,
      metadata: {
        taskCount: 0,
        progress: 0
      }
    });
  }

  static async notifyProjectUpdated(userId: string, projectId: string, projectName: string, metadata?: any) {
    await this.createNotification({
      projectId,
      projectName,
      type: 'project_updated',
      message: `Project "${projectName}" has been updated`,
      metadata
    });
  }

  static async notifyProjectDeleted(userId: string, projectId: string, projectName: string) {
    await this.createNotification({
      projectId,
      projectName,
      type: 'project_deleted',
      message: `Project "${projectName}" has been deleted`,
    });
  }

  static async notifyTaskCompleted(userId: string, projectId: string, projectName: string, taskCount: number, progress: number) {
    await this.createNotification({
      projectId,
      projectName,
      type: 'task_completed',
      message: `Task completed in project "${projectName}"`,
      metadata: {
        taskCount,
        progress
      }
    });
  }

  static async notifyMilestoneReached(userId: string, projectId: string, projectName: string, milestone: string, progress: number) {
    await this.createNotification({
      projectId,
      projectName,
      type: 'milestone_reached',
      message: `Milestone "${milestone}" reached in project "${projectName}"`,
      metadata: {
        progress
      }
    });
  }

  // Team-related notifications
  static async notifyTeamMemberAdded(userId: string, projectId: string, projectName: string, teamMemberEmail: string) {
    await this.createNotification({
      projectId,
      projectName,
      type: 'team_member_added',
      message: `New team member added to project "${projectName}"`,
      metadata: {
        teamMemberEmail
      }
    });
  }

  // Project sharing notifications
  static async notifyProjectShared(userId: string, projectId: string, projectName: string, sharedWithEmail: string) {
    await this.createNotification({
      projectId,
      projectName,
      type: 'project_shared',
      message: `Project "${projectName}" has been shared with ${sharedWithEmail}`,
      metadata: {
        sharedWithEmail
      }
    });
  }

  // Project invitation notifications
  static async notifyProjectInvitation(userId: string, projectId: string, projectName: string, invitedEmail: string, role: string) {
    await this.createNotification({
      projectId,
      projectName,
      type: 'project_invitation',
      message: `You've been invited to join project "${projectName}" as ${role}`,
      metadata: {
        role
      }
    });
  }

  // Batch notifications for multiple users
  static async notifyMultipleUsers(
    userIds: string[],
    notification: Omit<ProjectNotification, 'id' | 'timestamp' | 'isRead'>
  ) {
    const promises = userIds.map(userId => 
      this.createNotification(notification)
    );
    
    await Promise.allSettled(promises);
  }

  // Progress update notifications
  static async notifyProgressUpdate(
    userId: string,
    projectId: string,
    projectName: string,
    oldProgress: number,
    newProgress: number,
    taskCount: number
  ) {
    // Only notify if there's a significant progress change (5% or more)
    if (Math.abs(newProgress - oldProgress) >= 5) {
      await this.createNotification({
        projectId,
        projectName,
        type: 'project_updated',
        message: `Progress updated in project "${projectName}"`,
        metadata: {
          progress: newProgress,
          taskCount
        }
      });
    }
  }
}
