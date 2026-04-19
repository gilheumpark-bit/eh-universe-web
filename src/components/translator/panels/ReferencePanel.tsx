"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FileSearch, Search, BookOpen, Plus, Trash2, ExternalLink, Save, Check } from 'lucide-react';
import { useTranslator } from '../core/TranslatorContext';
import { logger } from '@/lib/logger';

interface ExternalReference {
  id: string;
  title: string;
  url: string;
  note?: string;
  addedAt: number;
}

const REFERENCES_STORAGE_KEY = 'eh_translator_references_v1';

// ============================================================
// PART 2 — Storage Helpers
// ============================================================

function loadReferences(): ExternalReference[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(REFERENCES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    logger.warn('ReferencePanel', 'loadReferences failed', err);
    return [];
  }
}

function saveReferences(refs: ExternalReference[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REFERENCES_STORAGE_KEY, JSON.stringify(refs));
  } catch (err) {
    logger.warn('ReferencePanel', 'saveReferences failed (quota?)', err);
  }
}

// ============================================================
// PART 3 — Main Component
// ============================================================
export function ReferencePanel() {
  const { chapters, activeChapterIndex, patchActiveChapter, langKo } = useTranslator();
  const currentChapter = activeChapterIndex !== null ? chapters[activeChapterIndex] : null;
  const storyNote = currentChapter?.storyNote ?? '';

  const [searchQuery, setSearchQuery] = useState('');

  // Story Note 편집 (debounced save)
  const [noteDraft, setNoteDraft] = useState(storyNote);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSavedAt, setNoteSavedAt] = useState<number | null>(null);

  // storyNote가 외부에서 바뀌면 draft 동기화 (chapter 전환 시)
  useEffect(() => {
    setNoteDraft(storyNote);
  }, [storyNote, activeChapterIndex]);

  // debounced 저장 — 800ms 후 patchActiveChapter
  useEffect(() => {
    if (noteDraft === storyNote) return;
    const t = setTimeout(() => {
      setNoteSaving(true);
      patchActiveChapter({ storyNote: noteDraft });
      setNoteSaving(false);
      setNoteSavedAt(Date.now());
    }, 800);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteDraft]);

  // External References (localStorage)
  const [refs, setRefs] = useState<ExternalReference[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    setRefs(loadReferences());
  }, []);

  const persistRefs = useCallback((next: ExternalReference[]) => {
    setRefs(next);
    saveReferences(next);
  }, []);

  const handleAddRef = useCallback(() => {
    const t = newTitle.trim();
    const u = newUrl.trim();
    if (!t || !u) return;
    // URL 유효성 간단 검증
    try {
      new URL(u);
    } catch {
      alert(langKo ? 'URL 형식이 올바르지 않습니다.' : 'Invalid URL');
      return;
    }
    const next: ExternalReference = {
      id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: t.slice(0, 200),
      url: u,
      addedAt: Date.now(),
    };
    persistRefs([next, ...refs]);
    setNewTitle('');
    setNewUrl('');
    setAddOpen(false);
  }, [newTitle, newUrl, refs, persistRefs, langKo]);

  const handleRemoveRef = useCallback((id: string) => {
    persistRefs(refs.filter(r => r.id !== id));
  }, [refs, persistRefs]);

  // 검색 필터
  const query = searchQuery.trim().toLowerCase();
  const filteredRefs = useMemo(() => {
    if (!query) return refs;
    return refs.filter(r =>
      r.title.toLowerCase().includes(query) || r.url.toLowerCase().includes(query)
    );
  }, [refs, query]);

  const noteMatchesQuery = !query || noteDraft.toLowerCase().includes(query);
  const noteMatchHits = query && noteDraft
    ? (noteDraft.toLowerCase().match(new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
    : 0;

  // ============================================================
  // PART 4 — Render
  // ============================================================
  return (
    <div className="flex h-full flex-col font-sans">
      {/* Search */}
      <div className="p-4 shrink-0 border-b border-white/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder={langKo ? '참고자료·메모 검색...' : 'Search references & notes...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-md py-1.5 pl-9 pr-3 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-amber/50 focus:ring-1 focus:ring-accent-amber/50 transition-[transform,opacity,background-color,border-color,color] pointer-events-auto"
          />
        </div>
        {query && (
          <div className="mt-2 text-[10px] text-text-tertiary font-mono">
            {langKo ? '결과' : 'Results'}: {filteredRefs.length} {langKo ? '링크' : 'links'}
            {noteMatchHits > 0 && `, ${noteMatchHits} ${langKo ? '메모 매치' : 'note matches'}`}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pointer-events-auto">
        {/* ── Story Note (챕터별 편집 가능) ── */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-text-secondary">
              <BookOpen className="w-4 h-4 text-accent-amber" />
              <span className="text-[13px] font-medium">
                {langKo ? '세계관 메모' : 'World Note'}
                {currentChapter ? ` · ${currentChapter.name}` : ''}
              </span>
            </div>
            {noteSaving ? (
              <span className="text-[10px] text-accent-amber flex items-center gap-1">
                <Save className="w-3 h-3 animate-pulse" />
                {langKo ? '저장 중' : 'Saving'}
              </span>
            ) : noteSavedAt ? (
              <span className="text-[10px] text-accent-green flex items-center gap-1">
                <Check className="w-3 h-3" />
                {langKo ? '저장됨' : 'Saved'}
              </span>
            ) : null}
          </div>

          {currentChapter ? (
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder={langKo
                ? '이 챕터의 세계관 설정·캐릭터·용어 힌트를 적어두세요. NOA 번역 시 자동 참조됩니다.'
                : 'Notes on world-setting, characters, terminology for this chapter. Used as NOA translation context.'}
              className={`w-full min-h-[120px] max-h-[300px] p-3 rounded-lg bg-white/5 border text-[13px] text-text-secondary leading-relaxed resize-y focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber/50 transition-colors ${
                query && !noteMatchesQuery ? 'border-white/10 opacity-50' : 'border-white/10'
              } ${query && noteMatchHits > 0 ? 'border-accent-amber/30' : ''}`}
            />
          ) : (
            <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-[13px] text-text-tertiary italic">
              {langKo ? '챕터를 선택하면 메모를 편집할 수 있습니다.' : 'Select a chapter to edit notes.'}
            </div>
          )}
        </div>

        {/* ── External References (링크 CRUD) ── */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-text-secondary">
              <FileSearch className="w-4 h-4 text-accent-amber" />
              <span className="text-[13px] font-medium">
                {langKo ? '외부 참고 링크' : 'External References'}
              </span>
              <span className="text-[10px] text-text-tertiary font-mono">({refs.length})</span>
            </div>
            <button
              type="button"
              onClick={() => setAddOpen(o => !o)}
              className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                addOpen
                  ? 'bg-accent-amber/15 border-accent-amber/40 text-accent-amber'
                  : 'bg-white/5 border-white/10 text-text-tertiary hover:text-text-secondary'
              }`}
            >
              <Plus className="w-3 h-3" />
              {langKo ? '추가' : 'Add'}
            </button>
          </div>

          {/* 추가 폼 */}
          {addOpen && (
            <div className="mb-3 rounded-lg border border-accent-amber/25 bg-accent-amber/[0.04] p-3 space-y-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={langKo ? '제목 (예: Wikipedia 캐릭터 아키타입)' : 'Title (e.g. Wikipedia Character Archetypes)'}
                className="w-full bg-black/40 border border-white/10 rounded-md px-2 py-1.5 text-[12px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-amber/50"
              />
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-black/40 border border-white/10 rounded-md px-2 py-1.5 text-[12px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-amber/50"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddRef}
                  disabled={!newTitle.trim() || !newUrl.trim()}
                  className="flex-1 py-1.5 rounded-md bg-accent-amber/20 hover:bg-accent-amber/30 text-accent-amber border border-accent-amber/40 text-[11px] font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {langKo ? '추가' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => { setAddOpen(false); setNewTitle(''); setNewUrl(''); }}
                  className="px-3 py-1.5 rounded-md bg-white/5 text-text-tertiary text-[11px] hover:bg-white/10 transition-colors"
                >
                  {langKo ? '취소' : 'Cancel'}
                </button>
              </div>
            </div>
          )}

          {/* 링크 목록 */}
          {filteredRefs.length === 0 ? (
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/10 text-[11px] text-text-tertiary text-center italic">
              {query
                ? (langKo ? '검색 결과가 없습니다.' : 'No results.')
                : (langKo ? '참고 링크를 추가하세요 (위키피디아, 번역 가이드 등)' : 'Add reference links (Wikipedia, glossary guides, etc.)')
              }
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredRefs.map((ref) => (
                <div key={ref.id} className="group rounded-lg bg-white/5 border border-white/10 p-2 flex items-start gap-2 hover:bg-white/10 transition-colors">
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-0 flex flex-col gap-0.5"
                  >
                    <span className="text-[13px] text-text-primary group-hover:text-accent-amber transition-colors flex items-center gap-1">
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="truncate">{ref.title}</span>
                    </span>
                    <span className="text-[10px] text-text-tertiary truncate font-mono">{ref.url}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleRemoveRef(ref.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-red-400 transition-[opacity,background-color]"
                    title={langKo ? '삭제' : 'Delete'}
                    aria-label={langKo ? '참고 링크 삭제' : 'Delete reference'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-[9px] text-text-tertiary italic text-center pt-2 border-t border-white/5">
          {langKo
            ? '세계관 메모는 각 챕터에 저장 · 외부 링크는 이 브라우저에 저장'
            : 'World notes saved per-chapter · external links saved in this browser'}
        </p>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: ReferencePanel | role=translator references CRUD | inputs=chapters,activeIdx | outputs=UI(note edit + external links)
