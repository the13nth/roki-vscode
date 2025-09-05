import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { answers, existingAnalyses, step } = await request.json();

    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get project context
    const contextResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/projects/${projectId}/context/full`);
    const contextData = await contextResponse.json();
    const projectContext = contextData.context || '';

    // Create comprehensive roast analysis prompt
    const analysisPrompt = `
You are a brutally honest business critic and startup advisor. Your job is to provide harsh, critical feedback to help identify real problems and improve this project. NO SUGAR-COATING. Be direct, honest, and sometimes harsh.

## PROJECT CONTEXT:
${projectContext}

## EXISTING ANALYSES DATA:
${Object.entries(existingAnalyses).map(([key, value]) => `**${key.toUpperCase()}**: ${JSON.stringify(value, null, 2)}`).join('\n\n')}

## ROAST ANALYSIS FOCUS AREAS:
${Object.entries(answers).map(([key, value]) => `**${key.replace(/_/g, ' ').toUpperCase()}**: ${value}`).join('\n\n')}

## ANALYSIS REQUIREMENTS:

Please provide a brutally honest roast analysis covering all 8 RAP (Roast Analysis Process) steps:

### 1. BUSINESS MODEL CRITIQUE
- Fundamental flaws in the business model
- Unrealistic assumptions and missing components
- Revenue model weaknesses and gaps
- Value proposition problems
- Partnership and resource dependency issues

### 2. MARKET REALITY CHECK
- Market size and demand assumptions that are wrong
- Competitive landscape analysis and threats
- Customer acquisition challenges
- Market timing and saturation issues
- Hidden market barriers and obstacles

### 3. TECHNICAL CHALLENGES
- Implementation complexity and risks
- Technology stack problems and limitations
- Integration challenges and dependencies
- Scalability and performance issues
- Technical team capability gaps

### 4. FINANCIAL VIABILITY
- Unrealistic revenue projections
- Underestimated costs and expenses
- Cash flow and funding challenges
- Unit economics problems
- Financial model flaws and assumptions

### 5. COMPETITIVE THREATS
- Stronger competitors and market leaders
- Differentiation weaknesses
- Competitive advantages that don't exist
- Market entry barriers and challenges
- Competitive response risks

### 6. EXECUTION RISKS
- Team capability and experience gaps
- Timeline and milestone feasibility
- Operational complexity and challenges
- Resource and funding requirements
- Execution plan weaknesses

### 7. REGULATORY HURDLES
- Legal compliance and licensing issues
- Regulatory changes and policy risks
- Industry-specific requirements
- Intellectual property challenges
- Government and policy barriers

### 8. OVERALL VERDICT
- Biggest red flags and critical issues
- Likelihood of success assessment
- Most likely failure points
- Reality check on project viability
- Harsh but constructive recommendations

## OUTPUT FORMAT:
Be brutally honest but constructive. Use specific examples from the project data. Include harsh criticism but also suggest improvements. Focus on identifying real problems that could kill the project.

