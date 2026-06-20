"use client";

// ============================================================
// PART 1 — imports & types
// ============================================================
// 용도: 프로젝트 없음 / 원고 없음 / 검색 결과 없음 / 연결 실패 등
// 일관된 아이콘 + 제목 + 설명 + 액션 버튼 레이아웃
// API: 하위 호환 — 구(action/secondaryAction/tone)·신(actions[]/tip/compact) 동시 지원

import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary';
}

interface LegacyAction {
  label: string;
  onClick?: () => void;
  href?: string;
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** 신규 API — 여러 액션 지원. variant(primary/secondary)로 스타일 구분. */
  actions?: EmptyStateAction[];
  /** 구 API — 단일 주 액션. 하위 호환 유지. */
  action?: LegacyAction;
  /** 구 API — 단일 보조 액션. 하위 호환 유지. */
  secondaryAction?: LegacyAction;
  /** 보조 설명/힌트 — "💡 Ctrl+K 사용 가능" 류. */
  tip?: string;
  /** 사이드바/리스트 등 좁은 컨테이너용 축소 모드. */
  compact?: boolean;
  /** 색조 — neutral(기본) / warning / error. */
  tone?: 'neutral' | 'warning' | 'error';
  className?: string;
}

// ============================================================
// PART 2 — style presets
// ============================================================
// tone은 아이콘 링만 조절 (text-*), compact는 전체 여백/크기 축소.
// [C] 디자인시스템 v8.0 시맨틱 토큰 사용 — raw Tailwind 금지.

const TONE_CLASSES: Record<NonNullable<EmptyStateProps['tone']>, { icon: string; ring: string }> = {
  neutral: { icon: 'text-text-tertiary', ring: 'bg-bg-secondary/60' },
  warning: { icon: 'text-accent-amber', ring: 'bg-accent-amber/10' },
  error: { icon: 'text-accent-red', ring: 'bg-accent-red/10' },
};

const PRIMARY_BTN =
  'inline-flex items-center justify-center gap-1.5 px-4 min-h-[44px] rounded-xl ' +
  'bg-accent-amber text-[#1a1a1a] text-sm font-bold ' +
  'transition-[transform,opacity] active:scale-[0.98] hover:opacity-90 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue';

const SECONDARY_BTN =
  'inline-flex items-center justify-center gap-1.5 px-4 min-h-[44px] rounded-xl ' +
  'bg-bg-secondary border border-border text-text-secondary text-sm font-medium ' +
  'transition-[transform,background-color,color] active:scale-[0.98] hover:text-text-primary ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue';

// ============================================================
// PART 3 — component
// ============================================================
export function EmptyState({
  icon: Icon,
  title,
  description,
  actions,
  action,
  secondaryAction,
  tip,
  compact = false,
  tone = 'neutral',
  className = '',
}: EmptyStateProps) {
  // [C] tone 값 방어 — 잘못된 값이 들어와도 neutral로 폴백
  const tc = TONE_CLASSES[tone] ?? TONE_CLASSES.neutral;

  // [G] 렌더링할 액션 목록 계산 — 신규 API 우선, 없으면 구 API를 normalize
  const renderActions: EmptyStateAction[] = (() => {
    if (actions && actions.length > 0) return actions;
    const legacy: EmptyStateAction[] = [];
    if (action) legacy.push({ ...action, variant: 'primary' });
    if (secondaryAction) legacy.push({ ...secondaryAction, variant: 'secondary' });
    return legacy;
  })();

  // compact 모드: 아이콘/패딩 축소, 타이틀 사이즈 감소
  const ringSize = compact ? 'w-10 h-10' : 'w-16 h-16';
  const iconSize = compact ? 'w-5 h-5' : 'w-8 h-8';
  const padY = compact ? 'py-6' : 'py-12';
  const padX = compact ? 'px-4' : 'px-6';
  const titleSize = compact ? 'text-xs' : 'text-sm';
  const descSize = compact ? 'text-[11px]' : 'text-xs';

  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center text-center gap-4 ${padY} ${padX} ${className}`}
    >
      {Icon && (
        <div className={`flex items-center justify-center ${ringSize} rounded-full ${tc.ring}`}>
          <Icon className={`${iconSize} ${tc.icon}`} strokeWidth={1.5} aria-hidden="true" />
        </div>
      )}

      <div className="max-w-sm space-y-1.5">
        <h3 className={`${titleSize} font-bold text-text-primary`}>{title}</h3>
        {description && (
          <p className={`${descSize} text-text-tertiary leading-relaxed`}>{description}</p>
        )}
      </div>

      {renderActions.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
          {renderActions.map((a, i) => {
            const ActionIcon = a.icon;
            const cls = a.variant === 'secondary' ? SECONDARY_BTN : PRIMARY_BTN;
            const content = (
              <>
                {ActionIcon && <ActionIcon className="w-3.5 h-3.5" aria-hidden="true" />}
                {a.label}
              </>
            );
            return a.href ? (
              <a key={i} href={a.href} className={cls}>
                {content}
              </a>
            ) : (
              <button key={i} type="button" onClick={a.onClick} className={cls}>
                {content}
              </button>
            );
          })}
        </div>
      )}

      {tip && (
        <p className={`${compact ? 'text-[10px]' : 'text-xs'} text-text-tertiary italic`}>
          💡 {tip}
        </p>
      )}
    </div>
  );
}

export default EmptyState;

// IDENTITY_SEAL: EmptyState | role=standard-empty-ui | inputs=icon+title+actions+tip+compact | outputs=JSX
