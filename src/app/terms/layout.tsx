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
  ko: "Loreguard 서비스 이용약관 — 사용자 권리·의무·면책 범위.",
  en: "Loreguard Terms of Service — User rights, obligations, and limitations.",
  ja: "Loreguard サービス利用規約 — ユーザーの権利・義務・免責範囲。",
  zh: "Loreguard 服务条款 — 用户权利、义务及免责范围。",
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
