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
  ko: "Loreguard 개인정보처리방침. 계정, 로컬 저장, BYOK, 외부 연동 데이터 처리 안내.",
  en: "Loreguard Privacy Policy covering accounts, local storage, BYOK, and external integration data handling.",
  ja: "Loreguard プライバシーポリシー。アカウント、ローカル保存、BYOK、外部連携データ処理の案内。",
  zh: "Loreguard 隐私政策，说明账户、本地存储、BYOK 与外部集成数据处理。",
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
