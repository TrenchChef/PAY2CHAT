'use client';

import { ConnectWalletButton } from './ConnectWalletButton';
import { useWallet } from '@solana/wallet-adapter-react';

export function NavBar() {
  const { publicKey } = useWallet();

  return (
    <header className="border-b border-border bg-surface sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="text-xl font-bold">X402 CHAT</div>
        <nav className="flex items-center gap-6">
          <a href="/" className="text-text-muted hover:text-text transition-colors">
            Home
          </a>
          <a href="/#features" className="text-text-muted hover:text-text transition-colors">
            Features
          </a>
          <a href="/#how-it-works" className="text-text-muted hover:text-text transition-colors">
            How It Works
          </a>
          <a href="/#pricing" className="text-text-muted hover:text-text transition-colors">
            Pricing
          </a>
          {publicKey && <ConnectWalletButton />}
        </nav>
      </div>
    </header>
  );
}

