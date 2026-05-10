import type { Metadata } from "next";
// [NEXT16-LAYOUT — 2026-05-10] LayoutProps 에서 searchParams 제거됨.
import { detectServerLang } from "@/lib/i18n/server-lang";

const TITLES = {
  ko: "저작권 정책",
  en: "Copyright Policy",
  ja: "著作権ポリシー",
  zh: "版权政策",
} as const;

const DESCRIPTIONS = {
  ko: "Loreguard 저작권 정책 — 사용자 100% 귀속 + AI 생성물 법적 지위 (KR/US).",
  en: "Loreguard Copyright Policy — 100% user ownership + AI-generated content legal status (KR/US).",
  ja: "Loreguard 著作権ポリシー — ユーザー100%帰属 + AI生成物の法的地位 (KR/US)。",
  zh: "Loreguard 版权政策 — 用户100%所有权 + AI生成内容的法律地位 (KR/US)。",
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const lang = await detectServerLang();
  return {
    title: TITLES[lang],
    description: DESCRIPTIONS[lang],
  };
}

export default function CopyrightLayout({ children }: { children: React.ReactNode }) {
  return children;
}
