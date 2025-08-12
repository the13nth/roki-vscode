'use client';

import { UserProfile } from '@clerk/nextjs';

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">User Profile</h1>
            <p className="text-gray-600">Manage your account settings and preferences</p>
          </div>
          <UserProfile 
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "shadow-xl border-0 rounded-lg",
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}