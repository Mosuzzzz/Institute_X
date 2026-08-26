import type { Metadata } from 'next';
import { Noto_Sans_JP, Noto_Sans_SC, Noto_Sans_Thai } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const notoSans = Noto_Sans_Thai({
  subsets: ['latin', 'thai'],
  display: 'swap',
  variable: '--font-noto-sans',
});

const notoSansChinese = Noto_Sans_SC({
  display: 'swap',
  preload: false,
  variable: '--font-noto-sans-sc',
});

const notoSansJapanese = Noto_Sans_JP({
  display: 'swap',
  preload: false,
  variable: '--font-noto-sans-jp',
});

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
    <html
      lang="th"
      className={`${notoSans.variable} ${notoSansChinese.variable} ${notoSansJapanese.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
