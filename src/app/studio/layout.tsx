import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "로어가드 · 소설가의 IDE",
  description:
    "Loreguard — 소설가의 IDE. 코드처럼 검증되는 소설. NOA 엔진 기반 AI 창작·세계관 일관성·번역·출판 원스톱.",
  // [Alpha non-public — 2026-05-08] 알파 단계라 검색엔진 비공개. robots.txt + meta robots 이중 차단.
  robots: { index: false, follow: false },
  openGraph: {
    title: "로어가드 · 소설가의 IDE",
    description:
      "Loreguard — 소설가의 IDE. 코드처럼 검증되는 소설.",
  },
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
