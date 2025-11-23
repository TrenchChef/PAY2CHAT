// Force dynamic rendering for join route
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

export default function JoinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

