"use client";

/**
 * RenameDialog — Bulk rename UI for Novel Studio.
 *
 * Lets a writer change "카이로스" → "카이로르" etc. across:
 *   - characters / items / world fields
 *   - session titles + messages (AI-generated prose)
 *   - episode scene sheets
 * Preview-first design: must click Preview before Apply.
 */

// ============================================================
// PART 1 — Imports + Types
// ============================================================

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { X, Search, Check, AlertTriangle } from 'lucide-react';
import type { AppLanguage, Project, ChatSession } from '@/lib/studio-types';
import { L4 } from '@/lib/i18n';
import { logger } from '@/lib/logger';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import {
  previewRename,
  applyRename,
  type RenameOptions,
  type RenamePreview,
  type RenameScope,
  type RenameResult,
} from '@/lib/rename-engine';
import { saveVersionedBackup } from '@/lib/indexeddb-backup';

export interface RenameDialogProps {
  open: boolean;
  projects: Project[];
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  currentProjectId: string | null;
  language: AppLanguage;
  onApply: (result: RenameResult) => void;
  onClose: () => void;
}

// Confirmation threshold — ask user when ≥10 matches.
const CONFIRM_THRESHOLD = 10;

// IDENTITY_SEAL: PART-1 | role=imports+types | inputs=props | outputs=component shell

// ============================================================
// PART 2 — i18n labels (4 languages)
// ============================================================

function labels(language: AppLanguage) {
  return {
    title: L4(language, { ko: '찾아바꾸기', en: 'Rename', ja: '名前を置換', zh: '批量重命名' }),
    from: L4(language, { ko: '찾을 이름', en: 'From', ja: '検索', zh: '查找' }),
    to: L4(language, { ko: '바꿀 이름', en: 'To', ja: '置換', zh: '替换为' }),
    caseSensitive: L4(language, { ko: '대소문자 구분', en: 'Case sensitive', ja: '大文字と小文字を区別', zh: '区分大小写' }),
    wholeWord: L4(language, { ko: '전체 단어 일치', en: 'Whole word', ja: '単語全体一致', zh: '全字匹配' }),
    scope: L4(language, { ko: '범위', en: 'Scope', ja: '範囲', zh: '范围' }),
    scopeSession: L4(language, { ko: '현재 에피소드', en: 'Current episode', ja: '現在のエピソード', zh: '当前章节' }),
    scopeProject: L4(language, { ko: '현재 프로젝트', en: 'Current project', ja: '現在のプロジェクト', zh: '当前项目' }),
    scopeAll: L4(language, { ko: '모든 프로젝트', en: 'All projects', ja: '全プロジェクト', zh: '所有项目' }),
    preview: L4(language, { ko: '미리보기', en: 'Preview', ja: 'プレビュー', zh: '预览' }),
    apply: L4(language, { ko: '적용', en: 'Apply', ja: '適用', zh: '应用' }),
    cancel: L4(language, { ko: '취소', en: 'Cancel', ja: 'キャンセル', zh: '取消' }),
    close: L4(language, { ko: '닫기', en: 'Close', ja: '閉じる', zh: '关闭' }),
    noMatches: L4(language, { ko: '일치하는 항목이 없습니다.', en: 'No matches.', ja: '一致する項目がありません。', zh: '没有匹配项。' }),
    emptyFrom: L4(language, { ko: '찾을 이름을 입력하세요.', en: 'Enter text to find.', ja: '検索文字を入力', zh: '请输入要查找的文本' }),
    sameValue: L4(language, { ko: '찾을 이름과 바꿀 이름이 같습니다.', en: '"From" and "To" are identical.', ja: '「検索」と「置換」が同じです', zh: '查找与替换相同' }),
    previewNHeader: (matches: number, fields: number) =>
      L4(language, {
        ko: `미리보기 · ${matches}건 (${fields}개 필드)`,
        en: `Preview · ${matches} matches (${fields} fields)`,
        ja: `プレビュー · ${matches}件 (${fields}項目)`,
        zh: `预览 · ${matches}处 (${fields}个字段)`,
      }),
    applyConfirm: (n: number) =>
      L4(language, {
        ko: `${n}건을 모두 변경하시겠습니까?`,
        en: `Apply all ${n} changes?`,
        ja: `${n}件をすべて変更しますか？`,
        zh: `是否应用全部 ${n} 处变更？`,
      }),
    doneToast: (n: number) =>
      L4(language, {
        ko: `${n}건 변경되었습니다.`,
        en: `${n} changes applied.`,
        ja: `${n}件変更しました。`,
        zh: `已应用 ${n} 处变更。`,
      }),
  };
}

