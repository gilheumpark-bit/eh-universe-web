// 루트 loading.tsx — 홈 카테고리 페이지 로딩 시 카드 그리드 skeleton.
// 개별 라우트는 자체 loading.tsx가 있으면 그것이 우선.
import { ContentCardSkeleton } from "@/components/SkeletonLoader";

export default function Loading() {
  return (
    <div
      className="flex-1 w-full max-w-7xl mx-auto px-4 py-12"
      role="status"
      aria-live="polite"
      aria-label="Loading content"
    >
      <span className="sr-only">Loading...</span>

      {/* 헤더 스켈레톤 */}
      <div className="mb-10 space-y-3">
        <div className="h-3 w-24 rounded bg-bg-secondary animate-pulse" />
        <div className="h-10 w-2/3 max-w-md rounded bg-bg-secondary animate-pulse" />
        <div className="h-4 w-full max-w-xl rounded bg-bg-secondary/70 animate-pulse" />
      </div>

      {/* 카드 그리드 스켈레톤 (스태거 delay) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <ContentCardSkeleton key={i} className={`animation-delay-[${i * 80}ms]`} />
        ))}
      </div>
    </div>
  );
}
