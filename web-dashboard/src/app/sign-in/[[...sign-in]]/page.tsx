'use client';

import { SignIn, useAuth } from '@clerk/nextjs';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Page() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const redirectUrl = searchParams.get('redirect_url') || '/projects';

  useEffect(() => {
    // If user is already signed in, redirect them to the intended destination
    if (isSignedIn) {
      router.push(redirectUrl);
    }
  }, [isSignedIn, redirectUrl, router]);

  // Don't render the sign-in form if user is already authenticated
  if (isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your AI Project Manager account</p>
        </div>
        <SignIn 
          redirectUrl={redirectUrl}
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-xl border-0 rounded-lg",
            }
          }}
        />
      </div>
    </div>
  );
}