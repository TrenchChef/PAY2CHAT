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
  // Render immediately with visible content
  console.log('📄 HostLobbyPage rendering, mounted:', mounted);
  
  return (
    <div 
      className="min-h-screen bg-background text-text" 
      style={{ 
        minHeight: '100vh', 
        backgroundColor: '#181c20',
        color: '#FFFFFF',
        display: 'block',
        width: '100%',
        padding: '0',
        margin: '0'
      }}
    >
      <ErrorBoundary>
        {!mounted ? (
          <div 
            style={{ 
              minHeight: '100vh', 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#181c20',
              color: '#FFFFFF'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <Spinner size="lg" />
              <p style={{ marginTop: '16px', color: '#FFFFFF', fontSize: '16px' }}>Loading...</p>
            </div>
          </div>
        ) : (
          <main 
            className="container mx-auto px-4 py-8"
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              padding: '32px 16px',
              minHeight: '100vh',
              backgroundColor: '#181c20',
              color: '#FFFFFF'
            }}
          >
            <HostLobby />
          </main>
        )}
      </ErrorBoundary>
    </div>
  );
}

