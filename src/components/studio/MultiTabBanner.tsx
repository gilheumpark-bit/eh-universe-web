'use client';

/**
 * MultiTabBanner — M1.3 멀티탭 상태 배너.
 *
 * 3가지 상태:
 *  - leader (단일 탭): 표시 없음 (null).
 *  - leader + followers (2+ 탭): 상단 피어 카운트 배너.
 *  - follower: 상단 동기화 상태 배너 + "이 창에서 계속" 버튼.
 *
 * [C] role="status" + aria-live="polite" (UI 변화 스크린리더 고지)
 * [G] 메시지는 useMemo / 버튼 상태 변경 시에만 재렌더
 * [K] className은 시맨틱 토큰만 사용
 *
 * @module components/studio/MultiTabBanner
 */

// ============================================================
// PART 1 — Imports & types
// ============================================================

import React, { useCallback, useMemo, useState } from 'react';
import { Users, Eye, ArrowUpCircle, AlertTriangle } from 'lucide-react';
import type { AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';

export interface MultiTabBannerProps {
  /** 이 탭이 Leader인가. */
  isLeader: boolean;
  /** Follower 수 (자신 제외). -1이면 알 수 없음(Web Locks). */
  followerCount: number;
  /** 현재 Leader의 tabId (Follower 뷰에서 짧게 표시용, null 허용). */
  leaderTabId?: string | null;
  /** 충돌 감지 개수 — 배지 표시 */
  conflictCount?: number;
  /** 언어 */
  language: AppLanguage | string;
  /** 수동 승격 요청 */
  onRequestPromotion?: () => Promise<boolean>;
  /** 충돌 로그 보기 버튼 (옵션) */
  onViewConflicts?: () => void;
}

// ============================================================
// PART 2 — 4-언어 라벨
// ============================================================

function makeLabels(lang: AppLanguage | string) {
  return {
    // Leader + followers
    leaderWithFollowers: (n: number) =>
      L4(lang, {
        ko: `다른 창에서도 작업 중 (${n}개)`,
        en: `Also working in other windows (${n})`,
        ja: `他のウィンドウでも作業中 (${n}個)`,
        zh: `其他窗口也在工作中 (${n} 个)`,
      }),
    leaderWithFollowersSubtitle: L4(lang, {
      ko: '이 탭이 저장을 담당합니다',
      en: 'This tab handles saves',
      ja: 'このタブが保存を担当',
      zh: '此标签页负责保存',
    }),
    // Follower
    followerTitle: L4(lang, {
      ko: '다른 창에서 저장 중',
      en: 'Saving in another window',
      ja: '別のウィンドウで保存中',
      zh: '正在其他窗口保存',
    }),
    followerSubtitle: L4(lang, {
      ko: '충돌을 막기 위해 저장 담당 창을 유지합니다',
      en: 'Keeping one save window to avoid conflicts',
      ja: '競合を防ぐため保存担当ウィンドウを維持します',
      zh: '为避免冲突，将保留一个保存窗口',
    }),
    promoteBtn: L4(lang, {
      ko: '이 창에서 계속',
      en: 'Continue here',
      ja: 'このウィンドウで続ける',
      zh: '在此窗口继续',
    }),
    promoting: L4(lang, {
      ko: '전환 중...',
      en: 'Switching...',
      ja: '切り替え中...',
      zh: '正在切换...',
    }),
    promoteFailed: L4(lang, {
      ko: '전환 실패 — 다시 시도하세요',
      en: 'Switch failed — please retry',
      ja: '切り替えに失敗 — 再試行してください',
      zh: '切换失败 — 请重试',
    }),
    // Conflicts
    conflictBadge: (n: number) =>
      L4(lang, {
        ko: `동시 편집 ${n}건 감지`,
        en: `${n} concurrent edit${n === 1 ? '' : 's'} detected`,
        ja: `同時編集 ${n}件を検出`,
        zh: `检测到 ${n} 个并发编辑`,
      }),
    viewConflictsBtn: L4(lang, {
      ko: '자세히',
      en: 'Details',
      ja: '詳細',
      zh: '详情',
    }),
    // a11y
    promoteAriaHelp: L4(lang, {
      ko: '현재 저장 담당 탭에게 쓰기 권한 양도를 요청합니다. 2초 안에 응답하지 않으면 실패로 처리됩니다.',
      en: 'Requests the current primary tab to transfer write access. Fails if no response within 2 seconds.',
      ja: '現在の主タブに書き込み権限の譲渡をリクエストします。2秒以内に応答がない場合は失敗となります。',
      zh: '请求当前主标签页转移写入权限。2 秒内无响应则失败。',
    }),
    statusLabelFollower: L4(lang, {
      ko: '멀티창 상태: 저장 대기',
      en: 'Multi-window status: save standby',
      ja: 'マルチウィンドウ状態: 保存待機',
      zh: '多窗口状态: 保存待机',
    }),
    statusLabelLeader: L4(lang, {
      ko: '멀티탭 상태: 저장 담당 탭',
      en: 'Multi-tab status: primary tab',
      ja: 'マルチタブ状態: 主タブ',
      zh: '多标签状态: 主标签页',
    }),
  } as const;
}

// ============================================================
// PART 3 — 보조 함수
// ============================================================

function shortTabId(id: string | null | undefined): string {
  if (!id) return '';
  return id.slice(-6);
}

// ============================================================
// PART 4 — Component
// ============================================================

const MultiTabBanner: React.FC<MultiTabBannerProps> = ({
  isLeader,
  followerCount,
  leaderTabId,
  conflictCount = 0,
  language,
  onRequestPromotion,
  onViewConflicts,
}) => {
  const labels = useMemo(() => makeLabels(language), [language]);
  const [promoting, setPromoting] = useState(false);
  const [promoteFailed, setPromoteFailed] = useState(false);

  const handlePromote = useCallback(async () => {
    if (!onRequestPromotion) return;
    setPromoting(true);
    setPromoteFailed(false);
    try {
      const ok = await onRequestPromotion();
      if (!ok) setPromoteFailed(true);
    } catch {
      setPromoteFailed(true);
    } finally {
      setPromoting(false);
    }
  }, [onRequestPromotion]);

  // Leader (단일 탭) — 표시 없음
  if (isLeader && followerCount <= 0) {
    // 충돌만 있을 때는 경고용 작은 뷰
    if (conflictCount > 0) {
      return (
        <ConflictOnlyBanner
          count={conflictCount}
          message={labels.conflictBadge(conflictCount)}
          viewLabel={labels.viewConflictsBtn}
          onView={onViewConflicts}
        />
      );
    }
    return null;
  }

  // Leader + followers
  if (isLeader && followerCount > 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={labels.statusLabelLeader}
        data-testid="multi-tab-banner"
        data-variant="leader-with-followers"
        className="flex items-center justify-between gap-3 border-b border-border bg-accent-blue/10 px-4 py-2 text-sm text-text-primary"
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-accent-blue" aria-hidden />
          <span className="font-semibold">{labels.leaderWithFollowers(followerCount)}</span>
          <span className="text-xs text-text-secondary">· {labels.leaderWithFollowersSubtitle}</span>
        </div>
        {conflictCount > 0 && (
          <ConflictInlineChip
            count={conflictCount}
            message={labels.conflictBadge(conflictCount)}
            viewLabel={labels.viewConflictsBtn}
            onView={onViewConflicts}
          />
        )}
      </div>
    );
  }

  // Follower
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={labels.statusLabelFollower}
      data-testid="multi-tab-banner"
      data-variant="follower"
      className="flex items-center justify-between gap-3 border-b border-border bg-accent-yellow/10 px-4 py-2 text-sm text-text-primary"
    >
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-accent-yellow" aria-hidden />
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
          <span className="font-semibold">{labels.followerTitle}</span>
          <span className="text-xs text-text-secondary">
            {labels.followerSubtitle}
            {leaderTabId ? ` · #${shortTabId(leaderTabId)}` : ''}
          </span>
        </div>
        {conflictCount > 0 && (
          <ConflictInlineChip
            count={conflictCount}
            message={labels.conflictBadge(conflictCount)}
            viewLabel={labels.viewConflictsBtn}
            onView={onViewConflicts}
          />
        )}
      </div>
      <div className="flex items-center gap-2">
        {promoteFailed && (
          <span className="text-xs text-accent-red" data-testid="multi-tab-promote-failed">
            {labels.promoteFailed}
          </span>
        )}
        <button
          type="button"
          onClick={handlePromote}
          disabled={promoting || !onRequestPromotion}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-accent-blue/30 bg-accent-blue/15 px-3 py-1.5 text-xs font-semibold text-accent-blue transition-colors hover:bg-accent-blue/25 focus-visible:ring-2 focus-visible:ring-accent-blue disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px]"
          aria-label={`${labels.promoteBtn} — ${labels.promoteAriaHelp}`}
          data-testid="multi-tab-promote-btn"
        >
          <ArrowUpCircle className="h-3.5 w-3.5" aria-hidden />
          {promoting ? labels.promoting : labels.promoteBtn}
        </button>
      </div>
    </div>
  );
};

