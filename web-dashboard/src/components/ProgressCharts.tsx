'use client';

import React, { useMemo } from 'react';
import { ActivityItem, ProgressData } from '../types/shared';

interface ProgressChartsProps {
  progressData: ProgressData;
  activities: ActivityItem[];
}

interface ChartDataPoint {
  date: string;
  completedTasks: number;
  percentage: number;
}

export function ProgressCharts({ progressData, activities }: ProgressChartsProps) {
  const chartData = useMemo(() => {
    // Generate chart data points from activity history
    const dataPoints: ChartDataPoint[] = [];
    const sortedActivities = [...activities].sort(
      (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    );

    // Start with initial state (0 completed tasks)
    const startDate = sortedActivities.length > 0 
      ? new Date(sortedActivities[0].completedAt)
      : new Date();
    
    startDate.setDate(startDate.getDate() - 1);
    dataPoints.push({
      date: startDate.toISOString().split('T')[0],
      completedTasks: 0,
      percentage: 0
    });

    // Add data points for each completion
    let cumulativeCompleted = 0;
    sortedActivities.forEach(activity => {
      cumulativeCompleted++;
      const percentage = progressData.totalTasks > 0 
        ? Math.round((cumulativeCompleted / progressData.totalTasks) * 100)
        : 0;
      
      dataPoints.push({
        date: new Date(activity.completedAt).toISOString().split('T')[0],
        completedTasks: cumulativeCompleted,
        percentage
      });
    });

    // Add current state if different from last activity
    const today = new Date().toISOString().split('T')[0];
    const lastDataPoint = dataPoints[dataPoints.length - 1];
    if (lastDataPoint.date !== today) {
      dataPoints.push({
        date: today,
        completedTasks: progressData.completedTasks,
        percentage: progressData.percentage
      });
    }

    return dataPoints;
  }, [activities, progressData]);

  const maxCompleted = Math.max(...chartData.map(d => d.completedTasks), 1);
  const chartHeight = 200;
  const chartWidth = 400;
  const padding = 40;

  const getXPosition = (index: number) => {
    return padding + (index / (chartData.length - 1)) * (chartWidth - 2 * padding);
  };

  const getYPosition = (value: number, maxValue: number) => {
    return chartHeight - padding - ((value / maxValue) * (chartHeight - 2 * padding));
  };

  const pathData = chartData
    .map((point, index) => {
      const x = getXPosition(index);
      const y = getYPosition(point.completedTasks, maxCompleted);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <div className="space-y-6">
      {/* Progress Trend Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress Trend</h3>
        
        {chartData.length > 1 ? (
          <div className="relative">
            <svg width={chartWidth} height={chartHeight} className="overflow-visible">
              {/* Grid lines */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width={chartWidth} height={chartHeight} fill="url(#grid)" />
              
              {/* Y-axis labels */}
              {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
                const value = Math.round(maxCompleted * ratio);
                const y = getYPosition(value, maxCompleted);
                return (
                  <g key={ratio}>
                    <line
                      x1={padding}
                      y1={y}
                      x2={chartWidth - padding}
                      y2={y}
                      stroke="#e5e7eb"
                      strokeWidth="1"
                    />
                    <text
                      x={padding - 10}
                      y={y + 4}
                      textAnchor="end"
                      className="text-xs fill-gray-500"
                    >
                      {value}
                    </text>
                  </g>
                );
              })}
              
              {/* Progress line */}
              <path
                d={pathData}
                fill="none"
                stroke="#3B82F6"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Data points */}
              {chartData.map((point, index) => {
                const x = getXPosition(index);
                const y = getYPosition(point.completedTasks, maxCompleted);
                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r="4"
                    fill="#3B82F6"
                    stroke="white"
                    strokeWidth="2"
                  />
                );
              })}
              
              {/* X-axis labels */}
              {chartData.map((point, index) => {
                if (index % Math.ceil(chartData.length / 5) === 0 || index === chartData.length - 1) {
                  const x = getXPosition(index);
                  const date = new Date(point.date);
                  const label = date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  });
                  return (
                    <text
                      key={index}
                      x={x}
                      y={chartHeight - 10}
                      textAnchor="middle"
                      className="text-xs fill-gray-500"
                    >
                      {label}
                    </text>
                  );
                }
                return null;
              })}
            </svg>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-sm">Not enough data for trend analysis</p>
            <p className="text-xs text-gray-400 mt-1">Complete more tasks to see progress trends</p>
          </div>
        )}
      </div>

      {/* Velocity Chart */}
      <VelocityChart activities={activities} />
      
      {/* Completion Distribution */}
      <CompletionDistribution activities={activities} />
    </div>
  );
}

