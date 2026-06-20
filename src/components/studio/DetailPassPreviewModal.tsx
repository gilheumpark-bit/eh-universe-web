"use client";

// ============================================================
// DetailPassPreviewModal — Task 4 Phase 3 — Draft / Expanded 비교 모달
// ============================================================
//
// DetailPassButton.onExpanded 호출 후 부모가 띄우는 모달.
// 작가가 원본/확장본을 나란히 보고 Accept / Edit / Reject 중 선택.
//
// 키보드:
//   - Enter  → Accept
//   - Escape → Reject
//   - Tab / Shift+Tab → useFocusTrap 로 순환
//
// [C] open=false 일 때는 렌더 안 함 (불필요한 리스너 방지).
// [C] useFocusTrap 이 ESC 핸들러를 잡으므로 모달 내부에서 이중 바인딩 안 함.
// [G] Tailwind 2-col grid — 단순 비교. BranchDiffView 처럼 무거운 엔진은 쓰지 않음.
// [K] 버튼 3개 + 편집 영역 1개 — 최소 구성.

import React, { useEffect, useRef, useState } from 'react';
import { Check, Edit3, X } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { L4 } from '@/lib/i18n';
import type { AppLanguage } from '@/lib/studio-types';

// ============================================================
// PART 1 — Props
// ============================================================

export interface DetailPassPreviewModalProps {
  /** 모달 표시 여부 */
  open: boolean;
  /** Draft pass 원본 */
  original: string;
  /** Detail pass 확장본 */
  expanded: string;
  /** 언어 */
  language: AppLanguage;
  /** 그대로 수락 — 부모가 expanded 를 에디터에 반영 */
  onAccept: () => void;
  /** 편집 후 저장 — finalText 가 edited 본문 */
  onEdit: (finalText: string) => void;
  /** 거부 — 원본 유지 */
  onReject: () => void;
}

// ============================================================
// PART 2 — Labels
// ============================================================

const TITLE = {
  ko: '확장본 미리보기',
  en: 'Expansion Preview',
  ja: '拡張プレビュー',
  zh: '扩写预览',
};

const LBL_ORIGINAL = {
  ko: '원본 초안',
  en: 'Original Draft',
  ja: '元の下書き',
  zh: '原始初稿',
};

const LBL_EXPANDED = {
  ko: '확장본',
  en: 'Expanded',
  ja: '拡張版',
  zh: '扩写版',
};

const BTN_ACCEPT = {
  ko: '수락 (Enter)',
  en: 'Accept (Enter)',
  ja: '承認 (Enter)',
  zh: '接受 (Enter)',
};

const BTN_EDIT = {
  ko: '편집 후 수락',
  en: 'Edit then Accept',
  ja: '編集して承認',
  zh: '编辑后接受',
};

const BTN_REJECT = {
  ko: '거부 (ESC)',
  en: 'Reject (ESC)',
  ja: '拒否 (ESC)',
  zh: '拒绝 (ESC)',
};

const STAT_DIFF = {
  ko: '증분',
  en: 'Increment',
  ja: '増分',
  zh: '增量',
};

// ============================================================
// PART 3 — Component
// ============================================================

