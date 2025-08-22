'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminCharts } from './AdminCharts';
import { 
  Users, 
  FolderOpen, 
  Brain, 
  Activity, 
  TrendingUp, 
  BarChart3,
  Calendar,
  Clock,
  Zap,
  Database,
  FileText,
  Target
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  totalProjects: number;
  totalAnalyses: number;
  totalTokens: number;
  totalCost?: number;
  costPerUser?: number;
  avgTokensPerAnalysis?: number;
  activeUsers: number;
  projectsByStatus: Record<string, number>;
  analysesByType: Record<string, number>;
  tokenUsageByUser: Array<{ userId: string; userName: string; email: string; tokens: number }>;
  userCosts?: Array<{ userId: string; userName: string; tokens: number; cost: number }>;
  pricingTiers?: Record<string, any>;
  recentActivity: Array<{ type: string; user: string; project: string; timestamp: string }>;
  projectsByUser: Array<{ userId: string; userName: string; email: string; projectCount: number }>;
  allUsers?: Array<{ 
    userId: string; 
    userName: string; 
    email: string; 
    createdAt: string; 
    projectCount: number; 
    tokenUsage: number; 
    cost: number 
  }>;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch admin statistics');
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading admin statistics: {error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No statistics available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeUsers} active this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              Across all users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAnalyses}</div>
            <p className="text-xs text-muted-foreground">
              AI-powered insights
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalCost?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">
              ${stats.costPerUser?.toFixed(2) || '0.00'} per user
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="analyses">Analyses</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="pricing">Pricing & Costs</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Project Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.projectsByStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className="capitalize">{status}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Analysis Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.analysesByType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="capitalize">{type.replace(/_/g, ' ')}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
                <CardDescription>
                  Complete list of users with email addresses and activity details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">User</th>
                        <th className="text-left p-3 font-medium">Email</th>
                        <th className="text-left p-3 font-medium">Joined</th>
                        <th className="text-left p-3 font-medium">Projects</th>
                        <th className="text-left p-3 font-medium">Token Usage</th>
                        <th className="text-left p-3 font-medium">Cost</th>
                        <th className="text-left p-3 font-medium">User ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.allUsers?.map((user, index) => (
                        <tr key={user.userId} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-purple-600">
                                  {index + 1}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium">{user.userName}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="text-sm text-gray-600">{user.email}</span>
                          </td>
                          <td className="p-3">
                            <span className="text-sm text-gray-600">{user.createdAt}</span>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline">{user.projectCount}</Badge>
                          </td>
                          <td className="p-3">
                            <span className="text-sm">{user.tokenUsage.toLocaleString()}</span>
                          </td>
                          <td className="p-3">
                            <span className="text-sm font-medium">${user.cost.toFixed(2)}</span>
                          </td>
                          <td className="p-3">
                            <span className="text-xs text-gray-500 font-mono">{user.userId.slice(-8)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Token Usage by User
                </CardTitle>
                <CardDescription>
                  Top users by AI token consumption
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.tokenUsageByUser.slice(0, 10).map((user, index) => (
                    <div key={user.userId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-purple-600">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{user.userName}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {user.tokens.toLocaleString()} tokens
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Projects by User
                </CardTitle>
                <CardDescription>
                  Users with the most projects
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.projectsByUser.slice(0, 10).map((user, index) => (
                    <div key={user.userId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{user.userName}</p>
                          <p className="text-sm text-muted-foreground">ID: {user.userId.slice(-8)}</p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {user.projectCount} projects
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Project Statistics
              </CardTitle>
              <CardDescription>
                Overview of project distribution and status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Project Status Distribution</h4>
                  <div className="space-y-2">
                    {Object.entries(stats.projectsByStatus).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="capitalize text-sm">{status}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Quick Stats</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Total Projects</span>
                      <span className="font-medium">{stats.totalProjects}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Active Users</span>
                      <span className="font-medium">{stats.activeUsers}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Avg Projects per User</span>
                      <span className="font-medium">
                        {stats.totalUsers > 0 ? (stats.totalProjects / stats.totalUsers).toFixed(1) : 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analyses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Analysis Statistics
              </CardTitle>
              <CardDescription>
                Detailed breakdown of analysis types and usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Analysis Types</h4>
                  <div className="space-y-2">
                    {Object.entries(stats.analysesByType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="capitalize text-sm">{type.replace(/_/g, ' ')}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Quick Stats</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Total Analyses</span>
                      <span className="font-medium">{stats.totalAnalyses}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Avg per Project</span>
                      <span className="font-medium">
                        {stats.totalProjects > 0 ? (stats.totalAnalyses / stats.totalProjects).toFixed(1) : 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          <AdminCharts stats={stats} />
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Cost Breakdown by User
                </CardTitle>
                <CardDescription>
                  Individual user costs based on token consumption
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.userCosts?.slice(0, 10).map((user, index) => (
                    <div key={user.userId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-green-600">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{user.userName}</p>
                          <p className="text-sm text-muted-foreground">{user.tokens.toLocaleString()} tokens</p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        ${user.cost.toFixed(2)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Suggested Pricing Tiers
                </CardTitle>
                <CardDescription>
                  Based on current usage patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.pricingTiers && Object.entries(stats.pricingTiers).map(([key, tier]: [string, any]) => (
                    <div key={key} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{tier.name}</h4>
                        <span className="text-lg font-bold">${tier.price}</span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>• {tier.tokens.toLocaleString()} tokens/month</p>
                        <p>• {tier.analyses} analyses/month</p>
                        <p>• {tier.projects} projects</p>
                        {tier.features.map((feature: string, index: number) => (
                          <p key={index}>• {feature}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Cost Analysis Summary
              </CardTitle>
              <CardDescription>
                Key metrics for pricing decisions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    ${stats.totalCost?.toFixed(2) || '0.00'}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Cost</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    ${stats.costPerUser?.toFixed(2) || '0.00'}
                  </div>
                  <p className="text-sm text-muted-foreground">Cost per User</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {stats.avgTokensPerAnalysis?.toLocaleString() || '0'}
                  </div>
                  <p className="text-sm text-muted-foreground">Avg Tokens per Analysis</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest user actions and system events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Activity className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium capitalize">{activity.type.replace(/_/g, ' ')}</p>
                      <p className="text-sm text-muted-foreground">
                        {activity.user} • {activity.project}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
