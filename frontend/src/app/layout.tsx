import type { Metadata } from 'next';
import { Kanit, Noto_Sans_JP, Noto_Sans_SC } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

const kanit = Kanit({
  subsets: ['latin', 'thai'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-kanit',
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
      className={`${kanit.variable} ${notoSansChinese.variable} ${notoSansJapanese.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
