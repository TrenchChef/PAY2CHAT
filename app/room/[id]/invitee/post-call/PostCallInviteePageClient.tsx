'use client';

import { PostCallInvitee } from '@/components/PostCallInvitee';

export default function PostCallInviteePageClient() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <PostCallInvitee />
      </main>
    </div>
  );
}