interface VelocityChartProps {
  activities: ActivityItem[];
}

function VelocityChart({ activities }: VelocityChartProps) {
  const { velocityData, maxCount, chartWidth } = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: date.toISOString().split('T')[0],
        count: 0
      };
    });

    activities.forEach(activity => {
      const activityDate = new Date(activity.completedAt).toISOString().split('T')[0];
      const dayData = last30Days.find(d => d.date === activityDate);
      if (dayData) {
        dayData.count++;
      }
    });

    const maxCount = Math.max(...last30Days.map(d => d.count), 1);
    const barWidth = 8;
    const chartWidth = last30Days.length * (barWidth + 2);

    return {
      velocityData: last30Days,
      maxCount,
      chartWidth
    };
  }, [activities]);

  const barWidth = 8;
  const chartHeight = 100;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Velocity (Last 30 Days)</h3>
      
      <div className="relative overflow-x-auto">
        <svg width={chartWidth} height={chartHeight} className="min-w-full">
          {velocityData.map((day, index) => {
            const height = (day.count / maxCount) * (chartHeight - 20);
            const x = index * (barWidth + 2);
            const y = chartHeight - height - 10;
            
            return (
              <g key={day.date}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={height}
                  fill={day.count > 0 ? '#10B981' : '#E5E7EB'}
                  rx="2"
                />
                {day.count > 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={y - 5}
                    textAnchor="middle"
                    className="text-xs fill-gray-600"
                  >
                    {day.count}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>Average: {(activities.length / 30).toFixed(1)} tasks/day</span>
          <span>Peak: {maxCount} tasks/day</span>
        </div>
      </div>
    </div>
  );
}

interface CompletionDistributionProps {
  activities: ActivityItem[];
}

function CompletionDistribution({ activities }: CompletionDistributionProps) {
  const distribution = useMemo(() => {
    const manual = activities.filter(a => a.completedBy === 'manual').length;
    const autoDetected = activities.filter(a => a.completedBy === 'auto-detection').length;
    const total = activities.length;
    
    return {
      manual: { count: manual, percentage: total > 0 ? (manual / total) * 100 : 0 },
      autoDetected: { count: autoDetected, percentage: total > 0 ? (autoDetected / total) * 100 : 0 }
    };
  }, [activities]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Completion Distribution</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded mr-3"></div>
            <span className="text-sm text-gray-700">Manual Completions</span>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-900">{distribution.manual.count}</div>
            <div className="text-xs text-gray-500">{distribution.manual.percentage.toFixed(1)}%</div>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-500 rounded mr-3"></div>
            <span className="text-sm text-gray-700">Auto-detected</span>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-900">{distribution.autoDetected.count}</div>
            <div className="text-xs text-gray-500">{distribution.autoDetected.percentage.toFixed(1)}%</div>
          </div>
        </div>
        
        {/* Visual bar */}
        <div className="w-full bg-gray-200 rounded-none h-3 overflow-hidden">
          <div className="h-full flex">
            <div 
              className="bg-green-500 h-full"
              style={{ width: `${distribution.manual.percentage}%` }}
            />
            <div 
              className="bg-gray-500 h-full"
              style={{ width: `${distribution.autoDetected.percentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}