import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "茶葉小舖",
  description: "台灣茶葉線上商店前台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant-TW" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
