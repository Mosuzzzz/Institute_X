import type { Metadata } from 'next';
import { Noto_Sans_JP, Noto_Sans_SC } from 'next/font/google';
import type { ReactNode } from 'react';
import '@fontsource/kanit/300.css';
import '@fontsource/kanit/400.css';
import '@fontsource/kanit/500.css';
import '@fontsource/kanit/600.css';
import '@fontsource/kanit/700.css';
import '@fontsource/kanit/800.css';
import './globals.css';
import AppFooter from './app-footer';

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
      className={`${notoSansChinese.variable} ${notoSansJapanese.variable}`}
    >
      <body className="bg-canvas font-sans text-ink antialiased">
        {children}
        <AppFooter />
      </body>
    </html>
  );
}
