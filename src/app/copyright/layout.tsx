import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "저작권 정책",
  description: "Loreguard 저작권 정책 — 사용자 100% 귀속 + AI 생성물 법적 지위 (KR/US).",
};

export default function CopyrightLayout({ children }: { children: React.ReactNode }) {
  return children;
}
