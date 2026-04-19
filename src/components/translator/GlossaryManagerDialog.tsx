// ============================================================
// PART 1 — Types & imports
// GlossaryManagerDialog — 번역 스튜디오 용어집 관리 모달
// - localStorage (noa_translation_glossary) CRUD
// - JSON import/export
// - 4-언어 레이블 (KO/EN/JP/CN)
// ============================================================

'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { X, Plus, Trash2, Download, Upload, Lock, Unlock } from 'lucide-react';
import { loadLocalGlossary, saveLocalGlossary } from '@/lib/translation/project-bridge';
import { useFocusTrap } from '@/hooks/useFocusTrap';

export interface GlossaryDialogEntry {
  source: string;
  target?: string;
  locked?: boolean;
}

export type GlossaryDialogLang = 'KO' | 'EN' | 'JP' | 'CN';

interface GlossaryManagerDialogProps {
  open: boolean;
  onClose: () => void;
  onApply?: (entries: GlossaryDialogEntry[]) => void;
  lang?: GlossaryDialogLang;
}

// ============================================================
// PART 2 — 다국어 레이블 (KO/EN/JP/CN)
// ============================================================

const LABELS: Record<GlossaryDialogLang, Record<string, string>> = {
  KO: {
    title: '용어집 관리',
    empty: '저장된 용어가 없습니다. 아래에서 추가하세요.',
    addSource: '원문 단어',
    addTarget: '번역 (선택)',
    addButton: '추가',
    exportButton: 'JSON 내보내기',
    importButton: 'JSON 가져오기',
    closeButton: '닫기',
    applyButton: '적용',
    deleteTitle: '삭제',
    lockTitle: '잠금',
    unlockTitle: '잠금 해제',
    searchPlaceholder: '용어 검색...',
  },
  EN: {
    title: 'Glossary Manager',
    empty: 'No entries saved. Add below.',
    addSource: 'Source word',
    addTarget: 'Target (optional)',
    addButton: 'Add',
    exportButton: 'Export JSON',
    importButton: 'Import JSON',
    closeButton: 'Close',
    applyButton: 'Apply',
    deleteTitle: 'Delete',
    lockTitle: 'Lock',
    unlockTitle: 'Unlock',
    searchPlaceholder: 'Search terms...',
  },
  JP: {
    title: '用語集管理',
    empty: '保存された用語がありません。下で追加してください。',
    addSource: '原文単語',
    addTarget: '訳 (任意)',
    addButton: '追加',
    exportButton: 'JSONエクスポート',
    importButton: 'JSONインポート',
    closeButton: '閉じる',
    applyButton: '適用',
    deleteTitle: '削除',
    lockTitle: 'ロック',
    unlockTitle: 'ロック解除',
    searchPlaceholder: '用語検索...',
  },
  CN: {
    title: '词汇表管理',
    empty: '没有保存的词汇。请在下方添加。',
    addSource: '原文词',
    addTarget: '译文 (可选)',
    addButton: '添加',
    exportButton: 'JSON导出',
    importButton: 'JSON导入',
    closeButton: '关闭',
    applyButton: '应用',
    deleteTitle: '删除',
    lockTitle: '锁定',
    unlockTitle: '解锁',
    searchPlaceholder: '搜索术语...',
  },
};

// ============================================================
// PART 3 — 메인 컴포넌트
// - 최상위 open=false 조기 return (C)
// - useFocusTrap 연동 (C) + Escape 핸들러
// - 백드롭 클릭 → onClose, 내부 클릭 → stopPropagation (C)
// - JSON import 실패 silent fallback (C)
// - filter useMemo (G)
// ============================================================

