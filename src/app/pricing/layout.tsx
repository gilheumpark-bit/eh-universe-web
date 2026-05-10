import type { Metadata } from "next";
import { detectServerLang } from "@/lib/i18n/server-lang";

const TITLES = {
  ko: "가격 안내",
  en: "Pricing",
  ja: "料金",
  zh: "价格",
} as const;

const DESCRIPTIONS = {
  ko: "Loreguard 가격 — 알파 단계는 무료. 정식 출시 시 Indie / Pro / Publisher / Enterprise 4 tier.",
  en: "Loreguard pricing — Free during alpha. Indie / Pro / Publisher / Enterprise tiers at GA.",
  ja: "Loreguard 料金 — アルファは無料。正式リリース時に Indie / Pro / Publisher / Enterprise 4 tier。",
  zh: "Loreguard 价格 — Alpha 期间免费。正式发布时 Indie / Pro / Publisher / Enterprise 4 tier。",
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const lang = await detectServerLang();
  return {
    title: TITLES[lang],
    description: DESCRIPTIONS[lang],
  };
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
