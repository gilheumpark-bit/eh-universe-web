import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TranslatorStudioBodyMount } from "./TranslatorStudioBodyMount";
import "./translator-studio.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-headline", display: "swap" });

export const metadata: Metadata = {
  title: "EH Translator — EH Universe",
  description: "장편·챕터·용어 중심 번역 워크스페이스",
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
