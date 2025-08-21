'use client';

import React from 'react';
import { ActivityItem } from '../types/shared';

interface ActivityTimelineProps {
  activities: ActivityItem[];
  maxItems?: number;
}

export function ActivityTimeline({ activities, maxItems = 10 }: ActivityTimelineProps) {
  const displayActivities = activities.slice(0, maxItems);

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const getCompletionIcon = (completedBy: 'manual' | 'auto-detection') => {
    if (completedBy === 'auto-detection') {
      return (
        <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
      );
    } else {
      return (
        <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    }
  };

  if (displayActivities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-sm">No recent activity</p>
        <p className="text-xs text-gray-400 mt-1">Complete some tasks to see activity here</p>
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {displayActivities.map((activity, index) => (
          <li key={`${activity.taskId}-${activity.completedAt.getTime()}`}>
            <div className="relative pb-8">
              {index !== displayActivities.length - 1 && (
                <span
                  className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                  aria-hidden="true"
                />
              )}
              <div className="relative flex space-x-3">
                {getCompletionIcon(activity.completedBy)}
                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                  <div>
                    <p className="text-sm text-gray-900 font-medium">
                      Task completed: {activity.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {activity.completedBy === 'auto-detection' ? (
                        <span className="inline-flex items-center">
                          <span className="w-2 h-2 bg-purple-400 rounded-full mr-1"></span>
                          Auto-detected
                        </span>
                      ) : (
                        <span className="inline-flex items-center">
                          <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                          Manual completion
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right text-xs text-gray-500 whitespace-nowrap">
                    {activity.completedAt && activity.completedAt instanceof Date && !isNaN(activity.completedAt.getTime()) ? (
                      <time dateTime={activity.completedAt.toISOString()}>
                        {formatTimeAgo(activity.completedAt)}
                      </time>
                    ) : (
                      <span>Unknown time</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ActivitySummaryProps {
  activities: ActivityItem[];
  days?: number;
}

export function ActivitySummary({ activities, days = 7 }: ActivitySummaryProps) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const recentActivities = activities.filter(
    activity => new Date(activity.completedAt) >= cutoffDate
  );
  
  const manualCompletions = recentActivities.filter(
    activity => activity.completedBy === 'manual'
  ).length;
  
  const autoCompletions = recentActivities.filter(
    activity => activity.completedBy === 'auto-detection'
  ).length;
  
  const velocity = recentActivities.length / days;

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h4 className="text-sm font-medium text-gray-900 mb-3">
        Activity Summary ({days} days)
      </h4>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{manualCompletions}</div>
          <div className="text-xs text-gray-500">Manual</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{autoCompletions}</div>
          <div className="text-xs text-gray-500">Auto-detected</div>
        </div>
      </div>
      
      <div className="border-t border-gray-200 pt-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Velocity</span>
          <span className="text-sm font-medium text-gray-900">
            {velocity.toFixed(1)} tasks/day
          </span>
        </div>
      </div>
    </div>
  );
}