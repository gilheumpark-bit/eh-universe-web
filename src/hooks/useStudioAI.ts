// ============================================================
// PART 1 — Types & Imports
// ============================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Message, ChatSession, AppLanguage, QualityGateResult, WritingMode,
} from '@/lib/studio-types';
import type { GenerateResult } from '@/services/geminiService';
import { type HFCPState as HFCPStateType, processHFCPTurn } from '@/engine/hfcp';
import { EngineReport } from '@/engine/types';
import { logger } from '@/lib/logger';
import { classifyAsStudioError, StudioErrorCode } from '@/lib/errors';
import { trackAIGeneration } from '@/lib/analytics';
import { generateStoryStream } from '@/services/geminiService';
import { analyzeManuscript, calculateQualityTag, type DirectorReport, type DirectorFinding, type QualityTag } from '@/engine/director';
import { stripEngineArtifacts } from '@/engine/pipeline';
import { getGenreTemperature } from '@/engine/genre-presets';
import { buildStoryBible } from '@/engine/context-builder';
import { VLLM_MODEL_ID } from '@/lib/dgx-models';
import { hasDgxService, getActiveProvider } from '@/lib/ai-providers';
import { recordAIUsage } from '@/lib/ai-usage-tracker';
import { evaluateQuality, buildRetryHint } from '@/engine/quality-gate';
import { generateSuggestions, getDefaultSuggestionConfig } from '@/engine/proactive-suggestions';
import { updateProfile, loadProfile, saveProfile, buildProfileHint } from '@/engine/writer-profile';
import { createT } from '@/lib/i18n';

/** 품질 게이트 시도별 기록 */
export interface QualityGateAttemptRecord {
  attempt: number;
  grade: string;
  directorScore: number;
  qualityTag: string;
  failReasons: string[];
  passed: boolean;
}
import { getNarrativeDepth } from '@/lib/noa/lora-swap';
import { computeTemperature, getTemperatureOverride } from '@/lib/temperature-settings';
import { executePipeline, getDefaultPipelineConfig, type PipelineExecution } from '@/engine/auto-pipeline';
import type { ProactiveSuggestion } from '@/lib/studio-types';
import { buildWritingContextPack } from '@/lib/writing-workspace/context-pack';
import { assembleNoaPrompt } from '@/lib/writing-workspace/noa-prompt-assembly';
import {
  attachDraftJournal,
  buildAdvancedPrefix,
  buildExternalCraftLeakNotice,
  buildHFCPPrefix,
  buildIntentMemoryPrefix,
  buildMetaContextPrefix,
  buildNoaCriticalRules,
  buildOutputModePrefix,
  buildStoryContextPrefix,
  buildWritingBaselinePrefix,
  isGenerationRetryable,
  pickContextBlock,
  recordCreativeProcessOutput,
  scanAntiSycophancyOutput,
  scanExternalCraftLeaks,
} from './useStudioAI.helpers';

export { resolveNoaProjectScopeId } from './useStudioAI.helpers';

interface UseStudioAIParams {
  currentSession: ChatSession | null;
  currentSessionId: string | null;
  currentProjectId: string | null;
  setSessions: React.Dispatch<React.SetStateAction<ChatSession[]>> | ((updater: (prev: ChatSession[]) => ChatSession[]) => void);
  updateCurrentSession: (patch: Partial<ChatSession>) => void;
  hfcpState: HFCPStateType;
  promptDirective: string;
  language: AppLanguage;
  canvasPass: number;
  setCanvasContent: (val: string) => void;
  setWritingMode: (mode: WritingMode) => void;
  setShowApiKeyModal: (val: boolean) => void;
  setUxError: (err: { error: unknown; retry?: () => void } | null) => void;
  advancedOutputMode?: string;
  advancedSettings?: import('@/components/studio/AdvancedWritingPanel').AdvancedWritingSettings;
  // 3.8 자율 시스템 콜백
  onSuggestionsUpdate?: (suggestions: ProactiveSuggestion[]) => void;
  onQualityGateRetry?: (attempt: number, maxRetries: number, history: QualityGateAttemptRecord[]) => void;
  onPipelineUpdate?: (result: PipelineExecution) => void;
}

// ============================================================
// PART 2 — Hook implementation
// ============================================================

/**
 * Core AI generation hook. Handles streaming story generation, HFCP turn processing,
 * quality gate evaluation with retry, proactive suggestions, and writer profile updates.
 */
