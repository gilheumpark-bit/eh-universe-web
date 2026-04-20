'use client';

// ============================================================
// PART 1 — Imports & Types
// ============================================================
//
// OriginBadge — 씬시트 필드의 책임 분계 태그를 시각화하는 작은 뱃지.
// USER / TEMPLATE / ENGINE_SUGGEST / ENGINE_DRAFT 4종 origin을
// 색상 + 아이콘 + 텍스트 3중 표시 (디자인 시스템 v8.0 a11y 준수).
//
// 사용:
//   <OriginBadge origin="USER" language="KO" />
//   <OriginBadge origin="ENGINE_DRAFT" language="EN" hideUnlessHover />
//
// 설정 토글(noa_origin_badge_visible)이 false면 컴포넌트 자체가 숨김.
// ============================================================

import React, { useEffect, useState } from 'react';
import { User as UserIcon, Layers, Sparkles, AlertCircle } from 'lucide-react';
import type { EntryOrigin, AppLanguage } from '@/lib/studio-types';
import { logger } from '@/lib/logger';

interface OriginBadgeProps {
  origin: EntryOrigin;
  language?: AppLanguage;
  /** 호버 시에만 표시 (라벨 컴팩트). 기본 false */
  hideUnlessHover?: boolean;
  /** 설정 토글 무시하고 항상 표시. 테스트/특수 화면용. 기본 false */
  forceVisible?: boolean;
  className?: string;
}

// ============================================================
// PART 2 — Origin labels & colors (4-language + a11y)
// ============================================================

const ORIGIN_LABELS: Record<EntryOrigin, Record<AppLanguage, { short: string; full: string; tooltip: string }>> = {
  USER: {
    KO: { short: '작가', full: '작가 입력', tooltip: '작가가 직접 작성한 항목 — 우선 존중됩니다.' },
    EN: { short: 'You', full: 'Author Input', tooltip: 'Written directly by the author — highest priority.' },
    JP: { short: '作家', full: '作家入力', tooltip: '作家が直接書いた項目 — 最優先で尊重されます。' },
    CN: { short: '作家', full: '作家输入', tooltip: '作家直接撰写的项目 — 最优先尊重。' },
  },
  TEMPLATE: {
    KO: { short: '기본', full: '기본 템플릿', tooltip: '장르 프리셋 등 시스템 기본값 — 자유롭게 덮어쓸 수 있습니다.' },
    EN: { short: 'Preset', full: 'Template Default', tooltip: 'System default such as genre preset — feel free to override.' },
    JP: { short: '既定', full: 'テンプレ既定値', tooltip: 'ジャンルプリセット等のシステム既定値 — 自由に上書き可。' },
    CN: { short: '预设', full: '默认模板', tooltip: '类型预设等系统默认值 — 可自由覆盖。' },
  },
  ENGINE_SUGGEST: {
    KO: { short: '제안', full: '엔진 제안', tooltip: '엔진이 제안하고 작가가 수락한 항목 — 작가의 결정 우선.' },
    EN: { short: 'Hint', full: 'Engine Suggestion', tooltip: 'Engine suggested, author accepted — author intent prioritized.' },
    JP: { short: '提案', full: 'エンジン提案', tooltip: 'エンジンが提案し作家が承認 — 作家の判断を優先。' },
    CN: { short: '建议', full: '引擎建议', tooltip: '引擎建议、作家已采纳 — 优先作家意图。' },
  },
  ENGINE_DRAFT: {
    KO: { short: '초안', full: '엔진 미확정 초안', tooltip: '엔진이 작성한 미확정 초안 — 작가 검토 후 확정 필요.' },
    EN: { short: 'Draft', full: 'Engine Draft (unconfirmed)', tooltip: 'Engine-generated unconfirmed draft — requires author confirmation.' },
    JP: { short: '草案', full: 'エンジン未確定草案', tooltip: 'エンジン作成の未確定草案 — 作家の確認が必要。' },
    CN: { short: '草稿', full: '引擎未确定草案', tooltip: '引擎生成的未确定草案 — 需作家确认。' },
  },
};

