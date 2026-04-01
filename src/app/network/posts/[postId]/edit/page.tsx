import { NetworkPostEditClient } from "@/components/network/NetworkPostEditClient";

export default function EditPostPage({ params }: { params: { postId: string } }) {
  return <NetworkPostEditClient postId={params.postId} />;
}
