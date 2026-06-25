import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Loreguard · 창작 전문 IDE",
  description:
    "Loreguard는 작가의 결정, 수정, 승인, 출고 과정을 기록하는 창작 전문 IDE입니다.",
  // [비공개 운영 — 2026-06-13] 준비 중 표면이라 검색엔진 비공개. robots.txt + meta robots 이중 차단.
  robots: { index: false, follow: false },
  openGraph: {
    title: "Loreguard · 창작 전문 IDE",
    description:
      "작가의 결정, 수정, 승인, 출고 과정을 기록하는 창작 전문 IDE.",
  },
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
