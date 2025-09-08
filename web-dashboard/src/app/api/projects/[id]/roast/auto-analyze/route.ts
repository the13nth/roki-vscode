import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { analysisVectorService } from '@/lib/analysisVectorService';
import { getApiConfiguration } from '@/lib/apiConfig';
import { validateSecureConfig } from '@/lib/secureConfig';
import { getPineconeClient, PINECONE_INDEX_NAME } from '@/lib/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log(`🔥 Starting automatic roast analysis for project ${projectId}`);

    // Load all existing analyses directly from Pinecone
    const pinecone = getPineconeClient();
    console.log(`🔍 Using Pinecone index: ${PINECONE_INDEX_NAME}`);
    const index = pinecone.index(PINECONE_INDEX_NAME);
    
    // Query for analyses with a more comprehensive approach
    const queryResponse = await index.namespace('analyses').query({
      vector: new Array(1024).fill(0), // Dummy vector for metadata-only query
      filter: {
        projectId: { $eq: projectId }
      },
      topK: 100,
      includeMetadata: true,
    });

    console.log(`📊 Found ${queryResponse.matches?.length || 0} analysis matches from Pinecone`);

    const existingAnalyses: Record<string, any> = {};
    
    if (queryResponse.matches) {
      for (const match of queryResponse.matches) {
        if (match.metadata) {
          const analysisType = match.metadata.analysisType as string;
          const analysisData = match.metadata.analysisData;
          
          if (analysisType && analysisData) {
            try {
              existingAnalyses[analysisType] = typeof analysisData === 'string' 
                ? JSON.parse(analysisData) 
                : analysisData;
              console.log(`✅ Loaded ${analysisType} analysis data`);
            } catch (e) {
              console.error(`Failed to parse analysis data for ${analysisType}:`, e);
            }
          }
        }
      }
    }

    console.log(`📋 Total analyses loaded: ${Object.keys(existingAnalyses).length}`);
    console.log(`📋 Analysis types: ${Object.keys(existingAnalyses).join(', ')}`);

    // Get project context directly from Pinecone
    const contextQueryResponse = await index.namespace('documents').query({
      vector: new Array(1024).fill(0),
      filter: {
        projectId: projectId,
        documentType: 'project_context'
      },
      topK: 10,
      includeMetadata: true,
    });

    let projectContext = '';
    if (contextQueryResponse.matches && contextQueryResponse.matches.length > 0) {
      // Combine all context documents
      projectContext = contextQueryResponse.matches
        .map((match: any) => match.metadata?.content || '')
        .join('\n\n');
    }

    // Get vector context for better analysis
    let vectorContext = '';
    try {
      const context = await analysisVectorService.getAnalysisContext(
        projectId,
        'roast',
        `Project context: ${projectContext.substring(0, 1000)}`
      );
      
      if (context.relevantDocuments.length > 0 || context.relatedAnalyses.length > 0 || context.projectInfo.length > 0) {
        vectorContext = analysisVectorService.formatContextForAnalysis(context, 'roast');
        console.log(`✅ Retrieved vector context: ${context.relevantDocuments.length} docs, ${context.relatedAnalyses.length} analyses, ${context.projectInfo.length} project info`);
      }
    } catch (error) {
      console.error('❌ Failed to get vector search context:', error);
    }

    // Validate secure configuration
    const configValidation = validateSecureConfig();
    if (!configValidation.isValid) {
      console.error('❌ Invalid secure configuration:', configValidation.errors);
      return NextResponse.json(
        { error: 'Configuration validation failed', details: configValidation.errors },
        { status: 500 }
      );
    }

    const apiConfig = getApiConfiguration();
    if (!apiConfig) {
      return NextResponse.json(
        { error: 'API configuration not found' },
        { status: 500 }
      );
    }

    // Define roast sections to process sequentially with specific analysis targets
    const roastSections = [
      {
        id: 'businessModelCritique',
        title: 'Business Model Critique',
        focus: 'business model flaws, revenue model problems, value proposition weaknesses, partnership dependencies',
        targetAnalyses: ['bmc', 'financial', 'market'],
        searchQuery: 'business model canvas revenue streams value proposition partnerships'
      },
      {
        id: 'marketReality',
        title: 'Market Reality Check',
        focus: 'market size claims, competitive landscape, customer acquisition challenges, market timing issues',
        targetAnalyses: ['market', 'differentiation', 'bmc'],
        searchQuery: 'market analysis competitive landscape customer segments market size'
      },
      {
        id: 'technicalChallenges',
        title: 'Technical Challenges',
        focus: 'implementation complexity, technology stack problems, integration challenges, scalability issues',
        targetAnalyses: ['technical', 'processes'],
        searchQuery: 'technical analysis implementation complexity technology stack scalability'
      },
      {
        id: 'financialViability',
        title: 'Financial Viability',
        focus: 'revenue projections, cost estimates, cash flow issues, unit economics problems',
        targetAnalyses: ['financial', 'bmc'],
        searchQuery: 'financial analysis revenue projections cost estimates cash flow'
      },
      {
        id: 'competitiveThreats',
        title: 'Competitive Threats',
        focus: 'stronger competitors, differentiation weaknesses, market entry barriers, competitive responses',
        targetAnalyses: ['differentiation', 'market', 'bmc'],
        searchQuery: 'competitive differentiation market positioning competitive threats'
      },
      {
        id: 'executionRisks',
        title: 'Execution Risks',
        focus: 'team capabilities, timeline feasibility, resource requirements, operational complexity',
        targetAnalyses: ['processes', 'technical', 'bmc'],
        searchQuery: 'execution plan team capabilities timeline feasibility operational complexity'
      },
      {
        id: 'regulatoryHurdles',
        title: 'Regulatory Hurdles',
        focus: 'legal compliance, licensing issues, regulatory changes, industry requirements',
        targetAnalyses: ['technical', 'processes', 'market'],
        searchQuery: 'regulatory compliance legal requirements licensing industry standards'
      },
      {
        id: 'overallVerdict',
        title: 'Overall Verdict',
        focus: 'biggest red flags, success probability, critical issues, harsh recommendations',
        targetAnalyses: ['all'],
        searchQuery: 'overall assessment critical issues risks success probability'
      }
    ];

    const roastData: Record<string, string> = {};
    const contextSection = vectorContext ? `\n\n## RELEVANT PROJECT CONTEXT (VECTOR SEARCH):\n${vectorContext}` : '';

    // Process each section sequentially to avoid character limits
    for (const section of roastSections) {
      console.log(`🔥 Processing roast section: ${section.title}`);
      
      // Get vector search context for this specific section
      let sectionVectorContext = '';
      try {
        const sectionContext = await analysisVectorService.getAnalysisContext(
          projectId,
          'roast',
          section.searchQuery
        );
        
        if (sectionContext.relevantDocuments.length > 0 || sectionContext.relatedAnalyses.length > 0) {
          sectionVectorContext = analysisVectorService.formatContextForAnalysis(sectionContext, 'roast');
          console.log(`✅ Retrieved section-specific context: ${sectionContext.relevantDocuments.length} docs, ${sectionContext.relatedAnalyses.length} analyses`);
        }
      } catch (error) {
        console.error(`❌ Failed to get section vector context for ${section.id}:`, error);
      }

      // Filter analyses for this section
      let sectionAnalyses: Record<string, any> = {};
      if (section.targetAnalyses.includes('all')) {
        sectionAnalyses = existingAnalyses;
      } else {
        for (const analysisType of section.targetAnalyses) {
          if (existingAnalyses[analysisType]) {
            sectionAnalyses[analysisType] = existingAnalyses[analysisType];
          }
        }
      }

      console.log(`📊 Using ${Object.keys(sectionAnalyses).length} analyses for ${section.title}: ${Object.keys(sectionAnalyses).join(', ')}`);
      
      const sectionPrompt = `
You are an experienced business consultant and startup advisor with a reputation for providing honest, constructive feedback. Your role is to identify potential issues and provide actionable recommendations to help improve this project. Be direct and critical when necessary, but maintain a professional, constructive tone.

## PROJECT CONTEXT:
${projectContext}${contextSection}

## SECTION-SPECIFIC CONTEXT:
${sectionVectorContext}

## RELEVANT ANALYSES FOR THIS SECTION:
${Object.entries(sectionAnalyses).map(([key, value]) => `**${key.toUpperCase()}**: ${JSON.stringify(value, null, 2)}`).join('\n\n')}

## ANALYSIS FOCUS: ${section.title}
Focus specifically on: ${section.focus}

## ANALYSIS REQUIREMENTS:
Provide a professional critical analysis for this specific area. Be honest and direct about issues while maintaining constructive guidance. Use specific examples from the project data. Structure your response as follows:

1. **Key Concerns Identified**: List the primary areas of concern in this domain
2. **Risk Assessment**: Evaluate the potential impact and likelihood of identified issues
3. **Evidence-Based Analysis**: Use specific data from the analyses to support your observations
4. **Actionable Recommendations**: Provide clear, implementable steps to address concerns

Maintain a professional tone while being thorough in your analysis. Focus on identifying real challenges that could impact project success and provide practical solutions.

Use clear, professional language that demonstrates expertise and genuine concern for project success.`;

      try {
        // Call Google AI directly for this section
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const result = await model.generateContent(sectionPrompt);
        const response = await result.response;
        const sectionContent = response.text();
        
        roastData[section.id] = sectionContent;
        console.log(`✅ Completed roast section: ${section.title}`);

        // Add a small delay between sections to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Error processing section ${section.id}:`, error);
        roastData[section.id] = generateDefaultSectionContent(section, existingAnalyses);
      }
    }

    // Add timestamp
    roastData.timestamp = new Date().toISOString();

    console.log(`🔥 Completed automatic roast analysis for project ${projectId}`);

    return NextResponse.json(roastData);

  } catch (error) {
    console.error('Error generating automatic roast analysis:', error);
    return NextResponse.json(
      { error: 'Failed to generate automatic roast analysis' },
      { status: 500 }
    );
  }
}

