'use client';

import { useState, useEffect } from 'react';
import { WaitlistModal } from '@/components/WaitlistModal';
import { Button } from '@/components/ui/button';
import { CheckCircle, Mail } from 'lucide-react';

export default function Page() {
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);

  // Automatically open the waitlist modal when the page loads
  useEffect(() => {
    setIsWaitlistModalOpen(true);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Get Started</h1>
          <p className="text-gray-600 mb-6">ROKI is currently not accepting new users</p>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-yellow-600" />
            </div>
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">
              We're Temporarily Closed
            </h2>
            <p className="text-yellow-700 text-sm mb-4">
              We're working hard to improve ROKI and will be back online soon. 
              Join our waitlist to be notified when we're ready for new sign-ups.
            </p>
            <Button 
              onClick={() => setIsWaitlistModalOpen(true)}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              Join Waitlist
            </Button>
          </div>
          
          <div className="text-sm text-gray-500">
            <p>Already have an account?</p>
            <Button 
              variant="link" 
              className="text-blue-600 hover:text-blue-800 p-0 h-auto"
              onClick={() => window.location.href = '/sign-in'}
            >
              Sign in here
            </Button>
          </div>
        </div>
      </div>
      
      {/* Waitlist Modal */}
      <WaitlistModal 
        isOpen={isWaitlistModalOpen} 
        onClose={() => setIsWaitlistModalOpen(false)} 
      />
    </div>
  );
}