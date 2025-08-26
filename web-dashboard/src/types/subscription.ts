export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  period: 'monthly' | 'yearly';
  description: string;
  features: string[];
  limits: {
    tokens: number;
    projects: number;
    analysesPerSection: number;
    socialPosts: number;
    priority: boolean;
    support: 'email' | 'priority' | 'dedicated';
  };
  popular?: boolean;
  cta: string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  period: 'monthly' | 'yearly';
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'trial_ended';
  trialStart: string;
  trialEnd: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionUsage {
  userId: string;
  planId: string;
  currentUsage: {
    tokens: number;
    projects: number;
    analyses: number;
    socialPosts: number;
  };
  limits: {
    tokens: number;
    projects: number;
    analysesPerSection: number;
    socialPosts: number;
  };
  remaining: {
    tokens: number;
    projects: number;
    analyses: number;
    socialPosts: number;
  };
  percentageUsed: {
    tokens: number;
    projects: number;
    analyses: number;
    socialPosts: number;
  };
}
