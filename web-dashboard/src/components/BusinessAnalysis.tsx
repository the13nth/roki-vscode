'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Users,
  Zap,
  Target,
  BarChart3,
  Building2,
  Clock,
  Shield,
  Lightbulb
} from 'lucide-react';
import { BusinessAnalysisResult } from '@/lib/workflowAnalysisService';

// Simple Progress component replacement
const Progress = ({ value, className = "" }: { value: number; className?: string }) => (
  <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
    <div 
      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

interface BusinessAnalysisProps {
  analysis: BusinessAnalysisResult;
}

export function BusinessAnalysis({ analysis }: BusinessAnalysisProps) {
  const getRatingColor = (rating: number) => {
    if (rating >= 80) return 'text-green-600 bg-green-100';
    if (rating >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getRatingIcon = (rating: number) => {
    if (rating >= 80) return <CheckCircle className="w-4 h-4" />;
    if (rating >= 60) return <AlertTriangle className="w-4 h-4" />;
    return <TrendingDown className="w-4 h-4" />;
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Business Rating */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="w-5 h-5 mr-2" />
            Business Analysis Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${getRatingColor(analysis.overallRating)}`}>
                {getRatingIcon(analysis.overallRating)}
                <span className="font-bold text-lg">{analysis.overallRating}/100</span>
              </div>
              <div>
                <h3 className="font-semibold">Business Readiness Score</h3>
                <p className="text-sm text-gray-600">
                  {analysis.overallRating >= 80 ? 'Excellent' : 
                   analysis.overallRating >= 60 ? 'Good' : 
                   analysis.overallRating >= 40 ? 'Needs Improvement' : 'Poor'}
                </p>
              </div>
            </div>
          </div>
          
          <Progress value={analysis.overallRating} className="h-2" />
        </CardContent>
      </Card>

      {/* Business Insights Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Business Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Organizational Structure */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">Organizational Structure</span>
                </div>
                <Badge className={getRatingColor(analysis.businessInsights.organizationalStructure.score)}>
                  {analysis.businessInsights.organizationalStructure.score}/100
                </Badge>
              </div>
              <Progress value={analysis.businessInsights.organizationalStructure.score} className="h-1" />
              <p className="text-xs text-gray-600">{analysis.businessInsights.organizationalStructure.analysis}</p>
            </div>

            {/* Process Efficiency */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">Process Efficiency</span>
                </div>
                <Badge className={getRatingColor(analysis.businessInsights.processEfficiency.score)}>
                  {analysis.businessInsights.processEfficiency.score}/100
                </Badge>
              </div>
              <Progress value={analysis.businessInsights.processEfficiency.score} className="h-1" />
              <p className="text-xs text-gray-600">{analysis.businessInsights.processEfficiency.analysis}</p>
            </div>

            {/* Stakeholder Alignment */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium">Stakeholder Alignment</span>
                </div>
                <Badge className={getRatingColor(analysis.businessInsights.stakeholderAlignment.score)}>
                  {analysis.businessInsights.stakeholderAlignment.score}/100
                </Badge>
              </div>
              <Progress value={analysis.businessInsights.stakeholderAlignment.score} className="h-1" />
              <p className="text-xs text-gray-600">{analysis.businessInsights.stakeholderAlignment.analysis}</p>
            </div>

            {/* Execution Readiness */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium">Execution Readiness</span>
                </div>
                <Badge className={getRatingColor(analysis.businessInsights.executionReadiness.score)}>
                  {analysis.businessInsights.executionReadiness.score}/100
                </Badge>
              </div>
              <Progress value={analysis.businessInsights.executionReadiness.score} className="h-1" />
              <p className="text-xs text-gray-600">{analysis.businessInsights.executionReadiness.analysis}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strategic Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lightbulb className="w-5 h-5 mr-2" />
            Strategic Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysis.strategicRecommendations.map((recommendation, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getPriorityColor(recommendation.priority)}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {recommendation.priority === 'high' ? (
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    ) : recommendation.priority === 'medium' ? (
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    ) : (
                      <Info className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-semibold">{recommendation.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {recommendation.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {recommendation.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{recommendation.description}</p>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-blue-700">
                        💡 <strong>Action:</strong> {recommendation.action}
                      </p>
                      <p className="text-sm font-medium text-green-700">
                        📈 <strong>Impact:</strong> {recommendation.impact}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Risk Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Overall Risk Level:</span>
              <Badge className={getRiskColor(analysis.riskAssessment.level)}>
                {analysis.riskAssessment.level.toUpperCase()}
              </Badge>
            </div>
          </div>
          
          <div className="space-y-3">
            {analysis.riskAssessment.risks.map((risk, index) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <h5 className="font-medium text-sm">{risk.risk}</h5>
                  <div className="flex space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {risk.probability} Probability
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {risk.impact} Impact
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-gray-600">
                  <strong>Mitigation:</strong> {risk.mitigation}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Recommendations by Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Organizational Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Organizational Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.businessInsights.organizationalStructure.recommendations.map((rec, index) => (
                <li key={index} className="text-xs text-gray-600 flex items-start space-x-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Process Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Process Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.businessInsights.processEfficiency.recommendations.map((rec, index) => (
                <li key={index} className="text-xs text-gray-600 flex items-start space-x-2">
                  <span className="text-green-500 mt-1">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Stakeholder Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Stakeholder Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.businessInsights.stakeholderAlignment.recommendations.map((rec, index) => (
                <li key={index} className="text-xs text-gray-600 flex items-start space-x-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Execution Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Execution Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.businessInsights.executionReadiness.recommendations.map((rec, index) => (
                <li key={index} className="text-xs text-gray-600 flex items-start space-x-2">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
