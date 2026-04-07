import { BoardPostDetailClient } from "@/components/network/BoardPostDetailClient";

interface BoardPostDetailPageProps {
  params: Promise<{ postId: string }>;
}

export default async function BoardPostDetailPage({ params }: BoardPostDetailPageProps) {
  const { postId } = await params;
  return <BoardPostDetailClient postId={postId} />;
}
