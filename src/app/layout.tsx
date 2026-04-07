import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "거울 길드 대시보드",
  description: "스카니아 거울 길드 성장 레이스 & 강화 운 랭킹",
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🍄</text></svg>" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
