import type { Metadata } from "next";

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

export default function AiDisclosureLayout({ children }: { children: React.ReactNode }) {
  return children;
}
