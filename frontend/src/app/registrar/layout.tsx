import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import RegistrarShell from './registrar-shell';

export const metadata: Metadata = {
  title: 'User Registration | Institute X',
  description: 'Manage Institute X user accounts.',
};

export default function RegistrarLayout({ children }: { children: ReactNode }) {
  return <RegistrarShell>{children}</RegistrarShell>;
}