export default MultiTabBanner;

// ============================================================
// PART 5 — Sub-components (conflict chips)
// ============================================================

interface ConflictChipProps {
  count: number;
  message: string;
  viewLabel: string;
  onView?: () => void;
}

const ConflictInlineChip: React.FC<ConflictChipProps> = ({ count, message, viewLabel, onView }) => (
  <span
    className="inline-flex items-center gap-1 rounded-full bg-accent-red/15 px-2 py-0.5 text-xs font-semibold text-accent-red"
    data-testid="multi-tab-conflict-chip"
    data-count={count}
  >
    <AlertTriangle className="h-3 w-3" aria-hidden />
    <span>{message}</span>
    {onView && (
      <button
        type="button"
        onClick={onView}
        className="ml-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-accent-red hover:bg-accent-red/20 focus-visible:ring-2 focus-visible:ring-accent-red min-h-[20px]"
        data-testid="multi-tab-view-conflicts-btn"
      >
        {viewLabel}
      </button>
    )}
  </span>
);

const ConflictOnlyBanner: React.FC<ConflictChipProps> = ({ count, message, viewLabel, onView }) => (
  <div
    role="status"
    aria-live="polite"
    data-testid="multi-tab-banner"
    data-variant="conflict-only"
    className="flex items-center justify-between gap-3 border-b border-accent-red/30 bg-accent-red/10 px-4 py-2 text-sm text-text-primary"
  >
    <div className="flex items-center gap-2">
      <AlertTriangle className="w-4 h-4 text-accent-red" aria-hidden />
      <span className="font-semibold text-accent-red">{message}</span>
    </div>
    {onView && (
      <button
        type="button"
        onClick={onView}
        className="inline-flex items-center justify-center rounded-lg border border-accent-red/30 bg-accent-red/15 px-3 py-1.5 text-xs font-semibold text-accent-red hover:bg-accent-red/25 focus-visible:ring-2 focus-visible:ring-accent-red min-h-[44px]"
        data-testid="multi-tab-view-conflicts-btn"
        data-count={count}
      >
        {viewLabel}
      </button>
    )}
  </div>
);
