import React from 'react';

// ============================================================
// LoadingSkeleton — 재사용 로딩 스켈레톤 (variant 지원)
// ============================================================

export type SkeletonVariant = 'text' | 'card' | 'chart' | 'avatar' | 'button';

interface LoadingSkeletonProps {
  /** 높이 (기본 128px, variant 설정 시 무시) */
  height?: number;
  /** 라운드 크기 (기본 xl) */
  rounded?: string;
  /** 줄 수 (기본 0 = 블록 하나) */
  lines?: number;
  /** 스켈레톤 형태 변형 */
  variant?: SkeletonVariant;
  /** 추가 클래스 */
  className?: string;
}

/** Variant-specific dimension and style presets */
const VARIANT_PRESETS: Record<SkeletonVariant, { width: string; height: string; rounded: string }> = {
  text: { width: '100%', height: '16px', rounded: 'rounded' },
  card: { width: '100%', height: '160px', rounded: 'rounded-xl' },
  chart: { width: '100%', height: '200px', rounded: 'rounded-lg' },
  avatar: { width: '48px', height: '48px', rounded: 'rounded-full' },
  button: { width: '96px', height: '40px', rounded: 'rounded-lg' },
};

export default function LoadingSkeleton({
  height,
  rounded,
  lines = 0,
  variant,
  className = '',
}: LoadingSkeletonProps) {
  // Variant mode: render preset shape
  if (variant) {
    const preset = VARIANT_PRESETS[variant];
    const resolvedRounded = rounded ?? preset.rounded;

    // text variant with lines > 0: multiple text rows
    if (variant === 'text' && lines > 0) {
      return (
        <div className={`space-y-2 px-4 py-4 ${className}`} role="status" aria-label="Loading">
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={`skeleton-shimmer ${resolvedRounded}`}
              style={{
                height: preset.height,
                width: `${Math.max(40, 100 - i * 15)}%`,
              }}
            />
          ))}
        </div>
      );
    }

    // card variant: title bar + body block
    if (variant === 'card') {
      return (
        <div className={`mx-4 my-4 ${className}`} role="status" aria-label="Loading">
          <div className={`skeleton-shimmer ${resolvedRounded} overflow-hidden`} style={{ height: height ? `${height}px` : preset.height, width: preset.width }}>
            <div className="p-4 space-y-3">
              <div className="skeleton-shimmer rounded h-4 w-3/5" />
              <div className="skeleton-shimmer rounded h-3 w-4/5" />
              <div className="skeleton-shimmer rounded h-3 w-2/5" />
            </div>
          </div>
        </div>
      );
    }

    // chart variant: axis lines + bars
    if (variant === 'chart') {
      return (
        <div className={`mx-4 my-4 ${className}`} role="status" aria-label="Loading">
          <div className={`skeleton-shimmer ${resolvedRounded} overflow-hidden`} style={{ height: height ? `${height}px` : preset.height, width: preset.width }}>
            <div className="flex items-end gap-2 h-full p-4 pt-8">
              {[60, 80, 45, 90, 55, 70, 40].map((h, i) => (
                <div key={i} className="skeleton-shimmer rounded-t flex-1" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      );
    }

    // avatar / button: single shape
    return (
      <div className={`mx-4 my-4 inline-block ${className}`} role="status" aria-label="Loading">
        <div
          className={`skeleton-shimmer ${resolvedRounded}`}
          style={{ height: height ? `${height}px` : preset.height, width: preset.width }}
        />
      </div>
    );
  }

  // Legacy: lines mode (no variant)
  if (lines > 0) {
    return (
      <div className={`space-y-2 px-4 py-4 ${className}`} role="status" aria-label="Loading">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`skeleton-shimmer ${rounded ?? 'rounded-xl'} h-4`}
            style={{ width: `${Math.max(40, 100 - i * 15)}%` }}
          />
        ))}
      </div>
    );
  }

  // Legacy: single block
  return (
    <div
      className={`skeleton-shimmer ${rounded ?? 'rounded-xl'} mx-4 my-4 ${className}`}
      style={{ height: `${height ?? 128}px` }}
      role="status"
      aria-label="Loading"
    />
  );
}
