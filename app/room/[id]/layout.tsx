'use client';

// Force dynamic rendering to prevent server-side rendering issues
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';

export default function RoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

