import React from "react";

// ============================================================
// PART 1 — Base SkeletonLoader
// ============================================================

/** CSS shimmer animation — premium gradient with glow effect */
const shimmerStyle: React.CSSProperties = {
  background:
    "linear-gradient(90deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 20%, var(--color-bg-secondary) 50%, var(--color-bg-tertiary) 80%, var(--color-bg-secondary) 100%)",
  backgroundSize: "200% 100%",
  animation: "skeleton-shimmer 2s ease-in-out infinite",
};

export type SkeletonVariant = "text" | "card" | "panel" | "editor" | "sidebar" | "avatar" | "button" | "badge";

interface SkeletonLoaderProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  className?: string;
  /** Optional delay for staggered animations (in ms) */
  delay?: number;
}

/**
 * Premium skeleton with shimmer animation.
 * Variants control default sizing:
 * - text: single line placeholder
 * - card: card-sized block
 * - panel: tall panel block
 * - editor: wide editor area
 * - sidebar: narrow sidebar strip
 * - avatar: circular avatar placeholder
 * - button: button-sized rectangle
 * - badge: small badge/tag
 */
export function SkeletonLoader({
  variant = "text",
  width,
  height,
  className = "",
  delay = 0,
}: SkeletonLoaderProps) {
  const defaults: Record<SkeletonVariant, { w: string; h: string; rounded: string }> = {
    text: { w: "100%", h: "16px", rounded: "rounded" },
    card: { w: "100%", h: "120px", rounded: "rounded-2xl" },
    panel: { w: "100%", h: "200px", rounded: "rounded-2xl" },
    editor: { w: "100%", h: "400px", rounded: "rounded-xl" },
    sidebar: { w: "240px", h: "100%", rounded: "rounded-xl" },
    avatar: { w: "40px", h: "40px", rounded: "rounded-full" },
    button: { w: "100px", h: "36px", rounded: "rounded-xl" },
    badge: { w: "60px", h: "24px", rounded: "rounded-full" },
  };

  const d = defaults[variant];

  return (
    <div
      className={`${d.rounded} ${className}`}
      style={{
        ...shimmerStyle,
        width: width ?? d.w,
        height: height ?? d.h,
        animationDelay: delay ? `${delay}ms` : undefined,
      }}
      role="status"
      aria-label="Loading"
    />
  );
}

/** Content card skeleton — image + text combo */
export function ContentCardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`p-4 rounded-2xl border border-white/[0.06] bg-bg-secondary/30 ${className}`}>
      <SkeletonLoader variant="card" height={140} className="mb-3" />
      <SkeletonLoader variant="badge" width="30%" className="mb-2" delay={100} />
      <SkeletonLoader variant="text" width="85%" height={20} className="mb-2" delay={150} />
      <SkeletonLoader variant="text" width="60%" height={14} delay={200} />
      <div className="flex items-center gap-2 mt-4">
        <SkeletonLoader variant="avatar" width={28} height={28} delay={250} />
        <SkeletonLoader variant="text" width={80} height={12} delay={300} />
      </div>
    </div>
  );
}

/** Character card skeleton */
export function CharacterCardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`p-4 rounded-2xl border border-white/[0.06] bg-bg-secondary/30 ${className}`}>
      <div className="flex items-start gap-3">
        <SkeletonLoader variant="avatar" width={56} height={56} />
        <div className="flex-1">
          <SkeletonLoader variant="text" width="50%" height={18} className="mb-2" delay={100} />
          <SkeletonLoader variant="badge" width="40%" delay={150} />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <SkeletonLoader variant="text" width="90%" height={12} delay={200} />
        <SkeletonLoader variant="text" width="70%" height={12} delay={250} />
      </div>
    </div>
  );
}

/** Writing mode skeleton */
export function WritingModeSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-4 rounded-2xl border border-white/[0.06] bg-bg-secondary/30 flex flex-col items-center gap-2">
            <SkeletonLoader variant="avatar" width={32} height={32} delay={i * 50} />
            <SkeletonLoader variant="text" width="60%" height={12} delay={i * 50 + 100} />
          </div>
        ))}
      </div>
      <div className="p-3 rounded-xl border border-white/[0.06] bg-bg-secondary/30 flex items-center gap-3">
        <SkeletonLoader variant="badge" width={60} delay={300} />
        <SkeletonLoader variant="text" className="flex-1" height={36} delay={350} />
      </div>
    </div>
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
