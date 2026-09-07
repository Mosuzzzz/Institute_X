'use client';

import '@fontsource/kanit/400.css';
import '@fontsource/kanit/500.css';
import '@fontsource/kanit/600.css';
import './globals.css';
import StatusPage from './status-page';

export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="th">
      <body>
        <StatusPage code={500} onRetry={retry} />
      </body>
    </html>
  );
}
