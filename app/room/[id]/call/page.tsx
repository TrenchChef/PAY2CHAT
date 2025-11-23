import CallPageClient from './CallPageClient';

// Required for static export with dynamic routes
export function generateStaticParams() {
  return []; // Empty array means routes will be handled client-side
}

export default function CallPage() {
  return <CallPageClient />;
}

