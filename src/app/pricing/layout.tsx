import type { Metadata } from "next";
import { detectServerLang } from "@/lib/i18n/server-lang";

const TITLES = {
  ko: "가격 안내",
  en: "Pricing",
  ja: "料金",
  zh: "价格",
} as const;

const DESCRIPTIONS = {
  ko: "Loreguard 가격 안내. 창작 작업, 과정기록, 출고 패키지를 기준으로 나눈 이용 구조.",
  en: "Loreguard pricing for creative work, process records, and release packages.",
  ja: "Loreguard 料金案内。創作作業、過程記録、出稿パッケージを基準にした利用構成。",
  zh: "Loreguard 价格说明。按创作工作、过程记录与出库包组织的使用结构。",
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
