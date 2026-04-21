import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용약관",
  description: "Loreguard 서비스 이용약관 — 사용자 권리·의무·면책 범위.",
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
