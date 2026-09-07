import type { Metadata } from "next";
import "./globals.css";
import "./workspace.css";

export const metadata: Metadata = {
  title: "마디마디 | AI 말하기 코칭",
  description:
    "말버릇, 속도, 발음, 전달력을 분석하고 맞춤 연습을 제안하는 AI 말하기 코칭 서비스",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

// Vercel 최신 버 배포
