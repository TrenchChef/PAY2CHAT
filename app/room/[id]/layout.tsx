// Force dynamic rendering to prevent server-side rendering issues
export const dynamic = 'force-dynamic';

export default function RoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

