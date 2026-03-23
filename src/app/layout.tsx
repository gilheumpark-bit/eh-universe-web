import type { Metadata } from "next";
import { LangProvider } from "@/lib/LangContext";
import { AuthProvider } from "@/lib/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "EH Universe — A Narrative Engine That Prevents Story Collapse",
  description:
    "66 million years of verified SF universe. Open-source narrative engine EH Rulebook. 200+ article archive.",
  metadataBase: new URL("https://eh-universe.com"),
  openGraph: {
    title: "EH Universe — A Narrative Engine That Prevents Story Collapse",
    description:
      "66 million years of verified SF universe. Open-source narrative engine EH Rulebook.",
    type: "website",
    url: "https://eh-universe.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "EH Universe — Narrative Engine",
    description: "66 million years of verified SF universe. Open-source narrative engine.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
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
      <body className="min-h-full flex flex-col">
        <AuthProvider><LangProvider>{children}</LangProvider></AuthProvider>
      </body>
    </html>
  );
}
