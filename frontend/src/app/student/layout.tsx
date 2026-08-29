import type { Metadata } from 'next';
import { Suspense, type ReactNode } from 'react';
import StudentShell from './student-shell';
import { commonUi } from '../ui-styles';

export const metadata: Metadata = {
  title: 'Student Learning | Institute X',
  description: 'Browse eligible courses and continue learning at Institute X.',
};

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <main className={commonUi.callbackShell}>
          <section className={commonUi.callbackPanel} aria-live="polite">
            <span className={commonUi.spinner} aria-hidden="true" />
            <h1>Loading student workspace…</h1>
          </section>
        </main>
      }
    >
      <StudentShell>{children}</StudentShell>
    </Suspense>
  );
}
