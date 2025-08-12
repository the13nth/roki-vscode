'use client';

import React from 'react';

interface ProgressBarProps {
  percentage: number;
  totalTasks: number;
  completedTasks: number;
  showDetails?: boolean;
  size?: 'small' | 'medium' | 'large';
  color?: 'blue' | 'green' | 'purple' | 'orange';
  animated?: boolean;
}

export function ProgressBar({
  percentage,
  totalTasks,
  completedTasks,
  showDetails = true,
  size = 'medium',
  color = 'blue',
  animated = true
}: ProgressBarProps) {
  const sizeClasses = {
    small: 'h-2',
    medium: 'h-4',
    large: 'h-6'
  };

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500'
  };

  const textSizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  };

  return (
    <div className="w-full">
      {showDetails && (
        <div className="flex justify-between items-center mb-2">
          <span className={`font-medium text-gray-700 ${textSizeClasses[size]}`}>
            Progress
          </span>
          <span className={`font-semibold text-gray-900 ${textSizeClasses[size]}`}>
            {percentage}%
          </span>
        </div>
      )}
      
      <div className={`w-full bg-gray-200 rounded-none ${sizeClasses[size]} overflow-hidden`}>
        <div
          className={`${sizeClasses[size]} ${colorClasses[color]} rounded-none transition-all duration-500 ease-out ${
            animated ? 'animate-pulse' : ''
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      
      {showDetails && (
        <div className="flex justify-between items-center mt-1">
          <span className={`text-gray-500 ${textSizeClasses[size]}`}>
            {completedTasks} of {totalTasks} tasks completed
          </span>
          <span className={`text-gray-500 ${textSizeClasses[size]}`}>
            {totalTasks - completedTasks} remaining
          </span>
        </div>
      )}
    </div>
  );
}

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
}

export function CircularProgress({
  percentage,
  size = 120,
  strokeWidth = 8,
  color = '#3B82F6',
  backgroundColor = '#E5E7EB',
  showPercentage = true
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">
            {percentage}%
          </span>
        </div>
      )}
    </div>
  );
}

interface MilestoneProgressProps {
  name: string;
  progress: number;
  targetDate: string;
  isOverdue?: boolean;
}

export function MilestoneProgress({
  name,
  progress,
  targetDate,
  isOverdue = false
}: MilestoneProgressProps) {
  const targetDateObj = new Date(targetDate);
  const isValidDate = !isNaN(targetDateObj.getTime());
  const formattedDate = isValidDate 
    ? targetDateObj.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
    : targetDate;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <h4 className="font-semibold text-gray-900 text-sm">{name}</h4>
        <span className={`text-xs px-2 py-1 rounded-full ${
          isOverdue 
            ? 'bg-red-100 text-red-800' 
            : progress >= 100 
            ? 'bg-green-100 text-green-800'
            : 'bg-blue-100 text-blue-800'
        }`}>
          {isOverdue ? 'Overdue' : progress >= 100 ? 'Complete' : 'In Progress'}
        </span>
      </div>
      
      <div className="mb-3">
        <ProgressBar
          percentage={progress}
          totalTasks={0}
          completedTasks={0}
          showDetails={false}
          size="small"
          color={progress >= 100 ? 'green' : isOverdue ? 'orange' : 'blue'}
          animated={false}
        />
      </div>
      
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>{progress}% complete</span>
        <span>Due: {formattedDate}</span>
      </div>
    </div>
  );
}