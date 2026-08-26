import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Institute X Authentication Service',
  description: 'เข้าสู่ระบบ Institute X ด้วยบัญชีมหาวิทยาลัย',
  icons: {
    icon: '/logoX.png',
    apple: '/logoX.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
