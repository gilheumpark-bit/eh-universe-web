"use client";

/**
 * MergeConflictResolver — Visual 3-way diff conflict resolver.
 *
 * Given a file body that contains Git merge conflict markers, this
 * component renders each unresolved region side-by-side (Ours / Ancestor /
 * Theirs) with one-click accept buttons and ↑/↓ navigation between
 * conflicts. The final resolution is produced by reserializing the
 * DocumentBlock[] — no raw-string surgery in the UI.
 *
 * @module components/studio/MergeConflictResolver
 */

// ============================================================
// PART 1 — Imports + types + labels
// ============================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, GitMerge, ChevronUp, ChevronDown, Check, Plus } from 'lucide-react';
import type { AppLanguage } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';
import { logger } from '@/lib/logger';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import {
  parseConflicts,
  resolveConflict,
  hasUnresolved,
  stringifyBlocks,
  conflictIndices,
  type ConflictBlock,
  type ConflictChoice,
  type DocumentBlock,
} from '@/lib/conflict-parser';

export interface MergeConflictResolverProps {
  open: boolean;
  /** Raw file content containing conflict markers. */
  content: string;
  /** Active language for label translation. */
  language: AppLanguage;
  /** Fires when the user clicks Save Resolution. */
  onSave: (resolved: string) => void;
  /** Fires when the user dismisses the dialog. */
  onClose: () => void;
  /** Optional label override for the "Ours" column. */
  oursLabelOverride?: string;
  /** Optional label override for the "Theirs" column. */
  theirsLabelOverride?: string;
}

function labels(lang: AppLanguage) {
  return {
    title: L4(lang, {
      ko: '병합 충돌 해결',
      en: 'Resolve Merge Conflicts',
      ja: 'マージ競合の解決',
      zh: '解决合并冲突',
    }),
    ours: L4(lang, { ko: '현재 (HEAD)', en: 'Ours (HEAD)', ja: '現在 (HEAD)', zh: '当前 (HEAD)' }),
    ancestor: L4(lang, { ko: '공통 조상', en: 'Common Ancestor', ja: '共通の祖先', zh: '共同祖先' }),
    theirs: L4(lang, { ko: '가져올 내용', en: 'Theirs', ja: '取り込む内容', zh: '传入内容' }),
    acceptOurs: L4(lang, { ko: '현재 선택', en: 'Accept Ours', ja: '現在を採用', zh: '接受当前' }),
    acceptTheirs: L4(lang, { ko: '상대 선택', en: 'Accept Theirs', ja: '相手を採用', zh: '接受传入' }),
    acceptBoth: L4(lang, { ko: '둘 다 유지', en: 'Accept Both', ja: '両方保持', zh: '保留双方' }),
    drop: L4(lang, { ko: '모두 삭제', en: 'Drop Both', ja: '両方削除', zh: '全部删除' }),
    prevConflict: L4(lang, { ko: '이전 충돌', en: 'Previous conflict', ja: '前の競合', zh: '上一个冲突' }),
    nextConflict: L4(lang, { ko: '다음 충돌', en: 'Next conflict', ja: '次の競合', zh: '下一个冲突' }),
    save: L4(lang, { ko: '해결 저장', en: 'Save Resolution', ja: '解決を保存', zh: '保存解决' }),
    cancel: L4(lang, { ko: '취소', en: 'Cancel', ja: 'キャンセル', zh: '取消' }),
    close: L4(lang, { ko: '닫기', en: 'Close', ja: '閉じる', zh: '关闭' }),
    status: (resolved: number, total: number) =>
      L4(lang, {
        ko: `${resolved} / ${total} 해결됨`,
        en: `${resolved} / ${total} resolved`,
        ja: `${resolved} / ${total} 解決済み`,
        zh: `${resolved} / ${total} 已解决`,
      }),
    counter: (current: number, total: number) =>
      L4(lang, {
        ko: `충돌 ${current} / ${total}`,
        en: `Conflict ${current} / ${total}`,
        ja: `競合 ${current} / ${total}`,
        zh: `冲突 ${current} / ${total}`,
      }),
    allResolved: L4(lang, {
      ko: '모든 충돌이 해결되었습니다.',
      en: 'All conflicts resolved.',
      ja: 'すべての競合が解決されました。',
      zh: '所有冲突已解决。',
    }),
    noConflicts: L4(lang, {
      ko: '이 파일에는 충돌 표시가 없습니다.',
      en: 'No conflict markers in this file.',
      ja: 'このファイルに競合マーカーはありません。',
      zh: '此文件中没有冲突标记。',
    }),
  };
}

