import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isFeatureEnabledServer } from "@/lib/feature-flags";
import NetworkClientLayout from "./NetworkClientLayout";

// [Alpha non-public — 2026-05-08] 알파 단계 검색엔진 비공개.
// [2026-05-09] page-level title metadata 보강 — 알파 비공개라도 일관 라벨링.
export const metadata: Metadata = {
  title: "Network · 로어가드",
  description:
    "EH Universe Network — 행성 커뮤니티 + 보고서 + 정착지. 작가·번역가·독자 협업 공간.",
  robots: { index: false, follow: false },
};

export default function NetworkLayout({ children }: { children: React.ReactNode }) {
  if (!isFeatureEnabledServer("NETWORK_COMMUNITY")) {
    notFound();
  }
  return <NetworkClientLayout>{children}</NetworkClientLayout>;
}
