'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Target,
  AlertTriangle,
  Shield,
  DollarSign,
  TrendingDown,
  Eye,
  Settings
} from 'lucide-react';

interface TokenAlert {
  userId: string;
  type: 'daily_limit' | 'monthly_limit' | 'burst_limit' | 'cost_threshold';
  message: string;
  timestamp: string;
  severity: 'warning' | 'critical';
  currentUsage: number;
  limit: number;
}

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
    plan: string;
    subscriptionStatus: string;
    trialEnd: any; 
    userId: string; 
    userName: string; 
    email: string; 
    createdAt: string; 
    projectCount: number; 
    tokenUsage: number; 
    cost: number;
    dailyUsage?: number;
    monthlyProjection?: number;
    rateLimitStatus?: 'normal' | 'warning' | 'critical';
  }>;
  tokenAlerts?: TokenAlert[];
  rateLimitStats?: {
    usersAtLimit: number;
    usersNearLimit: number;
    totalRateLimitViolations: number;
  };
  costTrends?: {
    dailyAverage: number;
    weeklyGrowth: number;
    monthlyProjection: number;
    costPerToken: number;
  };
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [alertFilter, setAlertFilter] = useState<'all' | 'warning' | 'critical'>('all');

  useEffect(() => {
    fetchAdminStats();
  }, [timeRange]);

  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/stats?timeRange=${timeRange}`);
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

  const getAlertIcon = (severity: string) => {
    return severity === 'critical' ? <AlertTriangle className="h-4 w-4 text-red-500" /> : <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };

  const getRateLimitStatusColor = (status?: string) => {
    switch (status) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
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

  const filteredAlerts = stats.tokenAlerts?.filter(alert => 
    alertFilter === 'all' || alert.severity === alertFilter
  ) || [];

  return (
    <div className="space-y-6">
      {/* Enhanced Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Users</CardTitle>
            <Users className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeUsers} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Projects</CardTitle>
            <FolderOpen className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">{stats.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              All users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Analyses</CardTitle>
            <Brain className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">{stats.totalAnalyses}</div>
            <p className="text-xs text-muted-foreground">
              AI insights
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Cost</CardTitle>
            <Zap className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">{formatCurrency(stats.totalCost || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.costPerUser || 0)}/user
            </p>
          </CardContent>
        </Card>
      </div>

      {/* New: Token Alerts Section */}
      {stats.tokenAlerts && stats.tokenAlerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Token Usage Alerts ({filteredAlerts.length})
            </CardTitle>
            <CardDescription className="text-red-700">
              Users approaching or exceeding token limits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Select value={alertFilter} onValueChange={(value: any) => setAlertFilter(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Alerts</SelectItem>
                  <SelectItem value="warning">Warnings</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={fetchAdminStats}>
                <Eye className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {filteredAlerts.map((alert, index) => (
                <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${
                  alert.severity === 'critical' ? 'bg-red-100 border border-red-200' : 'bg-yellow-100 border border-yellow-200'
                }`}>
                  <div className="flex items-center gap-3">
                    {getAlertIcon(alert.severity)}
                    <div>
                      <p className="font-medium text-sm">{alert.message}</p>
                      <p className="text-xs text-gray-600">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                      {alert.severity}
                    </Badge>
                    <p className="text-xs text-gray-600 mt-1">
                      {alert.currentUsage.toLocaleString()} / {alert.limit.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New: Rate Limiting Status */}
      {stats.rateLimitStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rate Limit Status</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Users at Limit</span>
                  <Badge variant="destructive">{stats.rateLimitStats.usersAtLimit}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Near Limit</span>
                  <Badge variant="secondary">{stats.rateLimitStats.usersNearLimit}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Violations</span>
                  <Badge variant="outline">{stats.rateLimitStats.totalRateLimitViolations}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cost Trends */}
          {stats.costTrends && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats.costTrends.dailyAverage)}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.costTrends.weeklyGrowth > 0 ? '+' : ''}{stats.costTrends.weeklyGrowth.toFixed(1)}% from last week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Projection</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats.costTrends.monthlyProjection)}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(stats.costTrends.costPerToken)} per token
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Enhanced Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-8 h-auto">
          <TabsTrigger value="overview" className="text-xs md:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="users" className="text-xs md:text-sm">Users</TabsTrigger>
          <TabsTrigger value="projects" className="text-xs md:text-sm">Projects</TabsTrigger>
          <TabsTrigger value="analyses" className="text-xs md:text-sm">Analyses</TabsTrigger>
          <TabsTrigger value="charts" className="text-xs md:text-sm">Charts</TabsTrigger>
          <TabsTrigger value="pricing" className="text-xs md:text-sm">Pricing</TabsTrigger>
          <TabsTrigger value="activity" className="text-xs md:text-sm">Activity</TabsTrigger>
          <TabsTrigger value="alerts" className="text-xs md:text-sm">Alerts</TabsTrigger>
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
                  Enhanced User Management
                </CardTitle>
                <CardDescription>
                  Complete list of users with token usage, rate limiting status, and cost analytics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px]">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 md:p-3 font-medium text-xs md:text-sm">User</th>
                        <th className="text-left p-2 md:p-3 font-medium text-xs md:text-sm">Email</th>
                        <th className="text-left p-2 md:p-3 font-medium text-xs md:text-sm">Plan</th>
                        <th className="text-left p-2 md:p-3 font-medium text-xs md:text-sm">Status</th>
                        <th className="text-left p-2 md:p-3 font-medium text-xs md:text-sm">Trial Ends</th>
                        <th className="text-left p-2 md:p-3 font-medium text-xs md:text-sm">Joined</th>
                        <th className="text-left p-2 md:p-3 font-medium text-xs md:text-sm">Projects</th>
                        <th className="text-left p-2 md:p-3 font-medium text-xs md:text-sm">Tokens</th>
                        <th className="text-left p-2 md:p-3 font-medium text-xs md:text-sm">Cost</th>
                        <th className="text-left p-2 md:p-3 font-medium text-xs md:text-sm">Daily Usage</th>
                        <th className="text-left p-2 md:p-3 font-medium text-xs md:text-sm">Rate Limit</th>
                        <th className="text-left p-2 md:p-3 font-medium text-xs md:text-sm">ID</th>
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
                            <Badge variant="outline">{user.plan || 'Free'}</Badge>
                          </td>
                          <td className="p-3">
                            <Badge className={
                              user.subscriptionStatus === 'trialing' ? 'bg-blue-100 text-blue-700' :
                              user.subscriptionStatus === 'active' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-700'
                            }>
                              {user.subscriptionStatus || 'Free'}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <span className="text-sm text-gray-600">
                              {user.trialEnd ? new Date(user.trialEnd).toLocaleDateString() : 'N/A'}
                            </span>
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
                            <span className="text-sm font-medium">{formatCurrency(user.cost)}</span>
                          </td>
                          <td className="p-3">
                            <span className="text-sm">{user.dailyUsage?.toLocaleString() || '0'}</span>
                          </td>
                          <td className="p-3">
                            <Badge className={getRateLimitStatusColor(user.rateLimitStatus)}>
                              {user.rateLimitStatus || 'normal'}
                            </Badge>
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

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Token Usage Alerts & Monitoring
              </CardTitle>
              <CardDescription>
                Comprehensive view of all token usage alerts and rate limiting violations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Alert Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {stats.tokenAlerts?.filter(a => a.severity === 'critical').length || 0}
                    </div>
                    <p className="text-sm text-red-700">Critical Alerts</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {stats.tokenAlerts?.filter(a => a.severity === 'warning').length || 0}
                    </div>
                    <p className="text-sm text-yellow-700">Warnings</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.rateLimitStats?.usersAtLimit || 0}
                    </div>
                    <p className="text-sm text-blue-700">Users at Limit</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {stats.totalUsers - (stats.rateLimitStats?.usersAtLimit || 0)}
                    </div>
                    <p className="text-sm text-green-700">Users Normal</p>
                  </div>
                </div>

                {/* Alert History */}
                <div>
                  <h4 className="font-medium mb-3">Recent Alert History</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {stats.tokenAlerts?.map((alert, index) => (
                      <div key={index} className={`p-3 rounded-lg border ${
                        alert.severity === 'critical' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getAlertIcon(alert.severity)}
                            <span className="font-medium">{alert.type.replace('_', ' ')}</span>
                          </div>
                          <span className="text-sm text-gray-600">
                            {new Date(alert.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{alert.message}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span>Usage: {alert.currentUsage.toLocaleString()}</span>
                          <span>Limit: {alert.limit.toLocaleString()}</span>
                          <span>Percentage: {Math.round((alert.currentUsage / alert.limit) * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
