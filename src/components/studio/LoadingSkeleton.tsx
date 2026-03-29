import React from 'react';

// ============================================================
// LoadingSkeleton — 재사용 로딩 스켈레톤
// ============================================================

interface LoadingSkeletonProps {
  /** 높이 (기본 128px) */
  height?: number;
  /** 라운드 크기 (기본 xl) */
  rounded?: string;
  /** 줄 수 (기본 0 = 블록 하나) */
  lines?: number;
  /** 추가 클래스 */
  className?: string;
}

export default function LoadingSkeleton({
  height = 128,
  rounded = 'rounded-xl',
  lines = 0,
  className = '',
}: LoadingSkeletonProps) {
  if (lines > 0) {
    return (
      <div className={`space-y-2 px-4 py-4 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`animate-pulse bg-bg-secondary ${rounded} h-4`}
            style={{ width: `${Math.max(40, 100 - i * 15)}%` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`animate-pulse bg-bg-secondary ${rounded} mx-4 my-4 ${className}`}
      style={{ height: `${height}px` }}
    />
  );
}
