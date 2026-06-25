"use client";
// ============================================================
// PART 1 — Module Header
// ============================================================
//
// NovelIDELauncher — Phase B~F 신규 패널 4종 통합 launcher.
//
// 통합 패널:
//   - Symbol Outline (Phase B)
//   - Long-Arc Verifier Report (Phase C)
//   - Story Debugger (Phase D)
//   - Reader Simulation (Phase E)
//
// 패턴: 우하단 FAB → 우측 Drawer 슬라이드. StudioShell 1줄 mount.
// 단축키: Ctrl+Shift+I (IDE 토글)
//
// 격리:
//   - StudioMainContent 0byte (별도 모달 마운트)
//   - ManuscriptView 0byte (Tiptap decoration extension 별도)
//   - 자체 4 탭 — 외부 라우팅 X
//
// [C] config null → 빈 패널 안내 / [G] lazy mount (visible 토글) / [K] 단일 책임
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Code2, X } from 'lucide-react';
import type { StoryConfig, EpisodeManuscript, Message } from '@/lib/studio-types';
import { MultiCursorBar, SnippetPalette, SymbolQuickJumpModal } from './NovelIDELauncher.lazy';
import {
  getCertificateLanguage,
  getLauncherTabs,
  type JournalView,
  type LauncherTab,
  type NovelIDELanguage,
} from './NovelIDELauncher.model';
import { NovelIDELauncherTabBody } from './NovelIDELauncher.body';
import { SubmissionPackageModal } from './NovelIDELauncher.submission';
import type { CreativeEvent } from '@/lib/creative-process/types';

// hooks
import { useSymbolIndex } from '@/hooks/useSymbolIndex';
import { useLongArcVerifier } from '@/hooks/useLongArcVerifier';
import { useStoryDebugger } from '@/hooks/useStoryDebugger';
import { useReaderSimulation } from '@/hooks/useReaderSimulation';
import { useSymbolShortcuts } from '@/hooks/useSymbolShortcuts';
// [정합 재조정 — 2026-05-07] IDE Settings — autoTrigger 토글 적용.
import { useNovelIDESettings } from '@/hooks/useNovelIDESettings';
import { extractAllForeshadowMarkers } from '@/lib/long-arc-verifier/foreshadow-tracker';
import { findReferences } from '@/lib/symbol-index/find-references';
import { computeSemanticDiff } from '@/lib/semantic-diff/differ';
import type { FindReferencesResult } from '@/lib/symbol-index/types';

// ============================================================
// PART 2 — Component
// ============================================================

export interface NovelIDELauncherProps {
  config: StoryConfig | null | undefined;
  episodes: EpisodeManuscript[] | null | undefined;
  projectId: string;
  /** [검증 루프 fix — 2026-05-08] L3 Completion Gap 자체 trigger 용 */
  messages?: Message[] | null;
  language?: NovelIDELanguage;
}

