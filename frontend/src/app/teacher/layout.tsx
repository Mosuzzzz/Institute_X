import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import TeacherShell from './teacher-shell';

export const metadata: Metadata = {
  title: 'Teacher Workspace | Institute X',
  description: 'Create, review and publish Institute X courses.',
};

export default function TeacherLayout({ children }: { children: ReactNode }) {
  return <TeacherShell>{children}</TeacherShell>;
}
