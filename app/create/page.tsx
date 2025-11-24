'use client';

import { useState, useEffect } from 'react';
import nextDynamic from 'next/dynamic';
import { Spinner } from '@/components/Spinner';

// Dynamically import CreateRoomForm to prevent SSR analysis
const CreateRoomForm = nextDynamic(() => import('@/components/CreateRoomForm').then(mod => ({ default: mod.CreateRoomForm })), {
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

export default function CreatePage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <CreateRoomForm />
      </main>
    </div>
  );
}

