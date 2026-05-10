import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TranslatorStudioBodyMount } from "./TranslatorStudioBodyMount";
import "./translator-studio.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-headline", display: "swap" });

export const metadata: Metadata = {
  title: "Fiction-native Translation Studio · 로어가드",
  description:
    "Fiction-native Translation Studio — 소설 전문 번역. 장편 IP 의 세계관·캐릭터·용어집·회차 맥락을 반영한 맥락 번역. 한국 작가는 세계로, 해외 작가는 한국·아시아로. AI prepares. Translators elevate. Authors go global.",
  // [Alpha non-public — 2026-05-08] 알파 단계 검색엔진 비공개.
  robots: { index: false, follow: false },
};

export default function TranslationStudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`translation-studio-root ${inter.variable} ${manrope.variable}`}>
      <TranslatorStudioBodyMount />
      <ErrorBoundary variant="full-page" section="Translation Studio">
        {children}
      </ErrorBoundary>
    </div>
  );
}
