'use client';

import StatusPage from './status-page';

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <StatusPage code={500} onRetry={retry} />;
}
