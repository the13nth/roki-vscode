import { NextRequest, NextResponse } from 'next/server';
import { pineconeSyncService } from '@/lib/pineconeSyncService';
import { TokenTrackingService } from '@/lib/tokenTrackingService';
import { getGoogleAIConfig, validateSecureConfig } from '@/lib/secureConfig';
import { promises as fs } from 'fs';
import path from 'path';
import { auth } from '@clerk/nextjs/server';

const tokenTrackingService = new TokenTrackingService();

interface ApiConfiguration {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

function getGlobalConfigPath(): string {
  return path.join(process.cwd(), '.ai-project', 'global-api-config.json');
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { context, analysisType = 'comprehensive', fetchOnly = false } = await request.json();

    console.log(`🔍 Starting ${analysisType} analysis for project ${id}`);
    if (fetchOnly) {
      console.log('📚 Fetching documents only (no analysis)');
    }

    // Fetch documents from Pinecone instead of relying on context parameter
    console.log('📚 Fetching documents from Pinecone...');
    const pineconeResult = await pineconeSyncService.downloadProject(id);

    let project, documents, contextDocuments;

    if (pineconeResult.success) {
      const data = pineconeResult.data;
      project = data.project;
      documents = data.documents;
      contextDocuments = data.contextDocuments;
      console.log('✅ Successfully fetched documents from Pinecone');
    } else {
      console.warn('⚠️ Failed to fetch from Pinecone, falling back to file system:', pineconeResult.message);

      // Fallback to file system
      try {

        // Get project config
        const projectResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/projects/${id}`);
        if (!projectResponse.ok) {
          throw new Error('Failed to fetch project config');
        }
        const projectData = await projectResponse.json();

        project = {
          name: projectData.name,
          projectPath: projectData.projectPath,
          progress: projectData.progress
        };

        // Get context documents from file system
        const contextResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/projects/${id}/context/full`);
        if (contextResponse.ok) {
          const contextData = await contextResponse.json();
          contextDocuments = contextData.contextDocs || [];
        } else {
          contextDocuments = [];
        }

        // Get main documents from file system
        documents = [];
        const docTypes = ['requirements', 'design', 'tasks'];
        for (const docType of docTypes) {
          try {
            const docResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/projects/${id}/documents/${docType}`);
            if (docResponse.ok) {
              const docData = await docResponse.json();
              if (docData.content) {
                documents.push({
                  title: `${docType.charAt(0).toUpperCase() + docType.slice(1)}`,
                  documentType: docType,
                  content: docData.content,
                  filename: `${docType}.md`
                });
              }
            }
          } catch (error) {
            console.warn(`Failed to fetch ${docType} document:`, error);
          }
        }

        console.log('✅ Successfully fetched documents from file system');
      } catch (error) {
        console.error('❌ Failed to fetch documents from file system:', error);
        return NextResponse.json(
          { error: 'Failed to fetch project documents from both cloud storage and file system' },
          { status: 500 }
        );
      }
    }

    console.log(`📊 Retrieved from Pinecone:`);
    console.log(`  - Project metadata: ${project ? 'Yes' : 'No'}`);
    console.log(`  - Project documents: ${documents?.length || 0}`);
    console.log(`  - Context documents: ${contextDocuments?.length || 0}`);

    // Debug context documents
    if (contextDocuments && contextDocuments.length > 0) {
      console.log('📚 Context documents details:');
      contextDocuments.forEach((doc: any, index: number) => {
        console.log(`  ${index + 1}. ${doc.title || doc.filename} (${doc.category || 'no category'}) - Type: ${doc.type || 'no type'}`);
      });
    } else {
      console.log('⚠️ No context documents found - this might indicate a sync or query issue');
    }

    // If fetchOnly is true, return the documents without analysis
    if (fetchOnly) {
      console.log('📚 Returning documents for display');
      return NextResponse.json({
        projectDocuments: documents || [],
        contextDocuments: contextDocuments || [],
        project: project
      });
    }

    // Build comprehensive context from Pinecone data
    let analysisContext = `# Project Analysis Context\n\n`;

    // Add project overview
    analysisContext += `## Project Overview\n`;
    analysisContext += `- **Project ID:** ${id}\n`;
    if (project) {
      analysisContext += `- **Name:** ${project.name || 'Unknown'}\n`;
      analysisContext += `- **Path:** ${project.projectPath || 'Unknown'}\n`;
      if (project.progress) {
        analysisContext += `- **Progress:** ${project.progress.completedTasks || 0}/${project.progress.totalTasks || 0} tasks completed\n`;
      }
    }
    analysisContext += `\n`;

    // Add project documents (requirements, design, tasks)
    if (documents && documents.length > 0) {
      console.log('📋 Adding project documents to analysis context...');
      documents.forEach((doc: any, index: number) => {
        console.log(`  ${index + 1}. ${doc.title || doc.filename} (${doc.documentType})`);
        analysisContext += `## ${doc.title || doc.filename}\n`;
        analysisContext += `${doc.content}\n\n`;
      });
    }

    // Add context documents
    if (contextDocuments && contextDocuments.length > 0) {
      console.log('📚 Adding context documents to analysis context...');
      analysisContext += `## Context Documents\n`;
      contextDocuments.forEach((doc: any, index: number) => {
        console.log(`  ${index + 1}. ${doc.title || doc.filename} (${doc.category})`);
        analysisContext += `### ${doc.title || doc.filename}\n`;
        analysisContext += `${doc.content}\n\n`;
      });
    }

    console.log(`📝 Total analysis context length: ${analysisContext.length} characters`);

    // Validate secure configuration
    const configValidation = validateSecureConfig();
    if (!configValidation.isValid) {
      console.error('❌ Secure configuration validation failed:', configValidation.errors);
      return NextResponse.json(
        { error: `Configuration error: ${configValidation.errors.join(', ')}` },
        { status: 500 }
      );
    }

    // Try to get Google AI configuration from environment
    let apiConfig: ApiConfiguration;
    try {
      apiConfig = getGoogleAIConfig();
      console.log('✅ Using secure Google AI configuration from environment');
    } catch (error) {
      console.warn('⚠️ Failed to get Google AI config from environment, falling back to global config file');
      
      // Fallback to global configuration file
      const globalConfigPath = getGlobalConfigPath();
      if (!await fileExists(globalConfigPath)) {
        return NextResponse.json(
          { error: 'No AI configuration found. Please set GOOGLE_AI_API_KEY environment variable or configure an AI provider in the global settings.' },
          { status: 400 }
        );
      }

      const globalConfigData = await fs.readFile(globalConfigPath, 'utf8');
      apiConfig = JSON.parse(globalConfigData);
    }

    // Determine max tokens based on analysis type
    let maxTokens = 4000;
    if (analysisType === 'comprehensive') {
      maxTokens = 8000;
    }

    console.log(`🤖 Using AI provider: ${apiConfig.provider} with model: ${apiConfig.model}`);

    // Generate analysis prompt based on type
    let prompt = '';
    if (analysisType === 'comprehensive') {
      prompt = `Please provide a comprehensive analysis of this project based on the provided context. Structure your response with the following sections:

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

For each section, provide detailed, actionable insights based on the project documents and context provided. Use bullet points, numbered lists, and clear formatting for better readability. Be specific and provide concrete examples where possible.`;
    } else if (analysisType === 'technical') {
      prompt = `Please provide a technical analysis of this project focusing on:

1. **Architecture Review**: Assessment of the technical architecture and design
2. **Technology Stack**: Evaluation of chosen technologies and their suitability
3. **Implementation Strategy**: Analysis of the development approach and methodology
4. **Technical Challenges**: Identification of potential technical hurdles
5. **Performance Considerations**: Scalability and performance implications
6. **Technical Recommendations**: Specific technical improvements and optimizations

Focus on technical aspects and provide detailed technical insights.`;
    } else if (analysisType === 'business') {
      prompt = `Please provide a business analysis of this project focusing on:

1. **Market Analysis**: Assessment of market opportunity and positioning
2. **Business Model**: Evaluation of revenue streams and business strategy
3. **Competitive Landscape**: Analysis of competitive advantages and market positioning
4. **Customer Value**: Assessment of value proposition and customer benefits
5. **Growth Potential**: Evaluation of scalability and expansion opportunities
6. **Business Recommendations**: Strategic recommendations for business success

Focus on business aspects and market opportunities.`;
    } else if (analysisType === 'insights') {
      prompt = `Please provide key technical insights about this project focusing on:

1. **Technical Insights**: 3-5 important technical observations about the project's architecture, approach, and implementation
2. **Technology Assessment**: Evaluation of the chosen technologies and their suitability
3. **Implementation Insights**: Key insights about the development approach and methodology

Focus on technical insights and provide actionable observations.`;
    } else if (analysisType === 'recommendations') {
      prompt = `Please provide technical recommendations for this project focusing on:

1. **Technical Recommendations**: 3-5 actionable technical recommendations for improvement
2. **Implementation Suggestions**: Specific suggestions for better implementation
3. **Optimization Opportunities**: Areas where the project can be optimized

Focus on actionable technical recommendations.`;
    } else if (analysisType === 'risks') {
      prompt = `Please provide a technical risk assessment for this project focusing on:

1. **Technical Risks**: 3-5 potential technical challenges and risks
2. **Implementation Risks**: Risks related to the development approach
3. **Mitigation Strategies**: Suggested strategies to address these risks

Focus on technical risks and mitigation strategies.`;
    } else if (analysisType === 'market') {
      prompt = `Please provide a comprehensive market analysis for this project focusing on:

1. **Market Position**: Detailed assessment of market opportunity, target market segments, and positioning strategy
2. **Competitive Advantages**: Analysis of competitive advantages, unique selling propositions, and market differentiation
3. **Market Gaps**: Identification of market gaps, underserved customer needs, and opportunities for innovation
4. **Industry Trends**: Relevant industry trends, technological developments, and their impact on the project
5. **Competitive Threats**: Potential competitive threats, market challenges, and risk factors
6. **Market Size**: Addressable market size, growth potential, and market penetration opportunities

Focus on providing detailed, data-driven insights about the market landscape and competitive positioning. Use specific examples and concrete analysis.`;
    } else if (analysisType === 'differentiation') {
      prompt = `Please provide a comprehensive differentiation analysis for this project focusing on:

1. **Unique Value Propositions**: Key unique value propositions, core benefits, and customer value drivers
2. **Competitive Differentiators**: How the project differentiates from competitors, unique features, and competitive moats
3. **Innovation Opportunities**: Areas where the project can innovate, emerging technologies, and creative solutions
4. **Suggested Features**: Potential features that could enhance differentiation, user experience improvements, and functionality enhancements
5. **Brand Positioning**: Strategic positioning, messaging, and brand differentiation opportunities
6. **Customer Experience**: Unique customer experience elements, user journey improvements, and service differentiation

Focus on providing detailed analysis of competitive advantages and differentiation strategies. Include specific examples and actionable recommendations.`;
    } else if (analysisType === 'financial') {
      prompt = `Please provide a comprehensive financial analysis for this project focusing on:

1. **Development Costs**: Detailed breakdown of development costs, including technology, personnel, infrastructure, and operational expenses
2. **Revenue Projections**: Multi-year revenue projections, pricing strategies, revenue streams, and growth assumptions
3. **ROI Analysis**: Return on investment analysis, break-even point calculations, payback period, and profitability metrics
4. **Funding Requirements**: Total funding requirements, funding phases, capital allocation, and investment milestones
5. **Risk Factors**: Financial risk factors, market risks, operational risks, and mitigation strategies
6. **Cash Flow Analysis**: Cash flow projections, working capital requirements, and financial sustainability
7. **Valuation Considerations**: Potential valuation metrics, exit strategies, and long-term financial planning

Focus on providing detailed financial projections with realistic assumptions and comprehensive cost analysis. Include specific numbers and timelines where possible.`;
    } else if (analysisType === 'bmc') {
      prompt = `Please create a comprehensive Business Model Canvas for this project. Analyze the project details and fill out each of the 9 building blocks with specific, actionable content:

1. **Key Partnerships**: Who are the key partners and suppliers? What key resources are we acquiring from partners? What key activities do partners perform?
2. **Key Activities**: What key activities does our value proposition require? Our distribution channels? Customer relationships? Revenue streams?
3. **Key Resources**: What key resources does our value proposition require? Our distribution channels? Customer relationships? Revenue streams?
4. **Value Proposition**: What value do we deliver to the customer? Which customer problems are we solving? What bundles of products and services are we offering?
5. **Customer Relationships**: What type of relationship does each customer segment expect? How are they integrated with the rest of our business model? How costly are they?
6. **Channels**: Through which channels do our customer segments want to be reached? How are we reaching them now? How are our channels integrated? Which ones work best?
7. **Customer Segments**: For whom are we creating value? Who are our most important customers?
8. **Cost Structure**: What are the most important costs inherent in our business model? Which key resources are most expensive? Which key activities are most expensive?
9. **Revenue Streams**: For what value are our customers really willing to pay? For what do they currently pay? How are they currently paying? How would they prefer to pay? How much does each revenue stream contribute to overall revenues?

For each section, provide detailed, specific content based on the project context. Focus on practical, implementable elements rather than generic descriptions.`;
    } else if (analysisType === 'roast') {
      prompt = `Please provide a brutally honest critique of this project idea. Be direct and critical:

1. **Brutal Critique**: 3-5 brutally honest criticisms of the project
2. **Reality Check**: Harsh reality checks about the project's viability
3. **Market Reality**: Honest assessment of market challenges
4. **Improvements Needed**: What needs to be improved or changed
5. **Honest Advice**: Direct, honest advice about the project

Be brutally honest and critical - don't sugarcoat anything.`;
    }

    // Call AI service
    let analysisResult;
    try {
      if (apiConfig.provider === 'google') {
        // Check if context is too long for Gemini (limit is ~30k characters)
        const maxContextLength = 25000;
        let truncatedContext = analysisContext;
        if (analysisContext.length > maxContextLength) {
          console.warn(`⚠️ Context too long (${analysisContext.length} chars), truncating to ${maxContextLength} chars`);
          truncatedContext = analysisContext.substring(0, maxContextLength) + '\n\n[Content truncated due to length limits]';
        }

        const requestBody = {
          contents: [{
            parts: [{
              text: `${prompt}\n\n${truncatedContext}`
            }]
          }],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: 0.3,
          }
        };

        console.log(`🤖 Sending request to Gemini API with ${truncatedContext.length} characters of context`);

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${apiConfig.model}:generateContent?key=${apiConfig.apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Gemini API error ${response.status}:`, errorText);
          throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        const content = result.candidates[0].content.parts[0].text;

        // Parse the response to extract structured data
        const sections = content.split(/\*\*\d+\.\s*[^*]*\*\*/);
        const summary = sections[0]?.trim() || content.substring(0, 200) + '...';

        const insights: any[] = [];
        const recommendations: any[] = [];
        const risks: any[] = [];
        const nextSteps: any[] = [];
        let marketAnalysis: any = null;
        let differentiationAnalysis: any = null;
        let financialProjections: any = null;
        let businessModelCanvas: any = null;

        // Find all section headers and their content
        const sectionMatches = content.match(/\*\*\d+\.\s*([^*]*)\*\*([\s\S]*?)(?=\*\*\d+\.|$)/g);

        if (sectionMatches) {
          sectionMatches.forEach((match: any) => {
            const headerMatch = match.match(/\*\*\d+\.\s*([^*]*)\*\*/);
            if (headerMatch) {
              const title = headerMatch[1].trim();
              const content = match.replace(/\*\*\d+\.\s*[^*]*\*\*/, '').trim();

              if (title.toLowerCase().includes('insight')) {
                insights.push({ title, content });
              } else if (title.toLowerCase().includes('recommendation') || title.toLowerCase().includes('suggestion')) {
                recommendations.push({ title, content });
              } else if (title.toLowerCase().includes('risk')) {
                risks.push({ title, content });
              } else if (title.toLowerCase().includes('next step')) {
                nextSteps.push({ title, content });
              } else if (title.toLowerCase().includes('market') || title.toLowerCase().includes('market analysis')) {
                marketAnalysis = { title, content };
              } else if (title.toLowerCase().includes('differentiation') || title.toLowerCase().includes('competitive')) {
                differentiationAnalysis = { title, content };
              } else if (title.toLowerCase().includes('financial') || title.toLowerCase().includes('cost') || title.toLowerCase().includes('revenue')) {
                financialProjections = { title, content };
              }
            }
          });
        }

        // Special handling for BMC analysis
        if (analysisType === 'bmc') {
          const bmcSections = {
            keyPartnerships: '',
            keyActivities: '',
            keyResources: '',
            valueProposition: '',
            customerRelationships: '',
            channels: '',
            customerSegments: '',
            costStructure: '',
            revenueStreams: ''
          };

          // Extract BMC sections from content - try multiple patterns
          console.log('🔍 Parsing BMC content...');
          console.log('📝 Raw content preview:', content.substring(0, 500));

          // Try different regex patterns for BMC sections
          let bmcMatches = content.match(/\*\*\d+\.\s*([^*]*)\*\*([\s\S]*?)(?=\*\*\d+\.|$)/g);

          if (!bmcMatches) {
            // Try alternative pattern without numbered sections
            bmcMatches = content.match(/\*\*([^*]*)\*\*([\s\S]*?)(?=\*\*[^*]*\*\*|$)/g);
          }

          if (bmcMatches) {
            console.log(`📊 Found ${bmcMatches.length} BMC sections`);
            bmcMatches.forEach((match: any, index: number) => {
              // Try both patterns for header extraction
              let headerMatch = match.match(/\*\*\d+\.\s*([^*]*)\*\*/);
              if (!headerMatch) {
                headerMatch = match.match(/\*\*([^*]*)\*\*/);
              }

              if (headerMatch) {
                const title = headerMatch[1].trim().toLowerCase();
                const sectionContent = match.replace(/\*\*[^*]*\*\*/, '').trim();
                console.log(`  ${index + 1}. "${title}" -> ${sectionContent.substring(0, 100)}...`);

                if (title.includes('key partnerships') || title.includes('partnerships')) {
                  bmcSections.keyPartnerships = sectionContent;
                } else if (title.includes('key activities') || title.includes('activities')) {
                  bmcSections.keyActivities = sectionContent;
                } else if (title.includes('key resources') || title.includes('resources')) {
                  bmcSections.keyResources = sectionContent;
                } else if (title.includes('value proposition') || title.includes('value')) {
                  bmcSections.valueProposition = sectionContent;
                } else if (title.includes('customer relationships') || title.includes('relationships')) {
                  bmcSections.customerRelationships = sectionContent;
                } else if (title.includes('channels')) {
                  bmcSections.channels = sectionContent;
                } else if (title.includes('customer segments') || title.includes('segments')) {
                  bmcSections.customerSegments = sectionContent;
                } else if (title.includes('cost structure') || title.includes('costs')) {
                  bmcSections.costStructure = sectionContent;
                } else if (title.includes('revenue streams') || title.includes('revenue')) {
                  bmcSections.revenueStreams = sectionContent;
                }
              }
            });
          } else {
            console.warn('⚠️ No BMC sections found in content, trying fallback parsing...');
            // Fallback: try to extract content by looking for common BMC keywords
            const fallbackSections = [
              { key: 'keyPartnerships', patterns: ['key partnerships', 'partnerships'] },
              { key: 'keyActivities', patterns: ['key activities', 'activities'] },
              { key: 'keyResources', patterns: ['key resources', 'resources'] },
              { key: 'valueProposition', patterns: ['value proposition', 'value'] },
              { key: 'customerRelationships', patterns: ['customer relationships', 'relationships'] },
              { key: 'channels', patterns: ['channels'] },
              { key: 'customerSegments', patterns: ['customer segments', 'segments'] },
              { key: 'costStructure', patterns: ['cost structure', 'costs'] },
              { key: 'revenueStreams', patterns: ['revenue streams', 'revenue'] }
            ];

            fallbackSections.forEach(section => {
              for (const pattern of section.patterns) {
                const regex = new RegExp(`${pattern}[:\\s]*([\\s\\S]*?)(?=(?:key partnerships|key activities|key resources|value proposition|customer relationships|channels|customer segments|cost structure|revenue streams)|$)`, 'i');
                const match = content.match(regex);
                if (match && match[1]) {
                  bmcSections[section.key as keyof typeof bmcSections] = match[1].trim();
                  console.log(`✅ Found ${pattern}: ${match[1].substring(0, 50)}...`);
                  break;
                }
              }
            });
          }

          console.log('📊 Final BMC sections:', Object.keys(bmcSections).map(key => `${key}: ${bmcSections[key as keyof typeof bmcSections] ? 'Yes' : 'No'}`));
          businessModelCanvas = bmcSections;
        }

        // Calculate token usage
        const inputTokens = Math.ceil((analysisContext.length + prompt.length) / 4); // Rough estimation: 1 token ≈ 4 characters
        const outputTokens = Math.ceil(content.length / 4);

        // Track token usage
        await tokenTrackingService.trackTokenUsage(id, inputTokens, outputTokens, `${analysisType}-analysis`);

        analysisResult = {
          summary,
          insights: insights.length > 0 ? insights : [{ title: 'Key Insights', content: 'Analysis completed successfully' }],
          recommendations: recommendations.length > 0 ? recommendations : [{ title: 'Recommendations', content: 'Consider the insights provided above' }],
          risks: risks.length > 0 ? risks : [],
          nextSteps: nextSteps.length > 0 ? nextSteps : [],
          marketAnalysis,
          differentiationAnalysis,
          financialProjections,
          businessModelCanvas,
          rawContent: content,
          timestamp: new Date().toISOString(),
          tokenUsage: {
            inputTokens,
            outputTokens,
            totalTokens: inputTokens + outputTokens,
            cost: (inputTokens / 1000) * 0.000125 + (outputTokens / 1000) * 0.000375
          }
        };

      } else if (apiConfig.provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiConfig.apiKey}`
          },
          body: JSON.stringify({
            model: apiConfig.model,
            messages: [
              {
                role: 'system',
                content: 'You are an expert project analyst providing detailed technical analysis.'
              },
              {
                role: 'user',
                content: `${prompt}\n\n${analysisContext}`
              }
            ],
            max_tokens: maxTokens,
            temperature: 0.3
          })
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const result = await response.json();
        const content = result.choices[0].message.content;

        analysisResult = {
          summary: content.substring(0, 200) + '...',
          insights: [{ title: 'Technical Analysis', content }],
          recommendations: [{ title: 'Technical Recommendations', content: 'Review the technical analysis above for specific recommendations.' }],
          rawContent: content,
          timestamp: new Date().toISOString()
        };

      } else if (apiConfig.provider === 'anthropic') {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiConfig.apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: apiConfig.model,
            max_tokens: maxTokens,
            messages: [
              {
                role: 'user',
                content: `${prompt}\n\n${analysisContext}`
              }
            ]
          })
        });

        if (!response.ok) {
          throw new Error(`Anthropic API error: ${response.status}`);
        }

        const result = await response.json();
        const content = result.content[0].text;

        analysisResult = {
          summary: content.substring(0, 200) + '...',
          insights: [{ title: 'Business Analysis', content }],
          recommendations: [{ title: 'Business Recommendations', content: 'Review the business analysis above for strategic recommendations.' }],
          rawContent: content,
          timestamp: new Date().toISOString()
        };

        // Track token usage with proper estimation
        const inputTokens = Math.ceil((analysisContext.length + prompt.length) / 4); // Rough estimation: 1 token ≈ 4 characters
        const outputTokens = Math.ceil(content.length / 4);
        await tokenTrackingService.trackTokenUsage(id, inputTokens, outputTokens, `${analysisType}-analysis`);
      } else {
        throw new Error(`Unsupported AI provider: ${apiConfig.provider}`);
      }

      console.log('✅ Analysis completed successfully');
      return NextResponse.json(analysisResult);

    } catch (error) {
      console.error('❌ AI analysis failed:', error);
      return NextResponse.json(
        { error: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Analysis route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
