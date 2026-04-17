import type { Metadata } from "next";
import { PlanetDetailClient } from "@/components/network/PlanetDetailClient";

interface PlanetDetailPageProps {
  params: Promise<{ planetId: string }>;
}

export async function generateMetadata({ params }: PlanetDetailPageProps): Promise<Metadata> {
  const { planetId } = await params;
  // OG URL은 배포 도메인 기반으로 동적 생성 (하드코딩된 vercel.app 제거)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    ? (process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}`)
    : '';
  const ogUrl = `${baseUrl}/api/og?title=${encodeURIComponent(planetId)}&genre=Planet`;
  return {
    openGraph: {
      title: `${planetId} — 작가 네트워크`,
      description: "작가 네트워크 — 세계관 기반 게시판",
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function PlanetDetailPage({ params }: PlanetDetailPageProps) {
  const { planetId } = await params;
  return <PlanetDetailClient planetId={planetId} />;
}
