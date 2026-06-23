"use client";

// ============================================================
// Translation Panel — 번역 엔진 UI (Advanced)
// ============================================================

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Languages, Settings2, ChevronRight } from "lucide-react";
import { logger } from "@/lib/logger";
import type { AppLanguage, StoryConfig, EpisodeManuscript } from "@/lib/studio-types";
import type { TranslationMode, TranslationTarget } from "@/engine/translation";
import type { TranslationSegment } from "@/lib/translation/editable-segment";
import type { GlossaryCandidate } from "@/lib/translation/glossary-extractor";
import { BAND_META } from "@/engine/translation";
import { useTranslation } from "@/hooks/useTranslation";
import { getTaintTracker } from "@/lib/noa/taint-tracker";
import { useStudio, type StudioContextValue } from "@/app/studio/StudioContext";
import { buildProjectTranslationContext } from "@/lib/translation/project-bridge";
import { searchWithRAGFallback, type TMSuggestion } from "@/lib/translation/translation-memory";
import { GeneralTranslationSection } from "@/components/studio/TranslationPanel.general";
import { TranslationStatusPanels } from "@/components/studio/TranslationPanel.status";
import {
  TranslationAdvancedSettings,
  TranslationExecutionControls,
  TranslationGlossaryEditor,
  TranslationNovelModeConfig,
  TranslationOperationsTerminal,
  TranslationQueueEmptyState,
  TranslationResultsGrid,
  type LogEntry,
} from "@/components/studio/TranslationPanel.sections";

/**
 * StudioContext에 안전 접근 — Provider 밖에서는 null 반환.
 * useStudio()는 throws하므로 try-catch로 감싸 외부 라우트 호환성 확보.
 * 주의: hook 자체는 항상 호출되며, throw만 catch함 (Rules of Hooks 준수).
 */
function useStudioSafe(): StudioContextValue | null {
  try {
    return useStudio();
  } catch {
    return null;
  }
}

interface TranslationPanelProps {
  language: AppLanguage;
  config: StoryConfig;
  setConfig: (c: StoryConfig | ((prev: StoryConfig) => StoryConfig)) => void;
}

type TranslationScope = 'novel' | 'general';