// Default content generators for each section
function generateDefaultSectionContent(section: any, existingAnalyses: any): string {
  const analysisKeys = Object.keys(existingAnalyses);
  const hasAnalyses = analysisKeys.length > 0;
  
  // Get relevant analyses for this section
  let sectionAnalyses: Record<string, any> = {};
  if (section.targetAnalyses.includes('all')) {
    sectionAnalyses = existingAnalyses;
  } else {
    for (const analysisType of section.targetAnalyses) {
      if (existingAnalyses[analysisType]) {
        sectionAnalyses[analysisType] = existingAnalyses[analysisType];
      }
    }
  }
  
  const relevantAnalysisKeys = Object.keys(sectionAnalyses);
  
  return `## ${section.title}

**Key Concerns Identified:**
Based on the available project data, several areas of concern have been identified in this domain:

**Risk Assessment:**
${hasAnalyses 
  ? `The existing analyses (${analysisKeys.join(', ')}) indicate potential challenges in this area that warrant careful consideration.`
  : 'Without comprehensive analysis data, this area presents uncertainties that require thorough evaluation.'
}

**Relevant Analysis Data:**
${relevantAnalysisKeys.length > 0 
  ? `This section should focus on: ${relevantAnalysisKeys.join(', ')} analyses. However, the AI analysis encountered processing issues.`
  : 'No relevant analysis data found for this section.'
}

**Evidence-Based Analysis:**
- **Data Availability**: ${hasAnalyses ? 'Analysis data exists but may indicate areas for improvement' : 'Limited analysis data available - this represents a potential risk'}
- **Assumption Validation**: Key assumptions in this area may require further validation
- **Implementation Considerations**: Current approach may benefit from additional planning

**Actionable Recommendations:**
- Conduct comprehensive analysis of this area
- Validate key assumptions with market research
- Develop contingency plans for identified risks
- Consider alternative approaches where appropriate

**Summary:** This area requires focused attention and strategic planning to ensure project success.`;
}
