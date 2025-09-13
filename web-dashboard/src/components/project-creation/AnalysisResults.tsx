import React from 'react';
import { EnhancementStage } from './types';

interface AnalysisResultsProps {
  enhancementStage: EnhancementStage;
}

export function AnalysisResults({ enhancementStage }: AnalysisResultsProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900">
          AI Enhancement Results ({enhancementStage.stage})
        </h4>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Overall Score:</span>
          <span className={`px-2 py-1 rounded text-sm font-medium ${
            enhancementStage.score >= 70 ? 'bg-green-100 text-green-800' :
            enhancementStage.score >= 55 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {enhancementStage.score}/100
          </span>
          <span className="text-xs text-gray-500">
            (weighted: Basic 20% + Detailed 30% + Validation 50%)
          </span>
        </div>
      </div>

      {/* Comprehensive Analysis Results */}
      {(enhancementStage.stage === 'comprehensive' || enhancementStage.stage === 'complete') && enhancementStage.basicEnhancement && (
        <div className="space-y-6">
          {/* Basic Enhancement Section */}
          <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-medium text-gray-900 flex items-center">
                <span className="text-blue-500 mr-2">✨</span>
                Basic Enhancement
              </h5>
              <span className={`px-2 py-1 rounded text-sm font-medium ${
                enhancementStage.basicEnhancement.viabilityScore >= 80 ? 'bg-green-100 text-green-800' :
                enhancementStage.basicEnhancement.viabilityScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {enhancementStage.basicEnhancement.viabilityScore}/100
              </span>
            </div>
            
            {enhancementStage.basicEnhancement.suggestions.length > 0 && (
              <div className="mb-4">
                <h6 className="text-sm font-medium text-gray-700 mb-2">Key Suggestions:</h6>
                <ul className="space-y-1">
                  {enhancementStage.basicEnhancement.suggestions.map((suggestion, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {enhancementStage.basicEnhancement.keyInsights && enhancementStage.basicEnhancement.keyInsights.length > 0 && (
              <div className="mb-4">
                <h6 className="text-sm font-medium text-gray-700 mb-2">Key Insights:</h6>
                <ul className="space-y-1">
                  {enhancementStage.basicEnhancement.keyInsights.map((insight, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start">
                      <span className="text-green-500 mr-2">💡</span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {enhancementStage.basicEnhancement.nextSteps && enhancementStage.basicEnhancement.nextSteps.length > 0 && (
              <div>
                <h6 className="text-sm font-medium text-gray-700 mb-2">Next Steps:</h6>
                <ul className="space-y-1">
                  {enhancementStage.basicEnhancement.nextSteps.map((step, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start">
                      <span className="text-orange-500 mr-2">→</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Detailed Analysis Section */}
          {enhancementStage.detailedAnalysis && (
            <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-medium text-gray-900 flex items-center">
                  <span className="text-green-500 mr-2">🚀</span>
                  Detailed Analysis
                </h5>
                <span className={`px-2 py-1 rounded text-sm font-medium ${
                  enhancementStage.detailedAnalysis.viabilityScore >= 80 ? 'bg-green-100 text-green-800' :
                  enhancementStage.detailedAnalysis.viabilityScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {enhancementStage.detailedAnalysis.viabilityScore}/100
                </span>
              </div>

              {enhancementStage.detailedAnalysis.marketAnalysis && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <h6 className="text-xs font-medium text-gray-500 uppercase">Market Size</h6>
                    <p className="text-sm text-gray-800">{enhancementStage.detailedAnalysis.marketAnalysis.marketSize}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <h6 className="text-xs font-medium text-gray-500 uppercase">Competitive Advantage</h6>
                    <p className="text-sm text-gray-800">{enhancementStage.detailedAnalysis.marketAnalysis.competitiveAdvantage}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <h6 className="text-xs font-medium text-gray-500 uppercase">Target Customers</h6>
                    <p className="text-sm text-gray-800">{enhancementStage.detailedAnalysis.marketAnalysis.targetCustomers}</p>
                  </div>
                </div>
              )}

              {enhancementStage.detailedAnalysis.riskAssessment && (
                <div className="bg-gray-50 p-3 rounded mb-4">
                  <h6 className="text-xs font-medium text-gray-500 uppercase mb-2">Risk Assessment</h6>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h6 className="font-medium text-gray-700 mb-1">Technical Risks:</h6>
                      <ul className="space-y-1">
                        {enhancementStage.detailedAnalysis.riskAssessment.technicalRisks?.map((risk: string, index: number) => (
                          <li key={index} className="text-gray-600">• {risk}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h6 className="font-medium text-gray-700 mb-1">Market Risks:</h6>
                      <ul className="space-y-1">
                        {enhancementStage.detailedAnalysis.riskAssessment.marketRisks?.map((risk: string, index: number) => (
                          <li key={index} className="text-gray-600">• {risk}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {enhancementStage.detailedAnalysis.suggestions && enhancementStage.detailedAnalysis.suggestions.length > 0 && (
                <div>
                  <h6 className="text-sm font-medium text-gray-700 mb-2">Detailed Recommendations:</h6>
                  <ul className="space-y-1">
                    {enhancementStage.detailedAnalysis.suggestions.map((suggestion, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start">
                        <span className="text-green-500 mr-2">•</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Validation Section */}
          {enhancementStage.validation && (
            <div className="bg-white rounded-lg p-4 border-l-4 border-purple-500">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-medium text-gray-900 flex items-center">
                  <span className="text-purple-500 mr-2">✅</span>
                  Validation Results
                </h5>
                <span className={`px-2 py-1 rounded text-sm font-medium ${
                  enhancementStage.validation.viabilityScore >= 80 ? 'bg-green-100 text-green-800' :
                  enhancementStage.validation.viabilityScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {enhancementStage.validation.viabilityScore}/100
                </span>
              </div>

              {enhancementStage.validation.validationResults && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <h6 className="text-xs font-medium text-gray-500 uppercase">Problem-Solution Fit</h6>
                    <p className="text-sm text-gray-800">{enhancementStage.validation.validationResults.problemSolutionFit}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <h6 className="text-xs font-medium text-gray-500 uppercase">Market Demand</h6>
                    <p className="text-sm text-gray-800">{enhancementStage.validation.validationResults.marketDemand}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <h6 className="text-xs font-medium text-gray-500 uppercase">Business Model Viability</h6>
                    <p className="text-sm text-gray-800">{enhancementStage.validation.validationResults.businessModelViability}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <h6 className="text-xs font-medium text-gray-500 uppercase">Execution Feasibility</h6>
                    <p className="text-sm text-gray-800">{enhancementStage.validation.validationResults.executionFeasibility}</p>
                  </div>
                </div>
              )}

              {enhancementStage.validation.criticalIssues && enhancementStage.validation.criticalIssues.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <h6 className="text-sm font-medium text-red-800 mb-2">⚠️ Critical Issues:</h6>
                  <ul className="space-y-1">
                    {enhancementStage.validation.criticalIssues.map((issue, index) => (
                      <li key={index} className="text-sm text-red-700 flex items-start">
                        <span className="text-red-500 mr-2">•</span>
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {enhancementStage.validation.strengthsAndWeaknesses && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <h6 className="text-sm font-medium text-green-800 mb-2">✅ Strengths:</h6>
                    <ul className="space-y-1">
                      {enhancementStage.validation.strengthsAndWeaknesses.strengths?.map((strength: string, index: number) => (
                        <li key={index} className="text-sm text-green-700 flex items-start">
                          <span className="text-green-500 mr-2">•</span>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <h6 className="text-sm font-medium text-yellow-800 mb-2">⚠️ Areas for Improvement:</h6>
                    <ul className="space-y-1">
                      {enhancementStage.validation.strengthsAndWeaknesses.weaknesses?.map((weakness: string, index: number) => (
                        <li key={index} className="text-sm text-yellow-700 flex items-start">
                          <span className="text-yellow-500 mr-2">•</span>
                          {weakness}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {enhancementStage.validation.honestAssessment && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <h6 className="text-sm font-medium text-gray-800 mb-2">🎯 Honest Assessment:</h6>
                  <p className="text-sm text-gray-700">{enhancementStage.validation.honestAssessment}</p>
                </div>
              )}
            </div>
          )}

          {/* Optimization Section - Show when complete */}
          {enhancementStage.stage === 'complete' && enhancementStage.optimizations && (
            <div className="bg-white rounded-lg p-4 border-l-4 border-purple-500">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-medium text-gray-900 flex items-center">
                  <span className="text-purple-500 mr-2">⚡</span>
                  Optimization Results
                </h5>
                <span className={`px-2 py-1 rounded text-sm font-medium ${
                  enhancementStage.score >= 80 ? 'bg-green-100 text-green-800' :
                  enhancementStage.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {enhancementStage.score}/100
                </span>
              </div>

              {enhancementStage.optimizations && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <h6 className="text-xs font-medium text-gray-500 uppercase">Value Proposition</h6>
                    <p className="text-sm text-gray-800">{enhancementStage.optimizations.valueProposition}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <h6 className="text-xs font-medium text-gray-500 uppercase">Market Strategy</h6>
                    <p className="text-sm text-gray-800">{enhancementStage.optimizations.marketStrategy}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <h6 className="text-xs font-medium text-gray-500 uppercase">Product Strategy</h6>
                    <p className="text-sm text-gray-800">{enhancementStage.optimizations.productStrategy}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <h6 className="text-xs font-medium text-gray-500 uppercase">Business Model</h6>
                    <p className="text-sm text-gray-800">{enhancementStage.optimizations.businessModel}</p>
                  </div>
                </div>
              )}

              {enhancementStage.competitiveStrategy && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <h6 className="text-sm font-medium text-blue-800 mb-2">🎯 Competitive Strategy</h6>
                  <div className="space-y-2">
                    <div>
                      <h6 className="text-xs font-medium text-blue-700 uppercase">Differentiation</h6>
                      <p className="text-sm text-blue-800">{enhancementStage.competitiveStrategy.differentiation}</p>
                    </div>
                    <div>
                      <h6 className="text-xs font-medium text-blue-700 uppercase">Positioning</h6>
                      <p className="text-sm text-blue-800">{enhancementStage.competitiveStrategy.positioning}</p>
                    </div>
                    <div>
                      <h6 className="text-xs font-medium text-blue-700 uppercase">Defensibility</h6>
                      <p className="text-sm text-blue-800">{enhancementStage.competitiveStrategy.defensibility}</p>
                    </div>
                  </div>
                </div>
              )}

              {enhancementStage.executionPlan && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <h6 className="text-sm font-medium text-green-800 mb-2">📋 Execution Plan</h6>
                  <div className="space-y-2">
                    <div>
                      <h6 className="text-xs font-medium text-green-700 uppercase">MVP Definition</h6>
                      <p className="text-sm text-green-800">{enhancementStage.executionPlan.mvpDefinition}</p>
                    </div>
                    <div>
                      <h6 className="text-xs font-medium text-green-700 uppercase">Roadmap</h6>
                      <p className="text-sm text-green-800">{enhancementStage.executionPlan.roadmap}</p>
                    </div>
                    <div>
                      <h6 className="text-xs font-medium text-green-700 uppercase">Key Milestones</h6>
                      <p className="text-sm text-green-800">{enhancementStage.executionPlan.milestones}</p>
                    </div>
                  </div>
                </div>
              )}

              {enhancementStage.successFactors && enhancementStage.successFactors.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <h6 className="text-sm font-medium text-yellow-800 mb-2">🏆 Critical Success Factors</h6>
                  <ul className="space-y-1">
                    {enhancementStage.successFactors.map((factor, index) => (
                      <li key={index} className="text-sm text-yellow-700 flex items-start">
                        <span className="text-yellow-500 mr-2">•</span>
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {enhancementStage.optimizationSummary && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <h6 className="text-sm font-medium text-gray-800 mb-2">📊 Optimization Summary</h6>
                  <p className="text-sm text-gray-700">{enhancementStage.optimizationSummary}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Target Segments - Show for both comprehensive and optimized */}
      {enhancementStage.targetSegments && (
        <div className="bg-white p-4 rounded-lg mb-4">
          <h5 className="text-sm font-medium text-gray-700 mb-3">🎯 Target Segments</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h6 className="text-xs font-medium text-gray-500 uppercase mb-2">Primary Segment</h6>
              <p className="text-sm text-gray-800 font-medium">{enhancementStage.targetSegments.primary}</p>
            </div>
            {enhancementStage.targetSegments.secondary && enhancementStage.targetSegments.secondary.length > 0 && (
              <div>
                <h6 className="text-xs font-medium text-gray-500 uppercase mb-2">Secondary Segments</h6>
                <ul className="space-y-1">
                  {enhancementStage.targetSegments.secondary.map((segment, index) => (
                    <li key={index} className="text-sm text-gray-600">• {segment}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {enhancementStage.targetSegments.demographics && (
              <div>
                <h6 className="text-xs font-medium text-gray-500 uppercase mb-2">Demographics</h6>
                <p className="text-sm text-gray-800">{enhancementStage.targetSegments.demographics}</p>
              </div>
            )}
            {enhancementStage.targetSegments.psychographics && (
              <div>
                <h6 className="text-xs font-medium text-gray-500 uppercase mb-2">Psychographics</h6>
                <p className="text-sm text-gray-800">{enhancementStage.targetSegments.psychographics}</p>
              </div>
            )}
          </div>

          {enhancementStage.targetSegments.painPoints && enhancementStage.targetSegments.painPoints.length > 0 && (
            <div className="mt-4">
              <h6 className="text-xs font-medium text-gray-500 uppercase mb-2">Key Pain Points</h6>
              <ul className="space-y-1">
                {enhancementStage.targetSegments.painPoints.map((painPoint, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start">
                    <span className="text-red-500 mr-2">•</span>
                    {painPoint}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Business Model Suggestions - Show for both comprehensive and optimized */}
      {enhancementStage.businessModelSuggestions && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h5 className="text-sm font-medium text-blue-900 mb-3">💡 AI Business Model Suggestions</h5>
          <div className="space-y-4">
            <div>
              <h6 className="text-xs font-medium text-blue-700 uppercase mb-2">Recommended Models</h6>
              <div className="flex flex-wrap gap-2">
                {enhancementStage.businessModelSuggestions.recommended.map((model, index) => (
                  <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                    {model}
                  </span>
                ))}
              </div>
            </div>
            
            {enhancementStage.businessModelSuggestions.alternatives && enhancementStage.businessModelSuggestions.alternatives.length > 0 && (
              <div>
                <h6 className="text-xs font-medium text-blue-700 uppercase mb-2">Alternative Models</h6>
                <div className="flex flex-wrap gap-2">
                  {enhancementStage.businessModelSuggestions.alternatives.map((model, index) => (
                    <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                      {model}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <h6 className="text-xs font-medium text-blue-700 uppercase mb-2">Reasoning</h6>
              <p className="text-sm text-blue-800">{enhancementStage.businessModelSuggestions.reasoning}</p>
            </div>
            
            {enhancementStage.businessModelSuggestions.revenueProjections && (
              <div>
                <h6 className="text-xs font-medium text-blue-700 uppercase mb-2">Revenue Projections</h6>
                <p className="text-sm text-blue-800">{enhancementStage.businessModelSuggestions.revenueProjections}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

