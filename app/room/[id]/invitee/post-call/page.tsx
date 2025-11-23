import PostCallInviteePageClient from './PostCallInviteePageClient';

// Required for static export with dynamic routes
export function generateStaticParams() {
  return []; // Empty array means routes will be handled client-side
}

export default function PostCallInviteePage() {
  return <PostCallInviteePageClient />;
}

