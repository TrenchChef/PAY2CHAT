'use client';

import { PostCallHost } from '@/components/PostCallHost';

// Force dynamic rendering to prevent server-side rendering issues
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

export default function PostCallHostPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <PostCallHost />
      </main>
    </div>
  );
}

