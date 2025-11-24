'use client';

import { ReactNode } from 'react';
import { WalletProvider } from './WalletProvider';
import { ConsentProvider } from './ConsentProvider';
import { ConsentModalWrapper } from '../ConsentModalWrapper';

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ConsentProvider>
      <WalletProvider>
        <ConsentModalWrapper />
        {children}
      </WalletProvider>
    </ConsentProvider>
  );
}

