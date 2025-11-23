'use client';

import { CreateRoomForm } from '@/components/CreateRoomForm';

export default function CreatePage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <CreateRoomForm />
      </main>
    </div>
  );
}

