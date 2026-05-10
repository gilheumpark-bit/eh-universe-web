import type { Metadata } from "next";
// [NEXT16-LAYOUT — 2026-05-10] LayoutProps 에서 searchParams 제거됨.
// cookie 'lang' → accept-language → 'ko' fallback.
import { detectServerLang } from "@/lib/i18n/server-lang";

const TITLES = {
  ko: "AI 고지",
  en: "AI Disclosure",
  ja: "AI 利用告知",
  zh: "AI 使用披露",
} as const;

const DESCRIPTIONS = {
  ko: "Loreguard 사용 AI 모델·데이터 처리·BYOK 정책 투명 공개.",
  en: "Loreguard AI models, data handling, and BYOK policy transparently disclosed.",
  ja: "Loreguard 使用 AI モデル・データ処理・BYOK ポリシーの透明な開示。",
  zh: "Loreguard 使用的 AI 模型、数据处理和 BYOK 政策透明披露。",
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const lang = await detectServerLang();
  return {
    title: TITLES[lang],
    description: DESCRIPTIONS[lang],
  };
}

export default function AiDisclosureLayout({ children }: { children: React.ReactNode }) {
  return children;
}
