'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TokenUsageData {
    totals: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        totalCost: number;
        requestCount: number;
        uniqueSessions: number;
    };
    timeSeriesData: Array<{
        period: string;
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        cost: number;
        requestCount: number;
    }>;
    byProject: Array<{
        projectId: string;
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        cost: number;
        requestCount: number;
    }>;
    byAnalysisType: Array<{
        analysisType: string;
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        cost: number;
        requestCount: number;
    }>;
    recentUsage: Array<{
        projectId: string;
        sessionId: string;
        analysisType: string;
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        cost: number;
        timestamp: string;
    }>;
}

export default function TokenUsageVisualization() {
    const [data, setData] = useState<TokenUsageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeRange, setTimeRange] = useState('30d');
    const [groupBy, setGroupBy] = useState('day');

    const fetchTokenUsage = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/token-usage?timeRange=${timeRange}&groupBy=${groupBy}`);
            if (!response.ok) {
                throw new Error('Failed to fetch token usage data');
            }
            const result = await response.json();
            setData(result);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTokenUsage();
    }, [timeRange, groupBy]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 4
        }).format(amount);
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-US').format(num);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-24 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                    <div className="h-64 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="text-center text-red-600">
                        <p>Error loading token usage data: {error}</p>
                        <Button onClick={fetchTokenUsage} className="mt-4">
                            Retry
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!data) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="text-center text-gray-500">
                        <p>No token usage data available</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Token Usage Analytics</h2>
                    <p className="text-gray-600">Monitor your AI token consumption and costs</p>
                </div>
                <div className="flex gap-2">
                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7d">Last 7 days</SelectItem>
                            <SelectItem value="30d">Last 30 days</SelectItem>
                            <SelectItem value="90d">Last 90 days</SelectItem>
                            <SelectItem value="all">All time</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={groupBy} onValueChange={setGroupBy}>
                        <SelectTrigger className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="day">By Day</SelectItem>
                            <SelectItem value="week">By Week</SelectItem>
                            <SelectItem value="month">By Month</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total Tokens</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {formatNumber(data.totals.totalTokens)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            {formatNumber(data.totals.inputTokens)} input + {formatNumber(data.totals.outputTokens)} output
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Total Cost</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(data.totals.totalCost)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            Across {formatNumber(data.totals.requestCount)} requests
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Sessions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">
                            {formatNumber(data.totals.uniqueSessions)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            Unique sessions
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">Avg Cost/Request</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                            {formatCurrency(data.totals.totalCost / Math.max(data.totals.requestCount, 1))}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            Per API call
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="timeline" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                    <TabsTrigger value="projects">By Project</TabsTrigger>
                    <TabsTrigger value="analysis">By Analysis Type</TabsTrigger>
                    <TabsTrigger value="recent">Recent Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="timeline">
                    <Card>
                        <CardHeader>
                            <CardTitle>Usage Over Time</CardTitle>
                            <CardDescription>Token consumption and costs over the selected time period</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {data.timeSeriesData.length === 0 ? (
                                    <div className="text-center text-gray-500 py-8">
                                        No usage data for the selected time period
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {data.timeSeriesData.map((item, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <div className="flex-1">
                                                    <div className="font-medium">{formatDate(item.period)}</div>
                                                    <div className="text-sm text-gray-600">
                                                        {formatNumber(item.requestCount)} requests
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-medium">{formatNumber(item.totalTokens)} tokens</div>
                                                    <div className="text-sm text-green-600">{formatCurrency(item.cost)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="projects">
                    <Card>
                        <CardHeader>
                            <CardTitle>Usage by Project</CardTitle>
                            <CardDescription>Token consumption breakdown by project</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {data.byProject.length === 0 ? (
                                    <div className="text-center text-gray-500 py-8">
                                        No project data available
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {data.byProject
                                            .sort((a, b) => b.totalTokens - a.totalTokens)
                                            .map((project, index) => (
                                                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                                                    <div className="flex-1">
                                                        <div className="font-medium text-gray-900">
                                                            {project.projectId === 'project-creation' ? 'Project Creation' : project.projectId}
                                                        </div>
                                                        <div className="text-sm text-gray-600">
                                                            {formatNumber(project.requestCount)} requests
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-medium">{formatNumber(project.totalTokens)} tokens</div>
                                                        <div className="text-sm text-green-600">{formatCurrency(project.cost)}</div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="analysis">
                    <Card>
                        <CardHeader>
                            <CardTitle>Usage by Analysis Type</CardTitle>
                            <CardDescription>Token consumption breakdown by type of AI analysis</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {data.byAnalysisType.length === 0 ? (
                                    <div className="text-center text-gray-500 py-8">
                                        No analysis type data available
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {data.byAnalysisType
                                            .sort((a, b) => b.totalTokens - a.totalTokens)
                                            .map((analysis, index) => (
                                                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                                                    <div className="flex-1">
                                                        <div className="font-medium text-gray-900 capitalize">
                                                            {analysis.analysisType.replace(/-/g, ' ')}
                                                        </div>
                                                        <div className="text-sm text-gray-600">
                                                            {formatNumber(analysis.requestCount)} requests
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-medium">{formatNumber(analysis.totalTokens)} tokens</div>
                                                        <div className="text-sm text-green-600">{formatCurrency(analysis.cost)}</div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="recent">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                            <CardDescription>Latest token usage events</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {data.recentUsage.length === 0 ? (
                                    <div className="text-center text-gray-500 py-8">
                                        No recent activity
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {data.recentUsage.map((usage, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="text-xs">
                                                            {usage.analysisType.replace(/-/g, ' ')}
                                                        </Badge>
                                                        <span className="text-sm text-gray-600">
                                                            {usage.projectId === 'project-creation' ? 'Project Creation' : usage.projectId}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {new Date(usage.timestamp).toLocaleString()}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-medium">{formatNumber(usage.totalTokens)} tokens</div>
                                                    <div className="text-xs text-green-600">{formatCurrency(usage.cost)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}