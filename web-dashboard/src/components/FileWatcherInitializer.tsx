// Client-side file watcher status indicator
'use client';

import { useEffect, useState } from 'react';
import { ClientOnly } from './ClientOnly';

function FileWatcherInitializerInner() {
  const [, setWatcherStatus] = useState<'initializing' | 'active' | 'error' | 'inactive'>('initializing');

  useEffect(() => {
    // Check file watcher status via API
    const checkWatcherStatus = async () => {
      try {
        const response = await fetch('/api/file-watcher/status');
        if (response.ok) {
          const data = await response.json();
          setWatcherStatus(data.isActive ? 'active' : 'inactive');
        } else {
          setWatcherStatus('error');
        }
      } catch (error) {
        console.error('Failed to check file watcher status:', error);
        setWatcherStatus('error');
      }
    };

    // Check status after a short delay
    const timer = setTimeout(checkWatcherStatus, 2000);

    return () => clearTimeout(timer);
  }, []);

  // This component doesn't render anything visible
  return null;
}

export function FileWatcherInitializer() {
  return (
    <ClientOnly>
      <FileWatcherInitializerInner />
    </ClientOnly>
  );
}