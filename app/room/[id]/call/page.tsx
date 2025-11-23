'use client';

import { CallUI } from '@/components/CallUI';

// Force dynamic rendering to prevent server-side rendering issues
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

export default function CallPage() {
  return <CallUI />;
}