export function GlossaryManagerDialog({
  open,
  onClose,
  onApply,
  lang = 'KO',
}: GlossaryManagerDialogProps) {
  const [entries, setEntries] = useState<GlossaryDialogEntry[]>([]);
  const [newSource, setNewSource] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [filter, setFilter] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const L = LABELS[lang];

  // [C] Focus trap + Escape via onEscape callback (single source of truth)
  useFocusTrap(dialogRef, open, onClose);

  // Load on open
  useEffect(() => {
    if (!open) return;
    setEntries(loadLocalGlossary());
    setNewSource('');
    setNewTarget('');
    setFilter('');
  }, [open]);

  // Persist helper
  const persist = useCallback((next: GlossaryDialogEntry[]) => {
    setEntries(next);
    saveLocalGlossary(next);
  }, []);

  const handleAdd = useCallback(() => {
    const src = newSource.trim();
    if (!src) return;
    const next: GlossaryDialogEntry = {
      source: src,
      target: newTarget.trim() || undefined,
      locked: true,
    };
    const existing = entries.findIndex((e) => e.source === src);
    const updated =
      existing >= 0
        ? entries.map((e, i) => (i === existing ? next : e))
        : [...entries, next];
    persist(updated);
    setNewSource('');
    setNewTarget('');
  }, [newSource, newTarget, entries, persist]);

  const handleDelete = useCallback(
    (i: number) => {
      persist(entries.filter((_, idx) => idx !== i));
    },
    [entries, persist],
  );

  const handleEdit = useCallback(
    (i: number, field: 'source' | 'target', value: string) => {
      const updated = entries.map((e, idx) =>
        idx === i ? { ...e, [field]: value } : e,
      );
      persist(updated);
    },
    [entries, persist],
  );

  const handleToggleLock = useCallback(
    (i: number) => {
      const updated = entries.map((e, idx) =>
        idx === i ? { ...e, locked: !e.locked } : e,
      );
      persist(updated);
    },
    [entries, persist],
  );

  const handleExport = useCallback(() => {
    if (entries.length === 0) return;
    try {
      const blob = new Blob([JSON.stringify(entries, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `glossary-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* silent — export failure shouldn't disrupt UI */
    }
  }, [entries]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(String(ev.target?.result ?? ''));
          if (!Array.isArray(parsed)) return;
          // 병합: 기존 Map + 새 Map — source 키 기준 dedup (새 것 우선)
          const existingMap = new Map(entries.map((en) => [en.source, en]));
          for (const item of parsed) {
            if (item && typeof item.source === 'string' && item.source.trim()) {
              existingMap.set(item.source, {
                source: item.source,
                target:
                  typeof item.target === 'string' ? item.target : undefined,
                locked:
                  typeof item.locked === 'boolean' ? item.locked : true,
              });
            }
          }
          persist(Array.from(existingMap.values()));
        } catch {
          /* [C] silent fallback — malformed JSON shouldn't crash dialog */
        }
      };
      reader.readAsText(file);
      // [C] allow re-selecting same file
      e.target.value = '';
    },
    [entries, persist],
  );

  const handleApply = useCallback(() => {
    onApply?.(entries);
    onClose();
  }, [entries, onApply, onClose]);

  // [G] Memoize filtered list — avoid recomputing on every keystroke
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.source.toLowerCase().includes(q) ||
        (e.target ?? '').toLowerCase().includes(q),
    );
  }, [entries, filter]);

  // [C] Early return — nothing rendered when closed (also skips focus trap)
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal,50)] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="glossary-dialog-title"
        className="bg-bg-primary border border-border rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2
            id="glossary-dialog-title"
            className="text-lg font-semibold text-text-primary"
          >
            {L.title}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleImportClick}
              className="p-2 hover:bg-bg-secondary rounded transition text-text-secondary focus-visible:ring-2 focus-visible:ring-accent-blue"
              aria-label={L.importButton}
              title={L.importButton}
            >
              <Upload className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImportFile}
              aria-hidden="true"
              tabIndex={-1}
            />
            <button
              type="button"
              onClick={handleExport}
              className="p-2 hover:bg-bg-secondary rounded transition text-text-secondary focus-visible:ring-2 focus-visible:ring-accent-blue disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={L.exportButton}
              title={L.exportButton}
              disabled={entries.length === 0}
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-bg-secondary rounded transition text-text-secondary focus-visible:ring-2 focus-visible:ring-accent-blue"
              aria-label={L.closeButton}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter */}
        <div className="p-3 border-b border-border">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={L.searchPlaceholder}
            className="w-full px-3 py-2 bg-bg-secondary border border-border rounded text-sm text-text-primary focus-visible:ring-2 focus-visible:ring-accent-blue outline-none"
          />
        </div>

        {/* Add form */}
        <div className="p-3 border-b border-border bg-bg-secondary/30">
          <div className="flex gap-2">
            <input
              type="text"
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              placeholder={L.addSource}
              className="flex-1 px-2 py-1.5 bg-bg-primary border border-border rounded text-sm text-text-primary focus-visible:ring-2 focus-visible:ring-accent-blue outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
              }}
            />
            <input
              type="text"
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              placeholder={L.addTarget}
              className="flex-1 px-2 py-1.5 bg-bg-primary border border-border rounded text-sm text-text-primary focus-visible:ring-2 focus-visible:ring-accent-blue outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
              }}
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newSource.trim()}
              className="px-3 py-1.5 bg-accent-blue/20 hover:bg-accent-blue/30 disabled:opacity-50 disabled:cursor-not-allowed text-accent-blue rounded text-sm font-medium transition inline-flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-accent-blue"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden />
              {L.addButton}
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-text-tertiary text-sm">
              {L.empty}
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((entry) => {
                // realIndex: entries 내 실제 위치 (filter 후에도 정확한 CRUD 타깃팅)
                const realIndex = entries.indexOf(entry);
                return (
                  <div
                    key={`${entry.source}-${realIndex}`}
                    className="flex items-center gap-2 p-2 hover:bg-bg-secondary rounded group"
                  >
                    <input
                      type="text"
                      value={entry.source}
                      onChange={(e) =>
                        handleEdit(realIndex, 'source', e.target.value)
                      }
                      className="flex-1 bg-transparent text-sm text-text-primary border-b border-transparent hover:border-border focus:border-accent-blue outline-none"
                      aria-label={L.addSource}
                    />
                    <span className="text-text-tertiary text-xs" aria-hidden>
                      →
                    </span>
                    <input
                      type="text"
                      value={entry.target ?? ''}
                      onChange={(e) =>
                        handleEdit(realIndex, 'target', e.target.value)
                      }
                      placeholder="—"
                      className="flex-1 bg-transparent text-sm text-text-primary border-b border-transparent hover:border-border focus:border-accent-blue outline-none"
                      aria-label={L.addTarget}
                    />
                    <button
                      type="button"
                      onClick={() => handleToggleLock(realIndex)}
                      className="p-1 text-text-tertiary hover:text-text-primary transition focus-visible:ring-2 focus-visible:ring-accent-blue rounded"
                      aria-label={entry.locked ? L.unlockTitle : L.lockTitle}
                      title={entry.locked ? L.unlockTitle : L.lockTitle}
                    >
                      {entry.locked ? (
                        <Lock className="w-3.5 h-3.5 text-accent-blue" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(realIndex)}
                      className="p-1 text-text-tertiary hover:text-accent-red transition opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-accent-blue rounded"
                      aria-label={L.deleteTitle}
                      title={L.deleteTitle}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer (옵션: onApply 전달 시에만 표시) */}
        {onApply && (
          <div className="p-3 border-t border-border flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-secondary rounded transition focus-visible:ring-2 focus-visible:ring-accent-blue"
            >
              {L.closeButton}
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-3 py-1.5 bg-accent-blue hover:bg-accent-blue/80 text-white rounded text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-accent-blue"
            >
              {L.applyButton} ({entries.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=props | outputs=GlossaryDialogEntry
// IDENTITY_SEAL: PART-2 | role=Labels | inputs=lang | outputs=L10n
// IDENTITY_SEAL: PART-3 | role=Dialog | inputs=open,onClose,onApply,lang | outputs=modal-ui
