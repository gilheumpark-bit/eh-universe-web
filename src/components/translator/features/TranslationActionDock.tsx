import React, { useRef, type ChangeEvent } from 'react';
import { useTranslator } from '../core/TranslatorContext';
import { useTranslatorLayout } from '../core/TranslatorLayoutContext';
import { useLang } from '@/lib/LangContext';
import { PROVIDERS } from '@/lib/translator-constants';
import {
  Sparkles,
  Zap,
  Brain,
  Globe,
  Settings2,
  ShieldCheck,
  ChevronRight,
  Save,
  Download,
  Upload,
  Cloud,
  Key,
  HardDrive,
  GitCompare,
} from 'lucide-react';
// [A.4 — 2026-05-08] Market track 장르 선택 통합.
import { KoreanGenrePicker } from '../panels/KoreanGenrePicker';
import { useState } from 'react';
import type { KoreanGenreId } from '@/lib/translation/korean-genre-matrix';

export function TranslationActionDock() {
  const { lang } = useLang();
  const importRef = useRef<HTMLInputElement>(null);
  const { setActiveLeftPanel } = useTranslatorLayout();
  const {
    loading,
    statusMsg,
    provider,
    setProvider,
    translate,
    deepTranslate,
    runDualTranslate,
    outputMode,
    setOutputMode,
    runCompareB,
    compareResultB,
    activeChapter,
    autoSaveLabel,
    cloudSyncEnabled,
    cloudSyncStatus,
    cloudSyncDetail,
    exportData,
    importData,
    chapters,
    setChapters,
    downloadAllResults,
    authUser,
    isAuthLoaded,
    openApiKeyModal,
    source,
    setWorldContext,
    setCharacterProfiles,
    from,
    to,
  } = useTranslator();

  const stage = activeChapter?.stageProgress ?? 0;
  const stageLabel = loading ? `${Math.min(stage, 5)}/5` : '—/5';
  const hasChapters = chapters.length > 0;
  const exportFive = ['txt', 'md', 'json', 'html', 'csv'] as const;

  // [A.4] Market track 장르 — localStorage 보존
  const [genre, setGenre] = useState<KoreanGenreId>(() => {
    if (typeof window === 'undefined') return 'generic';
    try {
      const saved = localStorage.getItem('noa_translator_genre');
      if (saved) return saved as KoreanGenreId;
    } catch { /* */ }
    return 'generic';
  });
  const handleGenreChange = (id: KoreanGenreId) => {
    setGenre(id);
    try { localStorage.setItem('noa_translator_genre', id); } catch { /* quota */ }
    try { window.dispatchEvent(new CustomEvent('noa:translator-genre-changed', { detail: { id } })); } catch { /* */ }
  };

  // [D.1 — 2026-05-09] Translation → Studio export — 번역 결과를 Studio episode 형식 JSON 으로 다운로드.
  // 이전 (오평가): chaptersToStudioEpisodes export 만, 호출 0건.
  // 수리: 작가가 번역본 → Studio 검수 모드로 가져갈 수 있게 JSON 다운로드 (Studio import 호환 형식).
  // track 선택 (faithful / market) — 작가가 어느 트랙을 Studio 로 가져갈지 결정.
  const handleStudioExport = async (track: 'faithful' | 'market' = 'market') => {
    if (chapters.length === 0) {
      window.alert(lang === 'ko' ? 'Export 할 chapter 가 없습니다.' : 'No chapters to export.');
      return;
    }
    try {
      const bridgeMod = await import('@/lib/translation/studio-bridge');
      const episodes = bridgeMod.chaptersToStudioEpisodes(chapters, track);
      if (episodes.length === 0) {
        window.alert(
          lang === 'ko'
            ? `${track === 'faithful' ? 'Faithful' : 'Market'} 트랙에 export 가능한 결과가 없습니다.`
            : `No exportable ${track} results.`,
        );
        return;
      }
      // Studio import 호환 형식 — { schema_version, episodes[] }
      const payload = {
        schema_version: '1.0.0',
        track,
        exported_at: new Date().toISOString(),
        from_lang: from,
        to_lang: to,
        episodes,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `studio-import-${track}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      window.alert(
        lang === 'ko'
          ? `${episodes.length} episode 를 Studio 형식 JSON 으로 export 완료.\n\nStudio 에서 "JSON 불러오기" 로 import 가능.`
          : `Exported ${episodes.length} episodes as Studio JSON.\n\nUse "Import JSON" in Studio.`,
      );
    } catch (e) {
      // logger pattern
      if (typeof window !== 'undefined' && (window as { __DEV__?: boolean }).__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[studio-export] failed', e);
      }
    }
  };

  // [C.3 — 2026-05-08] 회차 분할 — Market track 결과를 5,500자 단위 회차로 자동 분할.
  const handleSplitChapters = async () => {
    if (!source.trim()) return;
    try {
      const splitMod = await import('@/lib/translation/chapter-splitter');
      const splits = splitMod.splitIntoChapters(source);
      const summary = splitMod.summarizeSplit(splits);
      // 결과 안내 — alert (간단). production console.log 제거 — 디버그는 logger.debug 또는 옵션화.
      const msg = lang === 'ko'
        ? `자동 분할 결과: ${summary.total}회차 / 평균 ${summary.avgCharCount.toLocaleString()}자 / 자연 break ${Math.round(summary.naturalBreakRate * 100)}%\n\n첫 회차 ${splits[0]?.charCount ?? 0}자.\n\n다음 사이클: chapters[] 자동 import.`
        : `Auto-split: ${summary.total} chapters, avg ${summary.avgCharCount.toLocaleString()} chars, ${Math.round(summary.naturalBreakRate * 100)}% natural breaks.`;
      window.alert(msg);
    } catch (e) {
      // logger.warn 패턴 차용 (실제 logger import 가 무거우므로 간단 처리)
      if (typeof window !== 'undefined' && (window as { __DEV__?: boolean }).__DEV__) {
        // eslint-disable-next-line no-console
        console.warn('[chapter-splitter] failed', e);
      }
    }
  };

  // [P0-2 → 오평가 수리 — 2026-05-09] Studio episode → Translation chapter 자동 import.
  // 이전 (오평가): localStorage 키 `studio_${projectId}_sessions` 사용 — Studio가 실제로 안 씀 (죽은 코드).
  // 수정: `noa_projects_v2` (project-migration.ts STORAGE_KEY_PROJECTS) — 정확한 키.
  // Project schema: { id, sessions: ChatSession[] }. ChatSession.config.manuscripts 에서 episodes 추출.
  const handleStudioImport = async () => {
    try {
      const bridgeMod = await import('@/lib/translation/studio-bridge');
      const projectId = typeof window !== 'undefined' ? window.localStorage.getItem('noa_studio_currentProjectId') : null;
      if (!projectId) {
        window.alert(lang === 'ko' ? 'Loreguard Studio에서 활성 프로젝트가 없습니다.' : 'No active Loreguard Studio project.');
        return;
      }

      // [정확한 키] noa_projects_v2 — Studio 의 모든 projects 통합 저장.
      const projectsRaw = window.localStorage.getItem('noa_projects_v2');
      const episodes: Array<{ title: string; content: string; episodeNumber?: number }> = [];
      // [D.2 — 2026-05-09] syncStoryBible 통합 — Studio worldbook + characters + glossary 자동 추출.
      let bibleInput: import('@/lib/translation/studio-bridge').StoryBibleSyncInput = {};
      if (projectsRaw) {
        try {
          const projects = JSON.parse(projectsRaw) as Array<{
            id?: string;
            name?: string;
            sessions?: Array<{
              config?: {
                manuscripts?: Array<{ episode?: number; title?: string; content?: string }>;
                world?: { entries?: Array<{ name?: string; description?: string }> };
                characters?: Array<{ name?: string; description?: string; aliases?: string[] }>;
                glossary?: Record<string, string>;
              };
            }>;
          }>;
          const targetProject = projects.find((p) => p.id === projectId);
          if (targetProject?.sessions) {
            for (const s of targetProject.sessions) {
              const list = s.config?.manuscripts ?? [];
              for (const m of list) {
                if (typeof m.content === 'string' && m.content.trim().length > 0) {
                  episodes.push({
                    title: m.title || `Episode ${m.episode ?? episodes.length + 1}`,
                    content: m.content,
                    episodeNumber: m.episode,
                  });
                }
              }
              // Story Bible 추출 — 첫 번째 session 기준 (Studio가 sessions[0] 을 메인 사용).
              if (s.config && Object.keys(bibleInput).length === 0) {
                bibleInput = {
                  worldEntries: (s.config.world?.entries ?? [])
                    .filter((e): e is { name: string; description?: string } => typeof e.name === 'string' && e.name.length > 0),
                  characters: (s.config.characters ?? [])
                    .filter((c): c is { name: string; description?: string; aliases?: string[] } => typeof c.name === 'string' && c.name.length > 0),
                  glossary: Object.entries(s.config.glossary ?? {}).map(([source, target]) => ({ source, target: String(target) })),
                };
              }
            }
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('[studio-import] projects parse failed', e);
        }
      }

      if (episodes.length === 0) {
        window.alert(
          lang === 'ko'
            ? `Studio 프로젝트 "${projectId}" 에서 episode (manuscripts) 를 찾지 못했습니다.\n\n원고를 먼저 작성하거나, 활성 프로젝트를 변경하세요.`
            : `No episodes (manuscripts) in Studio project "${projectId}".\n\nWrite manuscripts first or switch active project.`,
        );
        return;
      }

      const importedChapters = bridgeMod.studioEpisodesToChapters(episodes);
      const append = chapters.length > 0 && window.confirm(
        lang === 'ko'
          ? `현재 ${chapters.length} chapter 가 있습니다. ${importedChapters.length} 새 episode 를 추가할까요?\n\n취소: 기존을 대체합니다.`
          : `Currently ${chapters.length} chapters. Append ${importedChapters.length} new episodes?\n\nCancel: replace existing.`,
      );
      setChapters(append ? [...chapters, ...importedChapters].slice(0, 30) : importedChapters.slice(0, 30));

      // [D.2 — 2026-05-09] Story Bible 자동 sync — worldContext + characterProfiles 채움.
      // 이전 (오평가): syncStoryBible export 만 있고 호출 0건.
      // 수리: import 시 자동 동기화 — 번역가가 수동 복사 X.
      let bibleStatus = '';
      if (Object.keys(bibleInput).length > 0) {
        const bible = bridgeMod.syncStoryBible(bibleInput);
        if (bible.worldContext) setWorldContext(bible.worldContext);
        if (bible.characterProfiles) setCharacterProfiles(bible.characterProfiles);
        const items: string[] = [];
        if (bible.worldContext) items.push(lang === 'ko' ? '세계관' : 'world');
        if (bible.characterProfiles) items.push(lang === 'ko' ? '캐릭터' : 'characters');
        if (bible.glossaryText) items.push(lang === 'ko' ? '용어집' : 'glossary');
        bibleStatus = items.length > 0
          ? lang === 'ko'
            ? `\n\nStory Bible 동기화: ${items.join('·')}`
            : `\n\nStory Bible synced: ${items.join('·')}`
          : '';
      }

      window.alert(
        lang === 'ko'
          ? `Studio 에서 ${importedChapters.length} episode import 완료.${bibleStatus}`
          : `Imported ${importedChapters.length} episodes from Studio.${bibleStatus}`,
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[studio-bridge] failed', e);
      window.alert(lang === 'ko' ? 'Studio import 실패' : 'Studio import failed');
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {loading ? (
        <div className="flex items-center justify-between rounded-lg border border-accent-indigo/20 bg-accent-indigo/10 p-3">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 animate-ping rounded-full bg-accent-indigo" />
            <span className="font-mono text-xs uppercase tracking-wider text-accent-indigo">
              {statusMsg || (lang === 'ko' ? '처리 중…' : 'Working…')}
            </span>
          </div>
          <span className="text-xs text-text-tertiary">{stageLabel}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-[#111113] p-3 font-mono text-xs uppercase tracking-wider text-text-tertiary">
          <ShieldCheck className="h-3.5 w-3.5 text-accent-green" />
          {lang === 'ko' ? '대기' : 'Ready'}
        </div>
      )}

      <div className="rounded-lg border border-white/8 bg-[#1a1816]/90 p-3 space-y-2">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
          <Save className="h-3 w-3 text-emerald-400/80" />
          {lang === 'ko' ? '저장' : 'Save'}
        </div>
        <p className="text-[11px] text-text-secondary leading-snug break-words">{autoSaveLabel}</p>
        <div className="flex items-start gap-2 text-[10px] text-text-tertiary">
          <Cloud className="h-3 w-3 shrink-0 mt-0.5 text-sky-400/70" />
          <span className="leading-snug">
            {cloudSyncEnabled
              ? isAuthLoaded && authUser
                ? lang === 'ko'
                  ? `클라우드: ${cloudSyncStatus === 'saving' ? '저장 중' : cloudSyncStatus === 'ok' ? '동기화됨' : cloudSyncStatus === 'error' ? '오류' : '대기'}${cloudSyncDetail ? ` · ${cloudSyncDetail}` : ''}`
                  : `Cloud: ${cloudSyncStatus}${cloudSyncDetail ? ` · ${cloudSyncDetail}` : ''}`
                : lang === 'ko'
                  ? '클라우드: 로그인하면 자동 업로드됩니다.'
                  : 'Cloud: sign in to enable upload.'
              : lang === 'ko'
                ? '클라우드: Supabase 미설정 또는 미로그인'
                : 'Cloud: Supabase or sign-in not active'}
          </span>
        </div>
        <div className="pt-1">
          <div className="mb-1.5 text-[9px] font-mono font-semibold uppercase tracking-wider text-accent-amber/80">
            {lang === 'ko' ? '보내기 · 대표 5형식' : 'Export · 5 formats'}
          </div>
          <div className="grid grid-cols-5 gap-1">
            {exportFive.map((fmt) => (
              <button
                key={fmt}
                type="button"
                disabled={!hasChapters}
                onClick={() => downloadAllResults(fmt)}
                className="rounded-md border border-white/10 bg-black/50 py-1.5 text-[8px] font-black uppercase tracking-wide text-text-secondary hover:border-accent-amber/35 hover:bg-accent-amber/10 hover:text-accent-amber disabled:cursor-not-allowed disabled:opacity-35"
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 border-t border-white/5 pt-2">
          <button
            type="button"
            onClick={() => void exportData()}
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-white/10 bg-black/40 py-1.5 text-[9px] text-text-tertiary hover:bg-white/10"
          >
            <Download className="h-3 w-3" />
            {lang === 'ko' ? '전체 JSON' : 'Full JSON'}
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e: ChangeEvent<HTMLInputElement>) => importData(e)}
          />
          <button
            type="button"
            onClick={() => importRef.current?.click()}
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-white/10 bg-black/40 py-1.5 text-[9px] text-text-tertiary hover:bg-white/10"
          >
            <Upload className="h-3 w-3" />
            {lang === 'ko' ? 'JSON 불러오기' : 'Import JSON'}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setActiveLeftPanel('backup')}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-accent-amber/25 bg-accent-amber/10 py-2 text-[10px] font-medium text-accent-amber hover:bg-accent-amber/20"
        >
          <HardDrive className="h-3.5 w-3.5" />
          {lang === 'ko' ? '저장·백업 (전체 도구)' : 'Save & backup (all tools)'}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <label className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
          {lang === 'ko' ? '엔진 선택' : 'Primary engine'}
        </label>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="w-full cursor-pointer rounded-lg border border-white/10 bg-[#111113] p-2 text-sm text-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 transition-colors hover:bg-[#151518] focus:border-accent-green/50"
        >
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="my-2 h-px w-full bg-white/5" />

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => void translate()}
          disabled={loading}
          className="group relative flex w-full cursor-pointer items-center justify-between overflow-hidden rounded-lg border border-white/10 bg-linear-to-r from-[#1A1A1D] to-[#111113] py-3 pl-4 pr-4 transition-[transform,background-color,border-color,color] hover:border-accent-green/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="absolute inset-0 bg-accent-green/5 opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="rounded-md bg-accent-green/10 p-1.5">
              <Zap className="h-4 w-4 text-accent-green" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[13px] font-semibold text-text-primary">
                {lang === 'ko' ? '빠른 번역' : 'Fast draft'}
              </span>
              <span className="text-[10px] text-text-tertiary">
                {lang === 'ko' ? '단일 패스 번역' : 'Single-pass translation'}
              </span>
            </div>
          </div>
          <ChevronRight className="relative z-10 h-4 w-4 text-text-tertiary transition-transform group-hover:translate-x-1 group-hover:text-accent-green" />
        </button>

        <button
          type="button"
          onClick={() => void deepTranslate()}
          disabled={loading}
          className="group relative flex w-full cursor-pointer items-center justify-between overflow-hidden rounded-lg border border-accent-indigo/20 bg-linear-to-r from-accent-indigo/10 to-transparent py-3 pl-4 pr-4 shadow-[0_0_15px_rgba(47,155,131,0.05)] transition-[transform,background-color,border-color,box-shadow,color] hover:border-accent-indigo/60 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="absolute inset-0 bg-accent-indigo/10 opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="relative rounded-md bg-accent-indigo/20 p-1.5 shadow-[0_0_10px_rgba(99,102,241,0.3)]">
              <Brain className="h-4 w-4 text-accent-indigo" strokeWidth={2.5} />
              <Sparkles className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse text-white" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[13px] font-semibold text-accent-indigo">
                {lang === 'ko' ? '딥 파이프라인' : 'Deep pipeline'}
              </span>
              <span className="text-[10px] text-accent-indigo/60">5-stage</span>
            </div>
          </div>
          <ChevronRight className="relative z-10 h-4 w-4 text-accent-indigo/50 transition-transform group-hover:translate-x-1 group-hover:text-accent-indigo" />
        </button>

        {/* [A.4 — 2026-05-08] Korean web novel 장르 (Market track 적응) */}
        <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
          <KoreanGenrePicker value={genre} onChange={handleGenreChange} language={lang === 'ko' ? 'ko' : 'en'} />
          <p className="text-[9px] text-text-tertiary mt-1 leading-tight">
            {lang === 'ko'
              ? 'Market track 만 적용 (헌터물·회귀물·로판 등 한국 웹소설 매트릭스)'
              : 'Applied to Market track only (Korean web novel genre matrix)'}
          </p>
        </div>

        {/* [C.2 + C.3 + D.1 — 2026-05-09] Studio 양방향 + 회차 분할 */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void handleStudioImport()}
            disabled={loading}
            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] font-bold bg-accent-purple/10 border border-accent-purple/30 text-accent-purple hover:bg-accent-purple/15 transition-colors disabled:opacity-40"
            title={lang === 'ko' ? 'Loreguard Studio 의 활성 프로젝트 episode + Story Bible 가져오기' : 'Import episodes + Story Bible from active Loreguard Studio project'}
          >
            ⇇ {lang === 'ko' ? 'Studio 가져오기' : 'Import Studio'}
          </button>
          <button
            type="button"
            onClick={() => void handleSplitChapters()}
            disabled={loading || !source.trim()}
            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] font-bold bg-accent-amber/10 border border-accent-amber/30 text-accent-amber hover:bg-accent-amber/15 transition-colors disabled:opacity-40"
            title={lang === 'ko' ? '한국 웹소설 5,500자 단위 자동 회차 분할' : 'Auto-split into 5,500-char Korean web novel chapters'}
          >
            ✂ {lang === 'ko' ? '회차 분할' : 'Auto-split'}
          </button>
        </div>
        {/* [D.1 — 2026-05-09] Studio 로 export — Faithful / Market 양 track */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void handleStudioExport('market')}
            disabled={loading || chapters.length === 0}
            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] font-bold bg-accent-purple/10 border border-accent-purple/30 text-accent-purple hover:bg-accent-purple/15 transition-colors disabled:opacity-40"
            title={lang === 'ko' ? 'Market track 결과를 Studio JSON 으로 export' : 'Export Market track as Studio JSON'}
          >
            ⇉ {lang === 'ko' ? 'Studio로 (M)' : 'Export (Market)'}
          </button>
          <button
            type="button"
            onClick={() => void handleStudioExport('faithful')}
            disabled={loading || chapters.length === 0}
            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[10px] font-bold bg-accent-green/10 border border-accent-green/30 text-accent-green hover:bg-accent-green/15 transition-colors disabled:opacity-40"
            title={lang === 'ko' ? 'Faithful track 결과를 Studio JSON 으로 export' : 'Export Faithful track as Studio JSON'}
          >
            ⇉ {lang === 'ko' ? 'Studio로 (F)' : 'Export (Faithful)'}
          </button>
        </div>

        {/* [2026-05-08 시장 분석 4차 본질] 듀얼 번역 — Source-faithful + Market-ready 동시 출력. */}
        <button
          type="button"
          onClick={() => {
            // [B.3 — 2026-05-08] 듀얼 버튼 클릭 시 outputMode 자동 'dual' 동기화.
            // 이미 dual 이면 그대로. 다른 모드 (faithful/market/default) 시 dual 전환 후 호출.
            if (outputMode !== 'dual') setOutputMode('dual');
            void runDualTranslate();
          }}
          disabled={loading || !source.trim()}
          className={`group relative flex w-full cursor-pointer items-center justify-between overflow-hidden rounded-lg border py-3 pl-4 pr-4 shadow-[0_0_15px_rgba(47,155,131,0.08)] transition-[transform,background-color,border-color,box-shadow,color] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
            outputMode === 'dual'
              ? 'border-accent-green/60 bg-linear-to-r from-accent-green/15 to-accent-green/5 ring-1 ring-accent-green/30'
              : 'border-accent-green/20 bg-linear-to-r from-accent-green/10 to-transparent hover:border-accent-green/50'
          }`}
          title={
            lang === 'ko'
              ? '듀얼 출력 — 원문 보존 (Faithful) + 현지화 (Market) 두 결과 동시 생성. Stage 1~3 공유, 4~5 병렬 (비용 ~1.4x).'
              : 'Dual output — Source-faithful + Market-ready in parallel (Stage 4~5 split, ~1.4x cost).'
          }
        >
          <div className="relative z-10 flex items-center gap-3">
            <div className="relative rounded-md bg-accent-green/20 p-1.5 shadow-[0_0_10px_rgba(106,170,144,0.3)]">
              <GitCompare className="h-4 w-4 text-accent-green" strokeWidth={2.5} />
              <Sparkles className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse text-accent-green" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[13px] font-bold text-accent-green">
                {lang === 'ko' ? '듀얼 번역 · F+M' : 'Dual · F+M'}
              </span>
              <span className="text-[10px] text-accent-green/70 font-mono">
                {lang === 'ko' ? '원문 보존 + 현지화' : 'Faithful + Market'}
              </span>
            </div>
          </div>
          <ChevronRight className="relative z-10 h-4 w-4 text-accent-green/50 transition-transform group-hover:translate-x-1 group-hover:text-accent-green" />
        </button>

        {/* B로 재번역 (A/B 비교용 대체 엔진) */}
        <button
          type="button"
          onClick={() => void runCompareB()}
          disabled={loading || !source.trim()}
          className="group relative flex w-full cursor-pointer items-center justify-between overflow-hidden rounded-lg border border-accent-purple/20 bg-linear-to-r from-accent-purple/10 to-transparent py-2.5 pl-4 pr-4 transition-[transform,background-color,border-color,color] hover:border-accent-purple/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          title={lang === 'ko' ? '다른 엔진(Claude↔OpenAI)으로 B안 재생성. 오른쪽 에디터 B 탭에서 비교 가능.' : 'Re-translate with alt engine (Claude↔OpenAI). View in right editor B tab.'}
        >
          <div className="relative z-10 flex items-center gap-3">
            <div className="rounded-md bg-accent-purple/15 p-1.5">
              <GitCompare className="h-4 w-4 text-accent-purple" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[12px] font-semibold text-accent-purple">
                {lang === 'ko' ? 'B안 재번역' : 'Generate B'}
              </span>
              <span className="text-[10px] text-accent-purple/60">
                {compareResultB
                  ? (lang === 'ko' ? `완료 · ${compareResultB.length.toLocaleString()}자` : `Done · ${compareResultB.length} chars`)
                  : (lang === 'ko' ? '대체 엔진 A/B 비교' : 'Alt engine A/B compare')}
              </span>
            </div>
          </div>
          <ChevronRight className="relative z-10 h-4 w-4 text-accent-purple/50 transition-transform group-hover:translate-x-1 group-hover:text-accent-purple" />
        </button>
      </div>

      <div className="my-2 h-px w-full bg-white/5" />

      <div className="mt-2 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setActiveLeftPanel('glossary')}
          className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-white/5 bg-[#111113] py-3 text-text-tertiary transition-colors hover:bg-white/5 hover:text-white"
        >
          <Globe className="h-4 w-4" />
          <span className="text-[10px] font-medium">{lang === 'ko' ? '용어집' : 'Glossary'}</span>
        </button>
        <button
          type="button"
          onClick={openApiKeyModal}
          className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-white/5 bg-[#111113] py-3 text-text-tertiary transition-colors hover:bg-white/5 hover:text-white"
        >
          <Key className="h-4 w-4" />
          <span className="text-[10px] font-medium">{lang === 'ko' ? 'API 키' : 'API keys'}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveLeftPanel('settings')}
          className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-white/5 bg-[#111113] py-3 text-text-tertiary transition-colors hover:bg-white/5 hover:text-white"
        >
          <Settings2 className="h-4 w-4" />
          <span className="text-[10px] font-medium">{lang === 'ko' ? '설정' : 'Settings'}</span>
        </button>
      </div>
    </div>
  );
}
