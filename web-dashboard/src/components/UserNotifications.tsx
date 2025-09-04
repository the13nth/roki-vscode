'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { ProjectNotification, UserNotificationPreferences } from '@/types';
import { Bell, Settings, CheckCircle, Circle, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

export function UserNotifications() {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<ProjectNotification[]>([]);
  const [preferences, setPreferences] = useState<UserNotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();
      loadPreferences();
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/user/notifications');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotifications(data.notifications || []);
        }
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/user/notification-preferences');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPreferences(data.preferences);
        }
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/user/notifications/${notificationId}/read`, {
        method: 'POST',
      });
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        );
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/user/notifications/${notificationId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const updatePreference = async (key: keyof UserNotificationPreferences, value: any) => {
    if (!preferences) return;

    const updatedPreferences = { ...preferences, [key]: value };
    setPreferences(updatedPreferences);

    try {
      const response = await fetch('/api/user/notification-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPreferences),
      });
      if (!response.ok) {
        // Revert on failure
        setPreferences(preferences);
      }
    } catch (error) {
      console.error('Failed to update preference:', error);
      setPreferences(preferences);
    }
  };

  const getNotificationIcon = (type: ProjectNotification['type']) => {
    switch (type) {
      case 'project_created':
        return <Circle className="w-4 h-4 text-green-500" />;
      case 'project_updated':
        return <RefreshCw className="w-4 h-4 text-blue-500" />;
      case 'task_completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'milestone_reached':
        return <CheckCircle className="w-4 h-4 text-purple-600" />;
      case 'team_member_added':
        return <Circle className="w-4 h-4 text-blue-600" />;
      case 'project_shared':
        return <Circle className="w-4 h-4 text-orange-600" />;
      default:
        return <Circle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getNotificationTypeLabel = (type: ProjectNotification['type']) => {
    switch (type) {
      case 'project_created': return 'Project Created';
      case 'project_updated': return 'Project Updated';
      case 'project_deleted': return 'Project Deleted';
      case 'task_completed': return 'Task Completed';
      case 'milestone_reached': return 'Milestone Reached';
      case 'team_member_added': return 'Team Member Added';
      case 'project_shared': return 'Project Shared';
      default: return 'Update';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Bell className="w-6 h-6 text-gray-700" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
            <p className="text-gray-600">Stay updated on your projects and team activities</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {unreadCount > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {unreadCount} unread
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreferences(!showPreferences)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Preferences
          </Button>
        </div>
      </div>

      {/* Notification Preferences */}
      {showPreferences && (
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>
              Customize how and when you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Email Notifications</span>
                <Switch
                  checked={preferences?.emailNotifications || false}
                  onCheckedChange={(checked) => updatePreference('emailNotifications', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Project Updates</span>
                <Switch
                  checked={preferences?.projectUpdates || false}
                  onCheckedChange={(checked) => updatePreference('projectUpdates', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Task Completions</span>
                <Switch
                  checked={preferences?.taskCompletions || false}
                  onCheckedChange={(checked) => updatePreference('taskCompletions', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Team Changes</span>
                <Switch
                  checked={preferences?.teamChanges || false}
                  onCheckedChange={(checked) => updatePreference('teamChanges', checked)}
                />
              </div>
            </div>
            <Separator />
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium">Digest Frequency:</span>
              <Select
                value={preferences?.digestFrequency || 'daily'}
                onValueChange={(value) => updatePreference('digestFrequency', value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your project updates and team activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No notifications yet</p>
              <p className="text-sm">You'll see updates here when you create projects or make changes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start space-x-3 p-3 rounded-lg border ${
                    notification.isRead ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {getNotificationTypeLabel(notification.type)}
                      </Badge>
                      {!notification.isRead && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                          New
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {notification.projectName}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    {notification.metadata && (
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        {notification.metadata.progress !== undefined && (
                          <span>Progress: {notification.metadata.progress}%</span>
                        )}
                        {notification.metadata.taskCount !== undefined && (
                          <span>Tasks: {notification.metadata.taskCount}</span>
                        )}
                        {notification.metadata.teamMemberEmail && (
                          <span>Added: {notification.metadata.teamMemberEmail}</span>
                        )}
                        {notification.metadata.sharedWithEmail && (
                          <span>Shared with: {notification.metadata.sharedWithEmail}</span>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {formatDate(notification.timestamp)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        Mark as read
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNotification(notification.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
