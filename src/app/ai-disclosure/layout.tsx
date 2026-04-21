import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI 고지",
  description: "Loreguard 사용 AI 모델·데이터 처리·BYOK 정책 투명 공개.",
};

export default function AiDisclosureLayout({ children }: { children: React.ReactNode }) {
  return children;
}
