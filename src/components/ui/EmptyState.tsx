"use client";

// ============================================================
// EmptyState — 빈 상태 표준 컴포넌트
// ============================================================
// 용도: 프로젝트 없음 / 원고 없음 / 검색 결과 없음 / 연결 실패 등
// 일관된 아이콘 + 제목 + 설명 + 액션 버튼 레이아웃
// ============================================================

import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  tone?: 'neutral' | 'warning' | 'error';
  className?: string;
}

const TONE_CLASSES: Record<NonNullable<EmptyStateProps['tone']>, { icon: string; ring: string }> = {
  neutral: { icon: 'text-text-tertiary', ring: 'bg-bg-secondary/60' },
  warning: { icon: 'text-accent-amber', ring: 'bg-accent-amber/10' },
  error: { icon: 'text-accent-red', ring: 'bg-accent-red/10' },
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  tone = 'neutral',
  className = '',
}: EmptyStateProps) {
  const tc = TONE_CLASSES[tone];

  return (
    <div
      className={`flex flex-col items-center justify-center text-center gap-4 py-12 px-6 ${className}`}
      role="status"
    >
      {Icon && (
        <div className={`flex items-center justify-center w-16 h-16 rounded-full ${tc.ring}`}>
          <Icon className={`w-8 h-8 ${tc.icon}`} strokeWidth={1.5} />
        </div>
      )}

      <div className="max-w-sm space-y-1.5">
        <h3 className="text-sm font-bold text-text-primary">{title}</h3>
        {description && (
          <p className="text-xs text-text-tertiary leading-relaxed">{description}</p>
        )}
      </div>

      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
          {action && (
            action.href
              ? <a
                  href={action.href}
                  className="inline-flex items-center justify-center px-4 min-h-[44px] rounded-xl bg-accent-amber text-[#1a1a1a] text-sm font-bold transition-[transform,opacity] active:scale-[0.98] hover:opacity-90"
                >
                  {action.label}
                </a>
              : <button
                  onClick={action.onClick}
                  className="inline-flex items-center justify-center px-4 min-h-[44px] rounded-xl bg-accent-amber text-[#1a1a1a] text-sm font-bold transition-[transform,opacity] active:scale-[0.98] hover:opacity-90"
                >
                  {action.label}
                </button>
          )}
          {secondaryAction && (
            secondaryAction.href
              ? <a
                  href={secondaryAction.href}
                  className="inline-flex items-center justify-center px-4 min-h-[44px] rounded-xl bg-bg-secondary border border-border text-text-secondary text-sm font-medium transition-[transform,background-color,color] active:scale-[0.98] hover:text-text-primary"
                >
                  {secondaryAction.label}
                </a>
              : <button
                  onClick={secondaryAction.onClick}
                  className="inline-flex items-center justify-center px-4 min-h-[44px] rounded-xl bg-bg-secondary border border-border text-text-secondary text-sm font-medium transition-[transform,background-color,color] active:scale-[0.98] hover:text-text-primary"
                >
                  {secondaryAction.label}
                </button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;

// IDENTITY_SEAL: EmptyState | role=standard-empty-ui | inputs=icon+title+actions | outputs=JSX
