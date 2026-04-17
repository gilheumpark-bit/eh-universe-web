// ============================================================
// PART 1 — Planet Edit Page (행성 수정 라우트)
// ============================================================
// 경로: /network/planets/[planetId]/edit
// 접근: 행성 owner만 (클라이언트/서버 양쪽 검증)
// ============================================================

import type { Metadata } from "next";
import { PlanetEditClient } from "@/components/network/PlanetEditClient";

interface PlanetEditPageProps {
  params: Promise<{ planetId: string }>;
}

export async function generateMetadata({ params }: PlanetEditPageProps): Promise<Metadata> {
  const { planetId } = await params;
  return {
    title: `${planetId} 수정 — 작가 네트워크`,
    robots: { index: false, follow: false }, // 수정 페이지는 색인 제외
  };
}

export default async function PlanetEditPage({ params }: PlanetEditPageProps) {
  const { planetId } = await params;
  return <PlanetEditClient planetId={planetId} />;
}

// IDENTITY_SEAL: PlanetEditPage | role=planet edit route | inputs=planetId | outputs=edit form
