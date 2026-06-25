import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TranslatorStudioBodyMount } from "./TranslatorStudioBodyMount";
import "./translator-studio.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-headline", display: "swap" });

export const metadata: Metadata = {
  title: "번역·현지화 작업실 · Loreguard",
  description:
    "Loreguard 9단계 번역·현지화 작업실. 작품의 세계관, 캐릭터, 용어집, 회차 맥락을 불러와 번역 후보, 작가 승인, 과정기록, 출고 패키지까지 이어갑니다.",
  // [Search private 2026-05-08] 번역 작업실은 검색엔진에 공개하지 않는다.
  robots: { index: false, follow: false },
};

export default function TranslationStudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`translation-studio-root ${inter.variable} ${manrope.variable}`}>
      <TranslatorStudioBodyMount />
      <ErrorBoundary variant="full-page" section="번역·현지화 작업실">
        {children}
      </ErrorBoundary>
    </div>
  );
}
