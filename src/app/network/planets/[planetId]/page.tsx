import { PlanetDetailClient } from "@/components/network/PlanetDetailClient";

interface PlanetDetailPageProps {
  params: Promise<{ planetId: string }>;
}

export default async function PlanetDetailPage({ params }: PlanetDetailPageProps) {
  const { planetId } = await params;
  return <PlanetDetailClient planetId={planetId} />;
}
