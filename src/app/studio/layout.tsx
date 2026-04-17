import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "로어가드 스튜디오 · 소설 집필",
  description:
    "로어가드(Loreguard) 소설 스튜디오 — NOA 엔진 기반 AI 창작, 세계관 일관성, 번역·출판까지 원스톱.",
  openGraph: {
    title: "로어가드 스튜디오 · 소설 집필",
    description:
      "창작에서 번역·출판까지. 로어가드 집필 OS.",
  },
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
