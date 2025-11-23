'use client';

import { ConnectWalletButton } from '@/components/ConnectWalletButton';
import { ConsentModal } from '@/components/ConsentModal';
import { ActionScreen } from '@/components/ActionScreen';
import { useConsent } from '@/components/providers/ConsentProvider';

export default function Home() {
  const { consentGiven } = useConsent();

  return (
    <div className="min-h-screen bg-background">
      <ConsentModal />
      
      {consentGiven && (
        <>
          <header className="border-b border-border bg-surface">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
              <div className="text-xl font-bold">X402 CHAT</div>
              <nav className="flex items-center gap-6">
                <a href="/" className="text-text-muted hover:text-text">
                  Home
                </a>
                <ConnectWalletButton />
              </nav>
            </div>
          </header>

          <main className="container mx-auto px-4 py-8">
            <ActionScreen />
          </main>
        </>
      )}
    </div>
  );
}

