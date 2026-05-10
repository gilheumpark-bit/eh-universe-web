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
import { Code2, X, GitBranch, Bug, Users, ListTree, Settings2, ShieldCheck } from 'lucide-react';
import type { StoryConfig, EpisodeManuscript, Message } from '@/lib/studio-types';

// 패널 dynamic import — 초기 번들 부담 회피
import dynamic from 'next/dynamic';

const SymbolOutlinePanel = dynamic(
  () => import('@/components/studio/symbol-ide/SymbolOutlinePanel').then((m) => m.SymbolOutlinePanel),
  { ssr: false },
);
const LongArcReportPanel = dynamic(
  () => import('@/components/studio/long-arc/LongArcReportPanel').then((m) => m.LongArcReportPanel),
  { ssr: false },
);
const ForeshadowLedger = dynamic(
  () => import('@/components/studio/long-arc/ForeshadowLedger').then((m) => m.ForeshadowLedger),
  { ssr: false },
);
const DebuggerPanel = dynamic(
  () => import('@/components/studio/debugger/DebuggerPanel').then((m) => m.DebuggerPanel),
  { ssr: false },
);
const ReaderProfilePanel = dynamic(
  () => import('@/components/studio/reader-sim/ReaderProfilePanel').then((m) => m.ReaderProfilePanel),
  { ssr: false },
);
// [연결 #3·#4 — 2026-05-07] Snippet Palette + Multi-cursor Bar.
const SnippetPalette = dynamic(
  () => import('@/components/studio/snippets/SnippetPalette').then((m) => m.SnippetPalette),
  { ssr: false },
);
const MultiCursorBar = dynamic(
  () => import('@/components/studio/multi-cursor/MultiCursorBar').then((m) => m.MultiCursorBar),
  { ssr: false },
);
// [연결 #5 — 2026-05-07] Semantic Diff Panel.
const SemanticDiffPanel = dynamic(
  () => import('@/components/studio/semantic-diff/SemanticDiffPanel').then((m) => m.SemanticDiffPanel),
  { ssr: false },
);
// [검수 wiring — 2026-05-07] 미연결 모듈 4종 통합:
//   - SymbolQuickJumpModal (Ctrl+T)
//   - ReferencesPanel (Shift+F12 결과)
//   - LongArcGraph (텐션 곡선)
//   - DropoutHeatmap (이탈 히트맵)
const SymbolQuickJumpModal = dynamic(
  () => import('@/components/studio/symbol-ide/SymbolQuickJumpModal').then((m) => m.SymbolQuickJumpModal),
  { ssr: false },
);
const ReferencesPanel = dynamic(
  () => import('@/components/studio/symbol-ide/ReferencesPanel').then((m) => m.ReferencesPanel),
  { ssr: false },
);
const LongArcGraph = dynamic(
  () => import('@/components/studio/long-arc/LongArcGraph').then((m) => m.LongArcGraph),
  { ssr: false },
);
const DropoutHeatmap = dynamic(
  () => import('@/components/studio/reader-sim/DropoutHeatmap').then((m) => m.DropoutHeatmap),
  { ssr: false },
);
// [정합 재조정 — 2026-05-07] IDE Settings 패널 — 마스터 토글 시각 노출.
const NovelIDESettingsPanel = dynamic(
  () => import('@/components/studio/novel-ide/NovelIDESettingsPanel').then((m) => m.NovelIDESettingsPanel),
  { ssr: false },
);
// [L3·L4 — 2026-05-08] AI 맥락 이탈 방어 — Completion Gap + Meta-Context 패널.
const CompletionGapPanel = dynamic(
  () => import('@/components/studio/completion-gap/CompletionGapPanel').then((m) => m.CompletionGapPanel),
  { ssr: false },
);
const MetaContextPanel = dynamic(
  () => import('@/components/studio/meta-context/MetaContextPanel').then((m) => m.MetaContextPanel),
  { ssr: false },
);

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
import { buildTensionTrajectory } from '@/lib/long-arc-verifier/tension-trajectory';
import type { FindReferencesResult } from '@/lib/symbol-index/types';

type LauncherTab = 'outline' | 'long-arc' | 'debugger' | 'reader-sim' | 'diff' | 'defense' | 'settings';

// ============================================================
// PART 2 — Component
// ============================================================

export interface NovelIDELauncherProps {
  config: StoryConfig | null | undefined;
  episodes: EpisodeManuscript[] | null | undefined;
  projectId: string;
  /** [검증 루프 fix — 2026-05-08] L3 Completion Gap 자체 trigger 용 */
  messages?: Message[] | null;
  language?: 'KO' | 'EN' | 'JP' | 'CN';
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
              detail: { message: isKO ? `Symbol "${selection}" 없음` : `Symbol "${selection}" not found`, variant: 'info', duration: 2500 },
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

