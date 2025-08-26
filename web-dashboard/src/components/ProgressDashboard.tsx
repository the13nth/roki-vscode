'use client';

import React, { useState, useEffect } from 'react';
import { CornerBrackets } from '@/components/ui/corner-brackets';
import { ProgressData, ActivityItem, Milestone } from '../types/shared';
import { ProgressBar, CircularProgress, MilestoneProgress } from './ProgressBar';
import { ActivityTimeline, ActivitySummary } from './ActivityTimeline';
import { ProgressCharts } from './ProgressCharts';

interface ProgressDashboardProps {
  projectId: string;
}

interface ProgressStats {
  progress: ProgressData;
  tasks: Array<{
    id: string;
    title: string;
    isCompleted: boolean;
    isSubtask: boolean;
  }>;
  velocity: number;
  estimatedCompletion: Date | null;
}

export function ProgressDashboard({ projectId }: ProgressDashboardProps) {
  const [progressStats, setProgressStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'charts' | 'milestones'>('overview');

  useEffect(() => {
    fetchProgressStats();
  }, [projectId]);

  const fetchProgressStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/projects/${projectId}/progress`);
      const result = await response.json();
      
      if (result.success) {
        // Convert date strings back to Date objects
        const data = result.data;
        data.progress.lastUpdated = new Date(data.progress.lastUpdated);
        data.progress.recentActivity = data.progress.recentActivity.map((activity: any) => ({
          ...activity,
          completedAt: activity.completedAt ? new Date(activity.completedAt) : new Date()
        }));
        
        if (data.estimatedCompletion) {
          data.estimatedCompletion = new Date(data.estimatedCompletion);
        }
        
        setProgressStats(data);
      } else {
        // If progress data doesn't exist, try to initialize it
        if (result.error && result.error.includes('progress data')) {
          console.log('Attempting to initialize progress data...');
          const initResponse = await fetch(`/api/projects/${projectId}/progress`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'initialize' }),
          });
          
          const initResult = await initResponse.json();
          if (initResult.success) {
            // Retry fetching after initialization
            await fetchProgressStats();
            return;
          }
        }
        
        setError(result.error || 'Failed to fetch progress stats');
      }
    } catch (err) {
      setError(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Error fetching progress stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskToggle = async (taskId: string, isCompleted: boolean) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId,
          isCompleted
        }),
      });

      const result = await response.json();
      if (result.success) {
        // Update local state
        setProgressStats(prev => {
          if (!prev) return prev;
          
          return {
            ...prev,
            progress: {
              ...result.data,
              lastUpdated: new Date(result.data.lastUpdated),
              recentActivity: result.data.recentActivity.map((activity: any) => ({
                ...activity,
                completedAt: activity.completedAt ? new Date(activity.completedAt) : new Date()
              }))
            },
            tasks: prev.tasks.map(task => 
              task.id === taskId ? { ...task, isCompleted } : task
            )
          };
        });
      } else {
        setError(result.error || 'Failed to update task');
      }
    } catch (err) {
      setError('Failed to update task');
      console.error('Error updating task:', err);
    }
  };

  const addMilestone = async (name: string, targetDate: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add_milestone',
          milestoneName: name,
          targetDate
        }),
      });

      const result = await response.json();
      if (result.success) {
        await fetchProgressStats(); // Refresh data
      } else {
        setError(result.error || 'Failed to add milestone');
      }
    } catch (err) {
      setError('Failed to add milestone');
      console.error('Error adding milestone:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-none h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-none p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-red-800">Error loading progress</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={fetchProgressStats}
              className="mt-2 text-sm text-red-800 underline hover:text-red-900"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!progressStats) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No progress data available</p>
      </div>
    );
  }

  const { progress, tasks, velocity, estimatedCompletion } = progressStats;

  return (
    <div className="space-y-6">
      {/* Header with overall progress */}
      <div className="bg-white border border-gray-200 rounded-none p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Project Progress</h2>
          <div className="text-sm text-gray-500">
            Last updated: {progress.lastUpdated.toLocaleString()}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Circular Progress */}
          <div className="text-center">
            <CircularProgress
              percentage={progress.percentage}
              size={120}
              color="#3B82F6"
            />
            <div className="mt-4">
              <div className="text-2xl font-bold text-gray-900">{progress.completedTasks}</div>
              <div className="text-sm text-gray-500">of {progress.totalTasks} tasks completed</div>
            </div>
          </div>
          
          {/* Stats */}
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-600">Velocity</div>
              <div className="text-2xl font-bold text-gray-600">{velocity.toFixed(1)}</div>
              <div className="text-xs text-gray-500">tasks per day</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Remaining</div>
              <div className="text-2xl font-bold text-orange-600">{progress.totalTasks - progress.completedTasks}</div>
              <div className="text-xs text-gray-500">tasks left</div>
            </div>
          </div>
          
          {/* Estimated Completion */}
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-600">Estimated Completion</div>
              {estimatedCompletion ? (
                <>
                  <div className="text-lg font-bold text-green-600">
                    {estimatedCompletion.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="text-xs text-gray-500">
                    {Math.ceil((estimatedCompletion.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining
                  </div>
                </>
              ) : (
                <div className="text-lg text-gray-400">Not available</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'activity', label: 'Activity' },
            { id: 'charts', label: 'Charts' },
            { id: 'milestones', label: 'Milestones' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-gray-500 text-gray-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-none p-6 relative">
            <CornerBrackets />
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Progress</h3>
            <ProgressBar
              percentage={progress.percentage}
              totalTasks={progress.totalTasks}
              completedTasks={progress.completedTasks}
              size="large"
              color="blue"
            />
          </div>
          
          <div className="bg-white border border-gray-200 rounded-none p-6 relative">
            <CornerBrackets />
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <ActivitySummary activities={progress.recentActivity} />
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="bg-white border border-gray-200 rounded-none p-6 relative">
          <CornerBrackets />
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h3>
          <ActivityTimeline activities={progress.recentActivity} />
        </div>
      )}

      {activeTab === 'charts' && (
        <ProgressCharts progressData={progress} activities={progress.recentActivity} />
      )}

      {activeTab === 'milestones' && (
        <MilestonesTab
          milestones={progress.milestones || []}
          onAddMilestone={addMilestone}
        />
      )}
    </div>
  );
}

interface MilestonesTabProps {
  milestones: Milestone[];
  onAddMilestone: (name: string, targetDate: string) => void;
}

function MilestonesTab({ milestones, onAddMilestone }: MilestonesTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMilestoneName, setNewMilestoneName] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMilestoneName.trim() && newMilestoneDate) {
      onAddMilestone(newMilestoneName.trim(), newMilestoneDate);
      setNewMilestoneName('');
      setNewMilestoneDate('');
      setShowAddForm(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Milestones</h3>
        <button
          onClick={() => setShowAddForm(true)}
                        className="bg-gray-900 text-white px-4 py-2 rounded-none text-sm hover:bg-gray-800 transition-colors"
        >
          Add Milestone
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-none p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Milestone Name
              </label>
              <input
                type="text"
                value={newMilestoneName}
                onChange={(e) => setNewMilestoneName(e.target.value)}
                className="w-full border border-gray-300 rounded-none px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter milestone name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Date
              </label>
              <input
                type="date"
                value={newMilestoneDate}
                onChange={(e) => setNewMilestoneDate(e.target.value)}
                className="w-full border border-gray-300 rounded-none px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-gray-900 text-white px-4 py-2 rounded-none text-sm hover:bg-gray-800 transition-colors"
              >
                Add Milestone
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-none text-sm hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {milestones.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {milestones.map((milestone, index) => {
            const targetDate = new Date(milestone.targetDate);
            const isOverdue = targetDate < new Date() && milestone.progress < 100;
            
            return (
              <MilestoneProgress
                key={index}
                name={milestone.name}
                progress={milestone.progress}
                targetDate={milestone.targetDate}
                isOverdue={isOverdue}
              />
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          <p className="text-sm">No milestones defined</p>
          <p className="text-xs text-gray-400 mt-1">Add milestones to track major project goals</p>
        </div>
      )}
    </div>
  );
}