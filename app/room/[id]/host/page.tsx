'use client';

import { useState, useEffect } from 'react';
import { HostLobby } from '@/components/HostLobby';
import { Spinner } from '@/components/Spinner';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Force dynamic rendering to prevent server-side rendering issues
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default function HostLobbyPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Ensure we're in the browser
    if (typeof window !== 'undefined') {
      setMounted(true);
    }
  }, []);

  // Always show something - never blank
  // Render immediately with minimal content, then show full UI when mounted
  return (
    <div className="min-h-screen bg-background">
      <ErrorBoundary>
        {!mounted ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <Spinner size="lg" />
              <p className="mt-4 text-text-muted">Loading...</p>
            </div>
          </div>
        ) : (
          <main className="container mx-auto px-4 py-8">
            <HostLobby />
          </main>
        )}
      </ErrorBoundary>
    </div>
  );
}

