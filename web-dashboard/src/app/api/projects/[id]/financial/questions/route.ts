import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

interface Question {
  id: string;
  step: number;
  category: string;
  question: string;
  type: 'text' | 'number' | 'select' | 'textarea';
  options?: string[];
  required: boolean;
  placeholder?: string;
}

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
    const { context } = await request.json();

    // Generate questions based on project context and FINRO process
    const questions: Question[] = [
      // Step 1: Revenue Projections
      {
        id: 'revenue_model',
        step: 1,
        category: 'Revenue',
        question: 'What is your primary revenue model?',
        type: 'select',
        options: ['Subscription/SaaS', 'One-time Purchase', 'Freemium', 'Marketplace Commission', 'Advertising', 'Licensing', 'Other'],
        required: true,
        placeholder: 'Select revenue model'
      },
      {
        id: 'target_customers',
        step: 1,
        category: 'Revenue',
        question: 'Who are your target customers? (Be specific about customer segments)',
        type: 'textarea',
        required: true,
        placeholder: 'Describe your target customer segments in detail...'
      },
      {
        id: 'pricing_strategy',
        step: 1,
        category: 'Revenue',
        question: 'What is your pricing strategy and expected price points?',
        type: 'textarea',
        required: true,
        placeholder: 'Describe your pricing strategy, tiers, and expected prices...'
      },
      {
        id: 'revenue_timeline',
        step: 1,
        category: 'Revenue',
        question: 'When do you expect to start generating revenue?',
        type: 'select',
        options: ['Immediately', '1-3 months', '3-6 months', '6-12 months', '12+ months'],
        required: true
      },

      // Step 2: Key Factors Influencing Revenue
      {
        id: 'customer_acquisition',
        step: 2,
        category: 'Customer Acquisition',
        question: 'How do you plan to acquire customers? (Marketing channels, strategies)',
        type: 'textarea',
        required: true,
        placeholder: 'Describe your customer acquisition strategy...'
      },
      {
        id: 'estimated_cac',
        step: 2,
        category: 'Customer Acquisition',
        question: 'What is your estimated Customer Acquisition Cost (CAC)?',
        type: 'number',
        required: true,
        placeholder: 'Enter estimated CAC in USD'
      },
      {
        id: 'expected_churn',
        step: 2,
        category: 'Customer Retention',
        question: 'What is your expected monthly churn rate? (as percentage)',
        type: 'number',
        required: true,
        placeholder: 'Enter churn rate (e.g., 5 for 5%)'
      },
      {
        id: 'customer_lifetime',
        step: 2,
        category: 'Customer Retention',
        question: 'What is your expected customer lifetime in months?',
        type: 'number',
        required: true,
        placeholder: 'Enter customer lifetime in months'
      },

      // Step 3: Cost of Revenues / COGS
      {
        id: 'product_costs',
        step: 3,
        category: 'COGS',
        question: 'What are your main cost components for delivering your product/service?',
        type: 'textarea',
        required: true,
        placeholder: 'Describe your main cost categories (hosting, payment processing, third-party services, materials, etc.)...'
      },
      {
        id: 'cogs_per_month',
        step: 3,
        category: 'COGS',
        question: 'What is your estimated monthly COGS (Cost of Goods Sold)?',
        type: 'number',
        required: false,
        placeholder: 'Enter monthly COGS in USD (optional - will be inferred if not provided)'
      },
      {
        id: 'scaling_costs',
        step: 3,
        category: 'COGS',
        question: 'How do your costs scale with customer growth?',
        type: 'select',
        options: ['Linear scaling', 'Economies of scale (decreasing per unit)', 'Exponential scaling', 'Fixed costs with variable components'],
        required: true
      },

      // Step 4: Operating Expenses
      {
        id: 'team_structure',
        step: 4,
        category: 'Operations',
        question: 'Describe your current and planned team structure',
        type: 'textarea',
        required: true,
        placeholder: 'List roles, salaries, and hiring timeline...'
      },
      {
        id: 'monthly_burn',
        step: 4,
        category: 'Operations',
        question: 'What is your current monthly burn rate?',
        type: 'number',
        required: true,
        placeholder: 'Enter monthly burn rate in USD'
      },
      {
        id: 'infrastructure_costs',
        step: 4,
        category: 'Operations',
        question: 'What are your infrastructure and operational costs?',
        type: 'textarea',
        required: true,
        placeholder: 'Describe hosting, tools, office, legal, marketing costs...'
      },

      // Step 5: Income Statement Construction
      {
        id: 'revenue_growth',
        step: 5,
        category: 'Projections',
        question: 'What is your expected monthly revenue growth rate? (as percentage)',
        type: 'number',
        required: true,
        placeholder: 'Enter growth rate (e.g., 20 for 20%)'
      },
      {
        id: 'profit_margins',
        step: 5,
        category: 'Projections',
        question: 'What gross profit margin do you expect to achieve?',
        type: 'number',
        required: true,
        placeholder: 'Enter expected gross margin (e.g., 70 for 70%)'
      },

      // Step 6: Cash Flow and Balance Sheet Analysis
      {
        id: 'current_cash',
        step: 6,
        category: 'Cash Flow',
        question: 'What is your current cash position?',
        type: 'number',
        required: true,
        placeholder: 'Enter current cash in USD'
      },
      {
        id: 'funding_plans',
        step: 6,
        category: 'Cash Flow',
        question: 'What are your funding plans and timeline?',
        type: 'textarea',
        required: true,
        placeholder: 'Describe funding rounds, amounts, and timeline...'
      },

      // Step 7: KPIs
      {
        id: 'key_metrics',
        step: 7,
        category: 'KPIs',
        question: 'What are your key performance indicators?',
        type: 'textarea',
        required: true,
        placeholder: 'List your most important metrics to track...'
      },
      {
        id: 'benchmark_metrics',
        step: 7,
        category: 'KPIs',
        question: 'What industry benchmarks are you targeting?',
        type: 'textarea',
        required: true,
        placeholder: 'Describe industry standards you want to meet or exceed...'
      },

      // Step 8: Breakeven Analysis
      {
        id: 'breakeven_timeline',
        step: 8,
        category: 'Breakeven',
        question: 'When do you expect to reach breakeven?',
        type: 'select',
        options: ['3 months', '6 months', '12 months', '18 months', '24 months', '36+ months'],
        required: true
      },

      // Step 9: Scenario Analysis
      {
        id: 'best_case',
        step: 9,
        category: 'Scenarios',
        question: 'Describe your best-case scenario assumptions',
        type: 'textarea',
        required: true,
        placeholder: 'What would need to happen for your best-case scenario?...'
      },
      {
        id: 'worst_case',
        step: 9,
        category: 'Scenarios',
        question: 'Describe your worst-case scenario assumptions',
        type: 'textarea',
        required: true,
        placeholder: 'What could go wrong in your worst-case scenario?...'
      },
      {
        id: 'risk_mitigation',
        step: 9,
        category: 'Scenarios',
        question: 'What are your key risk mitigation strategies?',
        type: 'textarea',
        required: true,
        placeholder: 'How will you mitigate the identified risks?...'
      }
    ];

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Error generating financial questions:', error);
    return NextResponse.json(
      { error: 'Failed to generate questions' },
      { status: 500 }
    );
  }
}
