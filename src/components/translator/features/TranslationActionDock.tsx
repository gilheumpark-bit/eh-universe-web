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
  Scissors,
} from 'lucide-react';
// [A.4 — 2026-05-08] Market track 장르 선택 통합.
import { KoreanGenrePicker } from '../panels/KoreanGenrePicker';
import { useState } from 'react';
import type { KoreanGenreId } from '@/lib/translation/korean-genre-matrix';
import { loadProjects } from '@/lib/project-migration';
import { logger } from '@/lib/logger';

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
      window.alert(lang === 'ko' ? '보낼 회차가 없습니다.' : 'No chapters to export.');
      return;
    }
    try {
      const bridgeMod = await import('@/lib/translation/studio-bridge');
      const episodes = bridgeMod.chaptersToStudioEpisodes(chapters, track);
      if (episodes.length === 0) {
        window.alert(
          lang === 'ko'
            ? `${track === 'faithful' ? '원문 보존안' : '현지화안'}에 보낼 수 있는 결과가 없습니다.`
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
          ? `${episodes.length}개 회차를 창작 스튜디오 불러오기용 백업 파일로 내보냈습니다.\n\n창작 스튜디오에서 불러올 수 있습니다.`
          : `Exported ${episodes.length} episodes as a creative-studio backup file.\n\nImport it in the creative studio.`,
      );
    } catch (e) {
      logger.warn('translator-action-dock', 'studio export failed', e);
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
        ? `자동 분할 결과: ${summary.total}회차 / 평균 ${summary.avgCharCount.toLocaleString()}자 / 자연 분리 ${Math.round(summary.naturalBreakRate * 100)}%\n\n첫 회차 ${splits[0]?.charCount ?? 0}자.`
        : `Auto-split: ${summary.total} chapters, avg ${summary.avgCharCount.toLocaleString()} chars, ${Math.round(summary.naturalBreakRate * 100)}% natural breaks.`;
      window.alert(msg);
    } catch (e) {
      logger.warn('translator-action-dock', 'chapter splitter failed', e);
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
        window.alert(lang === 'ko' ? '창작 스튜디오에서 활성 작품을 먼저 선택하세요.' : 'No active creative-studio project.');
        return;
      }

      const episodes: Array<{ title: string; content: string; episodeNumber?: number }> = [];
      // [D.2 — 2026-05-09] syncStoryBible 통합 — Studio worldbook + characters + glossary 자동 추출.
      let bibleInput: import('@/lib/translation/studio-bridge').StoryBibleSyncInput = {};
      try {
        const projects = loadProjects();
        const targetProject = projects.find((project) => project.id === projectId);
        if (targetProject?.sessions) {
          for (const session of targetProject.sessions) {
            const sessionConfig = session.config as {
              manuscripts?: Array<{ episode?: number; title?: string; content?: string }>;
              world?: { entries?: Array<{ name?: string; description?: string }> };
              characters?: Array<{ name?: string; description?: string; aliases?: string[] }>;
              glossary?: Record<string, string>;
            } | undefined;
            const list = sessionConfig?.manuscripts ?? [];
            for (const manuscript of list) {
              if (typeof manuscript.content === 'string' && manuscript.content.trim().length > 0) {
                episodes.push({
                  title: manuscript.title || `Episode ${manuscript.episode ?? episodes.length + 1}`,
                  content: manuscript.content,
                  episodeNumber: manuscript.episode,
                });
              }
            }
            // Story Bible 추출 — 첫 번째 session 기준 (Studio가 sessions[0] 을 메인 사용).
            if (sessionConfig && Object.keys(bibleInput).length === 0) {
              bibleInput = {
                worldEntries: (sessionConfig.world?.entries ?? [])
                  .filter((entry): entry is { name: string; description?: string } => typeof entry.name === 'string' && entry.name.length > 0),
                characters: (sessionConfig.characters ?? [])
                  .filter((character): character is { name: string; description?: string; aliases?: string[] } => typeof character.name === 'string' && character.name.length > 0),
                glossary: Object.entries(sessionConfig.glossary ?? {}).map(([source, target]) => ({ source, target: String(target) })),
              };
            }
          }
        }
      } catch (e) {
        logger.warn('translator-action-dock', 'studio projects load failed', e);
      }

      if (episodes.length === 0) {
        window.alert(
          lang === 'ko'
            ? `창작 스튜디오의 현재 작품 "${projectId}"에서 회차 원고를 찾지 못했습니다.\n\n원고를 먼저 작성하거나, 활성 작품을 변경하세요.`
            : `No episode manuscripts found in creative-studio project "${projectId}".\n\nWrite manuscripts first or switch the active project.`,
        );
        return;
      }

      const importedChapters = bridgeMod.studioEpisodesToChapters(episodes);
      const append = chapters.length > 0 && window.confirm(
        lang === 'ko'
          ? `현재 ${chapters.length}개 회차가 있습니다. ${importedChapters.length}개 회차를 추가할까요?\n\n취소하면 기존 목록을 대체합니다.`
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
            ? `\n\n설정집 동기화: ${items.join('·')}`
            : `\n\nStory Bible synced: ${items.join('·')}`
          : '';
      }

      window.alert(
        lang === 'ko'
          ? `창작 스튜디오에서 ${importedChapters.length}개 회차를 불러왔습니다.${bibleStatus}`
          : `Imported ${importedChapters.length} episodes from the creative studio.${bibleStatus}`,
      );
    } catch (e) {
      logger.warn('translator-action-dock', 'studio bridge failed', e);
      window.alert(lang === 'ko' ? '작품 불러오기 실패' : 'Studio import failed');
    }
  };

  return (
    <div className="translation-action-dock flex flex-col gap-4 p-4 text-text-primary">
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
        <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-secondary p-3 font-mono text-xs font-semibold uppercase tracking-wider text-text-primary">
          <ShieldCheck className="h-3.5 w-3.5 text-accent-green" />
          {lang === 'ko' ? '대기' : 'Ready'}
        </div>
      )}

      <div className="rounded-xl border border-border bg-bg-primary/70 p-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
              {lang === 'ko' ? '현재 방향' : 'Direction'}
            </div>
            <div className="mt-1 truncate text-[13px] font-bold text-text-primary">
              {from.toUpperCase()} → {to.toUpperCase()}
            </div>
          </div>
          <div className="min-w-0 text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
              {lang === 'ko' ? '엔진' : 'Engine'}
            </div>
            <div className="mt-1 truncate text-[13px] font-bold text-text-primary">
              {provider}
            </div>
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-text-secondary">
          {lang === 'ko'
            ? '원문을 붙여 넣고 실행 방식을 고르세요. 결과는 작가 확인 후 저장·보내기 흐름으로 이어집니다.'
            : 'Paste source text, choose a run mode, then review before save/export.'}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-bg-primary/70 p-3 space-y-2">
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
                ? '클라우드: 연결 전'
                : 'Cloud: storage or sign-in not active'}
          </span>
        </div>
        <div className="pt-1">
        <div className="mb-1.5 text-[10px] font-semibold text-accent-amber/80">
          {lang === 'ko' ? '보내기 · 대표 5형식' : 'Export · 5 formats'}
        </div>
        <div className="grid grid-cols-5 gap-1">
            {exportFive.map((fmt) => (
              <button
                key={fmt}
                type="button"
                disabled={!hasChapters}
                onClick={() => downloadAllResults(fmt)}
                className="min-h-[36px] rounded-md border border-border bg-bg-secondary py-1.5 text-[10px] font-bold uppercase tracking-wide text-text-secondary hover:border-accent-amber/35 hover:bg-accent-amber/10 hover:text-accent-amber disabled:cursor-not-allowed disabled:border-border disabled:bg-bg-tertiary disabled:text-text-tertiary disabled:opacity-100"
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 border-t border-border pt-2">
          <button
            type="button"
            onClick={() => void exportData()}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-md border border-border bg-bg-secondary px-2 py-1.5 text-[10px] font-semibold text-text-secondary hover:bg-bg-tertiary"
          >
            <Download className="h-3 w-3" />
            {lang === 'ko' ? '전체 백업' : 'Full backup'}
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
            className="flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-md border border-border bg-bg-secondary px-2 py-1.5 text-[10px] font-semibold text-text-secondary hover:bg-bg-tertiary"
          >
            <Upload className="h-3 w-3" />
            {lang === 'ko' ? '백업 불러오기' : 'Import backup'}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setActiveLeftPanel('backup')}
          className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-md border border-accent-amber/25 bg-accent-amber/10 px-2 py-2 text-[11px] font-semibold text-accent-amber hover:bg-accent-amber/20"
        >
          <HardDrive className="h-3.5 w-3.5" />
          {lang === 'ko' ? '저장·백업 전체 보기' : 'Save & backup overview'}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <label className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-text-primary">
          {lang === 'ko' ? '엔진 선택' : 'Primary engine'}
        </label>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          aria-label={lang === 'ko' ? '엔진 선택' : 'Primary engine'}
          className="w-full cursor-pointer rounded-lg border border-border bg-bg-secondary p-2 text-sm font-semibold text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 transition-colors hover:bg-bg-tertiary focus:border-accent-green/50"
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
          className="group relative flex min-h-[68px] w-full cursor-pointer items-center justify-between overflow-hidden rounded-lg border border-border bg-bg-primary py-3 pl-4 pr-4 transition-[transform,background-color,border-color,color] hover:border-accent-green/50 hover:bg-bg-secondary active:scale-[0.98] disabled:cursor-not-allowed disabled:border-border disabled:bg-bg-tertiary disabled:text-text-tertiary disabled:opacity-100"
        >
          <div className="absolute inset-0 bg-accent-green/5 opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="rounded-md bg-accent-green/10 p-1.5">
              <Zap className="h-4 w-4 text-accent-green" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[13px] font-semibold text-text-primary">
                {lang === 'ko' ? '초안 만들기' : 'Fast draft'}
              </span>
              <span className="text-[10px] text-text-tertiary">
                {lang === 'ko' ? '원문을 한 번에 번역' : 'Single-pass translation'}
              </span>
            </div>
          </div>
          <ChevronRight className="relative z-10 h-4 w-4 text-text-tertiary transition-transform group-hover:translate-x-1 group-hover:text-accent-green" />
        </button>

        <button
          type="button"
          onClick={() => void deepTranslate()}
          disabled={loading}
          className="group relative flex min-h-[68px] w-full cursor-pointer items-center justify-between overflow-hidden rounded-lg border border-accent-indigo/20 bg-accent-indigo/10 py-3 pl-4 pr-4 transition-[transform,background-color,border-color,box-shadow,color] hover:border-accent-indigo/60 hover:bg-accent-indigo/15 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-border disabled:bg-bg-tertiary disabled:text-text-tertiary disabled:opacity-100"
        >
          <div className="absolute inset-0 bg-accent-indigo/10 opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="relative rounded-md bg-accent-indigo/20 p-1.5 shadow-[0_0_10px_rgba(99,102,241,0.3)]">
              <Brain className="h-4 w-4 text-accent-indigo" strokeWidth={2.5} />
              <Sparkles className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse text-white" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[13px] font-semibold text-accent-indigo">
                {lang === 'ko' ? '정밀 검토' : 'Deep review'}
              </span>
              <span className="text-[10px] text-accent-indigo/60">
                {lang === 'ko' ? '다섯 단계 문맥 점검' : 'Five-step context check'}
              </span>
            </div>
          </div>
          <ChevronRight className="relative z-10 h-4 w-4 text-accent-indigo/50 transition-transform group-hover:translate-x-1 group-hover:text-accent-indigo" />
        </button>

        {/* [A.4 — 2026-05-08] Korean web novel 장르 (Market track 적응) */}
        <div className="rounded-lg border border-border bg-bg-primary/60 px-3 py-2">
          <KoreanGenrePicker value={genre} onChange={handleGenreChange} language={lang === 'ko' ? 'ko' : 'en'} />
          <p className="text-[11px] text-text-tertiary mt-1 leading-relaxed">
            {lang === 'ko'
              ? '현지화안의 호칭·대사 리듬·장르 관습에 적용'
              : 'Applied to the localized draft: address terms, dialogue rhythm, and genre fit'}
          </p>
        </div>

        {/* [C.2 + C.3 + D.1 — 2026-05-09] Studio 양방향 + 회차 분할 */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void handleStudioImport()}
            disabled={loading}
            className="flex min-h-[44px] items-center justify-center gap-1.5 rounded border border-accent-purple/30 bg-accent-purple/10 px-2.5 py-1.5 text-[11px] font-bold text-accent-purple transition-colors hover:bg-accent-purple/15 disabled:cursor-not-allowed disabled:border-border disabled:bg-bg-tertiary disabled:text-text-tertiary disabled:opacity-100"
            title={lang === 'ko' ? '창작 스튜디오의 현재 작품 회차와 설정집 불러오기' : 'Import episodes and story bible from the active creative-studio project'}
          >
            <Download className="h-3 w-3" aria-hidden />
            {lang === 'ko' ? '작품 불러오기' : 'Import work'}
          </button>
          <button
            type="button"
            onClick={() => void handleSplitChapters()}
            disabled={loading || !source.trim()}
            className="flex min-h-[44px] items-center justify-center gap-1.5 rounded border border-accent-amber/30 bg-accent-amber/10 px-2.5 py-1.5 text-[11px] font-bold text-accent-amber transition-colors hover:bg-accent-amber/15 disabled:cursor-not-allowed disabled:border-border disabled:bg-bg-tertiary disabled:text-text-tertiary disabled:opacity-100"
            title={lang === 'ko' ? '한국 웹소설 5,500자 단위 자동 회차 분할' : 'Auto-split into 5,500-char Korean web novel chapters'}
          >
            <Scissors className="h-3 w-3" aria-hidden />
            {lang === 'ko' ? '회차 나누기' : 'Split chapters'}
          </button>
        </div>
        {/* [D.1 — 2026-05-09] Studio 로 export — Faithful / Market 양 track */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void handleStudioExport('market')}
            disabled={loading || chapters.length === 0}
            className="flex min-h-[44px] items-center justify-center gap-1.5 rounded border border-accent-purple/30 bg-accent-purple/10 px-2.5 py-1.5 text-[11px] font-bold text-accent-purple transition-colors hover:bg-accent-purple/15 disabled:cursor-not-allowed disabled:border-border disabled:bg-bg-tertiary disabled:text-text-tertiary disabled:opacity-100"
            title={lang === 'ko' ? '현지화안 결과를 창작 스튜디오 백업 파일로 내보내기' : 'Export localized track as a creative-studio backup file'}
          >
            <Upload className="h-3 w-3" aria-hidden />
            {lang === 'ko' ? '현지화안 저장' : 'Save localized'}
          </button>
          <button
            type="button"
            onClick={() => void handleStudioExport('faithful')}
            disabled={loading || chapters.length === 0}
            className="flex min-h-[44px] items-center justify-center gap-1.5 rounded border border-accent-green/30 bg-accent-green/10 px-2.5 py-1.5 text-[11px] font-bold text-accent-green transition-colors hover:bg-accent-green/15 disabled:cursor-not-allowed disabled:border-border disabled:bg-bg-tertiary disabled:text-text-tertiary disabled:opacity-100"
            title={lang === 'ko' ? '원문 보존안 결과를 창작 스튜디오 백업 파일로 내보내기' : 'Export source-faithful track as a creative-studio backup file'}
          >
            <Upload className="h-3 w-3" aria-hidden />
            {lang === 'ko' ? '보존안 저장' : 'Save preserved'}
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
          className={`group relative flex w-full cursor-pointer items-center justify-between overflow-hidden rounded-lg border py-3 pl-4 pr-4 shadow-[0_0_15px_rgba(47,155,131,0.08)] transition-[transform,background-color,border-color,box-shadow,color] active:scale-[0.98] disabled:cursor-not-allowed disabled:border-border disabled:bg-bg-tertiary disabled:text-text-tertiary disabled:opacity-100 ${
            outputMode === 'dual'
              ? 'border-accent-green/60 bg-linear-to-r from-accent-green/15 to-accent-green/5 ring-1 ring-accent-green/30'
              : 'border-accent-green/20 bg-linear-to-r from-accent-green/10 to-transparent hover:border-accent-green/50'
          }`}
          title={
            lang === 'ko'
              ? '두 안 만들기 — 원문 보존안과 현지화안을 함께 생성합니다. 앞단 문맥 점검을 공유하고 후반 검토를 나눠 진행합니다.'
              : 'Create two drafts — preserved draft and localized draft side by side.'
          }
        >
          <div className="relative z-10 flex items-center gap-3">
            <div className="relative rounded-md bg-accent-green/20 p-1.5 shadow-[0_0_10px_rgba(106,170,144,0.3)]">
              <GitCompare className="h-4 w-4 text-accent-green" strokeWidth={2.5} />
              <Sparkles className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse text-accent-green" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[13px] font-bold text-accent-green">
                {lang === 'ko' ? '두 안 만들기' : 'Dual draft'}
              </span>
              <span className="text-[11px] text-accent-green/70">
                {lang === 'ko' ? '원문 보존안 + 현지화안' : 'Preserved + localized'}
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
          className="group relative flex min-h-[64px] w-full cursor-pointer items-center justify-between overflow-hidden rounded-lg border border-accent-purple/20 bg-accent-purple/10 py-2.5 pl-4 pr-4 transition-[transform,background-color,border-color,color] hover:border-accent-purple/50 hover:bg-accent-purple/15 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-border disabled:bg-bg-tertiary disabled:text-text-tertiary disabled:opacity-100"
          title={lang === 'ko' ? '다른 번역 방식으로 B안을 다시 만듭니다. 오른쪽 에디터 B 탭에서 비교할 수 있습니다.' : 'Re-translate with another engine. View it in the right editor B tab.'}
        >
          <div className="relative z-10 flex items-center gap-3">
            <div className="rounded-md bg-accent-purple/15 p-1.5">
              <GitCompare className="h-4 w-4 text-accent-purple" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[12px] font-semibold text-accent-purple">
                {lang === 'ko' ? '비교안 만들기' : 'Generate comparison'}
              </span>
              <span className="text-[11px] text-accent-purple/60">
                {compareResultB
                  ? (lang === 'ko' ? `완료 · ${compareResultB.length.toLocaleString()}자` : `Done · ${compareResultB.length} chars`)
                  : (lang === 'ko' ? '다른 엔진으로 견본 비교' : 'Compare with another engine')}
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
          className="flex min-h-[58px] flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-bg-primary py-3 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
        >
          <Globe className="h-4 w-4" />
          <span className="text-[11px] font-medium">{lang === 'ko' ? '용어집' : 'Glossary'}</span>
        </button>
        <button
          type="button"
          onClick={openApiKeyModal}
          className="flex min-h-[58px] flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-bg-primary py-3 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
        >
          <Key className="h-4 w-4" />
          <span className="text-[11px] font-medium">{lang === 'ko' ? '연결 키' : 'Connection keys'}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveLeftPanel('settings')}
          className="flex min-h-[58px] flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-bg-primary py-3 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
        >
          <Settings2 className="h-4 w-4" />
          <span className="text-[11px] font-medium">{lang === 'ko' ? '설정' : 'Settings'}</span>
        </button>
      </div>
    </div>
  );
}
