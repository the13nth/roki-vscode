import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Market Research Process (MRP) Questions
    const questions = [
      // Step 1: Define Target Market
      {
        id: 'target_market',
        question: 'Define your target market segments',
        type: 'textarea',
        required: true,
        placeholder: 'Describe your ideal customer segments including demographics, psychographics, and behavior patterns...'
      },

      // Step 2: Identify Customer Pain Points
      {
        id: 'customer_pain_points',
        question: 'What are the main customer pain points your product addresses?',
        type: 'textarea',
        required: true,
        placeholder: 'List the specific problems, frustrations, and unmet needs your target customers experience...'
      },

      // Step 3: Analyze Competition
      {
        id: 'competitive_analysis',
        question: 'Provide a competitive analysis of your market',
        type: 'textarea',
        required: true,
        placeholder: 'Analyze your direct and indirect competitors, their strengths, weaknesses, and market positioning...'
      },

      // Step 4: Validate Product Features
      {
        id: 'product_features',
        question: 'What are your key product features and how do they address customer needs?',
        type: 'textarea',
        required: true,
        placeholder: 'List your core product features and explain how each addresses customer needs and differentiates you from competitors...'
      },

      // Step 5: Test Pricing
      {
        id: 'pricing_strategy',
        question: 'Describe your pricing strategy and model',
        type: 'textarea',
        required: true,
        placeholder: 'Define your pricing model, price points, and pricing strategy. Consider value-based, competitive, or freemium models...'
      },

      // Step 6: Iterate Based on Feedback
      {
        id: 'market_feedback',
        question: 'How do you collect and analyze customer feedback?',
        type: 'textarea',
        required: true,
        placeholder: 'Describe your feedback collection methods, metrics you track, and how you iterate based on customer input...'
      },

      // Step 7: Assess Market Demand
      {
        id: 'market_demand',
        question: 'Assess the market size and demand for your product',
        type: 'textarea',
        required: true,
        placeholder: 'Evaluate market size, growth potential, and demand. Include TAM, SAM, and SOM analysis...'
      }
    ];

    return NextResponse.json({
      success: true,
      questions,
      totalSteps: 7
    });

  } catch (error) {
    console.error('Error loading market questions:', error);
    return NextResponse.json(
      { error: 'Failed to load market questions' },
      { status: 500 }
    );
  }
}

