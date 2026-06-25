"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  const { chapters, activeChapterIndex, patchChapterAtIndex, langKo } = useTranslator();
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

  // [fix] line 68 data-loss: cleanup 시점에 현재 활성 회차를 알기 위한 ref
  // (디바운스 저장 effect가 캡처한 회차와 비교해 전환 여부를 판단)
  const activeChapterIndexRef = useRef(activeChapterIndex);
  activeChapterIndexRef.current = activeChapterIndex;

  // debounced 저장 — 800ms 후 patchChapterAtIndex (편집 시점의 회차에 고정)
  useEffect(() => {
    if (noteDraft === storyNote) return;
    // [fix] line 68 data-loss: 편집 대상 회차 index를 캡처해 그 회차에 저장한다.
    // 디바운스 창(800ms) 안에서 회차를 전환하면 이 effect의 cleanup이 돌면서
    // 기존에는 clearTimeout만 호출 → 미저장 편집이 조용히 소실됐다.
    // 이제 cleanup에서 활성 회차가 캡처 시점과 달라졌으면(=전환/언마운트)
    // 캡처한 회차로 pending 편집을 즉시 flush한다. 같은 회차에서 계속 타이핑할 때는
    // (디바운스 리셋) flush하지 않아 기존 디바운스 동작을 유지한다.
    const targetIndex = activeChapterIndex;
    let flushed = false;
    const commit = () => {
      if (flushed || targetIndex === null) return;
      flushed = true;
      patchChapterAtIndex(targetIndex, { storyNote: noteDraft });
    };
    const t = setTimeout(() => {
      setNoteSaving(true);
      commit();
      setNoteSaving(false);
      setNoteSavedAt(Date.now());
    }, 800);
    return () => {
      clearTimeout(t);
      // [fix] line 68: 활성 회차가 바뀌었거나(전환) 컴포넌트가 사라지는 경우에만
      // 손실 방지를 위해 캡처한 회차로 flush. 같은 회차 내 디바운스 리셋은 제외.
      if (activeChapterIndexRef.current !== targetIndex) commit();
    };
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
            placeholder={langKo ? '자료 링크·메모 검색...' : 'Search source links & notes...'}
            aria-label={langKo ? '자료 링크와 메모 검색' : 'Search source links and notes'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[44px] bg-bg-primary border border-border/60 rounded-md pl-9 pr-3 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-amber/50 transition-[transform,opacity,background-color,border-color,color] pointer-events-auto"
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
        {/* ── Story Note (회차별 편집 가능) ── */}
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
                ? '이 회차의 세계관 설정·캐릭터·용어 힌트를 적어두세요. 노아가 번역할 때 참고합니다.'
                : 'Notes on world-setting, characters, and terminology for this chapter. Used as Noa translation context.'}
              className={`w-full min-h-[120px] max-h-[300px] p-3 rounded-lg bg-white/5 border text-[13px] text-text-secondary leading-relaxed resize-y focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber/50 transition-colors ${
                query && !noteMatchesQuery ? 'border-white/10 opacity-50' : 'border-white/10'
              } ${query && noteMatchHits > 0 ? 'border-accent-amber/30' : ''}`}
            />
          ) : (
            <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-[13px] text-text-tertiary italic">
              {langKo ? '회차를 선택하면 메모를 편집할 수 있습니다.' : 'Select a chapter to edit notes.'}
            </div>
          )}
        </div>

        {/* ── Source links (local browser list) ── */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-text-secondary">
              <FileSearch className="w-4 h-4 text-accent-amber" />
              <span className="text-[13px] font-medium">
                {langKo ? '자료 링크' : 'Source links'}
              </span>
              <span className="text-[10px] text-text-tertiary font-mono">({refs.length})</span>
            </div>
            <button
              type="button"
              onClick={() => setAddOpen(o => !o)}
              className={`min-h-[44px] flex items-center gap-1 text-[11px] px-3 rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 ${
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
                placeholder={langKo ? '제목 (예: 캐릭터 유형 자료)' : 'Title (e.g. character archetype notes)'}
                className="w-full min-h-[44px] bg-bg-primary border border-border/60 rounded-md px-3 text-[12px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-amber/50"
              />
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://..."
                className="w-full min-h-[44px] bg-bg-primary border border-border/60 rounded-md px-3 text-[12px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-amber/50"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddRef}
                  disabled={!newTitle.trim() || !newUrl.trim()}
                  className="flex-1 min-h-[44px] rounded-md bg-accent-amber/20 hover:bg-accent-amber/30 text-accent-amber border border-accent-amber/40 text-[11px] font-bold disabled:bg-bg-tertiary disabled:text-text-quaternary disabled:opacity-100 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
                >
                  {langKo ? '추가' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => { setAddOpen(false); setNewTitle(''); setNewUrl(''); }}
                  className="min-h-[44px] px-3 rounded-md bg-white/5 text-text-tertiary text-[11px] hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
                >
                  {langKo ? '취소' : 'Cancel'}
                </button>
              </div>
            </div>
          )}

          {/* 링크 목록 */}
          {filteredRefs.length === 0 ? (
            <div className="rounded-xl border border-border/60 bg-bg-primary/80 px-4 py-6 text-center shadow-sm">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-accent-amber/25 bg-accent-amber/10 text-accent-amber">
                <FileSearch className="h-5 w-5" />
              </div>
              <p className="mt-3 text-[13px] font-semibold text-text-primary">
                {query
                  ? (langKo ? '맞는 자료 링크가 없습니다.' : 'No matching source links.')
                  : (langKo ? '자료 링크가 비어 있습니다.' : 'No source links yet.')}
              </p>
              <p className="mx-auto mt-1 max-w-[240px] text-[11px] leading-relaxed text-text-secondary">
                {query
                  ? (langKo ? '검색어를 줄이거나 새 자료 링크를 추가하세요.' : 'Try a broader search or add a source link.')
                  : (langKo ? '자료 출처, 용어 기준, 플랫폼 가이드를 한곳에 묶어둘 수 있습니다.' : 'Collect sources, glossary rules, and platform guides here.')}
              </p>
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
                    className="shrink-0 min-h-[44px] min-w-[44px] inline-flex items-center justify-center opacity-70 group-hover:opacity-100 focus-visible:opacity-100 rounded-md hover:bg-accent-red/20 text-accent-red transition-[opacity,background-color]"
                    title={langKo ? '삭제' : 'Delete'}
                    aria-label={langKo ? '자료 링크 삭제' : 'Delete source link'}
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
            ? '세계관 메모는 각 회차에 저장 · 자료 링크는 이 브라우저에 저장'
            : 'World notes saved per-chapter · source links saved in this browser'}
        </p>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: ReferencePanel | role=translator references CRUD | inputs=chapters,activeIdx | outputs=UI(note edit + external links)
