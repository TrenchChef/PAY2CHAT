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
          <a href="/#top" className="text-text-muted hover:text-text transition-colors">
            Home
          </a>
          <a href="/#create" className="text-text-muted hover:text-text transition-colors">
            Create
          </a>
          <a href="/#join" className="text-text-muted hover:text-text transition-colors">
            Join
          </a>
          <a href="/#how-it-works" className="text-text-muted hover:text-text transition-colors">
            How It Works
          </a>
          <a 
            href="/legal/tos.html" 
            className="text-text-muted hover:text-text transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Terms
          </a>
          <a 
            href="/legal/privacy.html" 
            className="text-text-muted hover:text-text transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy
          </a>
          {publicKey && <ConnectWalletButton />}
        </nav>
      </div>
    </header>
  );
}