// 색상 + 테두리 — 디자인 시스템 시맨틱 토큰 사용 (raw Tailwind 금지 원칙)
// USER: 파랑 / TEMPLATE: 회색 / ENGINE_SUGGEST: 황색 / ENGINE_DRAFT: 빨강
const ORIGIN_COLORS: Record<EntryOrigin, string> = {
  USER: 'border-accent-blue/60 text-accent-blue bg-accent-blue/10',
  TEMPLATE: 'border-border text-text-tertiary bg-bg-secondary/40',
  ENGINE_SUGGEST: 'border-accent-yellow/60 text-accent-yellow bg-accent-yellow/10',
  ENGINE_DRAFT: 'border-accent-red/60 text-accent-red bg-accent-red/10',
};

const ORIGIN_ICONS: Record<EntryOrigin, React.FC<{ className?: string }>> = {
  USER: UserIcon,
  TEMPLATE: Layers,
  ENGINE_SUGGEST: Sparkles,
  ENGINE_DRAFT: AlertCircle,
};

// ============================================================
// PART 3 — Visibility preference (localStorage toggle)
// ============================================================

const VISIBILITY_KEY = 'noa_origin_badge_visible';

/** 사용자가 origin 뱃지 표시를 켜둔 상태인지 — 기본 false (초보 작가 노출 0) */
export function isOriginBadgeVisible(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const v = localStorage.getItem(VISIBILITY_KEY);
    return v === '1' || v === 'true';
  } catch {
    return false;
  }
}

export function setOriginBadgeVisible(visible: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VISIBILITY_KEY, visible ? '1' : '0');
    // 다른 컴포넌트가 즉시 반응할 수 있도록 storage 이벤트 디스패치
    window.dispatchEvent(new StorageEvent('storage', { key: VISIBILITY_KEY }));
  } catch (err) {
    logger.warn('OriginBadge', 'setOriginBadgeVisible failed', err);
  }
}

// ============================================================
// PART 4 — Component
// ============================================================

const OriginBadge: React.FC<OriginBadgeProps> = ({
  origin,
  language = 'KO',
  hideUnlessHover = false,
  forceVisible = false,
  className = '',
}) => {
  const [visible, setVisible] = useState<boolean>(() => forceVisible || isOriginBadgeVisible());
  const [hovered, setHovered] = useState(false);

  // [C] 설정 토글 변경 시 즉시 반영 — storage 이벤트 구독
  useEffect(() => {
    if (forceVisible) return;
    const handler = (e: StorageEvent) => {
      if (e.key === VISIBILITY_KEY || e.key === null) {
        setVisible(isOriginBadgeVisible());
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [forceVisible]);

  if (!visible) return null;

  // [C] 잘못된 origin 입력 방어 — fallback USER
  const safeOrigin: EntryOrigin = (['USER', 'TEMPLATE', 'ENGINE_SUGGEST', 'ENGINE_DRAFT'] as EntryOrigin[]).includes(origin)
    ? origin
    : 'USER';

  const labels = ORIGIN_LABELS[safeOrigin][language] ?? ORIGIN_LABELS[safeOrigin].KO;
  const Icon = ORIGIN_ICONS[safeOrigin];
  const color = ORIGIN_COLORS[safeOrigin];

  // hideUnlessHover 모드: 호버 안 됐으면 점만 표시
  if (hideUnlessHover && !hovered) {
    return (
      <span
        role="img"
        aria-label={`${labels.full} — ${labels.tooltip}`}
        title={labels.tooltip}
        onMouseEnter={() => setHovered(true)}
        onFocus={() => setHovered(true)}
        tabIndex={0}
        className={`inline-block w-2 h-2 rounded-full ${color.split(' ').filter(c => c.startsWith('bg-')).join(' ')} ml-1 align-middle ${className}`}
      />
    );
  }

  return (
    <span
      role="status"
      aria-label={`${labels.full} — ${labels.tooltip}`}
      title={labels.tooltip}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      tabIndex={0}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${color} ${className}`}
    >
      <Icon className="w-2.5 h-2.5" />
      <span>{hovered ? labels.full : labels.short}</span>
    </span>
  );
};

export default OriginBadge;
