'use client';

import { UserProfile } from '@clerk/nextjs';
import SecurityConfigStatus from '@/components/SecurityConfigStatus';
import TokenUsageVisualization from '@/components/TokenUsageVisualization';
import { UserApiSettings } from '@/components/UserApiSettings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">User Profile</h1>
            <p className="text-gray-600">Manage your account settings and preferences</p>
          </div>
          
          <Tabs defaultValue="account" className="space-y-8">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="account">Account Settings</TabsTrigger>
              <TabsTrigger value="api">API Settings</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="usage">Token Usage</TabsTrigger>
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
            
            <TabsContent value="api" className="space-y-8">
              <UserApiSettings />
            </TabsContent>
            
            <TabsContent value="security" className="space-y-8">
              <SecurityConfigStatus />
            </TabsContent>
            
            <TabsContent value="usage" className="space-y-8">
              <TokenUsageVisualization />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}