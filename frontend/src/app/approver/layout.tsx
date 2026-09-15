import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import ApproverShell from './approver-shell';

export const metadata: Metadata = { title: 'Approver Workspace | Institute X', description: 'Review submitted Course Versions and Course reports.' };

export default function ApproverLayout({ children }: { children: ReactNode }) {
  return <ApproverShell>{children}</ApproverShell>;
}
