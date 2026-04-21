import type { Metadata } from "next";

// [C] 4언어 metadata — searchParams.lang 또는 cookie 기반 분기 (server-side)
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

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
