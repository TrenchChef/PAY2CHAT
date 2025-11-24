'use client';

import { ReactNode, useState, useEffect } from 'react';
import { WalletProvider } from './WalletProvider';
import { ConsentProvider } from './ConsentProvider';
import { ConsentModalWrapper } from '../ConsentModalWrapper';

export function ClientProviders({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only render providers after client-side mount
    if (typeof window !== 'undefined') {
      setMounted(true);
    }
  }, []);

  // Don't render providers during SSR - just render children
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ConsentProvider>
      <WalletProvider>
        <ConsentModalWrapper />
        {children}
      </WalletProvider>
    </ConsentProvider>
  );
}

