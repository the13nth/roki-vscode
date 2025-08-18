'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Code2, 
  Brain, 
  TrendingUp, 
  Zap, 
  DollarSign, 
  Grid3X3, 
  Flame,
  Share2,
  Copy,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface Prompt {
  id: string;
  name: string;
  description: string;
  category: 'analysis' | 'social' | 'other';
  process: string;
  prompt: string;
  variables: string[];
  icon: React.ReactNode;
  color: string;
}

interface PromptsViewerProps {
  projectId: string;
}

export function PromptsViewer({ projectId }: PromptsViewerProps) {
  const [selectedPrompt, setSelectedPrompt] = useState<string>('technical');
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

  // All prompts extracted from the codebase
  const prompts: Prompt[] = [
    {
      id: 'comprehensive',
      name: 'Comprehensive Analysis',
      description: 'Complete project analysis covering all aspects',
      category: 'analysis',
      process: 'Project Analysis → Comprehensive Analysis',
      variables: ['analysisContext', 'projectDocuments', 'contextDocuments'],
      icon: <Brain className="w-4 h-4" />,
      color: 'bg-blue-50 border-blue-200',
      prompt: `Please provide a comprehensive analysis of this project based on the provided context. Structure your response with the following sections:

1. **Project Summary**: A clear overview of what the project aims to achieve, its core value proposition, and target audience
2. **Key Insights**: 3-5 important observations about the project's scope, approach, and potential with specific details
3. **Technical Assessment**: Evaluation of the technical approach, architecture decisions, technology stack, and implementation strategy
4. **Business Analysis**: Market positioning, competitive advantages, business model insights, and revenue potential
5. **Risk Assessment**: Potential challenges, technical risks, market risks, and specific mitigation strategies
6. **Market Analysis**: Detailed market opportunity analysis, competitive landscape assessment, industry trends, and market gaps
7. **Differentiation Analysis**: Unique value propositions, competitive advantages, innovation opportunities, and suggested features
8. **Financial Projections**: Development costs breakdown, revenue projections, ROI analysis, and funding requirements
9. **Recommendations**: 3-5 actionable recommendations for improvement, optimization, and strategic direction
10. **Next Steps**: Specific actionable steps with timelines, priorities, and resource requirements to move the project forward

For each section, provide detailed, actionable insights based on the project documents and context provided. Use bullet points, numbered lists, and clear formatting for better readability. Be specific and provide concrete examples where possible.`
    },
    {
      id: 'technical',
      name: 'Technical Analysis',
      description: 'Focus on technical architecture and implementation',
      category: 'analysis',
      process: 'Project Analysis → Technical Analysis',
      variables: ['analysisContext', 'projectDocuments', 'techStack'],
      icon: <Code2 className="w-4 h-4" />,
      color: 'bg-green-50 border-green-200',
      prompt: `Please provide a technical analysis of this project focusing on:

1. **Architecture Review**: Assessment of the technical architecture and design
2. **Technology Stack**: Evaluation of chosen technologies and their suitability
3. **Implementation Strategy**: Analysis of the development approach and methodology
4. **Technical Challenges**: Identification of potential technical hurdles
5. **Performance Considerations**: Scalability and performance implications
6. **Technical Recommendations**: Specific technical improvements and optimizations

Focus on technical aspects and provide detailed technical insights.`
    },
    {
      id: 'market',
      name: 'Market Analysis',
      description: 'Market opportunity and competitive landscape analysis',
      category: 'analysis',
      process: 'Project Analysis → Market Analysis',
      variables: ['analysisContext', 'industryTrends', 'competitiveData'],
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'bg-purple-50 border-purple-200',
      prompt: `Please provide a comprehensive market analysis for this project focusing on:

1. **Market Position**: Detailed assessment of market opportunity, target market segments, and positioning strategy
2. **Competitive Advantages**: Analysis of competitive advantages, unique selling propositions, and market differentiation
3. **Market Gaps**: Identification of market gaps, underserved customer needs, and opportunities for innovation
4. **Industry Trends**: Relevant industry trends, technological developments, and their impact on the project
5. **Competitive Threats**: Potential competitive threats, market challenges, and risk factors
6. **Market Size**: Addressable market size, growth potential, and market penetration opportunities

Focus on providing detailed, data-driven insights about the market landscape and competitive positioning. Use specific examples and concrete analysis.`
    },
    {
      id: 'differentiation',
      name: 'Competitive Differentiation',
      description: 'Analyze competitive advantages and unique positioning',
      category: 'analysis',
      process: 'Project Analysis → Differentiation Analysis',
      variables: ['analysisContext', 'competitorData', 'marketPosition'],
      icon: <Zap className="w-4 h-4" />,
      color: 'bg-indigo-50 border-indigo-200',
      prompt: `Please provide a comprehensive differentiation analysis for this project focusing on:

1. **Unique Value Propositions**: Key unique value propositions, core benefits, and customer value drivers
2. **Competitive Differentiators**: How the project differentiates from competitors, unique features, and competitive moats
3. **Innovation Opportunities**: Areas where the project can innovate, emerging technologies, and creative solutions
4. **Suggested Features**: Potential features that could enhance differentiation, user experience improvements, and functionality enhancements
5. **Brand Positioning**: Strategic positioning, messaging, and brand differentiation opportunities
6. **Customer Experience**: Unique customer experience elements, user journey improvements, and service differentiation

Focus on providing detailed analysis of competitive advantages and differentiation strategies. Include specific examples and actionable recommendations.`
    },
    {
      id: 'financial',
      name: 'Financial Analysis',
      description: 'Financial projections and cost analysis',
      category: 'analysis',
      process: 'Project Analysis → Financial Analysis',
      variables: ['analysisContext', 'developmentCosts', 'revenueProjections'],
      icon: <DollarSign className="w-4 h-4" />,
      color: 'bg-green-50 border-green-200',
      prompt: `Please provide a comprehensive financial analysis for this project focusing on:

1. **Development Costs**: Detailed breakdown of development costs, including technology, personnel, infrastructure, and operational expenses
2. **Revenue Projections**: Multi-year revenue projections, pricing strategies, revenue streams, and growth assumptions
3. **ROI Analysis**: Return on investment analysis, break-even point calculations, payback period, and profitability metrics
4. **Funding Requirements**: Total funding requirements, funding phases, capital allocation, and investment milestones
5. **Risk Factors**: Financial risk factors, market risks, operational risks, and mitigation strategies
6. **Cash Flow Analysis**: Cash flow projections, working capital requirements, and financial sustainability
7. **Valuation Considerations**: Potential valuation metrics, exit strategies, and long-term financial planning

Focus on providing detailed financial projections with realistic assumptions and comprehensive cost analysis. Include specific numbers and timelines where possible.`
    },
    {
      id: 'bmc',
      name: 'Business Model Canvas',
      description: 'Generate comprehensive business model framework',
      category: 'analysis',
      process: 'Project Analysis → Business Model Canvas',
      variables: ['analysisContext', 'businessModel', 'valueProposition'],
      icon: <Grid3X3 className="w-4 h-4" />,
      color: 'bg-orange-50 border-orange-200',
      prompt: `Please create a comprehensive Business Model Canvas for this project. Analyze the project details and fill out each of the 9 building blocks with specific, actionable content:

1. **Key Partnerships**: Who are the key partners and suppliers? What key resources are we acquiring from partners? What key activities do partners perform?
2. **Key Activities**: What key activities does our value proposition require? Our distribution channels? Customer relationships? Revenue streams?
3. **Key Resources**: What key resources does our value proposition require? Our distribution channels? Customer relationships? Revenue streams?
4. **Value Proposition**: What value do we deliver to the customer? Which customer problems are we solving? What bundles of products and services are we offering?
5. **Customer Relationships**: What type of relationship does each customer segment expect? How are they integrated with the rest of our business model? How costly are they?
6. **Channels**: Through which channels do our customer segments want to be reached? How are we reaching them now? How are our channels integrated? Which ones work best?
7. **Customer Segments**: For whom are we creating value? Who are our most important customers?
8. **Cost Structure**: What are the most important costs inherent in our business model? Which key resources are most expensive? Which key activities are most expensive?
9. **Revenue Streams**: For what value are our customers really willing to pay? For what do they currently pay? How are they currently paying? How would they prefer to pay? How much does each revenue stream contribute to overall revenues?

For each section, provide detailed, specific content based on the project context. Focus on practical, implementable elements rather than generic descriptions.`
    },
    {
      id: 'roast',
      name: 'Project Roasting',
      description: 'Brutally honest critique and reality check',
      category: 'analysis',
      process: 'Project Analysis → Roast Analysis',
      variables: ['analysisContext', 'existingAnalyses', 'criticalReview'],
      icon: <Flame className="w-4 h-4" />,
      color: 'bg-red-50 border-red-200',
      prompt: `Based on the comprehensive analysis results provided, please provide a brutally honest critique of this project idea. Use the insights from all previous analyses to inform your criticism. Be direct and critical:

1. **Brutal Critique**: 3-5 brutally honest criticisms of the project based on the technical, market, differentiation, financial, and business model analysis
2. **Reality Check**: Harsh reality checks about the project's viability considering all the analysis results
3. **Market Reality**: Honest assessment of market challenges based on the market and competitive analysis
4. **Improvements Needed**: What needs to be improved or changed based on the comprehensive analysis
5. **Honest Advice**: Direct, honest advice about the project considering all the insights gathered

Be brutally honest and critical - don't sugarcoat anything. Use the analysis results to provide specific, informed criticism.`
    },
    {
      id: 'social-posts',
      name: 'Social Media Posts Generation',
      description: 'Generate platform-specific social media content',
      category: 'social',
      process: 'Social Posts → Content Generation',
      variables: ['platforms', 'numberOfPosts', 'tone', 'analysisResults', 'projectInfo'],
      icon: <Share2 className="w-4 h-4" />,
      color: 'bg-pink-50 border-pink-200',
      prompt: `You are a social media marketing expert. Generate {numberOfPosts} engaging social media posts for each of the following platforms: {platforms}.

{backgroundContext}

PROJECT INFORMATION:
Project Name: {projectName}
Description: {projectDescription}
Template: {projectTemplate}

REQUIREMENTS:
{requirements}

DESIGN:
{design}

PROGRESS:
{progressInfo}

ANALYSIS RESULTS:
{analysisResults}

REQUIREMENTS:
- Tone: {tone}
- {hashtagsRequirement}
- {emojisRequirement}
- Generate exactly {numberOfPosts} posts for each platform
- Each post should be unique and engaging
- Consider platform-specific character limits and best practices

{platformGuidelines}

OUTPUT FORMAT:
Return a JSON array where each object has:
{
  "platform": "platform_name",
  "content": "post_content",
  "hashtags": ["hashtag1", "hashtag2"] (if includeHashtags is true),
  "characterCount": number
}

Generate content that:
- Highlights the project's value proposition
- Uses project-specific details and insights
- Is appropriate for each platform's audience
- Follows the specified tone and requirements
- Encourages engagement (likes, shares, comments)`
    }
  ];

  const handleCopyPrompt = async (promptId: string, promptText: string) => {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopiedPrompt(promptId);
      setTimeout(() => setCopiedPrompt(null), 2000);
    } catch (error) {
      console.error('Failed to copy prompt:', error);
    }
  };

  const analysisPrompts = prompts.filter(p => p.category === 'analysis');
  const socialPrompts = prompts.filter(p => p.category === 'social');
  const otherPrompts = prompts.filter(p => p.category === 'other');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">AI Prompts Library</h1>
        <p className="text-gray-600">
          View all AI prompts used for analysis and content generation. Understand exactly what questions our AI asks about your project.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-none">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Analysis Prompts</p>
                <p className="text-2xl font-bold">{analysisPrompts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-none">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Share2 className="w-5 h-5 text-pink-600" />
              <div>
                <p className="text-sm font-medium">Social Media Prompts</p>
                <p className="text-2xl font-bold">{socialPrompts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-none">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Code2 className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm font-medium">Total Prompts</p>
                <p className="text-2xl font-bold">{prompts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Prompts by Category */}
      <Tabs defaultValue="analysis" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="analysis">Analysis Prompts</TabsTrigger>
          <TabsTrigger value="social">Social Media Prompts</TabsTrigger>
        </TabsList>

        {/* Analysis Prompts */}
        <TabsContent value="analysis" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {analysisPrompts.map((prompt) => (
              <Card key={prompt.id} className={`rounded-none ${prompt.color}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {prompt.icon}
                      <div>
                        <CardTitle className="text-lg">{prompt.name}</CardTitle>
                        <p className="text-sm text-gray-600">{prompt.description}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyPrompt(prompt.id, prompt.prompt)}
                      className="flex items-center space-x-2"
                    >
                      {copiedPrompt === prompt.id ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      <span>{copiedPrompt === prompt.id ? 'Copied!' : 'Copy'}</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Process Flow */}
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      Process: {prompt.process}
                    </Badge>
                  </div>

                  {/* Variables */}
                  <div>
                    <p className="text-sm font-medium mb-2">Variables Used:</p>
                    <div className="flex flex-wrap gap-2">
                      {prompt.variables.map((variable) => (
                        <Badge key={variable} variant="secondary" className="text-xs">
                          {`{${variable}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Prompt Content */}
                  <div>
                    <p className="text-sm font-medium mb-2">Prompt:</p>
                    <div className="bg-gray-50 border rounded p-4 max-h-64 overflow-y-auto">
                      <pre className="text-xs whitespace-pre-wrap font-mono text-gray-700">
                        {prompt.prompt}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Social Media Prompts */}
        <TabsContent value="social" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {socialPrompts.map((prompt) => (
              <Card key={prompt.id} className={`rounded-none ${prompt.color}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {prompt.icon}
                      <div>
                        <CardTitle className="text-lg">{prompt.name}</CardTitle>
                        <p className="text-sm text-gray-600">{prompt.description}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyPrompt(prompt.id, prompt.prompt)}
                      className="flex items-center space-x-2"
                    >
                      {copiedPrompt === prompt.id ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      <span>{copiedPrompt === prompt.id ? 'Copied!' : 'Copy'}</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Process Flow */}
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      Process: {prompt.process}
                    </Badge>
                  </div>

                  {/* Variables */}
                  <div>
                    <p className="text-sm font-medium mb-2">Variables Used:</p>
                    <div className="flex flex-wrap gap-2">
                      {prompt.variables.map((variable) => (
                        <Badge key={variable} variant="secondary" className="text-xs">
                          {`{${variable}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Prompt Content */}
                  <div>
                    <p className="text-sm font-medium mb-2">Prompt:</p>
                    <div className="bg-gray-50 border rounded p-4 max-h-64 overflow-y-auto">
                      <pre className="text-xs whitespace-pre-wrap font-mono text-gray-700">
                        {prompt.prompt}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Info Alert */}
      <Card className="rounded-none bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">Transparency in AI</p>
              <p className="text-sm text-blue-700 mt-1">
                All prompts shown here are the exact prompts sent to AI models. Variables in curly braces {`{}`} are replaced with your actual project data before being sent to the AI.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