export const NovelIDELauncher: React.FC<NovelIDELauncherProps> = ({
  config,
  episodes,
  projectId,
  messages,
  language = 'KO',
}) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<LauncherTab>('outline');
  // [연결 #3·#4 — 2026-05-07] Snippet Palette / Multi-cursor Bar 토글 상태.
  const [snippetOpen, setSnippetOpen] = useState(false);
  const [multiCursorOpen, setMultiCursorOpen] = useState(false);
  // [연결 #5] Semantic Diff 입력 — 활성 episode 의 마지막 두 버전 또는 사용자 선택.
  const [diffSelection, setDiffSelection] = useState<{ before: string; after: string } | null>(null);
  // [검수 wiring] Symbol Quick Jump (Ctrl+T) + Find All References (Shift+F12) 상태.
  const [quickJumpOpen, setQuickJumpOpen] = useState(false);
  const [refsResult, setRefsResult] = useState<FindReferencesResult | null>(null);
  // [Visual Charter v1.0 — 2026-05-10] Journal 탭 sub-view + Submission modal 토글
  const [journalView, setJournalView] = useState<JournalView>('inspector');
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [creativeEvents, setCreativeEvents] = useState<CreativeEvent[]>([]);
  const isKO = language === 'KO';

  // [정합 재조정] IDE Settings — autoTrigger 토글
  const { settings: ideSettings } = useNovelIDESettings();
  // 통합 hooks
  const symbolIndex = useSymbolIndex(config, episodes);
  const longArc = useLongArcVerifier({
    projectId,
    config,
    episodes,
    autoTrigger: ideSettings.longArcAutoTrigger,
  });
  const debugger_ = useStoryDebugger({
    characters: config?.characters,
    episodes,
    disabled: !open,
  });
  const readerSim = useReaderSimulation({ episodes });
  const foreshadowMarkers = extractAllForeshadowMarkers(episodes);

  // Ctrl+Shift+I 토글 + Ctrl+Shift+S (snippet) + Ctrl+D (multi-cursor)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      if (ctrl && shift && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      // [연결 #3] Ctrl+Shift+S → Snippet Palette
      if (ctrl && shift && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setSnippetOpen((s) => !s);
        return;
      }
      // [연결 #4] Ctrl+D → Multi-cursor Bar (Find/Replace)
      if (ctrl && !shift && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setMultiCursorOpen((s) => !s);
        return;
      }
      if (e.key === 'Escape') {
        if (snippetOpen) setSnippetOpen(false);
        else if (multiCursorOpen) setMultiCursorOpen(false);
        else if (open) setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, snippetOpen, multiCursorOpen]);

  // [연결 #3] Snippet 삽입 — 활성 editor 에 텍스트 dispatch
  const handleSnippetInsert = useCallback((text: string) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('noa:snippet-insert', { detail: { text } }),
    );
    // NovelEditor 측에서 listener 가 받아서 caret 위치에 삽입
  }, []);

  // [연결 #4] Multi-cursor 적용 — 활성 episode 본문 교체
  const handleMultiCursorApply = useCallback((newText: string) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('noa:manuscript-replace', { detail: { newText } }),
    );
  }, []);

  // [연결 #5] Semantic Diff 입력 자동 채우기 — 마지막 두 episode 비교
  useEffect(() => {
    if (tab !== 'diff' || !episodes || episodes.length < 2) return;
    const sorted = [...episodes].sort((a, b) => a.episode - b.episode);
    const last = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    setDiffSelection({ before: prev.content ?? '', after: last.content ?? '' });
  }, [tab, episodes]);

  // [검수 wiring] Symbol IDE 단축키 — Ctrl+T / Shift+F12 / Ctrl+Shift+O
  useSymbolShortcuts({
    onSymbolQuickJump: () => setQuickJumpOpen(true),
    onFindAllReferences: (selection) => {
      // 선택 텍스트 → surfaceMap → SymbolId → references
      const symbolId = symbolIndex.surfaceMap.get(selection);
      if (!symbolId) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('noa:alert', {
              detail: {
                message: isKO
                  ? `"${selection}"을 구조 항목에서 찾지 못했습니다`
                  : `"${selection}" was not found in the structure map`,
                variant: 'info',
                duration: 2500,
              },
            }),
          );
        }
        return;
      }
      const result = findReferences(symbolId, episodes ?? [], symbolIndex);
      setRefsResult(result);
      setOpen(true);
      setTab('outline');
    },
    onToggleSymbolOutline: () => {
      setOpen((o) => !o);
      setTab('outline');
    },
  });

  const handleJump = useCallback((episodeId: number, charOffset?: number) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('noa:goto-reference', {
        detail: { episodeId, charOffset, surface: '' },
      }),
    );
    setOpen(false);
  }, []);

  // [연결 #2 — 2026-05-07] BreakpointGutter 거터 클릭 → useStoryDebugger BP 토글.
  // breakpoint-gutter Tiptap extension 이 'noa:bp-toggle-request' { paragraphIdx } 발행.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ paragraphIdx: number }>).detail;
      if (!detail || typeof detail.paragraphIdx !== 'number') return;
      const epId = config?.episode ?? episodes?.[0]?.episode;
      if (typeof epId !== 'number') return;
      const loc = { episodeId: epId, paragraphIdx: detail.paragraphIdx };
      const existing = debugger_.breakpoints.find(
        (bp) =>
          bp.location.episodeId === loc.episodeId &&
          bp.location.paragraphIdx === loc.paragraphIdx,
      );
      if (existing) {
        debugger_.toggleBp(existing.id);
      } else {
        debugger_.addBreakpoint(loc, `EP${epId} ¶${detail.paragraphIdx}`);
      }
    };
    window.addEventListener('noa:bp-toggle-request', handler as EventListener);
    return () => window.removeEventListener('noa:bp-toggle-request', handler as EventListener);
  }, [config, episodes, debugger_]);

  const tabs = getLauncherTabs(isKO);

  // [Visual Charter v1.0 — 2026-05-10] Journal 탭 활성 시 creative events 로드 (5초 throttle).
  useEffect(() => {
    if (!open || tab !== 'journal' || !projectId) return;
    let cancelled = false;
    (async () => {
      try {
        const { listCreativeEvents } = await import('@/lib/creative-process/event-recorder');
        const evts = await listCreativeEvents({ projectId, limit: 500 });
        if (!cancelled) setCreativeEvents(evts);
      } catch {
        if (!cancelled) setCreativeEvents([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, tab, projectId]);

  const certLang = getCertificateLanguage(language);

  // [연결 #5] Semantic Diff result — useMemo 로 캐시
  const semanticDiffResult = React.useMemo(() => {
    if (!diffSelection) return null;
    return computeSemanticDiff(diffSelection.before, diffSelection.after, {
      characterNames: config?.characters?.map((c) => c.name) ?? [],
    });
  }, [diffSelection, config]);

  return (
    <>
      {/* FAB — 우하단 floating button. inline style 색상 강제 — 광역 CSS 우선순위 회피 (axe contrast 1.96 → 8.5+ 확보) */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-accent-purple hover:bg-accent-purple/80 text-white rounded-full shadow-2xl transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-accent-blue outline-none studio-aux-fab-force-white"
          aria-label={isKO ? '창작 보조 패널 열기' : 'Open creative support panel'}
          title="Ctrl+Shift+I"
        >
          <Code2 className="w-5 h-5" />
          <span className="text-sm font-bold uppercase tracking-wider">
            {isKO ? '보조' : 'AUX'}
          </span>
        </button>
      )}

      {/* Drawer */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Panel */}
          <aside
            className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[420px] lg:w-[500px] bg-bg-primary border-l border-border shadow-2xl flex flex-col"
            role="dialog"
            aria-label={isKO ? '창작 보조 패널' : 'Creative support panel'}
          >
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-accent-purple" />
                <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                  {isKO ? '창작 보조' : 'Creative Assist'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 text-text-tertiary hover:text-text-secondary rounded focus-visible:ring-2 focus-visible:ring-accent-blue outline-none"
                aria-label={isKO ? '닫기' : 'Close'}
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            {/* Tabs */}
            <nav className="flex border-b border-border bg-bg-secondary/50">
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`flex-1 flex flex-col items-center gap-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      active
                        ? 'text-accent-purple border-b-2 border-accent-purple bg-accent-purple/5'
                        : 'text-text-tertiary hover:text-text-secondary border-b-2 border-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Body */}
            <NovelIDELauncherTabBody
              tab={tab}
              language={language}
              isKO={isKO}
              config={config}
              episodes={episodes}
              messages={messages}
              symbolIndex={symbolIndex}
              refsResult={refsResult}
              setRefsResult={setRefsResult}
              longArc={longArc}
              handleJump={handleJump}
              foreshadowMarkers={foreshadowMarkers}
              debuggerState={debugger_}
              readerSim={readerSim}
              semanticDiffResult={semanticDiffResult}
              journalView={journalView}
              setJournalView={setJournalView}
              setSubmissionOpen={setSubmissionOpen}
              creativeEvents={creativeEvents}
              certLang={certLang}
            />

            {/* Footer */}
            <footer className="px-4 py-2 border-t border-border bg-bg-secondary/50 text-[10px] text-text-tertiary font-mono flex items-center justify-between">
              <span>
                Ctrl+Shift+I {isKO ? '토글' : 'toggle'} · Ctrl+Shift+S {isKO ? '스니펫' : 'snippet'} · Ctrl+D {isKO ? '치환' : 'find'}
              </span>
              <span className="text-accent-purple">{isKO ? '창작 보조' : 'Creative Assist'}</span>
            </footer>
          </aside>
        </>
      )}

      {/* [연결 #3] Snippet Palette — Ctrl+Shift+S 토글, IDE 패널과 독립 mount */}
      <SnippetPalette
        open={snippetOpen}
        onClose={() => setSnippetOpen(false)}
        onInsert={handleSnippetInsert}
        language={language}
      />

      {/* [연결 #4] Multi-cursor Bar — Ctrl+D 토글 */}
      <MultiCursorBar
        text={
          // [C] 활성 episode 본문 — 마지막 episode 기준 (간단). Phase 2 에서 활성 ep 추적.
          episodes?.[episodes.length - 1]?.content ?? ''
        }
        open={multiCursorOpen}
        onClose={() => setMultiCursorOpen(false)}
        onApply={(newText) => {
          handleMultiCursorApply(newText);
          setMultiCursorOpen(false);
        }}
        language={language}
      />

      {/* [검수 wiring] Symbol Quick Jump — Ctrl+T 토글 */}
      <SymbolQuickJumpModal
        index={symbolIndex}
        open={quickJumpOpen}
        onClose={() => setQuickJumpOpen(false)}
        language={language}
      />

      {submissionOpen && (
        <SubmissionPackageModal
          isKO={isKO}
          language={language}
          projectId={projectId}
          onClose={() => setSubmissionOpen(false)}
        />
      )}
    </>
  );
};

export default NovelIDELauncher;