export default function TranslationPanel({ language, config, setConfig }: TranslationPanelProps) {
  const isKO = language === "KO";

  // ── Project Bridge: StudioContext의 프로젝트 메타 + StoryConfig → 번역 컨텍스트 ──
  // useStudio는 StudioProvider 안에서만 호출 가능. 현재 ManuscriptTab→StudioShell 경로로 안전.
  // 외부 라우트에서 직접 렌더 시 fallback 필요 — try-catch로 보호.
  const studio = useStudioSafe();
  const projectContext = useMemo(() => {
    if (!config) return null;
    const projectId = studio?.currentProjectId
      || studio?.currentSessionId
      || (config.title ? `local-${config.title}` : 'local-default');
    const currentEpisodeNo = typeof config.episode === 'number' ? config.episode : undefined;
    return buildProjectTranslationContext(
      { id: projectId, title: config.title, config },
      { currentEpisodeNo, sourceLang: language }
    );
  }, [studio?.currentProjectId, studio?.currentSessionId, config, language]);
  const [scope, setScope] = useState<TranslationScope>('novel');
  const [generalDomain, setGeneralDomain] = useState<string>('general');
  const [generalText, setGeneralText] = useState('');
  const [generalResult, setGeneralResult] = useState('');
  const [generalTranslating, setGeneralTranslating] = useState(false);
  // Segment editor state
  const [segments, setSegments] = useState<TranslationSegment[]>([]);
  const [showSegmentView, setShowSegmentView] = useState(false);
  const [glossaryCandidates, setGlossaryCandidates] = useState<GlossaryCandidate[]>([]);
  const [_multiLangTargets, _setMultiLangTargets] = useState<string[]>(['EN']);
  const [tmCount, setTmCount] = useState(0);
  const [mode, setMode] = useState<TranslationMode>("fidelity");
  const [targetLang, setTargetLang] = useState<TranslationTarget>("EN");
  const [band, setBand] = useState<number>(BAND_META.default);
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Advanced Settings
  const [contractionLevel, setContractionLevel] = useState<'none'|'low'|'normal'|'high'>('normal');
  const [targetGenre, setTargetGenre] = useState<string>('');
  const [scoreThreshold, setScoreThreshold] = useState<number>(0.75);

  // ── TM + RAG 실시간 제안 (Phase 5) ──
  // 세그먼트 편집 중 원문에 대해 로컬 TM → RAG fallback 검색 → 최대 3건.
  const [tmSuggestions, setTmSuggestions] = useState<TMSuggestion[]>([]);
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const suggestionDebounceRef = useRef<number | null>(null);

  const handleSegmentFocus = useCallback((segmentText: string) => {
    setSuggestionQuery(segmentText ?? '');
  }, []);

  useEffect(() => {
    // [C] 짧은 쿼리 가드 (8자 미만은 무의미한 매칭 방지)
    if (!suggestionQuery || suggestionQuery.length < 8) {
      setTmSuggestions([]);
      return;
    }
    if (suggestionDebounceRef.current !== null) {
      window.clearTimeout(suggestionDebounceRef.current);
    }
    let cancelled = false;
    suggestionDebounceRef.current = window.setTimeout(async () => {
      try {
        const results = await searchWithRAGFallback(suggestionQuery, {
          topK: 3,
          projectId: projectContext?.projectId,
          targetLang,
        });
        if (!cancelled) setTmSuggestions(results);
      } catch {
        if (!cancelled) setTmSuggestions([]);
      }
    }, 300);

    return () => {
      cancelled = true;
      if (suggestionDebounceRef.current !== null) {
        window.clearTimeout(suggestionDebounceRef.current);
        suggestionDebounceRef.current = null;
      }
    };
  }, [suggestionQuery, projectContext?.projectId, targetLang]);

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const [batchMode, setBatchMode] = useState(false);
  const [glossary, setGlossary] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('eh-novel-glossary');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [glossaryTerm, setGlossaryTerm] = useState('');
  const [glossaryTranslation, setGlossaryTranslation] = useState('');

  const saveGlossary = useCallback((g: Record<string, string>) => {
    setGlossary(g);
    localStorage.setItem('eh-novel-glossary', JSON.stringify(g));
  }, []);

  const { translateEpisode, translateBatch: _translateBatch, progress, batchProgress: _batchProgress, isTranslating, abort, driftWarnings, voiceViolations, voiceRetryNeeded, voiceRetryHint, ragStatus, retryWithVoiceHint } = useTranslation({
    projectContext,
    onProgress: (p) => {
      if (p.status === 'scoring') {
         setLogs(prev => [...prev.slice(-49), { id: Date.now(), type: 'info', text: `Analyzing metrics for chunk ${p.currentChunk + 1}...` }]);
      } else if (p.status === 'recreating') {
         setLogs(prev => [...prev.slice(-49), { id: Date.now(), type: 'warn', text: `Quality Gate failed. Re-creating chunk ${p.currentChunk + 1} (Attempt ${p.recreateCount})...` }]);
      }
    },
    onChunkComplete: (chunk) => {
      setLogs(prev => [...prev.slice(-49), {
        id: Date.now(),
        type: chunk.passed ? 'success' : 'error',
        text: `Chunk ${chunk.index + 1} completed — Score: ${(chunk.score * 100).toFixed(1)}%, Attempts: ${chunk.attempt}`,
        detail: chunk.translatedText
      }]);
      // TM에 자동 저장 (소설 번역 청크)
      if (chunk.sourceText && chunk.translatedText) {
        import('@/lib/translation').then(({ addToTM }) => {
          addToTM(chunk.sourceText, chunk.translatedText, 'KO', targetLang, chunk.passed);
        }).catch(() => {});
      }
    },
    onError: (err) => {
      logger.error("Translation", err);
      setLogs(prev => [...prev.slice(-49), { id: Date.now(), type: 'error', text: `Error: ${err}` }]);
    },
    onSave: (entry) => {
      setConfig((prev) => ({
        ...prev,
        translatedManuscripts: [...(prev.translatedManuscripts ?? []), entry],
      }));
      setLogs(prev => [...prev, { id: Date.now(), type: 'success', text: `Episode ${entry.episode} finalization completed and saved to manuscript.` }]);
      // 완료 알림 (탭 비활성 시)
      import('@/lib/browser').then(({ notifyTranslationComplete }) => {
        notifyTranslationComplete(1, targetLang);
      }).catch(() => {});
    },
  });

  const manuscripts: EpisodeManuscript[] = useMemo(() =>
    (config.manuscripts ?? []).map((m, i) => ({
      ...m,
      episode: i + 1,
      title: m.title,
      content: m.content,
      charCount: m.charCount ?? m.content.length,
      lastUpdate: m.lastUpdate ?? 0,
    })),
    [config.manuscripts]
  );

  // ── 일반 번역 실행 (lazy import — 소설 번들 오염 방지) ──
  const handleGeneralTranslate = useCallback(async () => {
    if (!generalText.trim() || generalTranslating) return;
    setGeneralTranslating(true);
    setGeneralResult('');
    setLogs([{ id: Date.now(), type: 'info', text: `General translation: ${generalDomain} mode, ${targetLang}...` }]);
    // Wake Lock + 알림 권한 (한 번만) — import 실패 시 finally 가드
    let browser: typeof import('@/lib/browser') | null = null;
    try {
      browser = await import('@/lib/browser');
      browser.acquireWakeLock().catch(() => {});
      browser.requestNotificationPermission().catch(() => {});
    } catch {
      // browser 모듈 로드 실패 — Wake Lock 없이 진행
    }
    try {
      const { buildGeneralPrompt, applyPassthrough, restorePassthrough, GENERAL_DOMAIN_PRESETS } = await import('@/lib/translation');
      const preset = GENERAL_DOMAIN_PRESETS[generalDomain as keyof typeof GENERAL_DOMAIN_PRESETS] ?? GENERAL_DOMAIN_PRESETS.general;

      // 패스스루: 수식/코드/인용 보호
      const { filtered, map } = applyPassthrough(generalText, preset.passthroughPatterns);

      // 4단계 번역
      let draft = filtered;
      for (let stage = 1; stage <= 4; stage++) {
        setLogs(prev => [...prev, { id: Date.now(), type: 'info', text: `Stage ${stage}/4...` }]);
        const prompt = buildGeneralPrompt({
          text: draft,
          from: 'KO',
          to: targetLang,
          domain: generalDomain as keyof typeof GENERAL_DOMAIN_PRESETS,
          glossary: Object.keys(glossary).length > 0 ? glossary : undefined,
          stage,
          sourceText: filtered,
        });
        let result = '';
        await (await import('@/lib/ai-providers')).streamChat({
          systemInstruction: '',
          messages: [{ role: 'user', content: prompt }],
          temperature: stage === 1 ? 0.1 : 0.3,
          reasoningStage: 'translation',
          onChunk: (c: string) => { result += c; },
        });
        draft = result.trim() || draft;
      }

      // 패스스루 복원
      const final = restorePassthrough(draft, map);
      setGeneralResult(final);

      // 세그먼트 뷰 생성 (문장 정렬)
      const { createSegments, addBatchToTM, extractTermsRuleBased } = await import('@/lib/translation');
      const segs = createSegments(generalText, final);
      setSegments(segs);
      setShowSegmentView(true);

      // TM에 자동 저장
      const pairs = segs.filter((s: { source: string; target: string }) => s.source && s.target).map((s: { source: string; target: string }) => ({ source: s.source, target: s.target }));
      addBatchToTM(pairs, 'KO', targetLang);
      const { tmStats } = await import('@/lib/translation');
      setTmCount(tmStats().total);

      // 용어집 자동 추출 (규칙 기반, 빠름)
      const candidates = extractTermsRuleBased(generalText);
      setGlossaryCandidates(candidates);

      setLogs(prev => [...prev, { id: Date.now(), type: 'success', text: `Translation complete. ${segs.length} segments, ${pairs.length} TM entries saved, ${candidates.length} terms detected.` }]);
      // 완료 알림 + 뱃지 (browser 모듈 로드 시에만)
      if (browser) {
        browser.notifyBatchComplete(`General translation → ${targetLang}`);
        browser.incrementBadge();
        // AI 캐시에 결과 저장
        browser.cacheResponse('translate', generalDomain, [{ role: 'user', content: generalText.slice(0, 500) }], 0.1, final).catch(() => {});
      }
    } catch (err) {
      setLogs(prev => [...prev, { id: Date.now(), type: 'error', text: `Error: ${err}` }]);
    } finally {
      setGeneralTranslating(false);
      browser?.releaseWakeLock?.().catch(() => {});
    }
  }, [generalText, generalDomain, targetLang, glossary, generalTranslating]);

  const translationConfig = useMemo(() => ({
    mode, targetLang, band, contractionLevel,
    genre: targetGenre || undefined,
    scoreThreshold,
    glossary: Object.keys(glossary).length > 0
      ? Object.entries(glossary).map(([source, target]) => ({ source, target, locked: false }))
      : undefined,
  }), [mode, targetLang, band, contractionLevel, targetGenre, scoreThreshold, glossary]);

  const handleTranslate = useCallback(async () => {
    setLogs([]);
    // L2 Taint: 소설 원고를 'novel' 도메인으로 태깅 + translation 이동 가능 확인
    const taint = getTaintTracker();
    if (!taint.canTransfer('novel', 'translation')) {
      setLogs([{ id: Date.now(), type: 'error', text: 'Taint Policy: novel → translation transfer blocked' }]);
      return;
    }
    if (batchMode && manuscripts.length > 0) {
      // 배치 모드: 전체 에피소드 순차 번역 (실패 시 이어서 계속)
      setLogs([{ id: Date.now(), type: 'info', text: `Batch mode: ${manuscripts.length} episodes queued for translation...` }]);
      let completed = 0;
      for (const ms of manuscripts) {
        try {
          // Taint 태깅: 각 에피소드 원고를 novel 도메인 오염 표시
          taint.taint(ms.content?.toString().slice(0, 500) ?? '', 'novel');
          setLogs(prev => [...prev, { id: Date.now(), type: 'info', text: `EP.${ms.episode} (${completed + 1}/${manuscripts.length}) translating...` }]);
          await translateEpisode(ms, translationConfig);
          completed++;
          setLogs(prev => [...prev, { id: Date.now(), type: 'success', text: `EP.${ms.episode} complete (${completed}/${manuscripts.length})` }]);
        } catch (err) {
          setLogs(prev => [...prev, { id: Date.now(), type: 'error', text: `EP.${ms.episode} failed: ${err}. Continuing to next...` }]);
          // 실패해도 다음 에피소드로 계속 진행
        }
      }
      setLogs(prev => [...prev, { id: Date.now(), type: completed === manuscripts.length ? 'success' : 'warn', text: `Batch complete: ${completed}/${manuscripts.length} succeeded` }]);
    } else {
      // 단일 에피소드
      if (selectedEpisode === null) return;
      const ms = manuscripts.find((m) => m.episode === selectedEpisode);
      if (!ms) return;
      // Taint 태깅: 단일 에피소드 원고를 novel 도메인 표시
      taint.taint(ms.content?.toString().slice(0, 500) ?? '', 'novel');
      setLogs([{ id: Date.now(), type: 'info', text: `Initialization: Parsing episode ${selectedEpisode} (${ms.charCount} chars) into syntax chunks...` }]);
      try {
        await translateEpisode(ms, translationConfig);
      } catch (err) {
        setLogs(prev => [...prev, { id: Date.now(), type: 'error', text: `Translation failed: ${err}` }]);
      }
    }
  }, [batchMode, selectedEpisode, manuscripts, translationConfig, translateEpisode]);

  const translatedList = config.translatedManuscripts ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6 animate-fade-in overflow-hidden">
      {/* Header - Nexus Bridge */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-[linear-gradient(135deg,rgba(184,149,92,0.15),rgba(55,48,38,0.1))] text-text-primary shadow-[0_0_20px_rgba(184,149,92,0.15)]">
            <Languages className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary">
                Nexus Bridge
              </span>
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-white/95">
              {isKO ? "자율 현지화 엔진" : "Autonomous Localization Engine"}
            </h2>
          </div>
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          aria-expanded={showAdvanced}
          aria-label={isKO ? '고급 연동 설정 토글' : 'Toggle advanced settings'}
          className={`group flex items-center gap-2 rounded-xl border px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider transition-[transform,opacity,background-color,border-color,color] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${
            showAdvanced
              ? 'border-border bg-[rgba(184,149,92,0.1)] text-text-primary shadow-[0_0_15px_rgba(184,149,92,0.1)]'
              : 'border-white/8 bg-black/20 text-text-tertiary hover:border-border hover:bg-[rgba(184,149,92,0.05)] hover:text-text-secondary'
          }`}
        >
          <Settings2 className="h-4 w-4" />
          {isKO ? "고급 연동 설정" : "Advanced Settings"}
          <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-300 ${showAdvanced ? 'rotate-90' : ''}`} />
        </button>
      </div>

      <TranslationStatusPanels
        isKO={isKO}
        language={language}
        ragStatus={ragStatus}
        projectContext={projectContext}
        voiceRetryNeeded={voiceRetryNeeded}
        voiceRetryHint={voiceRetryHint}
        voiceViolations={voiceViolations}
        retryWithVoiceHint={retryWithVoiceHint}
        isTranslating={isTranslating}
        driftWarnings={driftWarnings}
      />

      {/* Scope Switch: 소설 / 일반 */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-black/30 border border-white/5 w-fit" role="tablist" aria-label={isKO ? '번역 범위 선택' : 'Translation scope'}>
        <button onClick={() => setScope('novel')} role="tab" aria-selected={scope === 'novel'} className={`px-4 py-2 rounded-lg font-mono text-[11px] font-bold uppercase tracking-wider transition-[background-color,border-color,box-shadow,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${scope === 'novel' ? 'bg-[rgba(184,149,92,0.15)] text-text-primary shadow-[inset_0_0_0_1px_rgba(184,149,92,0.3)]' : 'text-text-tertiary hover:text-text-secondary'}`}>
          {isKO ? '소설 번역' : 'Novel'}
        </button>
        <button onClick={() => setScope('general')} role="tab" aria-selected={scope === 'general'} className={`px-4 py-2 rounded-lg font-mono text-[11px] font-bold uppercase tracking-wider transition-[background-color,border-color,box-shadow,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${scope === 'general' ? 'bg-[rgba(184,149,92,0.15)] text-text-primary shadow-[inset_0_0_0_1px_rgba(184,149,92,0.3)]' : 'text-text-tertiary hover:text-text-secondary'}`}>
          {isKO ? '일반 번역' : 'General'}
        </button>
      </div>

      {/* ── 일반 번역 모드 ── */}
      {scope === 'general' && (
        <GeneralTranslationSection
          isKO={isKO}
          targetLang={targetLang}
          setTargetLang={setTargetLang}
          generalDomain={generalDomain}
          setGeneralDomain={setGeneralDomain}
          generalText={generalText}
          setGeneralText={setGeneralText}
          generalTranslating={generalTranslating}
          handleGeneralTranslate={handleGeneralTranslate}
          generalResult={generalResult}
          showSegmentView={showSegmentView}
          setShowSegmentView={setShowSegmentView}
          segments={segments}
          setSegments={setSegments}
          handleSegmentFocus={handleSegmentFocus}
          tmSuggestions={tmSuggestions}
          setTmSuggestions={setTmSuggestions}
          glossaryCandidates={glossaryCandidates}
          setGlossaryTerm={setGlossaryTerm}
          glossary={glossary}
          tmCount={tmCount}
          setLogs={setLogs}
        />
      )}

      {/* ── 소설 번역 모드 (기존 UI) ── */}
      {scope === 'novel' && <>

      <TranslationNovelModeConfig
        isKO={isKO}
        language={language}
        mode={mode}
        setMode={setMode}
        targetLang={targetLang}
        setTargetLang={setTargetLang}
        band={band}
        setBand={setBand}
      />

      {/* Advanced Settings Panel - Nexus Blue */}
      {showAdvanced && (
        <TranslationAdvancedSettings
          isKO={isKO}
          language={language}
          mode={mode}
          targetGenre={targetGenre}
          setTargetGenre={setTargetGenre}
          scoreThreshold={scoreThreshold}
          setScoreThreshold={setScoreThreshold}
          contractionLevel={contractionLevel}
          setContractionLevel={setContractionLevel}
        />
      )}

      {/* Glossary — 용어집 */}
      <TranslationGlossaryEditor
        isKO={isKO}
        glossary={glossary}
        glossaryTerm={glossaryTerm}
        setGlossaryTerm={setGlossaryTerm}
        glossaryTranslation={glossaryTranslation}
        setGlossaryTranslation={setGlossaryTranslation}
        saveGlossary={saveGlossary}
      />

      {/* Execution Area */}
      <TranslationExecutionControls
        isKO={isKO}
        batchMode={batchMode}
        setBatchMode={setBatchMode}
        manuscripts={manuscripts}
        selectedEpisode={selectedEpisode}
        setSelectedEpisode={setSelectedEpisode}
        isTranslating={isTranslating}
        abort={abort}
        handleTranslate={handleTranslate}
      />

      <TranslationOperationsTerminal progress={progress} logs={logs} logsEndRef={logsEndRef} />
      <TranslationResultsGrid isKO={isKO} translatedList={translatedList} />
      <TranslationQueueEmptyState isKO={isKO} manuscripts={manuscripts} />

      </>}
    </div>
  );
}
