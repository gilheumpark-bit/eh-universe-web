import { SkeletonLoader } from "@/components/SkeletonLoader";

export default function CodexLoading() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="h-14 border-b border-white/[0.06]" />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <SkeletonLoader variant="text" width={160} height={28} className="rounded-lg mb-4" />
        {/* Tab pills */}
        <div className="flex gap-2 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonLoader key={i} variant="text" width={100} height={36} className="rounded-lg" />
          ))}
        </div>
        {/* Content area */}
        <SkeletonLoader variant="panel" height={400} />
      </div>
    </div>
  );
}
