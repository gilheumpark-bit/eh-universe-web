import type { Metadata } from "next";
import { PlanetDetailClient } from "@/components/network/PlanetDetailClient";

interface PlanetDetailPageProps {
  params: Promise<{ planetId: string }>;
}

export async function generateMetadata({ params }: PlanetDetailPageProps): Promise<Metadata> {
  const { planetId } = await params;
  const ogUrl = `https://eh-universe-web.vercel.app/api/og?title=${encodeURIComponent(planetId)}&genre=Planet`;
  return {
    openGraph: {
      title: `${planetId} — EH Universe`,
      description: "EH Universe Network — 세계관 게시판",
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function PlanetDetailPage({ params }: PlanetDetailPageProps) {
  const { planetId } = await params;
  return <PlanetDetailClient planetId={planetId} />;
}
