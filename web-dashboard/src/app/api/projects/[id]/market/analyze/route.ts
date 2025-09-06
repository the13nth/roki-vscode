import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { analysisVectorService } from '@/lib/analysisVectorService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { answers, step } = await request.json();

    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get relevant context using vector search
    console.log(`🔍 Getting vector search context for market analysis`);
    let vectorContext = '';
    try {
      const context = await analysisVectorService.getAnalysisContext(
        projectId,
        'market',
        Object.entries(answers).map(([key, value]) => `${key}: ${value}`).join(' ')
      );
      
      if (context.relevantDocuments.length > 0 || context.relatedAnalyses.length > 0 || context.projectInfo.length > 0) {
        vectorContext = analysisVectorService.formatContextForAnalysis(context, 'market');
        console.log(`✅ Retrieved vector context: ${context.relevantDocuments.length} docs, ${context.relatedAnalyses.length} analyses, ${context.projectInfo.length} project info`);
      } else {
        console.log('⚠️ No relevant context found via vector search');
      }
    } catch (error) {
      console.error('❌ Failed to get vector search context:', error);
      // Continue without vector context rather than failing
    }

    // Get project context (fallback to existing method)
    const contextResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/projects/${projectId}/context/full`);
    const contextData = await contextResponse.json();
    const projectContext = contextData.context || '';

    const contextSection = vectorContext ? `\n\n## RELEVANT PROJECT CONTEXT (VECTOR SEARCH):\n${vectorContext}` : '';

    // Create comprehensive market analysis prompt
    const analysisPrompt = `
You are a market research expert analyzing a business project. Based on the project context and the provided answers, generate a comprehensive market analysis.

## PROJECT CONTEXT:
${projectContext}${contextSection}

## MARKET RESEARCH DATA:
${Object.entries(answers).map(([key, value]) => `**${key.replace(/_/g, ' ').toUpperCase()}**: ${value}`).join('\n\n')}

## ANALYSIS REQUIREMENTS:

Please provide a detailed market analysis covering all 7 MRP (Market Research Process) steps:

### 1. TARGET MARKET ANALYSIS
- Detailed market segmentation analysis
- Customer persona development
- Market size and opportunity assessment
- Geographic and demographic breakdown
- Psychographic and behavioral analysis

### 2. CUSTOMER PAIN POINTS ANALYSIS
- Pain point prioritization and validation
- Problem-solution fit assessment
- Customer journey mapping
- Unmet needs identification
- Pain point intensity analysis

### 3. COMPETITIVE ANALYSIS
- Direct and indirect competitor identification
- Competitive positioning matrix
- SWOT analysis of key competitors
- Market share analysis
- Competitive advantage assessment

### 4. PRODUCT VALIDATION
- Feature-market fit analysis
- Product differentiation assessment
- Value proposition validation
- Feature prioritization
- Product-market fit indicators

### 5. PRICING STRATEGY ANALYSIS
- Pricing model evaluation
- Price sensitivity analysis
- Competitive pricing comparison
- Value-based pricing assessment
- Pricing optimization recommendations

### 6. MARKET FEEDBACK ANALYSIS
- Feedback collection methodology review
- Customer satisfaction metrics
- Net Promoter Score (NPS) analysis
- Feedback loop effectiveness
- Iteration strategy assessment

### 7. MARKET DEMAND ASSESSMENT
- Total Addressable Market (TAM) calculation
- Serviceable Addressable Market (SAM) analysis
- Serviceable Obtainable Market (SOM) estimation
- Market growth projections
- Demand validation indicators

## OUTPUT FORMAT:
Provide specific, actionable insights with data-driven recommendations. Include market metrics, competitive benchmarks, and strategic recommendations for market entry and growth.

Focus on providing detailed analysis that helps understand market opportunities, competitive positioning, and customer needs.`;

    // Call AI service to generate the analysis
    const aiResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/ai/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal-key'}`
      },
      body: JSON.stringify({
        prompt: analysisPrompt,
        analysisType: 'market',
        projectId: projectId,
        userId: userId
      })
    });

    if (!aiResponse.ok) {
      throw new Error('AI analysis failed');
    }

    const aiData = await aiResponse.json();
    const analysisContent = aiData.analysis || aiData.content || '';

    // Parse the analysis into structured sections
    const sections = parseAnalysisSections(analysisContent);

    const marketData = {
      targetMarket: sections.targetMarket || generateDefaultTargetMarket(answers),
      customerPainPoints: sections.customerPainPoints || generateDefaultCustomerPainPoints(answers),
      competitiveAnalysis: sections.competitiveAnalysis || generateDefaultCompetitiveAnalysis(answers),
      productValidation: sections.productValidation || generateDefaultProductValidation(answers),
      pricingStrategy: sections.pricingStrategy || generateDefaultPricingStrategy(answers),
      marketFeedback: sections.marketFeedback || generateDefaultMarketFeedback(answers),
      marketDemand: sections.marketDemand || generateDefaultMarketDemand(answers),
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(marketData);
  } catch (error) {
    console.error('Error generating market analysis:', error);
    return NextResponse.json(
      { error: 'Failed to generate market analysis' },
      { status: 500 }
    );
  }
}

