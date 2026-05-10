import type { Metadata } from "next";

// [2026-05-09] codex layout.tsx 신설 — page-level title metadata 누락 보강.
// codex 는 공개 페이지 — robots index 허용, 4언어 통합 title.
export const metadata: Metadata = {
  title: "Codex · 로어가드 — 소설가의 IDE",
  description:
    "EH Universe Codex — 룰북·세계관 참조·사용자 가이드 통합. 소설가의 IDE 의 검증 baseline 자료.",
  openGraph: {
    title: "Codex · 로어가드",
    description: "룰북 · 참조 · 가이드 통합 자료.",
  },
};

export default function CodexLayout({ children }: { children: React.ReactNode }) {
  return children;
}
