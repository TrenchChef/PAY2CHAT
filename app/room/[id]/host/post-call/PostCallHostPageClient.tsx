'use client';

import { PostCallHost } from '@/components/PostCallHost';

export default function PostCallHostPageClient() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <PostCallHost />
      </main>
    </div>
  );
}

