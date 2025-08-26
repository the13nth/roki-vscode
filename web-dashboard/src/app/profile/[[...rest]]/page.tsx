'use client';

import { UserProfile } from '@clerk/nextjs';
import { useUser, useOrganization } from '@clerk/nextjs';
import SecurityConfigStatus from '@/components/SecurityConfigStatus';
import TokenUsageVisualization from '@/components/TokenUsageVisualization';
import { UserApiSettings } from '@/components/UserApiSettings';
import { UserSubscriptionManager } from '@/components/UserSubscriptionManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ProfilePage() {
  const { user } = useUser();
  const { organization } = useOrganization();
  
  // Check if user is admin
  const isAdmin = organization?.slug === 'binghi_admins' || 
                 organization?.name === 'binghi_admins' ||
                 (user?.organizationMemberships?.some((membership: any) => 
                   membership.organization?.slug === 'binghi_admins' || 
                   membership.organization?.name === 'binghi_admins'
                 ));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">User Profile</h1>
            <p className="text-gray-600">Manage your account settings and preferences</p>
          </div>
          
          <Tabs defaultValue="account" className="space-y-8">
            <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-5' : 'grid-cols-3'}`}>
              <TabsTrigger value="account">Account Settings</TabsTrigger>
              <TabsTrigger value="subscription">Subscription</TabsTrigger>
              <TabsTrigger value="api">API Settings</TabsTrigger>
              {isAdmin && <TabsTrigger value="security">Security</TabsTrigger>}
              {isAdmin && <TabsTrigger value="usage">Token Usage</TabsTrigger>}
            </TabsList>
            
            <TabsContent value="account" className="space-y-8">
              <UserProfile 
                appearance={{
                  elements: {
                    rootBox: "mx-auto",
                    card: "shadow-xl border-0 rounded-lg",
                  }
                }}
              />
            </TabsContent>
            
            <TabsContent value="subscription" className="space-y-8">
              <UserSubscriptionManager />
            </TabsContent>
            
            <TabsContent value="api" className="space-y-8">
              <UserApiSettings />
            </TabsContent>
            
            {isAdmin && (
              <TabsContent value="security" className="space-y-8">
                <SecurityConfigStatus />
              </TabsContent>
            )}
            
            {isAdmin && (
              <TabsContent value="usage" className="space-y-8">
                <TokenUsageVisualization />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}


