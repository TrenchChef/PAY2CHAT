'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConnectWalletButton } from '@/components/ConnectWalletButton';
import { JoinRoomForm } from '@/components/JoinRoomForm';

function JoinPageContent() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('room');
  const code = searchParams.get('code');

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
        <JoinRoomForm initialRoomId={roomId || undefined} initialCode={code || undefined} />
      </main>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>}>
      <JoinPageContent />
    </Suspense>
  );
}

