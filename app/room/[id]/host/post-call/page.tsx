'use client';

import { ConnectWalletButton } from '@/components/ConnectWalletButton';
import { PostCallHost } from '@/components/PostCallHost';

// Required for static export with dynamic routes
export function generateStaticParams() {
  return []; // Empty array means routes will be handled client-side
}

export default function PostCallHostPage() {
  return (
    <div className="min-h-screen bg-background">
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
        <PostCallHost />
      </main>
    </div>
  );
}

