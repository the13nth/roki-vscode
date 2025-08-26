'use client';

import { useState, useEffect } from 'react';
import { useUser, useOrganization } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlanSelectionModal } from '@/components/PlanSelectionModal';
import { 
  CreditCard, 
  Zap, 
  FolderOpen, 
  Brain, 
  Share2, 
  Crown,
  Check,
  AlertTriangle,
  TrendingUp,
  Calendar,
  DollarSign
} from 'lucide-react';
import { SubscriptionPlan, SubscriptionUsage } from '@/types/subscription';
import { SUBSCRIPTION_PLANS, YEARLY_PLANS, formatPrice, calculateYearlySavings } from '@/lib/subscriptionPlans';

interface UserSubscriptionData {
  currentPlan: SubscriptionPlan;
  subscription: any;
  usage: SubscriptionUsage;
}

export function UserSubscriptionManager() {
  const { user } = useUser();
  const { organization } = useOrganization();
  
  // Check if user is admin
  const isAdmin = organization?.slug === 'binghi_admins' || 
                 organization?.name === 'binghi_admins' ||
                 (user?.organizationMemberships?.some((membership: any) => 
                   membership.organization?.slug === 'binghi_admins' || 
                   membership.organization?.name === 'binghi_admins'
                 ));

  const [subscriptionData, setSubscriptionData] = useState<UserSubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalPlan, setModalPlan] = useState<any>(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/subscription');
      if (!response.ok) {
        throw new Error('Failed to fetch subscription data');
      }
      const data = await response.json();
      setSubscriptionData(data);
      setSelectedPlan(data.currentPlan.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelection = (plan: any) => {
    setModalPlan(plan);
    setShowModal(true);
  };

  const handleConfirmSubscription = async (planId: string, period: 'monthly' | 'yearly') => {
    try {
      setModalLoading(true);
      
      const response = await fetch('/api/user/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subscribe',
          planId,
          period
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update subscription');
      }

      await fetchSubscriptionData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update subscription');
    } finally {
      setModalLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      // Redirect to Stripe customer portal for subscription management
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to access billing portal');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access billing portal');
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getUsageIcon = (percentage: number) => {
    if (percentage >= 90) return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (percentage >= 75) return <TrendingUp className="h-4 w-4 text-yellow-500" />;
    return <Check className="h-4 w-4 text-green-500" />;
  };

  const formatUsage = (used: number, limit: number) => {
    if (limit === -1) return `${used.toLocaleString()} (Unlimited)`;
    return `${used.toLocaleString()} / ${limit.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading subscription data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading subscription data: {error}</p>
        <Button onClick={fetchSubscriptionData} className="mt-4">Retry</Button>
      </div>
    );
  }

  if (!subscriptionData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No subscription data available</p>
      </div>
    );
  }

  const { currentPlan, subscription, usage } = subscriptionData;
  const plans = billingPeriod === 'yearly' ? YEARLY_PLANS : SUBSCRIPTION_PLANS;

  return (
    <div className="space-y-6">
      {/* Current Plan Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Current Plan: {currentPlan.name}
          </CardTitle>
          <CardDescription>
            {subscription ? (
              <div className="flex items-center gap-4 text-sm">
                <span>Status: <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>{subscription.status}</Badge></span>
                <span>Period: {subscription.period}</span>
                <span>Next billing: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span>
              </div>
            ) : (
              'You are currently on the free plan'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`grid grid-cols-1 md:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
            {/* Token Usage - Only for admins */}
            {isAdmin && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Tokens</span>
                  {getUsageIcon(usage.percentageUsed.tokens)}
                </div>
                <div className="text-lg font-bold">{formatUsage(usage.currentUsage.tokens, usage.limits.tokens)}</div>
                <Progress value={usage.percentageUsed.tokens} className="h-2" />
                <div className={`text-xs ${getUsageColor(usage.percentageUsed.tokens)}`}>
                  {usage.percentageUsed.tokens.toFixed(1)}% used
                </div>
              </div>
            )}

            {/* Project Usage */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Projects</span>
                {getUsageIcon(usage.percentageUsed.projects)}
              </div>
              <div className="text-lg font-bold">{formatUsage(usage.currentUsage.projects, usage.limits.projects)}</div>
              <Progress value={usage.percentageUsed.projects} className="h-2" />
              <div className={`text-xs ${getUsageColor(usage.percentageUsed.projects)}`}>
                {usage.percentageUsed.projects.toFixed(1)}% used
              </div>
            </div>
            {/* Analysis Usage */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Analyses</span>
                {getUsageIcon(usage.percentageUsed.analyses)}
              </div>
              <div className="text-lg font-bold">{formatUsage(usage.currentUsage.analyses, usage.limits.analysesPerSection)}</div>
              <Progress value={usage.percentageUsed.analyses} className="h-2" />
              <div className={`text-xs ${getUsageColor(usage.percentageUsed.analyses)}`}>
                {usage.percentageUsed.analyses.toFixed(1)}% used
              </div>
            </div>

            {/* Social Posts Usage */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Social Posts</span>
                {getUsageIcon(usage.percentageUsed.socialPosts)}
              </div>
              <div className="text-lg font-bold">{formatUsage(usage.currentUsage.socialPosts, usage.limits.socialPosts)}</div>
              <Progress value={usage.percentageUsed.socialPosts} className="h-2" />
              <div className={`text-xs ${getUsageColor(usage.percentageUsed.socialPosts)}`}>
                {usage.percentageUsed.socialPosts.toFixed(1)}% used
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Choose Your Plan
          </CardTitle>
          <CardDescription>
            Select the plan that best fits your needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Billing Period Toggle */}
          <div className="flex justify-center mb-6">
            <div className="bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingPeriod === 'monthly' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingPeriod === 'yearly' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Yearly
                <Badge variant="secondary" className="ml-2 text-xs">Save 17%</Badge>
              </button>
            </div>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative transition-all hover:shadow-lg ${
                  plan.popular ? 'ring-2 ring-gray-500' : ''
                } ${selectedPlan === plan.id ? 'border-gray-500' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gray-800 text-white">Most Popular</Badge>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="text-3xl font-bold">
                    {formatPrice(plan.price, plan.period)}
                  </div>
                  {billingPeriod === 'yearly' && plan.price > 0 && (
                    <div className="text-sm text-green-600">
                      Save ${calculateYearlySavings(plan.price).toFixed(2)}/year
                    </div>
                  )}
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="flex flex-col h-full">
                  <div className="space-y-2 flex-grow">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 mt-6">
                    <Button 
                      className={`w-full ${
                        selectedPlan === plan.id 
                          ? 'bg-gray-600 hover:bg-gray-700' 
                          : 'bg-gray-900 hover:bg-gray-800'
                      }`}
                      onClick={() => handlePlanSelection(plan)}
                      disabled={selectedPlan === plan.id}
                    >
                      {selectedPlan === plan.id ? 'Current Plan' : plan.cta}
                    </Button>

                    {selectedPlan === plan.id && plan.id !== 'free' && (
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={handleCancelSubscription}
                      >
                        Cancel Subscription
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Plan Selection Modal */}
          <PlanSelectionModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            selectedPlan={modalPlan}
            onConfirm={handleConfirmSubscription}
            loading={modalLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