// IDENTITY_SEAL: PART-1 | role=types+i18n | inputs=props,lang | outputs=label bundle

// ============================================================
// PART 2 — Helpers: navigation + block queries
// ============================================================

/** Clamp to valid conflict slot, even when some conflicts were resolved. */
function clampToValidIndex(blocks: DocumentBlock[], wanted: number): number {
  const indices = conflictIndices(blocks);
  if (indices.length === 0) return -1;
  // If the current index is still a conflict, keep it.
  if (indices.includes(wanted)) return wanted;
  // Otherwise pick the nearest remaining conflict at-or-after `wanted`.
  for (const idx of indices) {
    if (idx >= wanted) return idx;
  }
  return indices[indices.length - 1];
}

/** 1-based order-of-appearance for the given document index. */
function orderOfConflict(blocks: DocumentBlock[], docIndex: number): number {
  let n = 0;
  for (let i = 0; i <= docIndex && i < blocks.length; i += 1) {
    if (blocks[i]?.type === 'conflict') n += 1;
  }
  return n;
}

// IDENTITY_SEAL: PART-2 | role=helpers | inputs=blocks,index | outputs=indices

// ============================================================
// PART 3 — Component
// ============================================================

const MergeConflictResolver: React.FC<MergeConflictResolverProps> = ({
  open,
  content,
  language,
  onSave,
  onClose,
  oursLabelOverride,
  theirsLabelOverride,
}) => {
  const t = useMemo(() => labels(language), [language]);

  // [C] WCAG 2.1 AA focus-trap — Tab 순환 + 이전 focus 복원.
  //     ESC는 아래 useEffect에서 이미 처리 → onEscape 인자 undefined로 중복 방지.
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open, undefined);

  const [blocks, setBlocks] = useState<DocumentBlock[]>(() => parseConflicts(content));
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    const idx = conflictIndices(parseConflicts(content));
    return idx.length > 0 ? idx[0] : -1;
  });

  // Re-parse when a different file body is provided.
  useEffect(() => {
    if (!open) return;
    try {
      const parsed = parseConflicts(content);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBlocks(parsed);
      const idx = conflictIndices(parsed);
      setCurrentIndex(idx.length > 0 ? idx[0] : -1);
    } catch (err) {
      logger.warn('MergeConflictResolver', 'parse failed', err);
      setBlocks([{ type: 'context', content: content ?? '', startLine: 1 }]);
      setCurrentIndex(-1);
    }
  }, [content, open]);

  const indices = useMemo(() => conflictIndices(blocks), [blocks]);
  const totalConflicts = useMemo(() => {
    // Count of conflict blocks in ORIGINAL content (== unresolved + resolved so far).
    return parseConflicts(content).reduce(
      (acc, b) => (b.type === 'conflict' ? acc + 1 : acc),
      0,
    );
  }, [content]);
  const resolvedCount = totalConflicts - indices.length;
  const allResolved = indices.length === 0;

  const currentBlock = currentIndex >= 0 ? blocks[currentIndex] : undefined;
  const isCurrentConflict = currentBlock?.type === 'conflict';

  // ============================================================
  // PART 3A — keyboard navigation (Esc / ArrowUp / ArrowDown)
  // ============================================================

  const gotoPrev = useCallback(() => {
    if (indices.length === 0) return;
    const curPos = indices.indexOf(currentIndex);
    const nextPos = curPos <= 0 ? indices.length - 1 : curPos - 1;
    setCurrentIndex(indices[nextPos]);
  }, [indices, currentIndex]);

  const gotoNext = useCallback(() => {
    if (indices.length === 0) return;
    const curPos = indices.indexOf(currentIndex);
    const nextPos = curPos < 0 || curPos >= indices.length - 1 ? 0 : curPos + 1;
    setCurrentIndex(indices[nextPos]);
  }, [indices, currentIndex]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      // Only navigate with Alt+Up/Down to avoid hijacking basic scrolling.
      if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault();
        gotoPrev();
      } else if (e.altKey && e.key === 'ArrowDown') {
        e.preventDefault();
        gotoNext();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, gotoPrev, gotoNext]);

  // ============================================================
  // PART 3B — accept handlers
  // ============================================================

  const handleAccept = useCallback(
    (choice: ConflictChoice) => {
      if (currentIndex < 0) return;
      const next = resolveConflict(blocks, currentIndex, choice);
      setBlocks(next);
      // Reposition to the next remaining conflict.
      const remaining = conflictIndices(next);
      if (remaining.length === 0) {
        setCurrentIndex(-1);
      } else {
        const nextIdx = clampToValidIndex(next, currentIndex);
        setCurrentIndex(nextIdx);
      }
    },
    [blocks, currentIndex],
  );

  const handleSave = useCallback(() => {
    if (hasUnresolved(blocks)) return;
    try {
      const out = stringifyBlocks(blocks);
      onSave(out);
    } catch (err) {
      logger.error('MergeConflictResolver', 'stringify failed', err);
    }
  }, [blocks, onSave]);

  if (!open) return null;

  const oursHeader = oursLabelOverride
    || (isCurrentConflict && (currentBlock as ConflictBlock).oursLabel)
    || t.ours;
  const theirsHeader = theirsLabelOverride
    || (isCurrentConflict && (currentBlock as ConflictBlock).theirsLabel)
    || t.theirs;

  const conflictPosition =
    isCurrentConflict ? orderOfConflict(blocks, currentIndex) : 0;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
      data-testid="mcr-backdrop"
    >
      <div
        ref={panelRef}
        className="relative bg-bg-primary border border-border rounded-2xl w-full max-w-6xl mx-4 max-h-[90vh] flex flex-col shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mcr-title"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-purple/20 flex items-center justify-center" aria-hidden="true">
              <GitMerge className="w-4 h-4 text-accent-purple" />
            </div>
            <div>
              <h3 id="mcr-title" className="font-bold text-base text-text-primary">
                {t.title}
              </h3>
              <div className="text-xs text-text-tertiary" data-testid="mcr-status" role="status" aria-live="polite">
                {t.status(resolvedCount, totalConflicts)}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/5 text-text-tertiary hover:text-text-primary transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={t.close}
            data-testid="mcr-close-btn"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {totalConflicts === 0 ? (
            <div className="text-center text-text-secondary py-12" data-testid="mcr-no-conflicts">
              {t.noConflicts}
            </div>
          ) : allResolved ? (
            <div
              className="text-center text-accent-green py-12 flex flex-col items-center gap-3"
              data-testid="mcr-all-resolved"
            >
              <Check className="w-10 h-10" aria-hidden />
              <div className="font-semibold">{t.allResolved}</div>
            </div>
          ) : (
            <>
              {/* Navigation */}
              <div className="flex items-center justify-between gap-3 bg-bg-secondary rounded-xl px-4 py-3 border border-border">
                <div
                  className="text-sm text-text-primary font-medium"
                  data-testid="mcr-counter"
                  role="status"
                  aria-live="polite"
                >
                  {t.counter(conflictPosition, totalConflicts)}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={gotoPrev}
                    className="p-2 rounded-lg hover:bg-white/5 text-text-secondary hover:text-text-primary transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label={t.prevConflict}
                    data-testid="mcr-prev-btn"
                  >
                    <ChevronUp className="w-5 h-5" aria-hidden="true" />
                  </button>
                  <button
                    onClick={gotoNext}
                    className="p-2 rounded-lg hover:bg-white/5 text-text-secondary hover:text-text-primary transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label={t.nextConflict}
                    data-testid="mcr-next-btn"
                  >
                    <ChevronDown className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* 3-way panels */}
              {isCurrentConflict && (() => {
                const cb = currentBlock as ConflictBlock;
                const showAncestor = typeof cb.ancestor === 'string';
                const gridCols = showAncestor ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2';
                return (
                  <div className={`grid ${gridCols} gap-3`}>
                    {/* Ours */}
                    <section
                      className="flex flex-col border border-border rounded-xl overflow-hidden bg-bg-secondary"
                      role="region"
                      aria-label={oursHeader}
                    >
                      <div className="flex items-center justify-between px-3 py-2 bg-accent-blue/10 border-b border-border">
                        <span className="text-xs font-bold uppercase tracking-wider text-accent-blue">
                          {oursHeader}
                        </span>
                      </div>
                      <pre
                        className="flex-1 p-3 text-xs font-mono text-text-primary whitespace-pre-wrap break-words min-h-[120px] max-h-[40vh] overflow-auto"
                        data-testid="mcr-ours-content"
                      >
                        {cb.ours}
                      </pre>
                    </section>
                    {/* Ancestor (diff3 only) */}
                    {showAncestor && (
                      <section
                        className="flex flex-col border border-border rounded-xl overflow-hidden bg-bg-secondary"
                        role="region"
                        aria-label={t.ancestor}
                      >
                        <div className="flex items-center justify-between px-3 py-2 bg-accent-yellow/10 border-b border-border">
                          <span className="text-xs font-bold uppercase tracking-wider text-accent-yellow">
                            {t.ancestor}
                          </span>
                        </div>
                        <pre
                          className="flex-1 p-3 text-xs font-mono text-text-primary whitespace-pre-wrap break-words min-h-[120px] max-h-[40vh] overflow-auto"
                          data-testid="mcr-ancestor-content"
                        >
                          {cb.ancestor}
                        </pre>
                      </section>
                    )}
                    {/* Theirs */}
                    <section
                      className="flex flex-col border border-border rounded-xl overflow-hidden bg-bg-secondary"
                      role="region"
                      aria-label={theirsHeader}
                    >
                      <div className="flex items-center justify-between px-3 py-2 bg-accent-purple/10 border-b border-border">
                        <span className="text-xs font-bold uppercase tracking-wider text-accent-purple">
                          {theirsHeader}
                        </span>
                      </div>
                      <pre
                        className="flex-1 p-3 text-xs font-mono text-text-primary whitespace-pre-wrap break-words min-h-[120px] max-h-[40vh] overflow-auto"
                        data-testid="mcr-theirs-content"
                      >
                        {cb.theirs}
                      </pre>
                    </section>
                  </div>
                );
              })()}

              {/* Accept buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleAccept('ours')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-blue/15 hover:bg-accent-blue/25 text-accent-blue font-semibold text-sm border border-accent-blue/30 transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]"
                  data-testid="mcr-accept-ours"
                >
                  <Check className="w-4 h-4" aria-hidden />
                  {t.acceptOurs}
                </button>
                <button
                  onClick={() => handleAccept('theirs')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-purple/15 hover:bg-accent-purple/25 text-accent-purple font-semibold text-sm border border-accent-purple/30 transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]"
                  data-testid="mcr-accept-theirs"
                >
                  <Check className="w-4 h-4" aria-hidden />
                  {t.acceptTheirs}
                </button>
                <button
                  onClick={() => handleAccept('both')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-green/15 hover:bg-accent-green/25 text-accent-green font-semibold text-sm border border-accent-green/30 transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]"
                  data-testid="mcr-accept-both"
                >
                  <Plus className="w-4 h-4" aria-hidden />
                  {t.acceptBoth}
                </button>
                <button
                  onClick={() => handleAccept('none')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary font-semibold text-sm border border-border transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]"
                  data-testid="mcr-drop-btn"
                >
                  <X className="w-4 h-4" aria-hidden />
                  {t.drop}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-text-secondary font-semibold text-sm border border-border transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]"
            data-testid="mcr-cancel-btn"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={!allResolved || totalConflicts === 0}
            className="px-4 py-2.5 rounded-xl bg-accent-purple hover:bg-accent-purple/90 text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-accent-blue/50 min-h-[44px]"
            data-testid="mcr-save-btn"
          >
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MergeConflictResolver;

// IDENTITY_SEAL: PART-3 | role=Component | inputs=content,lang,callbacks | outputs=React.Element