// IDENTITY_SEAL: PART-2 | role=i18n | inputs=lang | outputs=label-bundle

// ============================================================
// PART 3 — Hooks + derived state (Escape, focus trap)
// ============================================================

function useEscapeClose(enabled: boolean, onClose: () => void) {
  useEffect(() => {
    if (!enabled) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [enabled, onClose]);
}

// IDENTITY_SEAL: PART-3 | role=hooks | inputs=enabled,onClose | outputs=event-listeners

// ============================================================
// PART 4 — Component
// ============================================================

const RenameDialog: React.FC<RenameDialogProps> = ({
  open, projects, sessions, currentSession, currentProjectId, language, onApply, onClose,
}) => {
  const t = useMemo(() => labels(language), [language]);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [scope, setScope] = useState<RenameScope>('project');
  const [preview, setPreview] = useState<RenamePreview | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [expandedPath, setExpandedPath] = useState<string | null>(null);

  const fromInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // [C] WCAG 2.1 AA focus-trap — Tab 순환 + 이전 focus 복원.
  //     ESC는 아래 useEscapeClose에서 이미 처리 → onEscape 인자 undefined로 중복 방지.
  useFocusTrap(panelRef, open, undefined);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setFrom('');
      setTo('');
      setCaseSensitive(false);
      setWholeWord(false);
      setScope('project');
      setPreview(null);
      setIsApplying(false);
      setExpandedPath(null);
    }
  }, [open]);

  // Focus the From field on open.
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => fromInputRef.current?.focus(), 30);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEscapeClose(open, onClose);

  const optionsForEngine: RenameOptions = useMemo(() => ({
    from, to, caseSensitive, wholeWord, scope,
    currentSessionId: currentSession?.id ?? null,
    currentProjectId,
  }), [from, to, caseSensitive, wholeWord, scope, currentSession, currentProjectId]);

  // Gate flags
  const fromEmpty = from.trim().length === 0;
  const identical = from.length > 0 && from === to;
  const canPreview = !fromEmpty && !identical;
  const hasMatches = (preview?.totalMatches ?? 0) > 0;
  const canApply = canPreview && hasMatches && !isApplying;

  const handlePreview = useCallback(() => {
    if (!canPreview) return;
    try {
      const p = previewRename(projects, sessions, optionsForEngine);
      setPreview(p);
    } catch (err) {
      logger.warn('RenameDialog', 'preview failed', err);
      setPreview({ totalMatches: 0, matches: [] });
    }
  }, [canPreview, projects, sessions, optionsForEngine]);

  // Invalidate preview when inputs change.
  useEffect(() => {
    setPreview(null);
  }, [from, to, caseSensitive, wholeWord, scope]);

  const handleApply = useCallback(async () => {
    if (!canApply || !preview) return;
    const total = preview.totalMatches;
    if (total >= CONFIRM_THRESHOLD) {
      const ok = typeof window !== 'undefined' ? window.confirm(t.applyConfirm(total)) : true;
      if (!ok) return;
    }
    setIsApplying(true);
    // Undo snapshot → IndexedDB (best-effort, non-blocking error).
    try {
      await saveVersionedBackup(projects);
    } catch (err) {
      logger.warn('RenameDialog', 'versioned backup failed', err);
    }
    try {
      const result = applyRename(projects, sessions, optionsForEngine);
      onApply(result);
    } catch (err) {
      logger.warn('RenameDialog', 'applyRename failed', err);
    } finally {
      setIsApplying(false);
    }
  }, [canApply, preview, projects, sessions, optionsForEngine, onApply, t]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="relative bg-bg-primary border border-border rounded-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-dialog-title"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-purple/20 flex items-center justify-center">
              <Search className="w-4 h-4 text-accent-purple" />
            </div>
            <h3 id="rename-dialog-title" className="font-bold text-base text-text-primary">
              {t.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/5 text-text-tertiary hover:text-text-primary transition-colors focus-visible:ring-2 focus-visible:ring-accent-blue/50"
            aria-label={t.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-text-tertiary">
                {t.from}
              </span>
              <input
                ref={fromInputRef}
                type="text"
                value={from}
                onChange={e => setFrom(e.target.value)}
                className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-purple min-h-[44px]"
                placeholder="카이로스"
                data-testid="rename-from-input"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-text-tertiary">
                {t.to}
              </span>
              <input
                type="text"
                value={to}
                onChange={e => setTo(e.target.value)}
                className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-purple min-h-[44px]"
                placeholder="카이로르"
                data-testid="rename-to-input"
              />
            </label>
          </div>

          {/* Options */}
          <div className="flex flex-wrap gap-3 items-center">
            <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={e => setCaseSensitive(e.target.checked)}
                className="w-4 h-4 accent-accent-purple"
                data-testid="rename-case-checkbox"
              />
              <span>{t.caseSensitive}</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={wholeWord}
                onChange={e => setWholeWord(e.target.checked)}
                className="w-4 h-4 accent-accent-purple"
                data-testid="rename-word-checkbox"
              />
              <span>{t.wholeWord}</span>
            </label>
          </div>

          {/* Scope */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-text-tertiary mb-1.5">
              {t.scope}
            </div>
            <div className="flex flex-wrap gap-2">
              {(['session', 'project', 'all'] as RenameScope[]).map((sc) => (
                <button
                  key={sc}
                  onClick={() => setScope(sc)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${
                    scope === sc
                      ? 'bg-accent-purple text-white'
                      : 'bg-bg-secondary border border-border text-text-secondary hover:text-text-primary'
                  }`}
                  data-testid={`rename-scope-${sc}`}
                  type="button"
                >
                  {sc === 'session' ? t.scopeSession : sc === 'project' ? t.scopeProject : t.scopeAll}
                </button>
              ))}
            </div>
          </div>

          {/* Status messages */}
          {fromEmpty && (
            <div className="flex items-center gap-2 text-xs text-text-tertiary">
              <AlertTriangle className="w-3.5 h-3.5 text-accent-amber" />
              <span>{t.emptyFrom}</span>
            </div>
          )}
          {identical && (
            <div className="flex items-center gap-2 text-xs text-accent-amber">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{t.sameValue}</span>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="border-t border-border pt-4">
              <div className="text-[11px] font-bold uppercase tracking-widest text-text-tertiary mb-2">
                {t.previewNHeader(preview.totalMatches, preview.matches.length)}
              </div>
              {preview.matches.length === 0 ? (
                <div className="text-xs text-text-tertiary italic px-3 py-6 text-center bg-bg-secondary/50 rounded-lg">
                  {t.noMatches}
                </div>
              ) : (
                <ul className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {preview.matches.map((m) => {
                    const expanded = expandedPath === m.path;
                    return (
                      <li
                        key={m.path}
                        className="bg-bg-secondary/50 border border-border rounded-lg p-3 text-xs"
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedPath(expanded ? null : m.path)}
                          className="w-full flex items-center justify-between gap-3 text-left"
                          aria-expanded={expanded}
                        >
                          <span className="font-bold text-text-primary truncate">
                            {m.label}
                          </span>
                          <span className="shrink-0 px-2 py-0.5 bg-accent-purple/20 text-accent-purple rounded-full font-bold text-[10px]">
                            {m.matchCount}
                          </span>
                        </button>
                        {expanded && (
                          <div className="mt-2 space-y-1 font-mono text-[11px] leading-relaxed">
                            <div className="text-red-400/80">
                              <span className="text-text-tertiary mr-1.5">-</span>
                              {m.before}
                            </div>
                            <div className="text-green-400/80">
                              <span className="text-text-tertiary mr-1.5">+</span>
                              {m.after}
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-bold text-text-tertiary hover:text-text-primary transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-accent-blue/50"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={handlePreview}
            disabled={!canPreview}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${
              canPreview
                ? 'bg-bg-secondary border border-border text-text-primary hover:bg-bg-tertiary'
                : 'bg-bg-secondary/40 border border-border/40 text-text-tertiary cursor-not-allowed'
            }`}
            data-testid="rename-preview-btn"
          >
            <span className="flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" />
              {t.preview}
            </span>
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!canApply}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${
              canApply
                ? 'bg-accent-purple text-white hover:opacity-90'
                : 'bg-accent-purple/30 text-white/50 cursor-not-allowed'
            }`}
            data-testid="rename-apply-btn"
          >
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              {t.apply}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RenameDialog;

// IDENTITY_SEAL: PART-4 | role=render | inputs=props+state | outputs=JSX-dialog
