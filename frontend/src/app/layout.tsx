import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource/kanit/300.css";
import "@fontsource/kanit/400.css";
import "@fontsource/kanit/500.css";
import "@fontsource/kanit/600.css";
import "@fontsource/kanit/700.css";
import "@fontsource/kanit/800.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Institute X Authentication Service",
  description: "เข้าสู่ระบบ Institute X ด้วยบัญชีมหาวิทยาลัย",
  icons: {
    icon: "/logoX.png",
    apple: "/logoX.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="th">
      <body className="bg-canvas font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
