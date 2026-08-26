import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import ApproverShell from './approver-shell';

export const metadata: Metadata = { title: 'Approver Workspace | Institute X', description: 'Review Teacher permissions and submitted Course Versions.' };

export default function ApproverLayout({ children }: { children: ReactNode }) {
  return <ApproverShell>{children}</ApproverShell>;
}
