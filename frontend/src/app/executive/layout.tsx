import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import OwnerShell from './executive-shell';

export const metadata: Metadata = {
  title: 'Executive Workspace | Institute X',
  description: 'Monitor Institute X users, courses, traffic and learning outcomes.',
};

export default function OwnerLayout({ children }: { children: ReactNode }) {
  return <OwnerShell>{children}</OwnerShell>;
}