function parseAnalysisSections(content: string) {
  const sections: Record<string, string> = {};
  
  // Split content into sections based on headers
  const sectionHeaders = [
    'TARGET MARKET',
    'CUSTOMER PAIN POINTS',
    'COMPETITIVE ANALYSIS',
    'PRODUCT VALIDATION',
    'PRICING STRATEGY',
    'MARKET FEEDBACK',
    'MARKET DEMAND'
  ];

  sectionHeaders.forEach(header => {
    const regex = new RegExp(`###?\\s*${header}[\\s\\S]*?(?=###?\\s*[A-Z]|$)`, 'i');
    const match = content.match(regex);
    if (match) {
      sections[header.toLowerCase().replace(/\s+/g, '')] = match[0].trim();
    }
  });

  return sections;
}

// Default generators for each section
function generateDefaultTargetMarket(answers: Record<string, string>) {
  return `## Target Market Analysis

Based on the provided information, here's a comprehensive analysis of your target market:

**Primary Market Segments:**
${answers.target_market || 'Target market information not provided'}

**Market Characteristics:**
- Demographics: [To be analyzed based on your specific market]
- Psychographics: [Customer values, interests, and lifestyle factors]
- Behavioral patterns: [Purchasing habits and decision-making processes]

**Market Size Estimation:**
- Total Addressable Market (TAM): [Industry-wide opportunity]
- Serviceable Addressable Market (SAM): [Realistic market segment]
- Serviceable Obtainable Market (SOM): [Achievable market share]

**Recommendations:**
- Focus on the most promising customer segments
- Develop detailed buyer personas
- Validate market assumptions through research`;
}

function generateDefaultCustomerPainPoints(answers: Record<string, string>) {
  return `## Customer Pain Points Analysis

**Identified Pain Points:**
${answers.customer_pain_points || 'Customer pain points not specified'}

**Pain Point Categories:**
1. **Functional Pain Points**: Problems with current solutions
2. **Emotional Pain Points**: Frustrations and negative feelings
3. **Financial Pain Points**: Cost-related concerns
4. **Social Pain Points**: Reputation and social impact issues

**Pain Point Validation:**
- Severity assessment: [High/Medium/Low impact]
- Frequency: [How often customers experience these issues]
- Current solutions: [What customers are doing now]

**Recommendations:**
- Prioritize pain points by impact and frequency
- Validate through customer interviews
- Develop solutions that directly address top pain points`;
}

