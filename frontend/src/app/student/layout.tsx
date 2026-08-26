import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import StudentShell from './student-shell';

export const metadata: Metadata = {
  title: 'Student Learning | Institute X',
  description: 'Browse eligible courses and continue learning at Institute X.',
};

export default function StudentLayout({ children }: { children: ReactNode }) {
  return <StudentShell>{children}</StudentShell>;
}
