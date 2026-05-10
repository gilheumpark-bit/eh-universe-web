import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isFeatureEnabledServer } from "@/lib/feature-flags";

// [Alpha non-public — 2026-05-08] 알파 단계 검색엔진 비공개.
// [2026-05-09] page-level title metadata 보강 — 알파 비공개라도 일관 라벨링.
export const metadata: Metadata = {
  title: "Code Studio · 로어가드",
  description:
    "Loreguard Code Studio — 검증형 코드 생성 스튜디오. 9-team 정적 파이프라인 + Quill Engine 224룰.",
  robots: { index: false, follow: false },
};

export default function CodeStudioLayout({ children }: { children: React.ReactNode }) {
  if (!isFeatureEnabledServer("CODE_STUDIO")) {
    notFound();
  }
  return <div spellCheck={false}>{children}</div>;
}
