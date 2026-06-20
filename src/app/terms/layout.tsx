import type { Metadata } from "next";
// [NEXT16-LAYOUT — 2026-05-10] LayoutProps 에서 searchParams 제거됨.
import { detectServerLang } from "@/lib/i18n/server-lang";

const TITLES = {
  ko: "이용약관",
  en: "Terms of Service",
  ja: "利用規約",
  zh: "服务条款",
} as const;

const DESCRIPTIONS = {
  ko: "Loreguard 서비스 이용약관. 계정, 창작물, 노아 활용, 사용 기준, 서비스 범위를 안내합니다.",
  en: "Loreguard Terms of Service covering accounts, creative work, Noa usage, use standards, and service scope.",
  ja: "Loreguard サービス利用規約。アカウント、創作物、Noa 活用、利用基準、サービス範囲を案内します。",
  zh: "Loreguard 服务条款，说明账户、创作内容、Noa 使用、使用标准与服务范围。",
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const lang = await detectServerLang();
  return {
    title: TITLES[lang],
    description: DESCRIPTIONS[lang],
  };
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
