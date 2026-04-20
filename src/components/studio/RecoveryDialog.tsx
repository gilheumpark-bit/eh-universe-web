'use client';

/**
 * RecoveryDialog — M1.2 크래시 복구 선택 대화상자.
 *
 * 크래시/손상 감지 시 Studio가 열리기 전에 표시. 사용자가 3 선택지 중 하나를
 * 고르거나(복구/버리기/둘 다 보존) ESC로 닫아 기본 동작(복구 권장)을 취소할
 * 수 있다.
 *
 * 원칙: 복구는 작가의 권리 — AI 주도가 아닌 작가 주도. 기본 버튼은 '복구'지만
 * 3 선택지 모두 동등하게 탭 포커스 가능.
 *
 * [C] focus-trap + ESC + role="alertdialog" + aria-labelledby/describedby
 * [G] L4 번역은 useMemo로 캐시 / 시간 포맷은 단순 연산
 * [K] 한 파일 단일 Default export — 외부 Dialog 의존성 없음
 *
 * @module components/studio/RecoveryDialog
 */

// ============================================================
// PART 1 — Imports & types
// ============================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, RotateCcw, Trash2, GitBranch, X } from 'lucide-react';
import type { AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import type { RecoveryResult } from '@/lib/save-engine/recovery';
import type { RecoveryDecision } from '@/contexts/RecoveryContext';

export interface RecoveryDialogProps {
  /** 대화상자 표시 여부. */
  open: boolean;
  /** 복구 결과 (null이면 렌더 안 함). */
  result: RecoveryResult | null;
  /** 4-언어 코드 (ko/en/ja/zh 또는 AppLanguage KO/EN/JP/CN 어느 쪽이든 허용). */
  language: AppLanguage | string;
  /** 사용자가 선택을 내렸을 때. */
  onDecide: (decision: RecoveryDecision) => void;
  /** ESC/백드롭 클릭 시 — 호출자는 'restore' 기본 처리 또는 무시 자유. */
  onClose: () => void;
}

// ============================================================
// PART 2 — 4-언어 라벨
// ============================================================

function makeLabels(lang: AppLanguage | string) {
  return {
    title: L4(lang, {
      ko: '이전 세션 복구',
      en: 'Restore previous session',
      ja: '前回のセッションを復元',
      zh: '恢复上一会话',
    }),
    subtitle: L4(lang, {
      ko: '마지막 작업 내용을 다시 불러올 수 있습니다',
      en: 'We can bring back your last work',
      ja: '最後の作業内容を再度読み込めます',
      zh: '可以重新加载上次工作内容',
    }),
    lastSavedLabel: L4(lang, {
      ko: '마지막 저장',
      en: 'Last saved',
      ja: '最終保存',
      zh: '最后保存',
    }),
    recoverableLabel: L4(lang, {
      ko: '복구 가능 분량',
      en: 'Recoverable work',
      ja: '復旧可能な量',
      zh: '可恢复内容',
    }),
    expectedLossLabel: L4(lang, {
      ko: '예상 손실',
      en: 'Expected loss',
      ja: '予想損失',
      zh: '预计损失',
    }),
    corruptedLabel: L4(lang, {
      ko: '손상 엔트리',
      en: 'Corrupted entries',
      ja: '破損エントリ',
      zh: '损坏条目',
    }),
    minutesAgo: (n: number) =>
      L4(lang, {
        ko: `약 ${n}분 전`,
        en: `~${n} min ago`,
        ja: `約${n}分前`,
        zh: `约${n}分钟前`,
      }),
    minutesWork: (n: number) =>
      L4(lang, {
        ko: `약 ${n}분 작업`,
        en: `~${n} min of work`,
        ja: `約${n}分の作業`,
        zh: `约${n}分钟工作`,
      }),
    noLossText: L4(lang, {
      ko: '손실 없음',
      en: 'No loss',
      ja: '損失なし',
      zh: '无损失',
    }),
    lossMinutes: (n: number) =>
      L4(lang, {
        ko: `약 ${n}분`,
        en: `~${n} min`,
        ja: `約${n}分`,
        zh: `约${n}分钟`,
      }),
    entriesCount: (n: number) =>
      L4(lang, {
        ko: `${n}개`,
        en: `${n}`,
        ja: `${n}件`,
        zh: `${n}个`,
      }),
    restoreBtn: L4(lang, {
      ko: '복구 (권장)',
      en: 'Restore (Recommended)',
      ja: '復元 (推奨)',
      zh: '恢复 (推荐)',
    }),
    discardBtn: L4(lang, {
      ko: '버리기',
      en: 'Discard',
      ja: '破棄',
      zh: '丢弃',
    }),
    keepBothBtn: L4(lang, {
      ko: '둘 다 보존',
      en: 'Keep both',
      ja: '両方保存',
      zh: '两者都保留',
    }),
    restoreHelp: L4(lang, {
      ko: '이전 세션 내용을 현재 창으로 불러와 작업을 이어갑니다.',
      en: 'Load the previous session and continue editing.',
      ja: '前回のセッションを読み込み、作業を続けます。',
      zh: '加载上次会话并继续工作。',
    }),
    discardHelp: L4(lang, {
      ko: '마지막 스냅샷만 불러오고 미저장 변경은 폐기합니다.',
      en: 'Load only the last snapshot; unsaved changes will be lost.',
      ja: '最後のスナップショットのみを読み込み、未保存の変更は破棄します。',
      zh: '仅加载最后快照,未保存的更改将被丢弃。',
    }),
    keepBothHelp: L4(lang, {
      ko: '현재 상태를 새 브랜치로 저장하고 이전 세션도 함께 유지합니다.',
      en: 'Save current state to a new branch and keep the previous session.',
      ja: '現在の状態を新しいブランチに保存し、前回のセッションも保持します。',
      zh: '将当前状态保存到新分支并保留上一会话。',
    }),
    closeLabel: L4(lang, {
      ko: '닫기',
      en: 'Close',
      ja: '閉じる',
      zh: '关闭',
    }),
    warningTitle: L4(lang, {
      ko: '일부 구간 손실 감지',
      en: 'Partial loss detected',
      ja: '一部損失を検出',
      zh: '检测到部分损失',
    }),
    warningBody: L4(lang, {
      ko: '체인 무결성 검사에서 손상이 확인되어 일부 엔트리가 격리되었습니다. 복구 가능한 구간까지는 안전하게 복원됩니다.',
      en: 'Chain integrity check found corruption; affected entries were quarantined. Everything up to the break point will be safely restored.',
      ja: 'チェーン整合性チェックで破損を検出し、影響を受けたエントリを隔離しました。復旧可能な範囲までは安全に復元されます。',
      zh: '链完整性检查发现损坏,受影响的条目已隔离。可恢复的部分将被安全还原。',
    }),
  } as const;
}

// ============================================================
// PART 3 — 파생 값 계산
// ============================================================

function formatTimestamp(ms: number): string {
  try {
    const d = new Date(ms);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  } catch {
    return '-';
  }
}

function msToMinutes(ms: number): number {
  return Math.max(0, Math.round(ms / 60_000));
}

// ============================================================
// PART 4 — Component
// ============================================================

const RecoveryDialog: React.FC<RecoveryDialogProps> = ({
  open,
  result,
  language,
  onDecide,
  onClose,
}) => {
  const labels = useMemo(() => makeLabels(language), [language]);
  const panelRef = useRef<HTMLDivElement>(null);

  // [C] WCAG focus-trap — onEscape는 onClose로 전달(취소 = restore로 해석하지 않음).
  useFocusTrap(panelRef, open, onClose);

  // ESC 이벤트는 focus-trap에서 처리. 백드롭 클릭은 onClose.
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  const handleRestore = useCallback(() => onDecide('restore'), [onDecide]);
  const handleDiscard = useCallback(() => onDecide('discard'), [onDecide]);
  const handleKeepBoth = useCallback(() => onDecide('keep-both'), [onDecide]);

  // Body scroll lock — 모달 열리면 기본 body overflow hidden (UX 가드)
  useEffect(() => {
    if (!open) return;
    if (typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // 파생 값 — Date.now()는 mount 시 1회만 고정(purity rule 회피 + 렌더 재현성).
  const [nowAtMount] = useState<number>(() => Date.now());
  const lastSavedMs = result?.recoveredUpTo ?? null;
  const lastSavedText = lastSavedMs ? formatTimestamp(lastSavedMs) : '-';
  const minutesAgo = lastSavedMs ? msToMinutes(nowAtMount - lastSavedMs) : 0;
  const lossMins = msToMinutes(result?.estimatedLossMs ?? 0);
  const hasLoss = (result?.estimatedLossMs ?? 0) > 0 || (result?.corruptedEntries ?? 0) > 0;

  if (!open || !result) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="presentation"
      onClick={handleBackdropClick}
      data-testid="recovery-dialog-backdrop"
    >
      <div
        ref={panelRef}
        className="relative bg-bg-primary border border-border rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col shadow-2xl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="recovery-dialog-title"
        aria-describedby="recovery-dialog-subtitle"
        data-testid="recovery-dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-blue/20 flex items-center justify-center">
              <RotateCcw className="w-4 h-4 text-accent-blue" aria-hidden />
            </div>
            <div>
              <h3
                id="recovery-dialog-title"
                className="font-bold text-base text-text-primary"
              >
                {labels.title}
              </h3>
              <p
                id="recovery-dialog-subtitle"
                className="text-xs text-text-secondary mt-0.5"
              >
                {labels.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/5 text-text-tertiary hover:text-text-primary transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={labels.closeLabel}
            data-testid="recovery-dialog-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Last saved */}
          <InfoRow
            label={labels.lastSavedLabel}
            value={lastSavedText}
            secondary={lastSavedMs ? labels.minutesAgo(minutesAgo) : undefined}
            testId="recovery-last-saved"
          />

          {/* Recoverable work */}
          <InfoRow
            label={labels.recoverableLabel}
            value={labels.minutesWork(Math.max(1, minutesAgo))}
            testId="recovery-recoverable"
          />

          {/* Expected loss */}
          <InfoRow
            label={labels.expectedLossLabel}
            value={hasLoss ? labels.lossMinutes(lossMins) : labels.noLossText}
            testId="recovery-expected-loss"
            tone={hasLoss ? 'warn' : 'ok'}
          />

          {/* Corrupted entries (표시 조건) */}
          {result.corruptedEntries > 0 && (
            <InfoRow
              label={labels.corruptedLabel}
              value={labels.entriesCount(result.corruptedEntries)}
              testId="recovery-corrupted"
              tone="warn"
            />
          )}

          {/* Warning banner (chainDamaged 시) */}
          {result.chainDamaged && (
            <div
              className="flex items-start gap-2 bg-accent-yellow/10 border border-accent-yellow/30 rounded-xl px-3 py-2.5"
              role="alert"
              data-testid="recovery-warning-banner"
            >
              <AlertTriangle
                className="w-4 h-4 text-accent-yellow flex-shrink-0 mt-0.5"
                aria-hidden
              />
              <div className="text-xs text-text-primary">
                <div className="font-semibold text-accent-yellow">{labels.warningTitle}</div>
                <div className="mt-0.5 text-text-secondary">{labels.warningBody}</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 p-5 border-t border-border">
          <button
            onClick={handleDiscard}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-text-primary font-semibold text-sm border border-border transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue min-h-[44px]"
            data-testid="recovery-discard-btn"
            aria-label={`${labels.discardBtn} — ${labels.discardHelp}`}
          >
            <Trash2 className="w-4 h-4" aria-hidden />
            {labels.discardBtn}
          </button>
          <button
            onClick={handleKeepBoth}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-text-primary font-semibold text-sm border border-border transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue min-h-[44px]"
            data-testid="recovery-keep-both-btn"
            aria-label={`${labels.keepBothBtn} — ${labels.keepBothHelp}`}
          >
            <GitBranch className="w-4 h-4" aria-hidden />
            {labels.keepBothBtn}
          </button>
          <button
            onClick={handleRestore}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent-blue/15 hover:bg-accent-blue/25 text-accent-blue font-semibold text-sm border border-accent-blue/30 transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue min-h-[44px]"
            data-testid="recovery-restore-btn"
            aria-label={`${labels.restoreBtn} — ${labels.restoreHelp}`}
          >
            <RotateCcw className="w-4 h-4" aria-hidden />
            {labels.restoreBtn}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecoveryDialog;

// ============================================================
// PART 5 — InfoRow helper (internal)
// ============================================================

interface InfoRowProps {
  label: string;
  value: string;
  secondary?: string;
  testId?: string;
  tone?: 'ok' | 'warn';
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, secondary, testId, tone = 'ok' }) => {
  const toneClass =
    tone === 'warn' ? 'text-accent-yellow' : 'text-text-primary';
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-widest text-text-tertiary">
        {label}
      </span>
      <div
        className="bg-bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm flex items-center justify-between"
        data-testid={testId}
      >
        <span className={`font-mono ${toneClass}`}>{value}</span>
        {secondary && <span className="text-xs text-text-secondary">{secondary}</span>}
      </div>
    </div>
  );
};