  const tabs: Array<{ id: LauncherTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'outline', label: isKO ? 'Symbol' : 'Symbol', icon: ListTree },
    { id: 'long-arc', label: isKO ? '맥락' : 'Long-Arc', icon: GitBranch },
    { id: 'debugger', label: isKO ? '디버거' : 'Debugger', icon: Bug },
    { id: 'reader-sim', label: isKO ? '독자' : 'Reader', icon: Users },
    { id: 'diff', label: isKO ? '의미 비교' : 'Diff', icon: GitBranch },
    { id: 'defense', label: isKO ? '방어' : 'Defense', icon: ShieldCheck },
    { id: 'settings', label: isKO ? '설정' : 'Settings', icon: Settings2 },
  ];

  // [연결 #5] Semantic Diff result — useMemo 로 캐시
  const semanticDiffResult = React.useMemo(() => {
    if (!diffSelection) return null;
    // dynamic import 회피 — 직접 동기 호출
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { computeSemanticDiff } = require('@/lib/semantic-diff/differ') as typeof import('@/lib/semantic-diff/differ');
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
          style={{ color: '#ffffff' }}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-accent-purple hover:bg-accent-purple/80 text-white rounded-full shadow-2xl transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-accent-blue outline-none"
          aria-label={isKO ? 'Novel IDE 도구 열기' : 'Open Novel IDE tools'}
          title="Ctrl+Shift+I"
        >
          <Code2 className="w-5 h-5" style={{ color: '#ffffff' }} />
          <span className="text-sm font-bold uppercase tracking-wider" style={{ color: '#ffffff' }}>
            {isKO ? 'IDE' : 'IDE'}
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
            aria-label={isKO ? '소설 IDE 도구' : 'Novel IDE Tools'}
          >
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-accent-purple" />
                <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                  {isKO ? '소설가의 IDE' : 'Novelist IDE'}
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
            <div className="flex-1 overflow-hidden p-3">
              {tab === 'outline' && (
                <div className="space-y-3 h-full overflow-y-auto">
                  <SymbolOutlinePanel index={symbolIndex} language={language} />
                  {/* [검수 wiring] Find All References 결과 — Shift+F12 후 표시 */}
                  {refsResult && (
                    <ReferencesPanel
                      result={refsResult}
                      language={language}
                      onClose={() => setRefsResult(null)}
                    />
                  )}
                </div>
              )}
              {tab === 'long-arc' && (
                <div className="space-y-3 h-full overflow-y-auto">
                  <LongArcReportPanel
                    report={longArc.report}
                    loading={longArc.loading}
                    language={language}
                    episodes={episodes ?? undefined}
                    onRefresh={longArc.refresh}
                    onJump={handleJump}
                  />
                  {/* [검수 wiring] LongArcGraph — 텐션 곡선 시각화 */}
                  {episodes && episodes.length > 0 && (
                    <LongArcGraph
                      trajectory={buildTensionTrajectory(episodes)}
                      language={language}
                    />
                  )}
                  <ForeshadowLedger markers={foreshadowMarkers} language={language} onJump={handleJump} />
                </div>
              )}
              {tab === 'debugger' && (
                <DebuggerPanel
                  isRunning={debugger_.isRunning}
                  currentLocation={debugger_.currentLocation}
                  frame={debugger_.frame}
                  breakpoints={debugger_.breakpoints}
                  watches={debugger_.watches}
                  callHierarchy={debugger_.callHierarchy}
                  language={language}
                  characters={config?.characters}
                  episodes={episodes ?? undefined}
                  onStart={() => debugger_.start()}
                  onPause={debugger_.pause}
                  onStop={debugger_.stop}
                  onStepOver={debugger_.stepOver}
                  onStepInto={debugger_.stepInto}
                  onAddWatch={debugger_.addWatch}
                  onRemoveWatch={debugger_.removeWatch}
                  onToggleBreakpoint={debugger_.toggleBp}
                />
              )}
              {tab === 'reader-sim' && (
                <div className="space-y-3 h-full overflow-y-auto">
                  <ReaderProfilePanel
                    profile={readerSim.profile}
                    loading={readerSim.loading}
                    language={language}
                    onRefresh={readerSim.refresh}
                  />
                  {/* [검수 wiring] DropoutHeatmap — 화별 페르소나 이탈 히트맵 */}
                  {readerSim.profile && readerSim.profile.predictions.length > 0 && (
                    <DropoutHeatmap profile={readerSim.profile} language={language} />
                  )}
                </div>
              )}
              {tab === 'diff' && (
                <SemanticDiffPanel
                  result={semanticDiffResult}
                  language={language}
                  beforeLabel={
                    episodes && episodes.length >= 2
                      ? `EP${episodes[episodes.length - 2].episode}`
                      : undefined
                  }
                  afterLabel={
                    episodes && episodes.length >= 1
                      ? `EP${episodes[episodes.length - 1].episode}`
                      : undefined
                  }
                />
              )}
              {/* [정합 재조정 — 2026-05-07] IDE Settings — 마스터 토글 (시각적 끄기 노출) */}
              {/* [L3·L4 — 2026-05-08] AI 맥락 이탈 방어 — Defense 탭 */}
              {tab === 'defense' && (
                <div className="space-y-3 h-full overflow-y-auto">
                  <CompletionGapPanel messages={messages ?? undefined} language={language} />
                  <MetaContextPanel language={language} />
                </div>
              )}
              {tab === 'settings' && <NovelIDESettingsPanel language={language} />}
            </div>

            {/* Footer */}
            <footer className="px-4 py-2 border-t border-border bg-bg-secondary/50 text-[10px] text-text-tertiary font-mono flex items-center justify-between">
              <span>
                Ctrl+Shift+I {isKO ? '토글' : 'toggle'} · Ctrl+Shift+S {isKO ? '스니펫' : 'snippet'} · Ctrl+D {isKO ? '치환' : 'find'}
              </span>
              <span className="text-accent-purple">소설가의 IDE</span>
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
    </>
  );
};

export default NovelIDELauncher;
