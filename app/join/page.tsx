'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { JoinRoomForm } from '@/components/JoinRoomForm';

// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';

function JoinPageContent() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('room');
  const code = searchParams.get('code');

  return (
    <div className="min-h-screen bg-background">
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

