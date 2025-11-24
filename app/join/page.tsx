'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import nextDynamic from 'next/dynamic';
import { Spinner } from '@/components/Spinner';

// Dynamically import JoinRoomForm to prevent SSR analysis
const JoinRoomForm = nextDynamic(() => import('@/components/JoinRoomForm').then(mod => ({ default: mod.JoinRoomForm })), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  ),
});

// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const fetchCache = 'force-no-store';

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

