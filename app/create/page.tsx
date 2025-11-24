'use client';

import { useState, useEffect } from 'react';
import { CreateRoomForm } from '@/components/CreateRoomForm';
import { Spinner } from '@/components/Spinner';

// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const fetchCache = 'force-no-store';

export default function CreatePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMounted(true);
    }
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <CreateRoomForm />
      </main>
    </div>
  );
}

