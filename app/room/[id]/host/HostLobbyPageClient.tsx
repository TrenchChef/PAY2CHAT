'use client';

import { HostLobby } from '@/components/HostLobby';

export default function HostLobbyPageClient() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <HostLobby />
      </main>
    </div>
  );
}

