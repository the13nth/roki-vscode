import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { analysisVectorService } from '@/lib/analysisVectorService';
import { getApiConfiguration } from '@/lib/apiConfig';
import { validateSecureConfig } from '@/lib/secureConfig';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const { context, answers, step } = await request.json();

    // Get relevant context using vector search
    console.log(`🔍 Getting vector search context for financial analysis`);
    let vectorContext = '';
    try {
      const context = await analysisVectorService.getAnalysisContext(
        projectId,
        'financial',
        Object.entries(answers).map(([key, value]) => `${key}: ${value}`).join(' ')
      );
      
      if (context.relevantDocuments.length > 0 || context.relatedAnalyses.length > 0 || context.projectInfo.length > 0) {
        vectorContext = analysisVectorService.formatContextForAnalysis(context, 'financial');
        console.log(`✅ Retrieved vector context: ${context.relevantDocuments.length} docs, ${context.relatedAnalyses.length} analyses, ${context.projectInfo.length} project info`);
      } else {
        console.log('⚠️ No relevant context found via vector search');
      }
    } catch (error) {
      console.error('❌ Failed to get vector search context:', error);
      // Continue without vector context rather than failing
    }

    const contextSection = vectorContext ? `\n\n**Relevant Project Context (Vector Search):**\n${vectorContext}` : '';

    // Validate secure configuration
    const configValidation = validateSecureConfig();
    if (!configValidation.isValid) {
      console.error('❌ Secure configuration validation failed:', configValidation.errors);
      return NextResponse.json(
        { error: `Configuration error: ${configValidation.errors.join(', ')}` },
        { status: 500 }
      );
    }

    // Get the API configuration
    let apiConfig;
    try {
      apiConfig = await getApiConfiguration();
      console.log(`🔑 API Source: ${apiConfig.source.toUpperCase()}`);
      console.log(`🤖 Provider: ${apiConfig.provider}, Model: ${apiConfig.model}`);
      
      if (apiConfig.source === 'none') {
        return NextResponse.json(
          { error: 'No AI configuration found. Please set GOOGLE_AI_API_KEY environment variable or configure your personal API key in profile settings.' },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('Failed to get API configuration:', error);
      return NextResponse.json(
        { error: 'Failed to load API configuration. Please check your settings.' },
        { status: 500 }
      );
    }

    // Generate comprehensive financial analysis based on FINRO process
    const analysisPrompt = `Based on the project context and the provided answers, generate a comprehensive financial analysis following the FINRO startup financial modeling process.

**Project Context:**
${context}${contextSection}

**User Answers:**
${JSON.stringify(answers, null, 2)}

Please provide a detailed financial analysis covering all 9 FINRO steps:

## 1. REVENUE PROJECTIONS
- Detailed revenue forecasting methodology
- Multi-year revenue projections (3-5 years)
- Revenue streams breakdown
- Growth assumptions and drivers

## 2. KEY FACTORS INFLUENCING REVENUE
- Customer Acquisition Cost (CAC) analysis
- Customer Lifetime Value (LTV) calculations
- Churn rate impact analysis
- Pricing strategy effectiveness
- Market penetration assumptions

## 3. COST OF REVENUES / COGS
- Direct cost breakdown per month
- Cost scaling analysis
- Variable vs fixed cost structure
- Cost optimization opportunities

## 4. OPERATING EXPENSES
- Personnel costs and team scaling
- Infrastructure and operational costs
- Marketing and sales expenses
- General and administrative costs
- Expense growth projections

## 5. INCOME STATEMENT CONSTRUCTION
- Projected income statements (3-5 years)
- Gross margin analysis
- Operating margin trends
- Net profit projections
- Key profitability metrics

## 6. CASH FLOW AND BALANCE SHEET ANALYSIS
- Monthly cash flow projections
- Working capital requirements
- Funding needs and timing
- Cash runway analysis
- Balance sheet projections

## 7. KPIs
- Key performance indicators dashboard
- Industry benchmark comparisons
- Growth metrics and targets
- Operational efficiency metrics
- Customer metrics and cohort analysis

## 8. BREAKEVEN ANALYSIS
- Breakeven point calculations
- Sensitivity analysis
- Time to profitability
- Customer count needed for breakeven
- Revenue milestones

## 9. SCENARIO ANALYSIS
- Best-case scenario projections
- Worst-case scenario planning
- Most likely scenario
- Risk assessment and mitigation
- Stress testing and sensitivity analysis

Please provide specific numbers, calculations, and actionable insights based on the provided information. Include charts, tables, and visual representations where appropriate.`;

    // Call AI service directly
    let analysisContent = '';
    try {
      if (apiConfig.provider === 'google') {
        // Check if context is too long for Gemini (limit is ~30k characters)
        const maxContextLength = 25000;
        let truncatedContext = `${analysisPrompt}\n\n${context}${contextSection}`;
        if (truncatedContext.length > maxContextLength) {
          console.warn(`⚠️ Context too long (${truncatedContext.length} chars), truncating to ${maxContextLength} chars`);
          truncatedContext = truncatedContext.substring(0, maxContextLength) + '\n\n[Content truncated due to length limits]';
        }

        const requestBody = {
          contents: [{
            parts: [{
              text: truncatedContext
            }]
          }],
          generationConfig: {
            maxOutputTokens: 8000,
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
        analysisContent = result.candidates[0].content.parts[0].text;
        console.log('✅ Gemini API response received, length:', analysisContent.length);
      } else {
        throw new Error(`Unsupported AI provider: ${apiConfig.provider}`);
      }
    } catch (error) {
      console.error('❌ AI analysis failed:', error);
      throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Parse the analysis into structured sections
    const sections = parseAnalysisSections(analysisContent);

    const financialData = {
      revenueProjections: sections.revenueProjections || generateDefaultRevenueProjections(answers),
      keyFactors: sections.keyFactors || generateDefaultKeyFactors(answers),
      cogs: sections.cogs || generateDefaultCOGS(answers),
      operatingExpenses: sections.operatingExpenses || generateDefaultOperatingExpenses(answers),
      incomeStatement: sections.incomeStatement || generateDefaultIncomeStatement(answers),
      cashFlow: sections.cashFlow || generateDefaultCashFlow(answers),
      kpis: sections.kpis || generateDefaultKPIs(answers),
      breakeven: sections.breakeven || generateDefaultBreakeven(answers),
      scenarios: sections.scenarios || generateDefaultScenarios(answers),
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(financialData);
  } catch (error) {
    console.error('Error generating financial analysis:', error);
    return NextResponse.json(
      { error: 'Failed to generate financial analysis' },
      { status: 500 }
    );
  }
}

function parseAnalysisSections(content: string) {
  const sections: Record<string, string> = {};
  
  // Split content by section headers
  const sectionHeaders = [
    'REVENUE PROJECTIONS',
    'KEY FACTORS INFLUENCING REVENUE',
    'COST OF REVENUES',
    'OPERATING EXPENSES',
    'INCOME STATEMENT',
    'CASH FLOW',
    'KPIS',
    'BREAKEVEN ANALYSIS',
    'SCENARIO ANALYSIS'
  ];

  sectionHeaders.forEach(header => {
    const regex = new RegExp(`##?\\s*${header}[\\s\\S]*?(?=##?\\s*[A-Z]|$)`, 'i');
    const match = content.match(regex);
    if (match) {
      sections[header.toLowerCase().replace(/\s+/g, '')] = match[0];
    }
  });

  return sections;
}

// Default generators for each section
function generateDefaultRevenueProjections(answers: any) {
  const revenueModel = answers.revenue_model || 'Subscription/SaaS';
  const pricing = answers.pricing_strategy || 'Not specified';
  
  return `## Revenue Projections

**Revenue Model:** ${revenueModel}

**Pricing Strategy:** ${pricing}

### 3-Year Revenue Forecast
Based on the provided information, here are the projected revenue streams:

- **Year 1:** Focus on customer acquisition and product-market fit
- **Year 2:** Scale operations and optimize pricing
- **Year 3:** Market expansion and feature development

### Key Assumptions
- Revenue growth will depend on customer acquisition success
- Pricing optimization will improve unit economics over time
- Market expansion opportunities will emerge as the product matures`;
}

function generateDefaultKeyFactors(answers: any) {
  const cac = answers.estimated_cac || 0;
  const churn = answers.expected_churn || 0;
  const lifetime = answers.customer_lifetime || 0;
  
  return `## Key Factors Influencing Revenue

**Customer Acquisition Cost (CAC):** $${cac}
**Monthly Churn Rate:** ${churn}%
**Customer Lifetime:** ${lifetime} months

### Revenue Impact Analysis
- **LTV/CAC Ratio:** ${lifetime > 0 ? (lifetime * 50 / cac).toFixed(2) : 'N/A'}
- **Payback Period:** ${cac > 0 ? (cac / 50).toFixed(1) : 'N/A'} months
- **Revenue per Customer:** $${lifetime * 50}

### Recommendations
- Focus on reducing CAC through efficient marketing channels
- Implement retention strategies to reduce churn
- Optimize pricing to improve unit economics`;
}

function generateDefaultCOGS(answers: any) {
  const cogsPerMonth = answers.cogs_per_month || answers.inferred_cogs_per_month || 0;
  
  return `## Cost of Revenues / COGS

**Monthly COGS:** $${cogsPerMonth}

### Cost Breakdown
- **Direct Costs:** $${(cogsPerMonth * 0.6).toFixed(2)} (60%)
- **Infrastructure:** $${(cogsPerMonth * 0.3).toFixed(2)} (30%)
- **Third-party Services:** $${(cogsPerMonth * 0.1).toFixed(2)} (10%)

### Scaling Analysis
- Costs scale based on your specified scaling model
- Opportunities for economies of scale as volume increases
- Focus on cost optimization through automation and efficiency

### Market Estimation
Based on your business model and cost structure, this COGS reflects:
- Industry-standard cost ratios for your sector
- Your specific cost components and scaling approach
- Market benchmarks for similar businesses`;
}

function generateDefaultOperatingExpenses(answers: any) {
  const monthlyBurn = answers.monthly_burn || 0;
  
  return `## Operating Expenses

**Current Monthly Burn:** $${monthlyBurn}

### Expense Categories
- **Personnel:** ${monthlyBurn * 0.6} (60%)
- **Infrastructure:** ${monthlyBurn * 0.2} (20%)
- **Marketing:** ${monthlyBurn * 0.15} (15%)
- **Other:** ${monthlyBurn * 0.05} (5%)

### Growth Projections
- Expenses will scale with team growth
- Focus on maintaining efficient cost structure
- Invest in automation to control operational costs`;
}

function generateDefaultIncomeStatement(answers: any) {
  return `## Income Statement Construction

### Projected Income Statement (3 Years)

**Year 1:**
- Revenue: $50,000
- COGS: $15,000
- Gross Profit: $35,000
- Operating Expenses: $120,000
- Net Loss: -$85,000

**Year 2:**
- Revenue: $300,000
- COGS: $90,000
- Gross Profit: $210,000
- Operating Expenses: $200,000
- Net Profit: $10,000

**Year 3:**
- Revenue: $800,000
- COGS: $240,000
- Gross Profit: $560,000
- Operating Expenses: $350,000
- Net Profit: $210,000`;
}

function generateDefaultCashFlow(answers: any) {
  const currentCash = answers.current_cash || 0;
  
  return `## Cash Flow and Balance Sheet Analysis

**Current Cash Position:** $${currentCash}

### Cash Flow Projections
- **Monthly Burn:** $${answers.monthly_burn || 0}
- **Runway:** ${currentCash > 0 && answers.monthly_burn > 0 ? Math.floor(currentCash / answers.monthly_burn) : 0} months
- **Funding Needs:** $${Math.max(0, (answers.monthly_burn * 18) - currentCash)}

### Key Metrics
- **Working Capital Requirements:** $${answers.monthly_burn * 3}
- **Cash Conversion Cycle:** 30 days
- **Burn Rate Trend:** Stable with growth investments`;
}

function generateDefaultKPIs(answers: any) {
  return `## KPIs

### Key Performance Indicators

**Customer Metrics:**
- Monthly Active Users (MAU)
- Customer Acquisition Cost (CAC)
- Customer Lifetime Value (LTV)
- Monthly Churn Rate
- Net Promoter Score (NPS)

**Financial Metrics:**
- Monthly Recurring Revenue (MRR)
- Annual Recurring Revenue (ARR)
- Gross Revenue Retention
- Net Revenue Retention
- Gross Margin

**Operational Metrics:**
- Cost per Acquisition
- Time to Value
- Support Ticket Volume
- Feature Adoption Rate
- User Engagement Score`;
}

function generateDefaultBreakeven(answers: any) {
  const breakevenCustomers = answers.breakeven_customers || 0;
  const monthlyBurn = answers.monthly_burn || 0;
  
  return `## Breakeven Analysis

**Customers Needed for Breakeven:** ${breakevenCustomers}
**Expected Timeline:** ${answers.breakeven_timeline || '12 months'}

### Breakeven Calculation
- **Monthly Revenue per Customer:** $50
- **Monthly COGS per Customer:** $15
- **Monthly Contribution Margin:** $35
- **Fixed Costs:** $${monthlyBurn}
- **Breakeven Customers:** ${Math.ceil(monthlyBurn / 35)}

### Sensitivity Analysis
- **Best Case:** Breakeven in 8 months
- **Worst Case:** Breakeven in 18 months
- **Most Likely:** Breakeven in 12 months`;
}

function generateDefaultScenarios(answers: any) {
  return `## Scenario Analysis

### Best Case Scenario
- **Assumptions:** ${answers.best_case || 'Strong market adoption, efficient operations'}
- **Revenue:** 150% of projections
- **Timeline:** Breakeven in 8 months
- **Outcome:** Strong profitability and growth

### Worst Case Scenario
- **Assumptions:** ${answers.worst_case || 'Market challenges, higher costs'}
- **Revenue:** 60% of projections
- **Timeline:** Breakeven in 18 months
- **Outcome:** Extended runway needed

### Most Likely Scenario
- **Assumptions:** Moderate market adoption
- **Revenue:** 100% of projections
- **Timeline:** Breakeven in 12 months
- **Outcome:** Sustainable growth

### Risk Mitigation
${answers.risk_mitigation || 'Focus on customer retention, cost control, and market validation'}`;
}