export function useStudioAI({
  currentSession,
  currentSessionId,
  currentProjectId,
  setSessions,
  updateCurrentSession,
  hfcpState,
  promptDirective,
  language,
  canvasPass,
  setCanvasContent,
  setWritingMode,
  setShowApiKeyModal,
  setUxError,
  advancedOutputMode,
  advancedSettings,
  onSuggestionsUpdate,
  onQualityGateRetry,
  onPipelineUpdate,
}: UseStudioAIParams) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastReport, setLastReport] = useState<EngineReport | null>(null);
  const [directorReport, setDirectorReport] = useState<DirectorReport | null>(null);
  /** Generation elapsed time in seconds (null when not yet completed) */
  const [generationTime, setGenerationTime] = useState<number | null>(null);
  /** Approximate token usage from last generation */
  const [tokenUsage, setTokenUsage] = useState<{ used: number; budget: number } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const generationLockRef = useRef(false);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const generationStartRef = useRef<number>(0);
  // P0-2: Slow generation warning timers
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const verySlowTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Cleanup: abort streaming + clear timeout + release lock on unmount
  useEffect(() => () => {
    abortControllerRef.current?.abort();
    clearTimeout(timeoutIdRef.current);
    clearTimeout(slowTimerRef.current);
    clearTimeout(verySlowTimerRef.current);
    generationLockRef.current = false;
  }, []);

  // [2026-05-09] noa:ai-generating dispatch — isGenerating 변화 시 broadcast.
  // WristRestHint 등 외부 리스너가 손목 휴식 안내 등 trigger 가능.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.dispatchEvent(new CustomEvent('noa:ai-generating', { detail: { active: isGenerating } }));
    } catch { /* best-effort */ }
  }, [isGenerating]);

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    generationLockRef.current = false;
    setIsGenerating(false);
  }, []);

  const handleSend = useCallback(async (customPrompt?: string, inputValue?: string, clearInput?: () => void) => {
    const text = customPrompt || inputValue || '';
    if (!text.trim() || isGenerating || !currentSessionId || !currentSession) return;
    if (generationLockRef.current) return;

    generationLockRef.current = true;
    generationStartRef.current = performance.now();
    setGenerationTime(null);
    setTokenUsage(null);
    // Safety: auto-release lock after 30s to prevent permanent deadlock
    clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(() => { generationLockRef.current = false; }, 30_000);
    // HFCP: classify input and get prompt modifier
    const hfcpResult = processHFCPTurn(hfcpState, text);
    const hfcpPrefixWrapped = buildHFCPPrefix(hfcpResult);
    const directivePrefix = promptDirective ? `\n[작가 지침: ${promptDirective}]\n` : '';
    const outputModePrefix = buildOutputModePrefix(advancedOutputMode);
    const advancedPrefix = buildAdvancedPrefix(advancedSettings);
    // [L1·L2·L4 — 2026-05-08] Multi-layer context prefixes (작품 / 의도 / 메타).
    // dynamic import + non-blocking — 빌드 실패 시 빈 string.
    const storyContextPrefix = await buildStoryContextPrefix(currentSession?.config, language);
    const intentMemoryPrefix = await buildIntentMemoryPrefix(currentSession?.messages, language);
    const metaContextPrefix = await buildMetaContextPrefix(text, language);
    const writingContextPack = buildWritingContextPack({
      config: currentSession.config,
      projectId: currentProjectId,
      sessionId: currentSessionId,
    });
    if (writingContextPack.hardStopReasons.length > 0) {
      clearTimeout(lockTimerRef.current);
      generationLockRef.current = false;
      setUxError?.({
        error: new Error(`집필 기준선 검토 필요: ${writingContextPack.hardStopReasons.join(' / ')}`),
        retry: () => handleSend(customPrompt, inputValue, clearInput),
      });
      return;
    }
    const writingBaselinePrefix = buildWritingBaselinePrefix(writingContextPack);
    const externalCraftReferenceBlock = pickContextBlock(writingContextPack, 'external-craft');

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text, timestamp: Date.now(), meta: { hfcpMode: hfcpResult.mode, hfcpVerdict: hfcpResult.verdict, hfcpScore: hfcpResult.score } as Message['meta'] };
    const aiMsgId = `a-${Date.now()}`;
    const initialAiMsg: Message = { id: aiMsgId, role: 'assistant', content: '', timestamp: Date.now() };
    const existingMessages = currentSession?.messages || [];
    const updatedMessages = [...existingMessages, userMsg, initialAiMsg];

    updateCurrentSession({
      messages: updatedMessages,
      title: existingMessages.length === 0 ? text.substring(0, 15) : currentSession?.title
    });
    clearInput?.();
    setIsGenerating(true);

    // P0-2: Start slow generation warning timers
    clearTimeout(slowTimerRef.current);
    clearTimeout(verySlowTimerRef.current);
    slowTimerRef.current = setTimeout(() => {
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('noa:generation-slow'));
    }, 30_000);
    verySlowTimerRef.current = setTimeout(() => {
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('noa:generation-very-slow'));
    }, 120_000);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    clearTimeout(timeoutIdRef.current);
    timeoutIdRef.current = setTimeout(() => abortControllerRef.current?.abort(), 180_000);
    const capturedSessionId = currentSessionId;
    // 비동기 타이밍에 currentSession이 null일 수 있으므로 방어 체크
    if (!currentSession) { clearTimeout(timeoutIdRef.current); generationLockRef.current = false; setIsGenerating(false); return; }
    const capturedConfig = currentSession.config;
    const t = createT(language);

    // --- AUTO PIPELINE EXECUTION ---
    const writerProfile = loadProfile('default');
    const pipelineConfig = getDefaultPipelineConfig(writerProfile.skillLevel);
    
    // UI feedback for pipeline running
    onPipelineUpdate?.({ id: 'running', stages: [], totalDuration: 0, finalStatus: 'running' } as unknown as PipelineExecution);

    const pipelineResultExecution = executePipeline(
      { config: capturedConfig, currentEpisode: capturedConfig.episode ?? 1 },
      pipelineConfig
    );
    
    onPipelineUpdate?.(pipelineResultExecution);

    if (pipelineResultExecution.finalStatus === 'failed') {
      logger.error('pipeline', 'Pipeline failed at stage:', pipelineResultExecution.blockedAt, pipelineResultExecution.stages);
      generationLockRef.current = false;
      setIsGenerating(false);
      clearTimeout(timeoutIdRef.current);
      const failedStages = pipelineResultExecution.stages?.filter(s => s.status === 'failed') || [];
      const failedDetails = failedStages.map(s => `${s.stage}: ${s.warnings?.join(', ')}`).join('\n');
      const blockedMsg: Message = {
        id: `sys-${Date.now()}`, role: 'assistant',
        content: `${t('system.pipelineBlocked')} (${pipelineResultExecution.blockedAt})${failedDetails ? `\n${failedDetails}` : ''}`,
        timestamp: Date.now()
      };
      updateCurrentSession({
        messages: [...updatedMessages.slice(0, -1), blockedMsg], // Replace empty assistant message
      });
      return;
    }
    // --------------------------------

    let fullContent = '';
    try {
      // Inject genreSelections from worldSimData into simulatorRef for AI prompt
      const configForAI = {
        ...capturedConfig,
        simulatorRef: {
          ...capturedConfig.simulatorRef,
          genreSelections: capturedConfig.worldSimData?.genreSelections || capturedConfig.simulatorRef?.genreSelections,
        },
      };
      // 3.8 — Writer Profile 힌트를 프롬프트에 주입
      const profileHint = buildProfileHint(writerProfile, language);
      const basePrompt = assembleNoaPrompt({
        criticalRules: buildNoaCriticalRules(writingContextPack),
        currentProjectLore: [writingBaselinePrefix, storyContextPrefix].filter(Boolean).join('\n'),
        recentContext: [
          hfcpPrefixWrapped,
          intentMemoryPrefix,
          metaContextPrefix,
          profileHint ? `\n[Writer Profile] ${profileHint}\n` : '',
        ].filter(Boolean).join('\n'),
        externalCraftReferenceBlock,
        currentTask: [directivePrefix, outputModePrefix, advancedPrefix].filter(Boolean).join('\n'),
        finalAuthorCommand: text,
      });
      
      const { getDefaultGateConfig } = await import('@/engine/quality-gate');
      const gateConfig = getDefaultGateConfig(writerProfile.skillLevel);
      // full_auto: 무인 재시도 / confirm: 재시도 + 각 라운드 알림 / off: 1회만
      const maxAttempts = (
        gateConfig.enabled &&
        (gateConfig.autoMode === 'full_auto' || gateConfig.autoMode === 'confirm')
      ) ? gateConfig.maxRetries : 1;
      // confirm 모드: 재시도 전 CustomEvent로 상위 UI 토스트 트리거
      const confirmMode = gateConfig.autoMode === 'confirm';
      
      let attempt = 1;
      let finalContent = '';
      let result: GenerateResult = { content: '', report: {} as EngineReport };
      let dReport: DirectorReport = { findings: [], stats: {}, score: 100 };
      let qTag: QualityTag = { tag: '🟢', label: 'CLEAR', visibleFindings: [] };
      let gateResult: QualityGateResult = { passed: true, attempt: 1, failReasons: [], grade: '?', directorScore: 0, eosScore: 0, qualityTag: '' };
      let ipCheck: { filtered: string; matches: { original: string; replacement: string }[] } = { filtered: '', matches: [] };
      let currentRetryHint = '';
      let externalLeakHits: string[] = [];
      let externalLeakNotice = '';
      const gateHistory: QualityGateAttemptRecord[] = [];

      // Story Bible — 망각 방지 동적 컨텍스트
      const storyBible = buildStoryBible({
        config: capturedConfig,
        manuscripts: capturedConfig.manuscripts || [],
        currentEpisode: capturedConfig.episode ?? 1,
        language,
      });

      while (attempt <= maxAttempts) {
        fullContent = '';
        const promptWithHint = basePrompt + (currentRetryHint ? `\n\n${currentRetryHint}` : '');
        result = await generateStoryStream(
          configForAI, promptWithHint,
          (chunk) => {
            fullContent += chunk;
            const displayContent = stripEngineArtifacts(fullContent);
            if (canvasPass >= 1 && canvasPass <= 3) {
              setCanvasContent(displayContent);
            }
            setSessions(prev => prev.map(s => {
              if (s.id === capturedSessionId) {
                const visualPrefix = attempt > 1 ? `${t('system.qualityGateRetry').replace('{n}', String(attempt)).replace('{max}', String(maxAttempts))}\n\n` : '';
                const msgs = s.messages.map(m => m.id === aiMsgId ? { ...m, content: visualPrefix + displayContent } : m);
                return { ...s, messages: msgs };
              }
              return s;
            }));
          },
          { language, signal: controller.signal, platform: capturedConfig.platform, history: existingMessages, storyBible, model: hasDgxService() ? VLLM_MODEL_ID : undefined, temperature: computeTemperature(getGenreTemperature(capturedConfig.genre || ''), getNarrativeDepth(), getTemperatureOverride()) }
        );

        // Trademark/IP filter
        const { filterTrademarks } = await import('@/engine/validator');
        ipCheck = filterTrademarks(fullContent);
        if (ipCheck.matches.length > 0) fullContent = ipCheck.filtered;

        finalContent = stripEngineArtifacts(fullContent) || result.content;
        externalLeakHits = scanExternalCraftLeaks(finalContent, externalCraftReferenceBlock, capturedConfig);
        externalLeakNotice = externalLeakHits.length > 0
          ? buildExternalCraftLeakNotice(externalLeakHits, language)
          : '';
        
        try { dReport = analyzeManuscript(finalContent, capturedConfig.publishPlatform, capturedConfig.genre); } catch (err) { logger.warn('StudioAI', 'analyzeManuscript failed (non-blocking)', err); }
        qTag = calculateQualityTag(dReport, capturedConfig.narrativeIntensity || 'standard');

        gateResult = evaluateQuality(finalContent, capturedConfig, gateConfig.thresholds, language, attempt);

        // 시도별 이력 기록
        gateHistory.push({
          attempt,
          grade: gateResult.grade || '?',
          directorScore: dReport?.score ?? 0,
          qualityTag: qTag?.tag || '⚪',
          failReasons: [...(gateResult.failReasons || [])],
          passed: gateResult.passed,
        });

        if (gateResult.passed) break;

        currentRetryHint = buildRetryHint(gateResult, attempt, language);
        onQualityGateRetry?.(attempt, maxAttempts, gateHistory);
        // confirm 모드: 상위 UI(StudioShell)가 Toast/알림을 표시하도록 CustomEvent 발행
        if (confirmMode && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('noa:quality-gate-confirm', {
            detail: {
              attempt,
              maxAttempts,
              grade: gateResult.grade,
              failReasons: gateResult.failReasons,
              directorScore: dReport?.score ?? 0,
            },
          }));
        }
        if (attempt < maxAttempts) {
          // 지수 백오프 딜레이: 2초, 4초, 8초... (API 부하 방지)
          // confirm 모드는 사용자가 상황 파악할 수 있도록 딜레이 +1초
          const baseDelay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
          const retryDelay = confirmMode ? baseDelay + 1000 : baseDelay;
          await new Promise(r => setTimeout(r, retryDelay));
          attempt++;
        } else {
          break;
        }
      }

      setLastReport(result.report);
      setDirectorReport(dReport);

      try {
        await attachDraftJournal(currentProjectId);
      } catch (err) { logger.warn('StudioAI', 'attachJournal failed', err); }

      // AI 사용 메타데이터 기록 — Export 시 고지문 생성에 사용 (ai-usage-tracker)
      try {
        const activeProv = hasDgxService() ? 'dgx-qwen' : getActiveProvider();
        recordAIUsage(capturedSessionId, {
          type: 'generation',
          provider: activeProv,
          charsGenerated: finalContent.length,
        });
      } catch (err) { logger.warn('StudioAI', 'recordAIUsage failed', err); }

      try {
        await recordCreativeProcessOutput({
          currentProjectId,
          episodeId: capturedConfig.episode ?? undefined,
          targetId: aiMsgId,
          finalContent,
          originType: 'AI_DRAFT',
          label: 'AI generation',
        });
      } catch (err) { logger.warn('StudioAI', 'creative-process logging failed (non-blocking)', err); }

      try {
        await scanAntiSycophancyOutput(finalContent, language, 'generation');
      } catch (err) { logger.warn('StudioAI', 'anti-sycophancy scan failed (non-blocking)', err); }

      // Track generation time and approximate token usage
      const elapsedSec = Math.round((performance.now() - generationStartRef.current) / 100) / 10;
      setGenerationTime(elapsedSec);
      const approxTokens = Math.round(finalContent.length / 3.5);
      const budget = (capturedConfig.guardrails?.max ?? 5000);
      const tokenBudget = Math.round(budget / 3.5);
      setTokenUsage({ used: approxTokens, budget: tokenBudget });

      const retryHint = !gateResult.passed ? currentRetryHint : '';
      const gateMeta = {
        qualityGatePassed: gateResult.passed,
        qualityGateAttempt: gateResult.attempt,
        qualityGateReasons: gateResult.failReasons,
        qualityGateRetryHint: retryHint,
        qualityGateHistory: gateHistory,
        externalCraftLeakHits: externalLeakHits,
      };

      // ============================================================
      // 3.8 — 세계관 스튜디오 양방향 동기화 (World Data Sync)
      // ============================================================
      if (result.report.worldUpdates && capturedConfig.worldSimData) {
        // AI가 [WORLD_UPDATE] 등을 통해 세계관 변경 사항을 리포트로 반환하면
        // 현재 세션의 config.worldSimData에 최신 업데이트로 기록합니다. (Bi-directional Mutate)
        try {
          const updatedWorldSync = {
            ...capturedConfig,
            worldSimData: {
              ...capturedConfig.worldSimData,
              _latestUpdates: Array.isArray(result.report.worldUpdates) ? result.report.worldUpdates as string[] : [],
            }
          };
          updateCurrentSession({ config: updatedWorldSync });
        } catch (err) {
          logger.warn('StudioAI', 'worldSync update failed', err);
        }
      }

      // ============================================================
      // 3.8 — Proactive Suggestions 생성
      // ============================================================
      try {
        const sgConfig = getDefaultSuggestionConfig(writerProfile.skillLevel);
        const chars = capturedConfig.characters || [];
        // 과거 메시지에서 엔진 리포트를 추출하여 최근 메트릭 구성
        const pastReports = (currentSession?.messages || [])
          .filter(m => m.role === 'assistant' && m.meta?.engineReport)
          .slice(-5)
          .map(m => {
            const r = m.meta?.engineReport;
            if (!r) return { tension: 50, pacing: 60, immersion: 60, eos: 50, grade: 'B' };
            return { tension: r.metrics?.tension ?? 50, pacing: r.metrics?.pacing ?? 60, immersion: r.metrics?.immersion ?? 60, eos: r.eosScore ?? 50, grade: r.grade ?? 'B' };
          });
        // 현재 에피소드 메트릭 추가
        const recentMetrics = [...pastReports, { tension: result.report.metrics.tension, pacing: result.report.metrics.pacing, immersion: result.report.metrics.immersion, eos: result.report.eosScore, grade: result.report.grade }];
        const charLastAppearance: Record<string, number> = {};
        chars.forEach(ch => { charLastAppearance[ch.name] = capturedConfig.episode ?? 1; });
        const newSuggestions = generateSuggestions({
          config: capturedConfig,
          currentEpisode: capturedConfig.episode ?? 1,
          recentMetrics,
          characterNames: chars.map(c => c.name),
          characterLastAppearance: charLastAppearance,
          language,
        }, sgConfig);
        if (newSuggestions.length > 0) onSuggestionsUpdate?.(newSuggestions);
      } catch (err) { logger.warn('StudioAI', 'proactiveSuggestions failed', err); }

      // ============================================================
      // 3.8 — Writer Profile 학습
      // ============================================================
      try {
        const updated = updateProfile(writerProfile, {
          text: finalContent,
          grade: result.report.grade,
          directorScore: dReport.score,
          eosScore: result.report.eosScore,
          tension: result.report.metrics.tension,
          pacing: result.report.metrics.pacing,
          immersion: result.report.metrics.immersion,
          findings: dReport.findings,
          wasRegenerated: false,
          wasOverridden: false,
        });
        saveProfile(updated);
        const hint = buildProfileHint(updated, language);
        logger.info('writer-profile', 'Profile updated, hint length:', hint.length);
      } catch (err) { logger.warn('StudioAI', 'writerProfile save failed', err); }

      setSessions(prev => prev.map(s => {
        if (s.id === capturedSessionId) {
          const assistantContent = externalLeakNotice
            ? `${finalContent}\n\n${externalLeakNotice}`
            : finalContent;
          const msgs = s.messages.map(m =>
            m.id === aiMsgId
              ? { ...m, content: assistantContent, meta: {
                  engineReport: result.report, grade: result.report.grade, eosScore: result.report.eosScore, metrics: result.report.metrics, ipFiltered: ipCheck.matches.length,
                  qualityTag: qTag.tag, qualityLabel: qTag.label,
                  qualityFindings: qTag.visibleFindings.map((f: DirectorFinding) => ({ kind: f.kind, severity: f.severity, message: f.message, lineNo: f.lineNo, excerpt: f.excerpt })),
                  ...gateMeta,
                } }
              : m
          );
          // Auto-collect manuscript on generation complete
          const cleanText = finalContent;
          if (cleanText.length > 100 && externalLeakHits.length === 0) {
            const ep = capturedConfig.episode;
            const existing = (s.config.manuscripts || []).find(m => m.episode === ep);
            const manuscript = { episode: ep, title: capturedConfig.title ? `${capturedConfig.title} EP.${ep}` : `EP.${ep}`, content: cleanText, charCount: cleanText.length, lastUpdate: Date.now() };
            const manuscripts = existing
              ? (s.config.manuscripts || []).map(m => m.episode === ep ? manuscript : m)
              : [...(s.config.manuscripts || []), manuscript];
            return { ...s, messages: msgs, config: { ...s.config, manuscripts } };
          }
          return { ...s, messages: msgs };
        }
        return s;
      }));
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') { /* user cancelled */ }
      else {
        const classified = classifyAsStudioError(error);
        if (classified.code === StudioErrorCode.KEY_MISSING || classified.code === StudioErrorCode.KEY_INVALID) {
          setShowApiKeyModal(true);
        } else {
          logger.error('StudioAI', classified);
          // [P5 2026-06-09] 생성 실패 — 친화 메시지(ErrorToast 가 code→4언어 변환) + 일시적 오류 재시도.
          setUxError({ error: classified, retry: isGenerationRetryable(classified) ? () => handleSend(text, undefined, undefined) : undefined });
        }
      }
    } finally {
      clearTimeout(timeoutIdRef.current);
      clearTimeout(slowTimerRef.current);
      clearTimeout(verySlowTimerRef.current);
      generationLockRef.current = false;
      // 3-pass canvas mode: auto-inject on pass completion
      if (canvasPass >= 1 && canvasPass <= 3 && fullContent) {
        const clean = stripEngineArtifacts(fullContent);
        if (clean) setCanvasContent(clean);
        setWritingMode('canvas');
      }
      setIsGenerating(false);
      abortControllerRef.current = null;
      trackAIGeneration('unknown', 'unknown', canvasPass > 0 ? 'canvas' : 'ai');
    }
  }, [isGenerating, currentSessionId, currentProjectId, currentSession, hfcpState, promptDirective, language, canvasPass, advancedOutputMode, setSessions, updateCurrentSession, setCanvasContent, setWritingMode, setShowApiKeyModal, setUxError, onSuggestionsUpdate, onQualityGateRetry, advancedSettings, onPipelineUpdate]);

  const handleRegenerate = useCallback(async (assistantMsgId: string) => {
    if (isGenerating || !currentSessionId || !currentSession) return;
    if (generationLockRef.current) return;
    generationLockRef.current = true;
    const msgIndex = currentSession.messages.findIndex(m => m.id === assistantMsgId);
    if (msgIndex <= 0) { generationLockRef.current = false; return; }
    const userMsg = currentSession.messages[msgIndex - 1];
    if (userMsg.role !== 'user') { generationLockRef.current = false; return; }
    const historyMessages = currentSession.messages.slice(0, msgIndex - 1);

    // Save current content to versions before regenerating
    const currentMsg = currentSession.messages[msgIndex];
    const prevVersions = currentMsg.versions ?? [];
    const savedVersions = currentMsg.content ? [...prevVersions, currentMsg.content] : prevVersions;

    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        const msgs = s.messages.map(m => m.id === assistantMsgId ? { ...m, content: '', meta: undefined, versions: savedVersions, currentVersionIndex: savedVersions.length } : m);
        return { ...s, messages: msgs };
      }
      return s;
    }));
    setIsGenerating(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const capturedSessionId2 = currentSessionId;
    const capturedConfig2 = currentSession.config;

    let fullContent = '';
    try {
      const configForChat = {
        ...capturedConfig2,
        simulatorRef: {
          ...capturedConfig2.simulatorRef,
          genreSelections: capturedConfig2.worldSimData?.genreSelections || capturedConfig2.simulatorRef?.genreSelections,
        },
      };
      // [L1·L2·L4 — 2026-05-08] Multi-layer context prefixes — regenerate 도 동등 주입.
      // [검증 루프 fix — 2026-05-08] L2 intent + L4 meta 누락 → wiring.
      // generateStoryStream 의 storyBible 옵션 재활용 — baseSystem 에 prepend.
      const regenStoryContextPrefix = await buildStoryContextPrefix(capturedConfig2, language);
      const regenIntentMemoryPrefix = await buildIntentMemoryPrefix(historyMessages, language);
      const regenMetaContextPrefix = await buildMetaContextPrefix(userMsg.content, language);
      const regenWritingContextPack = buildWritingContextPack({
        config: capturedConfig2,
        projectId: currentProjectId,
        sessionId: capturedSessionId2,
        mode: 'episode-regenerate',
      });
      if (regenWritingContextPack.hardStopReasons.length > 0) {
        generationLockRef.current = false;
        setIsGenerating(false);
        setUxError?.({
          error: new Error(`집필 기준선 검토 필요: ${regenWritingContextPack.hardStopReasons.join(' / ')}`),
          retry: () => handleRegenerate(assistantMsgId),
        });
        return;
      }
      const regenExternalCraftReferenceBlock = pickContextBlock(regenWritingContextPack, 'external-craft');
      const regenCombinedPrefix = assembleNoaPrompt({
        criticalRules: buildNoaCriticalRules(regenWritingContextPack),
        currentProjectLore: [buildWritingBaselinePrefix(regenWritingContextPack), regenStoryContextPrefix].filter(Boolean).join('\n'),
        recentContext: [regenIntentMemoryPrefix, regenMetaContextPrefix].filter(Boolean).join('\n'),
        externalCraftReferenceBlock: regenExternalCraftReferenceBlock,
        currentTask: '',
        finalAuthorCommand: '',
      });
      const result = await generateStoryStream(
        configForChat, userMsg.content,
        (chunk) => {
          fullContent += chunk;
          const displayContent = stripEngineArtifacts(fullContent);
          setSessions(prev => prev.map(s => {
            if (s.id === capturedSessionId2) {
              const msgs = s.messages.map(m => m.id === assistantMsgId ? { ...m, content: displayContent } : m);
              return { ...s, messages: msgs };
            }
            return s;
          }));
        },
        {
          language,
          signal: controller.signal,
          platform: capturedConfig2.platform,
          history: historyMessages,
          storyBible: regenCombinedPrefix || undefined,
          model: hasDgxService() ? VLLM_MODEL_ID : undefined,
          temperature: computeTemperature(getGenreTemperature(capturedConfig2.genre || ''), getNarrativeDepth(), getTemperatureOverride()),
        },
      );

      // Trademark/IP filter
      const { filterTrademarks } = await import('@/engine/validator');
      const ipCheck = filterTrademarks(fullContent);
      if (ipCheck.matches.length > 0) {
        fullContent = ipCheck.filtered;
      }

      const finalContent = stripEngineArtifacts(fullContent) || result.content;
      const externalLeakHits = scanExternalCraftLeaks(finalContent, regenExternalCraftReferenceBlock, capturedConfig2);
      const externalLeakNotice = externalLeakHits.length > 0
        ? buildExternalCraftLeakNotice(externalLeakHits, language)
        : '';
      setLastReport(result.report);

      // AI 사용 메타데이터 기록 (재생성) — Export 고지문 생성 소스
      try {
        const activeProv = hasDgxService() ? 'dgx-qwen' : getActiveProvider();
        recordAIUsage(capturedSessionId2, {
          type: 'rewrite',
          provider: activeProv,
          charsGenerated: finalContent.length,
        });
      } catch (err) { logger.warn('StudioAI', 'recordAIUsage (regenerate) failed', err); }

      try {
        await recordCreativeProcessOutput({
          currentProjectId,
          episodeId: capturedConfig2.episode ?? undefined,
          targetId: `regen-${Date.now()}`,
          finalContent,
          originType: 'AI_REWRITE',
          label: 'AI regenerate',
        });
      } catch (err) { logger.warn('StudioAI', 'creative-process logging (regenerate) failed (non-blocking)', err); }

      try {
        await scanAntiSycophancyOutput(finalContent, language, 'regenerate');
      } catch (err) { logger.warn('StudioAI', 'anti-sycophancy scan (regenerate) failed (non-blocking)', err); }

      // Regenerate 품질 파이프라인 — handleSend와 동일하게 감독/품질태그 연결
      let dReport: DirectorReport = { findings: [], stats: {}, score: 100 };
      let qTag: QualityTag = { tag: '🟢', label: 'CLEAR', visibleFindings: [] };
      try { dReport = analyzeManuscript(finalContent, capturedConfig2.publishPlatform, capturedConfig2.genre); } catch (err) { logger.warn('StudioAI', 'analyzeManuscript failed (regenerate, non-blocking)', err); }
      qTag = calculateQualityTag(dReport, capturedConfig2.narrativeIntensity || 'standard');
      setDirectorReport(dReport);

      // Writer Profile 학습 (재생성은 wasRegenerated=true)
      try {
        const profile = loadProfile();
        const updated = updateProfile(profile, {
          text: finalContent,
          grade: result.report.grade,
          directorScore: dReport.score,
          eosScore: result.report.eosScore,
          tension: result.report.metrics.tension,
          pacing: result.report.metrics.pacing,
          immersion: result.report.metrics.immersion,
          findings: dReport.findings,
          wasRegenerated: true,
          wasOverridden: false,
        });
        saveProfile(updated);
      } catch (err) { logger.warn('StudioAI', 'writerProfile save failed (regenerate)', err); }

      setSessions(prev => prev.map(s => {
        if (s.id === capturedSessionId2) {
          const assistantContent = externalLeakNotice
            ? `${finalContent}\n\n${externalLeakNotice}`
            : finalContent;
          const msgs = s.messages.map(m => {
            if (m.id !== assistantMsgId) return m;
            const updatedVersions = [...(m.versions ?? []), finalContent];
            return {
              ...m,
              content: assistantContent,
              versions: updatedVersions,
              currentVersionIndex: updatedVersions.length - 1,
              meta: {
                engineReport: result.report,
                grade: result.report.grade,
                eosScore: result.report.eosScore,
                metrics: result.report.metrics,
                ipFiltered: ipCheck.matches.length,
                externalCraftLeakHits: externalLeakHits,
                qualityTag: qTag.tag,
                qualityLabel: qTag.label,
                qualityFindings: qTag.visibleFindings.map((f: DirectorFinding) => ({ kind: f.kind, severity: f.severity, message: f.message, lineNo: f.lineNo, excerpt: f.excerpt })),
              },
            };
          });
          return { ...s, messages: msgs };
        }
        return s;
      }));
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') { /* user cancelled */ }
      else {
        const classified = classifyAsStudioError(error);
        // [P5 2026-06-09] handleSend 와 대칭 — 키 오류는 모달, 그 외는 친화 메시지 + 일시적 오류 재시도.
        if (classified.code === StudioErrorCode.KEY_MISSING || classified.code === StudioErrorCode.KEY_INVALID) {
          setShowApiKeyModal(true);
        } else {
          logger.error('StudioAI', classified);
          setUxError({ error: classified, retry: isGenerationRetryable(classified) ? () => handleRegenerate(assistantMsgId) : undefined });
        }
      }
    } finally {
      generationLockRef.current = false;
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [isGenerating, currentProjectId, currentSessionId, currentSession, language, setSessions, setUxError, setShowApiKeyModal]);

  return {
    isGenerating,
    setIsGenerating,
    lastReport,
    directorReport,
    /** Elapsed generation time in seconds (null until generation completes) */
    generationTime,
    /** Approximate token usage from last generation */
    tokenUsage,
    handleCancel,
    handleSend,
    handleRegenerate,
  };
}