const DetailPassPreviewModal: React.FC<DetailPassPreviewModalProps> = ({
  open,
  original,
  expanded,
  language,
  onAccept,
  onEdit,
  onReject,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(expanded);

  // focus trap + ESC 핸들러 (onEscape → onReject)
  useFocusTrap(dialogRef, open, onReject);

  // expanded 가 새로 들어오면 edit 버퍼 동기화.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEditedText(expanded);
    setIsEditing(false);
  }, [expanded, open]);

  // Enter → Accept (편집 모드에서는 통상 newline 우선 — 모달 전체 Enter 는 비편집 상태에서만).
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      // 편집 textarea 내부 포커스면 Enter 로 수락하지 않음.
      const target = e.target as HTMLElement | null;
      if (target && target.tagName === 'TEXTAREA') return;
      e.preventDefault();
      if (isEditing) {
        onEdit(editedText);
      } else {
        onAccept();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, isEditing, editedText, onAccept, onEdit]);

  if (!open) return null;

  const increment = expanded.length - original.length;
  const incrementLabel = `${increment >= 0 ? '+' : ''}${increment.toLocaleString()}`;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal,1000)] bg-black/60 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-pass-preview-title"
      data-testid="detail-pass-preview-modal"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-6xl max-h-[92vh] bg-bg-primary border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2
            id="detail-pass-preview-title"
            className="text-sm font-black text-text-primary"
          >
            {L4(language, TITLE)}
          </h2>
          <div className="flex items-center gap-3 text-xs text-text-tertiary">
            <span>
              {original.length.toLocaleString()} → {expanded.length.toLocaleString()}
            </span>
            <span className={increment >= 0 ? 'text-accent-green' : 'text-accent-red'}>
              ({L4(language, STAT_DIFF)}: {incrementLabel})
            </span>
          </div>
        </div>

        {/* Body — 2 columns diff */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-0 overflow-hidden">
          {/* Left — original */}
          <div className="border-r border-border flex flex-col overflow-hidden">
            <div className="px-4 py-2 bg-bg-secondary text-[10px] font-black uppercase tracking-widest text-text-tertiary">
              {L4(language, LBL_ORIGINAL)}
            </div>
            <pre
              className="flex-1 overflow-auto whitespace-pre-wrap p-4 text-sm text-text-secondary leading-relaxed"
              data-testid="preview-original"
            >
              {original}
            </pre>
          </div>

          {/* Right — expanded (editable when isEditing) */}
          <div className="flex flex-col overflow-hidden">
            <div className="px-4 py-2 bg-bg-secondary text-[10px] font-black uppercase tracking-widest text-text-tertiary flex items-center justify-between">
              <span>{L4(language, LBL_EXPANDED)}</span>
              {isEditing && (
                <span className="text-accent-amber normal-case text-[10px]">
                  {L4(language, {
                    ko: '편집 중',
                    en: 'Editing',
                    ja: '編集中',
                    zh: '编辑中',
                  })}
                </span>
              )}
            </div>
            {isEditing ? (
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="flex-1 p-4 text-sm text-text-primary bg-bg-primary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue resize-none leading-relaxed font-mono"
                aria-label={L4(language, LBL_EXPANDED)}
                data-testid="preview-expanded-edit"
              />
            ) : (
              <pre
                className="flex-1 overflow-auto whitespace-pre-wrap p-4 text-sm text-text-primary leading-relaxed"
                data-testid="preview-expanded"
              >
                {expanded}
              </pre>
            )}
          </div>
        </div>

        {/* Footer — 3 actions */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-bg-secondary/40">
          <button
            type="button"
            onClick={onReject}
            data-testid="preview-reject"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-bg-secondary text-text-secondary hover:bg-accent-red/10 hover:text-accent-red border border-border transition-colors focus-visible:ring-2 focus-visible:ring-accent-red"
          >
            <X className="w-4 h-4" aria-hidden="true" />
            {L4(language, BTN_REJECT)}
          </button>
          <button
            type="button"
            onClick={() => {
              if (isEditing) {
                onEdit(editedText);
              } else {
                setIsEditing(true);
              }
            }}
            data-testid="preview-edit"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-bg-secondary text-text-secondary hover:bg-accent-amber/10 hover:text-accent-amber border border-border transition-colors focus-visible:ring-2 focus-visible:ring-accent-amber"
          >
            <Edit3 className="w-4 h-4" aria-hidden="true" />
            {isEditing
              ? L4(language, {
                  ko: '편집 저장',
                  en: 'Save Edit',
                  ja: '編集を保存',
                  zh: '保存编辑',
                })
              : L4(language, BTN_EDIT)}
          </button>
          <button
            type="button"
            onClick={onAccept}
            data-testid="preview-accept"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black bg-accent-blue text-text-primary hover:bg-accent-blue/90 border border-accent-blue transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue"
          >
            <Check className="w-4 h-4" aria-hidden="true" />
            {L4(language, BTN_ACCEPT)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetailPassPreviewModal;

// IDENTITY_SEAL: DetailPassPreviewModal | role=Accept/Edit/Reject 프리뷰 | inputs=original,expanded,language | outputs=callbacks