Use a direct, no-nonsense tone. Don't hold back on criticism, but make it actionable.`;

    // Call AI service to generate the analysis
    const aiResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/ai/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal-key'}`
      },
      body: JSON.stringify({
        prompt: analysisPrompt,
        analysisType: 'roast',
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

    const roastData = {
      businessModelCritique: sections.businessModelCritique || generateDefaultBusinessModelCritique(answers, existingAnalyses),
      marketReality: sections.marketReality || generateDefaultMarketReality(answers, existingAnalyses),
      technicalChallenges: sections.technicalChallenges || generateDefaultTechnicalChallenges(answers, existingAnalyses),
      financialViability: sections.financialViability || generateDefaultFinancialViability(answers, existingAnalyses),
      competitiveThreats: sections.competitiveThreats || generateDefaultCompetitiveThreats(answers, existingAnalyses),
      executionRisks: sections.executionRisks || generateDefaultExecutionRisks(answers, existingAnalyses),
      regulatoryHurdles: sections.regulatoryHurdles || generateDefaultRegulatoryHurdles(answers, existingAnalyses),
      overallVerdict: sections.overallVerdict || generateDefaultOverallVerdict(answers, existingAnalyses),
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(roastData);
  } catch (error) {
    console.error('Error generating roast analysis:', error);
    return NextResponse.json(
      { error: 'Failed to generate roast analysis' },
      { status: 500 }
    );
  }
}

function parseAnalysisSections(content: string) {
  const sections: Record<string, string> = {};
  
  // Split content into sections based on headers
  const sectionHeaders = [
    'BUSINESS MODEL CRITIQUE',
    'MARKET REALITY CHECK',
    'TECHNICAL CHALLENGES',
    'FINANCIAL VIABILITY',
    'COMPETITIVE THREATS',
    'EXECUTION RISKS',
    'REGULATORY HURDLES',
    'OVERALL VERDICT'
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
function generateDefaultBusinessModelCritique(answers: Record<string, string>, existingAnalyses: any) {
  return `## Business Model Critique

**Critical Flaws Identified:**
${answers.business_model_focus || 'Business model focus not specified'}

**Major Issues:**
- **Revenue Model Problems**: The business model appears to have fundamental flaws in how it generates revenue
- **Value Proposition Weakness**: The value proposition may not be compelling enough for customers
- **Partnership Dependencies**: Heavy reliance on external partnerships creates significant risk
- **Resource Requirements**: The model may require more resources than available

**Reality Check:**
Based on the existing analyses, there are several red flags in the business model that need immediate attention. The revenue projections appear unrealistic, and the value proposition lacks clear differentiation.

**Recommendations:**
- Revisit the core value proposition
- Simplify the business model
- Reduce external dependencies
- Validate revenue assumptions with real customers`;
}

function generateDefaultMarketReality(answers: Record<string, string>, existingAnalyses: any) {
  return `## Market Reality Check

**Market Assumptions to Challenge:**
${answers.market_assumptions || 'Market assumptions not specified'}

**Harsh Reality:**
- **Market Size Claims**: The claimed market size appears inflated and not validated
- **Competition Underestimated**: Existing competitors are likely stronger than acknowledged
- **Customer Acquisition**: Customer acquisition costs are probably much higher than projected
- **Market Timing**: The market may not be ready for this solution

**Competitive Analysis:**
The competitive landscape is more challenging than initially assessed. Established players have significant advantages in terms of resources, customer relationships, and market presence.

**Recommendations:**
- Conduct proper market research
- Validate demand with real customers
- Analyze competitor strengths honestly
- Reassess market timing and readiness`;
}

function generateDefaultTechnicalChallenges(answers: Record<string, string>, existingAnalyses: any) {
  return `## Technical Challenges

**Implementation Risks:**
${answers.technical_complexity || 'Technical complexity not specified'}

**Critical Technical Issues:**
- **Integration Complexity**: Multiple system integrations create significant technical risk
- **Scalability Problems**: The technical architecture may not scale as projected
- **Performance Issues**: System performance under load is likely inadequate
- **Security Vulnerabilities**: Security considerations appear insufficient

**Technical Debt:**
The project appears to have significant technical debt and implementation challenges that are being underestimated. The complexity of integrating multiple systems creates a high risk of failure.

**Recommendations:**
- Simplify the technical architecture
- Focus on core functionality first
- Invest in proper testing and security
- Plan for technical challenges and delays`;
}

function generateDefaultFinancialViability(answers: Record<string, string>, existingAnalyses: any) {
  return `## Financial Viability

**Financial Assumptions to Critique:**
${answers.financial_projections || 'Financial projections not specified'}

**Financial Red Flags:**
- **Revenue Projections**: Revenue projections appear unrealistic and not based on validated assumptions
- **Cost Underestimation**: Operating costs are likely significantly higher than projected
- **Cash Flow Issues**: Cash flow projections show unrealistic assumptions about customer payment timing
- **Unit Economics**: Unit economics may not be viable at the projected scale

**Funding Challenges:**
The financial model shows several concerning patterns that suggest the project may not be financially viable. Revenue assumptions are optimistic, and cost projections appear low.

**Recommendations:**
- Revisit all financial assumptions
- Conduct proper market research for pricing
- Include realistic cost estimates
- Plan for longer sales cycles and higher acquisition costs`;
}

function generateDefaultCompetitiveThreats(answers: Record<string, string>, existingAnalyses: any) {
  return `## Competitive Threats

**Competitive Landscape Analysis:**
${answers.competitive_landscape || 'Competitive landscape not specified'}

**Major Competitive Risks:**
- **Established Players**: Existing competitors have significant advantages in resources and market presence
- **Differentiation Weakness**: The competitive differentiation is not strong enough
- **Market Entry Barriers**: Barriers to entry are higher than initially assessed
- **Competitive Response**: Established players can easily respond to competitive threats

**Market Positioning Problems:**
The competitive positioning appears weak compared to established players. The differentiation strategy may not be sufficient to compete effectively.

**Recommendations:**
- Strengthen competitive differentiation
- Identify unique value propositions
- Plan for competitive responses
- Consider partnership strategies`;
}

function generateDefaultExecutionRisks(answers: Record<string, string>, existingAnalyses: any) {
  return `## Execution Risks

**Execution Plan Assessment:**
${answers.execution_plan || 'Execution plan not specified'}

**Critical Execution Issues:**
- **Team Capabilities**: The team may lack necessary experience and skills
- **Timeline Feasibility**: Project timelines appear unrealistic and overly optimistic
- **Resource Requirements**: Resource needs are likely underestimated
- **Operational Complexity**: Operational challenges are more complex than planned

**Team and Timeline Risks:**
The execution plan shows several red flags that suggest the project may not be executable as planned. Team capabilities and timeline assumptions appear unrealistic.

**Recommendations:**
- Assess team capabilities honestly
- Create realistic timelines with buffers
- Plan for resource constraints
- Simplify operational requirements`;
}

function generateDefaultRegulatoryHurdles(answers: Record<string, string>, existingAnalyses: any) {
  return `## Regulatory Hurdles

**Regulatory Requirements:**
${answers.regulatory_requirements || 'Regulatory requirements not specified'}

**Legal and Compliance Risks:**
- **Licensing Requirements**: Necessary licenses and permits may be difficult to obtain
- **Compliance Costs**: Regulatory compliance costs are likely higher than budgeted
- **Policy Changes**: Regulatory environment may change unfavorably
- **Industry Standards**: Industry-specific requirements may create barriers

**Regulatory Challenges:**
The regulatory environment presents significant challenges that could delay or prevent project success. Compliance requirements appear to be underestimated.

**Recommendations:**
- Research regulatory requirements thoroughly
- Budget for compliance costs
- Plan for regulatory delays
- Consider regulatory consulting`;
}

function generateDefaultOverallVerdict(answers: Record<string, string>, existingAnalyses: any) {
  return `## Overall Verdict

**Biggest Red Flags:**
${answers.overall_assessment || 'Overall assessment not specified'}

**Brutal Reality Check:**
Based on the comprehensive analysis, this project faces significant challenges that make success unlikely without major changes:

**Critical Issues:**
1. **Unrealistic Assumptions**: Multiple fundamental assumptions appear wrong
2. **Market Challenges**: Market conditions are more difficult than acknowledged
3. **Execution Risks**: Team and timeline assumptions are unrealistic
4. **Financial Viability**: Financial projections are not credible
5. **Competitive Threats**: Competitive positioning is weak

**Success Probability: LOW**
The combination of market challenges, execution risks, and financial viability issues makes this project highly unlikely to succeed in its current form.

**Harsh Recommendations:**
- Pivot the business model significantly
- Reassess market assumptions
- Strengthen the team
- Revise financial projections
- Consider alternative approaches

**Bottom Line:** This project needs major changes before it can be considered viable. The current approach is likely to fail.`;
}

