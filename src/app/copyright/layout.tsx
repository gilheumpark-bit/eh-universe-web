import type { Metadata } from "next";
// [NEXT16-LAYOUT — 2026-05-10] LayoutProps 에서 searchParams 제거됨.
import { detectServerLang } from "@/lib/i18n/server-lang";

const TITLES = {
  ko: "저작권 정책",
  en: "Copyright Policy",
  ja: "著作権ポリシー",
  zh: "版权政策",
} as const;

const DESCRIPTIONS = {
  ko: "Loreguard 저작권 정책. 사용자 귀속, 노아 활용 저작물 기준, 외부 플랫폼 게시 기준 안내.",
  en: "Loreguard Copyright Policy covering user ownership, Noa-assisted work standards, and external platform posting standards.",
  ja: "Loreguard 著作権ポリシー。ユーザー帰属、Noa 活用作品基準、外部プラットフォーム投稿基準の案内。",
  zh: "Loreguard 版权政策，说明用户所有权、Noa 辅助作品标准与外部平台发布标准。",
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const lang = await detectServerLang();
  return {
    title: TITLES[lang],
    description: DESCRIPTIONS[lang],
  };
}

export default function CopyrightLayout({ children }: { children: React.ReactNode }) {
  return children;
}
