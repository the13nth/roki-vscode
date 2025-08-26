import { SubscriptionPlan } from '@/types/subscription';

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'monthly',
    description: 'Perfect for getting started with AI-powered project analysis',
    features: [
      '500K tokens per month',
      '2 project creations',
      '2 analyses per section',
      '5 social media posts',
      'Basic AI analysis (Technical, Market)',
      'Saved analysis insights',
      'JSON export',
      'Email support'
    ],
    limits: {
      tokens: 500000,
      projects: 2,
      analysesPerSection: 2,
      socialPosts: 5,
      priority: false,
      support: 'email'
    },
    cta: 'Get Started Free'
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 9.99,
    period: 'monthly',
    description: 'Ideal for individual developers and small projects',
    features: [
      '2M tokens per month',
      '10 project creations',
      '5 analyses per section',
      '25 social media posts',
      'Full AI analysis suite (Technical, Market, Financial, BMC)',
      'Advanced saved insights & semantic embeddings',
      'Social media content generation (all platforms)',
      'Business Model Canvas generation',
      'Financial projections & market analysis',
      'AI-powered mitigation strategies',
      'Pinecone cloud sync & spreadsheet export',
      'Priority support'
    ],
    limits: {
      tokens: 2000000,
      projects: 10,
      analysesPerSection: 5,
      socialPosts: 25,
      priority: true,
      support: 'priority'
    },
    popular: true,
    cta: 'Start Free Trial'
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 29.99,
    period: 'monthly',
    description: 'Perfect for professional developers and growing teams',
    features: [
      '10M tokens per month',
      'Unlimited project creations',
      'Unlimited analyses per section',
      '100 social media posts',
      'All Starter features',
      'VS Code extension integration',
      'Team collaboration features',
      'Advanced analytics dashboard',
      'Custom integrations',
      'Dedicated support',
      'API access'
    ],
    limits: {
      tokens: 10000000,
      projects: -1, // Unlimited
      analysesPerSection: -1, // Unlimited
      socialPosts: 100,
      priority: true,
      support: 'dedicated'
    },
    cta: 'Start Free Trial'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99.99,
    period: 'monthly',
    description: 'For large teams and organizations with advanced needs',
    features: [
      '50M tokens per month',
      'Unlimited everything',
      'All Professional features',
      'Custom AI model training',
      'White-label solutions',
      'Advanced security & compliance',
      'Dedicated account manager',
      'Custom integrations & APIs',
      'SLA guarantees',
      'On-premise deployment options'
    ],
    limits: {
      tokens: 50000000,
      projects: -1, // Unlimited
      analysesPerSection: -1, // Unlimited
      socialPosts: -1, // Unlimited
      priority: true,
      support: 'dedicated'
    },
    cta: 'Contact Sales'
  }
];

export const YEARLY_PLANS: SubscriptionPlan[] = SUBSCRIPTION_PLANS.map(plan => ({
  ...plan,
  period: 'yearly' as const,
  price: plan.price * 10, // 2 months free
  cta: plan.id === 'free' ? 'Get Started Free' : 'Save 17%'
}));

export function getPlanById(planId: string, period: 'monthly' | 'yearly' = 'monthly'): SubscriptionPlan | undefined {
  const plans = period === 'yearly' ? YEARLY_PLANS : SUBSCRIPTION_PLANS;
  return plans.find(plan => plan.id === planId);
}

export function getDefaultPlan(): SubscriptionPlan {
  return SUBSCRIPTION_PLANS[0]; // Free plan
}

export function formatPrice(price: number, period: 'monthly' | 'yearly'): string {
  if (price === 0) return 'Free';
  return `$${price.toFixed(2)}/${period === 'yearly' ? 'year' : 'month'}`;
}

export function calculateYearlySavings(monthlyPrice: number): number {
  const yearlyPrice = monthlyPrice * 10; // 2 months free
  const fullYearPrice = monthlyPrice * 12;
  return fullYearPrice - yearlyPrice;
}



