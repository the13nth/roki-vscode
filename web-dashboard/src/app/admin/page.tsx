'use client';

import { useUser, useOrganization } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminDashboard } from '@/components/AdminDashboard';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AdminPage() {
  const { user, isLoaded: userLoaded } = useUser();
  const { organization } = useOrganization();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // Check if user is part of binghi_admins organization
  const isAdmin = organization?.slug === 'binghi_admins' || 
                 organization?.name === 'binghi_admins' ||
                 (user?.organizationMemberships?.some((membership: any) => 
                   membership.organization?.slug === 'binghi_admins' || 
                   membership.organization?.name === 'binghi_admins'
                 ));

  useEffect(() => {
    if (userLoaded) {
      if (!user) {
        // User not authenticated, redirect to sign in
        router.push('/sign-in');
        return;
      }

      if (!isAdmin) {
        // User not authorized, set unauthorized state
        setIsAuthorized(false);
        return;
      }

      // User is authorized
      setIsAuthorized(true);
    }
  }, [user, userLoaded, isAdmin, router]);

  // Loading state
  if (!userLoaded || isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  // Unauthorized state
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-md w-full mx-auto p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5" />
                <span className="font-semibold">Access Denied</span>
              </div>
              <p>You need to be a member of the binghi_admins organization to access this page.</p>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Authorized state - show admin dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          </div>
          <p className="text-gray-600">
            Welcome, {user?.firstName} {user?.lastName}. Here's an overview of your application.
          </p>
        </div>
        
        <AdminDashboard />
      </div>
    </div>
  );
}
