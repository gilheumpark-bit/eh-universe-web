import type { Metadata } from "next";
// [NEXT16-LAYOUT — 2026-05-10] LayoutProps 에서 searchParams 제거됨.
// cookie 'lang' → accept-language → 'ko' fallback.
import { detectServerLang } from "@/lib/i18n/server-lang";

const TITLES = {
  ko: "개인정보처리방침",
  en: "Privacy Policy",
  ja: "プライバシーポリシー",
  zh: "隐私政策",
} as const;

const DESCRIPTIONS = {
  ko: "Loreguard 개인정보처리방침 — K-PIPA, GDPR, APPI, PIPL 준수 정책.",
  en: "Loreguard Privacy Policy — Compliant with K-PIPA, GDPR, APPI, and PIPL.",
  ja: "Loreguard プライバシーポリシー — K-PIPA、GDPR、APPI、PIPL準拠。",
  zh: "Loreguard 隐私政策 — 符合 K-PIPA、GDPR、APPI、PIPL。",
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const lang = await detectServerLang();
  return {
    title: TITLES[lang],
    description: DESCRIPTIONS[lang],
  };
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
