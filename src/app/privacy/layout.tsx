import type { Metadata } from "next";

// [C] 라우트별 메타데이터 — 'use client' page.tsx는 metadata export 불가, layout으로 분리
export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "Loreguard 개인정보처리방침 — K-PIPA, GDPR, APPI, PIPL 준수 정책.",
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
