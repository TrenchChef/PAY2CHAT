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
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Ensure we're in the browser
    if (typeof window !== 'undefined') {
      try {
        setMounted(true);
      } catch (e: any) {
        console.error('Failed to mount page:', e);
        setError(e);
      }
    }
  }, []);

  // Log render
  if (typeof window !== 'undefined') {
    console.log('📄 HostLobbyPage rendering, mounted:', mounted, 'error:', error);
  }

  // Always show something - never blank
  // Render immediately with visible content
  if (error) {
    return (
      <div 
        style={{ 
          minHeight: '100vh', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#181c20',
          color: '#FFFFFF',
          padding: '20px',
          fontFamily: 'system-ui, sans-serif'
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '600px' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '16px', color: '#EF4444' }}>Error Loading Page</h1>
          <p style={{ color: '#FFFFFF', marginBottom: '16px' }}>{error.message || 'An error occurred'}</p>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              padding: '12px 24px',
              backgroundColor: '#8B5CF6',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '500'
            }}
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

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
        margin: '0',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      <noscript>
        <div style={{ padding: '20px', color: '#FFFFFF', backgroundColor: '#181c20', minHeight: '100vh' }}>
          <h1>JavaScript Required</h1>
          <p>This application requires JavaScript to function. Please enable JavaScript and refresh the page.</p>
        </div>
      </noscript>
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

