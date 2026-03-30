import React from "react";

// ============================================================
// PART 1 — Base SkeletonLoader
// ============================================================

/** CSS shimmer animation — uses design tokens for dark-theme compatibility */
const shimmerStyle: React.CSSProperties = {
  background:
    "linear-gradient(90deg, var(--color-bg-secondary) 25%, var(--color-bg-tertiary) 50%, var(--color-bg-secondary) 75%)",
  backgroundSize: "200% 100%",
  animation: "skeleton-shimmer 1.8s ease-in-out infinite",
};

export type SkeletonVariant = "text" | "card" | "panel" | "editor" | "sidebar";

interface SkeletonLoaderProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  className?: string;
}

/**
 * Reusable skeleton with shimmer animation.
 * Variants control default sizing:
 * - text: single line placeholder
 * - card: card-sized block
 * - panel: tall panel block
 * - editor: wide editor area
 * - sidebar: narrow sidebar strip
 */
export function SkeletonLoader({
  variant = "text",
  width,
  height,
  className = "",
}: SkeletonLoaderProps) {
  const defaults: Record<SkeletonVariant, { w: string; h: string; rounded: string }> = {
    text: { w: "100%", h: "16px", rounded: "rounded" },
    card: { w: "100%", h: "120px", rounded: "rounded-xl" },
    panel: { w: "100%", h: "200px", rounded: "rounded-xl" },
    editor: { w: "100%", h: "400px", rounded: "rounded-lg" },
    sidebar: { w: "240px", h: "100%", rounded: "rounded-lg" },
  };

  const d = defaults[variant];

  return (
    <div
      className={`${d.rounded} ${className}`}
      style={{
        ...shimmerStyle,
        width: width ?? d.w,
        height: height ?? d.h,
      }}
      role="status"
      aria-label="Loading"
    />
  );
}

// IDENTITY_SEAL: PART-1 | role=base skeleton element | inputs=variant,width,height | outputs=shimmer div

// ============================================================
// PART 2 — Compound Skeletons
// ============================================================

/** Studio page skeleton — sidebar + main editor area */
export function StudioPageSkeleton() {
  return (
    <div className="flex h-screen w-full bg-bg-primary">
      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-[260px] border-r border-white/[0.06] p-4 gap-3">
        <SkeletonLoader variant="text" width="60%" height={20} />
        <SkeletonLoader variant="text" width="80%" height={14} />
        <div className="mt-4 flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonLoader key={i} variant="text" height={36} />
          ))}
        </div>
        <div className="mt-auto">
          <SkeletonLoader variant="card" height={80} />
        </div>
      </div>
      {/* Main editor area */}
      <div className="flex-1 flex flex-col p-6 gap-4">
        {/* Top toolbar */}
        <div className="flex items-center gap-3">
          <SkeletonLoader variant="text" width={180} height={32} className="rounded-lg" />
          <SkeletonLoader variant="text" width={100} height={32} className="rounded-lg" />
          <div className="flex-1" />
          <SkeletonLoader variant="text" width={32} height={32} className="rounded-full" />
          <SkeletonLoader variant="text" width={32} height={32} className="rounded-full" />
        </div>
        {/* Tab bar */}
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonLoader key={i} variant="text" width={80} height={28} className="rounded-md" />
          ))}
        </div>
        {/* Editor body */}
        <SkeletonLoader variant="editor" className="flex-1" />
      </div>
    </div>
  );
}

/** Code Studio skeleton — activity bar + editor + panel */
export function CodeStudioSkeleton() {
  return (
    <div className="flex h-screen w-full bg-bg-primary">
      {/* Activity bar */}
      <div className="flex flex-col items-center w-12 border-r border-white/[0.06] py-4 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonLoader key={i} variant="text" width={28} height={28} className="rounded" />
        ))}
      </div>
      {/* Side panel */}
      <div className="hidden md:flex flex-col w-[240px] border-r border-white/[0.06] p-3 gap-2">
        <SkeletonLoader variant="text" width="70%" height={18} />
        <div className="mt-2 flex flex-col gap-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonLoader key={i} variant="text" height={28} />
          ))}
        </div>
      </div>
      {/* Editor area */}
      <div className="flex-1 flex flex-col">
        {/* Tab row */}
        <div className="flex items-center gap-1 border-b border-white/[0.06] px-3 py-1.5">
          <SkeletonLoader variant="text" width={120} height={26} className="rounded" />
          <SkeletonLoader variant="text" width={100} height={26} className="rounded" />
        </div>
        {/* Editor body */}
        <div className="flex-1 p-4">
          <div className="flex flex-col gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <SkeletonLoader
                key={i}
                variant="text"
                width={`${Math.max(30, 95 - i * 5)}%`}
                height={16}
              />
            ))}
          </div>
        </div>
        {/* Bottom panel */}
        <div className="border-t border-white/[0.06] h-[180px] p-3 flex flex-col gap-2">
          <SkeletonLoader variant="text" width={140} height={18} />
          <SkeletonLoader variant="card" height={100} />
        </div>
      </div>
    </div>
  );
}

/** Archive grid skeleton */
export function ArchiveSkeleton() {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header placeholder */}
      <div className="h-14 border-b border-white/[0.06]" />
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Title */}
        <SkeletonLoader variant="text" width={200} height={32} className="rounded-lg mb-2" />
        <SkeletonLoader variant="text" width={320} height={16} className="rounded mb-6" />
        {/* Search bar */}
        <SkeletonLoader variant="text" height={40} className="rounded-xl mb-8" />
        {/* Category pills */}
        <div className="flex gap-2 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonLoader key={i} variant="text" width={80} height={30} className="rounded-full" />
          ))}
        </div>
        {/* Card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2 p-4 rounded-xl border border-white/[0.06]">
              <SkeletonLoader variant="text" width="40%" height={12} />
              <SkeletonLoader variant="text" width="80%" height={18} />
              <SkeletonLoader variant="text" width="60%" height={14} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Network page skeleton */
export function NetworkSkeleton() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="h-14 border-b border-white/[0.06]" />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <SkeletonLoader variant="text" width={180} height={28} className="rounded-lg mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonLoader key={i} variant="card" height={140} />
          ))}
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-2 | role=compound page skeletons | inputs=none | outputs=StudioPageSkeleton,CodeStudioSkeleton,ArchiveSkeleton,NetworkSkeleton
