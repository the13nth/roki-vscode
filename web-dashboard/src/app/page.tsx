'use client';

import dynamic from 'next/dynamic';

const HomePage = dynamic(() => import('@/components/HomePage').then(mod => ({ default: mod.HomePage })), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-white/30 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading ROKI Project Manager...</p>
      </div>
    </div>
  )
});

export default function Home() {
  return <HomePage />;
}