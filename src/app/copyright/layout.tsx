import type { Metadata } from "next";

const TITLES = {
  ko: "저작권 정책",
  en: "Copyright Policy",
  ja: "著作権ポリシー",
  zh: "版权政策",
} as const;

const DESCRIPTIONS = {
  ko: "Loreguard 저작권 정책 — 사용자 100% 귀속 + AI 생성물 법적 지위 (KR/US).",
  en: "Loreguard Copyright Policy — 100% user ownership + AI-generated content legal status (KR/US).",
  ja: "Loreguard 著作権ポリシー — ユーザー100%帰属 + AI生成物の法的地位 (KR",
  zh: "Loreguard 版权政策 — 用户100%所有权 + AI生成内容的法律地位 (KR",
} as const;

type LangKey = keyof typeof TITLES;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const lang: LangKey = (params?.lang && params.lang in TITLES ? params.lang : "ko") as LangKey;
  return {
    title: TITLES[lang],
    description: DESCRIPTIONS[lang],
  };
}

export default function CopyrightLayout({ children }: { children: React.ReactNode }) {
  return children;
}
