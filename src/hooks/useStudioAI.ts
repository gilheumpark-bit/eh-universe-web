import { useState, useRef, useEffect, useCallback } from 'react';
import { Message, QualityGateResult } from '@/lib/studio-types';
import type { GenerateResult } from '@/services/geminiService';
import { processHFCPTurn } from '@/engine/hfcp';
import { EngineReport } from '@/engine/types';
import { logger } from '@/lib/logger';
import { classifyAsStudioError, StudioErrorCode } from '@/lib/errors';
import { trackAIGeneration } from '@/lib/analytics';
import { generateStoryStream } from '@/services/geminiService';
import { analyzeManuscript, calculateQualityTag, type DirectorReport, type QualityTag } from '@/engine/director';
import { stripEngineArtifacts } from '@/engine/pipeline';
import { getGenreTemperature } from '@/engine/genre-presets';
import { buildStoryBible } from '@/engine/context-builder';
import { VLLM_MODEL_ID } from '@/lib/dgx-models';
import { hasDgxService } from '@/lib/ai-providers';
import { evaluateQuality, buildRetryHint } from '@/engine/quality-gate';
import { loadProfile, buildProfileHint } from '@/engine/writer-profile';
import { createT } from '@/lib/i18n';

import { getNarrativeDepth } from '@/lib/noa/lora-swap';
import { computeTemperature, getTemperatureOverride } from '@/lib/temperature-settings';
import { buildWritingContextPack } from '@/lib/writing-workspace/context-pack';
import { assembleNoaPrompt } from '@/lib/writing-workspace/noa-prompt-assembly';
import {
  attachDraftJournal,
  buildComplianceGatePatch,
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
  scanExternalCraftLeaks,
} from './useStudioAI.helpers';
import {
  applyGenerationResultToSessions,
  buildConfigWithSimulatorGenres,
  runGenerationAuditSideEffects,
  runStudioPipelineGate,
  saveWriterProfileForGeneration,
  updateProactiveSuggestions,
} from './useStudioAI.postprocess';
import { useStudioAIRegenerate } from './useStudioAI.regenerate';
import type { QualityGateAttemptRecord, UseStudioAIParams } from './useStudioAI.types';

export { resolveNoaProjectScopeId } from './useStudioAI.helpers';

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
    const writerProfile = loadProfile('default');
    const pipelineGate = runStudioPipelineGate({
      capturedConfig,
      writerProfile,
      language,
      onPipelineUpdate,
    });
    if (pipelineGate.blockedMsg) {
      generationLockRef.current = false;
      setIsGenerating(false);
      clearTimeout(timeoutIdRef.current);
      updateCurrentSession({ messages: [...updatedMessages.slice(0, -1), pipelineGate.blockedMsg] });
      return;
    }
    const t = createT(language);

    let fullContent = '';
    try {
      const configForAI = buildConfigWithSimulatorGenres(capturedConfig);
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
      let complianceGateReport: ReturnType<typeof buildComplianceGatePatch>['report'] | null = null;
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
        const compliancePatch = buildComplianceGatePatch(capturedConfig, finalContent, language);
        complianceGateReport = compliancePatch.report;
        if (compliancePatch.shouldRetry) {
          gateResult = {
            ...gateResult,
            passed: false,
            failReasons: [...gateResult.failReasons, ...compliancePatch.failReasons],
          };
        }

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

        currentRetryHint = [
          buildRetryHint(gateResult, attempt, language),
          compliancePatch.retryHint,
        ].filter(Boolean).join('\n\n');
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

      await runGenerationAuditSideEffects({
        currentProjectId,
        capturedSessionId,
        episodeId: capturedConfig.episode ?? undefined,
        targetId: aiMsgId,
        finalContent,
        language,
      });

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
        writingContextCompliance: complianceGateReport,
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

      updateProactiveSuggestions({
        writerProfile,
        capturedConfig,
        currentSession,
        resultReport: result.report,
        language,
        onSuggestionsUpdate,
      });
      saveWriterProfileForGeneration({
        writerProfile,
        finalContent,
        resultReport: result.report,
        directorReport: dReport,
        language,
      });
      applyGenerationResultToSessions({
        setSessions,
        capturedSessionId,
        aiMsgId,
        externalLeakNotice,
        finalContent,
        resultReport: result.report,
        ipFilteredCount: ipCheck.matches.length,
        qTag,
        gateMeta,
        externalLeakHits,
        capturedConfig,
      });
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

  const handleRegenerate = useStudioAIRegenerate({
    isGenerating,
    currentSessionId,
    currentSession,
    currentProjectId,
    language,
    setSessions,
    setLastReport,
    setDirectorReport,
    setShowApiKeyModal,
    setUxError,
    generationLockRef,
    abortControllerRef,
    setIsGenerating,
  });

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
