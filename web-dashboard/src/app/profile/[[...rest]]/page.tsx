'use client';

import { UserProfile } from '@clerk/nextjs';
import { useUser, useOrganization } from '@clerk/nextjs';
import SecurityConfigStatus from '@/components/SecurityConfigStatus';
import TokenUsageVisualization from '@/components/TokenUsageVisualization';
import { UserApiSettings } from '@/components/UserApiSettings';
import { UserSubscriptionManager } from '@/components/UserSubscriptionManager';
import { UserNotifications } from '@/components/UserNotifications';
import { ProjectInvitations } from '@/components/ProjectInvitations';
import ProjectAccessDisplay from '@/components/ProjectAccessDisplay';
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
          
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="tokens">Token Usage</TabsTrigger>
              <TabsTrigger value="api">API Settings</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="invitations">Project Invitations</TabsTrigger>
              <TabsTrigger value="access">Project Access</TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="subscription">Subscription</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="profile" className="mt-6">
              <UserProfile />
            </TabsContent>

            <TabsContent value="security" className="mt-6">
              <SecurityConfigStatus />
            </TabsContent>

            <TabsContent value="tokens" className="mt-6">
              <TokenUsageVisualization />
            </TabsContent>

            <TabsContent value="api" className="mt-6">
              <UserApiSettings />
            </TabsContent>

            <TabsContent value="notifications" className="mt-6">
              <UserNotifications />
            </TabsContent>

            <TabsContent value="invitations" className="mt-6">
              <ProjectInvitations />
            </TabsContent>

            <TabsContent value="access" className="mt-6">
              <ProjectAccessDisplay />
            </TabsContent>

            {isAdmin && (
              <TabsContent value="subscription" className="mt-6">
                <UserSubscriptionManager />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}


