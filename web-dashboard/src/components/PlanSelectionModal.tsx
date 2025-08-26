'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Check, 
  Crown, 
  Zap, 
  FolderOpen, 
  Brain, 
  Share2,
  Calendar,
  Clock,
  X
} from 'lucide-react';
import { SubscriptionPlan } from '@/types/subscription';

interface PlanSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: SubscriptionPlan | null;
  onConfirm: (planId: string, period: 'monthly' | 'yearly') => Promise<void>;
  loading?: boolean;
}

export function PlanSelectionModal({ 
  isOpen, 
  onClose, 
  selectedPlan, 
  onConfirm, 
  loading = false 
}: PlanSelectionModalProps) {
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Reset confirmation state when modal opens or plan changes
  React.useEffect(() => {
    if (isOpen && selectedPlan) {
      setIsConfirmed(false);
    }
  }, [isOpen, selectedPlan?.id]);

  if (!selectedPlan) return null;

  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 7);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'free':
        return <Zap className="h-6 w-6 text-blue-500" />;
      case 'starter':
        return <FolderOpen className="h-6 w-6 text-green-500" />;
      case 'professional':
        return <Brain className="h-6 w-6 text-purple-500" />;
      case 'enterprise':
        return <Crown className="h-6 w-6 text-orange-500" />;
      default:
        return <Zap className="h-6 w-6 text-blue-500" />;
    }
  };

  const handleConfirm = async () => {
    await onConfirm(selectedPlan.id, period);
    setIsConfirmed(true);
  };

  const handleGoToProjects = () => {
    window.location.href = '/projects';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
                {/* Modal */}
          <div className="relative w-full max-w-7xl bg-white rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            {getPlanIcon(selectedPlan.id)}
            <div>
              <h2 className="text-xl font-semibold">Confirm {selectedPlan.name} Plan Selection</h2>
              <p className="text-sm text-gray-600">Review your plan details and trial period before confirming</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {isConfirmed ? (
            /* Confirmation View */
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Subscription Confirmed!
                </h3>
                <p className="text-gray-600 mb-6">
                  Your {selectedPlan.name} plan trial has been activated. You can now access all features for the next 7 days.
                </p>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                  <p className="text-sm text-gray-700">
                    <strong>Trial ends:</strong> {formatDate(trialEndDate)}
                  </p>
                </div>
                <Button 
                  onClick={handleGoToProjects}
                  className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-3"
                >
                  Go to Projects
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Plan Details */}
          <Card>
                            <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{selectedPlan.name} Plan</span>
                    {selectedPlan.popular && (
                      <Badge className="bg-gray-800 text-white">
                        <Crown className="w-3 h-3 mr-1" />
                        Most Popular
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-bold text-gray-900">
                      {selectedPlan.price === 0 ? 'Free' : `$${selectedPlan.price}`}
                    </span>
                    <span className="text-gray-700 font-medium">/{selectedPlan.period}</span>
                  </div>
                  <CardDescription>{selectedPlan.description}</CardDescription>
                </CardHeader>
            <CardContent>
                              <div className="grid grid-cols-4 gap-6 mb-6">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-gray-400" />
                    <span className="text-sm font-medium">
                      {selectedPlan.limits.tokens === -1 
                        ? 'Unlimited' 
                        : `${(selectedPlan.limits.tokens / 1000000).toFixed(1)}M`} tokens/month
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-gray-400" />
                    <span className="text-sm font-medium">
                      {selectedPlan.limits.projects === -1 ? 'Unlimited' : selectedPlan.limits.projects} projects
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-gray-400" />
                    <span className="text-sm font-medium">
                      {selectedPlan.limits.analysesPerSection === -1 ? 'Unlimited' : selectedPlan.limits.analysesPerSection} analyses/section
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Share2 className="h-5 w-5 text-gray-400" />
                    <span className="text-sm font-medium">
                      {selectedPlan.limits.socialPosts === -1 ? 'Unlimited' : selectedPlan.limits.socialPosts} social posts
                    </span>
                  </div>
                </div>

                              <div className="grid grid-cols-3 gap-8">
                  {selectedPlan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3 text-sm">
                      <Check className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{feature}</span>
                    </div>
                  ))}
                </div>
            </CardContent>
          </Card>

          {/* Trial and Billing Information */}
          <div className="grid grid-cols-1 gap-6">
            {/* Trial Information */}
            <Card className="border-gray-200 bg-gray-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-700">
                  <Clock className="h-5 w-5" />
                  Free Trial Period
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-8">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Trial Duration:</span>
                    <Badge variant="outline" className="bg-gray-100 text-gray-700">
                      7 Days
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Trial Ends:</span>
                    <span className="text-sm text-gray-700 font-medium">
                      {formatDate(trialEndDate)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">After Trial:</span>
                    <span className="text-sm text-gray-700">
                      {selectedPlan.id === 'free' ? 'Continue with Free Plan' : 'Upgrade to Paid Plan'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Credit Card:</span>
                    <span className="text-sm text-gray-700">
                      Not Required
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Billing Period Selection (for paid plans) */}
            {selectedPlan.id !== 'free' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Billing Period</CardTitle>
                  <CardDescription>Choose your preferred billing cycle</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 mb-6">
                    <div className="flex gap-4">
                      <Button
                        variant={period === 'monthly' ? 'default' : 'outline'}
                        onClick={() => setPeriod('monthly')}
                        className={`flex-1 ${period === 'monthly' ? 'bg-gray-900 text-white font-semibold' : 'bg-white text-gray-900 border-2 border-gray-300'}`}
                      >
                        <div className="text-center">
                          <div className={`font-semibold ${period === 'monthly' ? 'text-white' : 'text-gray-900'}`}>Monthly</div>
                          <div className={`text-sm ${period === 'monthly' ? 'text-gray-200' : 'text-gray-600'}`}>${selectedPlan.price}/month</div>
                        </div>
                      </Button>
                      <Button
                        variant={period === 'yearly' ? 'default' : 'outline'}
                        onClick={() => setPeriod('yearly')}
                        className={`flex-1 ${period === 'yearly' ? 'bg-gray-900 text-white font-semibold' : 'bg-white text-gray-900 border-2 border-gray-300'}`}
                      >
                        <div className="text-center">
                          <div className={`font-semibold ${period === 'yearly' ? 'text-white' : 'text-gray-900'}`}>Yearly</div>
                          <div className={`text-sm ${period === 'yearly' ? 'text-gray-200' : 'text-gray-600'}`}>${(selectedPlan.price * 0.83).toFixed(2)}/month</div>
                          <Badge className={`mt-1 text-xs ${period === 'yearly' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'}`}>Save 17%</Badge>
                        </div>
                      </Button>
                    </div>
                    <div className="text-center text-sm text-gray-700 font-medium bg-gray-50 p-3 rounded-lg border border-gray-200">
                      No credit card required. Start your 7-day free trial today.
                    </div>
                  </div>

                  {/* Action Buttons - Moved to bottom of card */}
                  <div className="flex gap-3 justify-end border-t pt-6">
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                      Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={loading}>
                      {loading ? 'Confirming...' : `Start ${selectedPlan.name} Trial`}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