function generateDefaultCompetitiveAnalysis(answers: Record<string, string>) {
  return `## Competitive Analysis

**Competitive Landscape:**
${answers.competitive_analysis || 'Competitive analysis not provided'}

**Competitor Categories:**
1. **Direct Competitors**: Products/services that solve the same problem
2. **Indirect Competitors**: Alternative solutions to the same need
3. **Potential Competitors**: Companies that could enter your market

**Competitive Positioning:**
- Strengths and weaknesses analysis
- Market share distribution
- Pricing comparison
- Feature comparison matrix

**Competitive Advantages:**
- Unique value propositions
- Barriers to entry
- Switching costs for customers

**Recommendations:**
- Identify market gaps and opportunities
- Develop differentiation strategies
- Monitor competitor activities regularly`;
}

function generateDefaultProductValidation(answers: Record<string, string>) {
  return `## Product Validation Analysis

**Product Features:**
${answers.product_features || 'Product features not specified'}

**Feature-Market Fit Assessment:**
- Core features that address primary customer needs
- Nice-to-have features that provide competitive advantage
- Features that may not be necessary

**Value Proposition Validation:**
- Unique selling propositions
- Customer value drivers
- Competitive differentiation

**Product-Market Fit Indicators:**
- Customer satisfaction scores
- Usage metrics and engagement
- Customer retention rates
- Word-of-mouth and referrals

**Recommendations:**
- Focus on core features that solve primary pain points
- Validate features through customer feedback
- Iterate based on usage data and customer input`;
}

function generateDefaultPricingStrategy(answers: Record<string, string>) {
  return `## Pricing Strategy Analysis

**Current Pricing Approach:**
${answers.pricing_strategy || 'Pricing strategy not specified'}

**Pricing Model Evaluation:**
- Value-based pricing: Pricing based on customer value
- Competitive pricing: Pricing relative to competitors
- Cost-plus pricing: Pricing based on costs plus margin
- Freemium model: Free basic version with premium features

**Price Sensitivity Analysis:**
- Customer willingness to pay
- Price elasticity of demand
- Competitive price positioning

**Pricing Optimization:**
- A/B testing different price points
- Tiered pricing strategies
- Dynamic pricing opportunities

**Recommendations:**
- Test pricing with target customers
- Consider value-based pricing models
- Monitor competitor pricing changes
- Optimize pricing based on customer feedback`;
}

function generateDefaultMarketFeedback(answers: Record<string, string>) {
  return `## Market Feedback Analysis

**Feedback Collection Methods:**
${answers.market_feedback || 'Market feedback processes not specified'}

**Feedback Channels:**
- Customer surveys and interviews
- User testing and usability studies
- Social media monitoring
- Customer support interactions
- Product analytics and usage data

**Key Metrics:**
- Net Promoter Score (NPS)
- Customer Satisfaction (CSAT)
- Customer Effort Score (CES)
- Feature usage analytics
- Customer retention rates

**Feedback Loop Process:**
- Data collection and analysis
- Insight generation and prioritization
- Product iteration and improvement
- Customer communication and updates

**Recommendations:**
- Implement systematic feedback collection
- Create feedback analysis processes
- Establish regular customer touchpoints
- Use feedback to drive product decisions`;
}

function generateDefaultMarketDemand(answers: Record<string, string>) {
  return `## Market Demand Assessment

**Market Size Analysis:**
${answers.market_demand || 'Market demand assessment not provided'}

**Market Sizing Framework:**
1. **Total Addressable Market (TAM)**: Total market demand
2. **Serviceable Addressable Market (SAM)**: Realistic market segment
3. **Serviceable Obtainable Market (SOM)**: Achievable market share

**Demand Validation Indicators:**
- Market growth trends and projections
- Customer demand signals
- Competitive market activity
- Industry investment and funding

**Market Entry Strategy:**
- Go-to-market approach
- Customer acquisition strategy
- Market penetration tactics
- Scaling and growth plans

**Recommendations:**
- Validate market demand through research
- Start with a focused market segment
- Build demand through customer education
- Scale based on proven demand indicators`;
}

