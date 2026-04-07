import { NetworkPostEditClient } from "@/components/network/NetworkPostEditClient";

interface EditPostPageProps {
  params: Promise<{ postId: string }>;
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  const { postId } = await params;
  return <NetworkPostEditClient postId={postId} />;
}
