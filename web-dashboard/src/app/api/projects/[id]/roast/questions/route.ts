import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Roast Analysis Process (RAP) Questions
    const questions = [
      // Step 1: Business Model Critique
      {
        id: 'business_model_focus',
        question: 'What specific aspects of the business model should we focus on critiquing?',
        type: 'textarea',
        required: true,
        placeholder: 'Describe the key business model elements you want brutally analyzed (revenue streams, value proposition, partnerships, etc.)...'
      },

      // Step 2: Market Reality Check
      {
        id: 'market_assumptions',
        question: 'What market assumptions need to be challenged?',
        type: 'textarea',
        required: true,
        placeholder: 'List the market assumptions, size claims, and demand projections that need harsh reality checking...'
      },

      // Step 3: Technical Challenges
      {
        id: 'technical_complexity',
        question: 'What technical implementation risks should we examine?',
        type: 'textarea',
        required: true,
        placeholder: 'Describe the technical stack, integrations, and implementation challenges that could fail...'
      },

      // Step 4: Financial Viability
      {
        id: 'financial_projections',
        question: 'What financial assumptions need brutal critique?',
        type: 'textarea',
        required: true,
        placeholder: 'List revenue projections, cost estimates, and financial models that need harsh analysis...'
      },

      // Step 5: Competitive Threats
      {
        id: 'competitive_landscape',
        question: 'What competitive threats and positioning issues should we analyze?',
        type: 'textarea',
        required: true,
        placeholder: 'Describe the competitive landscape, differentiation claims, and market positioning that need critique...'
      },

      // Step 6: Execution Risks
      {
        id: 'execution_plan',
        question: 'What execution risks and team capabilities should we evaluate?',
        type: 'textarea',
        required: true,
        placeholder: 'List team capabilities, timeline assumptions, and execution plans that need harsh assessment...'
      },

      // Step 7: Regulatory Hurdles
      {
        id: 'regulatory_requirements',
        question: 'What regulatory and compliance risks should we examine?',
        type: 'textarea',
        required: true,
        placeholder: 'Describe legal requirements, compliance issues, and regulatory risks that could derail the project...'
      },

      // Step 8: Overall Assessment
      {
        id: 'overall_assessment',
        question: 'What are the biggest red flags and overall concerns?',
        type: 'textarea',
        required: true,
        placeholder: 'Summarize the most critical issues, biggest risks, and overall project viability concerns...'
      }
    ];

    return NextResponse.json({
      success: true,
      questions,
      totalSteps: 8
    });

  } catch (error) {
    console.error('Error loading roast questions:', error);
    return NextResponse.json(
      { error: 'Failed to load roast questions' },
      { status: 500 }
    );
  }
}

