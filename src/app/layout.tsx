import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EH Universe — A Narrative Engine That Prevents Story Collapse",
  description:
    "6,600만 년의 검증된 SF 우주. 오픈소스 서사 엔진 EH Rulebook. 설정집 200+ 아티클. 당신의 이야기가 무너지지 않게 막는다.",
  openGraph: {
    title: "EH Universe — A Narrative Engine That Prevents Story Collapse",
    description:
      "6,600만 년의 검증된 SF 우주. 오픈소스 서사 엔진 EH Rulebook.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Noto+Sans+KR:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
