// ============================================================
// PART 1 — Types & Imports
// ============================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Message, ChatSession, AppLanguage,
} from '@/lib/studio-types';
import { type HFCPState as HFCPStateType, processHFCPTurn } from '@/engine/hfcp';
import { EngineReport } from '@/engine/types';
import { logger } from '@/lib/logger';
import { classifyAsStudioError, StudioErrorCode } from '@/lib/errors';
import { canGenerate, incrementGenerationCount } from '@/lib/tier';
import { trackAIGeneration } from '@/lib/analytics';
import { generateStoryStream } from '@/services/geminiService';
import { analyzeManuscript, calculateQualityTag, type DirectorReport } from '@/engine/director';
import { stripEngineArtifacts } from '@/engine/pipeline';
import { evaluateQuality, getDefaultThresholds, buildRetryHint } from '@/engine/quality-gate';
import { generateSuggestions, getDefaultSuggestionConfig } from '@/engine/proactive-suggestions';
import { updateProfile, loadProfile, saveProfile, buildProfileHint } from '@/engine/writer-profile';

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
import { executePipeline, getDefaultPipelineConfig, type PipelineExecution } from '@/engine/auto-pipeline';
import type { ProactiveSuggestion } from '@/lib/studio-types';

type WritingMode = 'ai' | 'edit' | 'canvas' | 'refine' | 'advanced';

interface UseStudioAIParams {
  currentSession: ChatSession | null;
  currentSessionId: string | null;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  advancedSettings?: any;
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
  const abortControllerRef = useRef<AbortController | null>(null);
  const generationLockRef = useRef(false);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Cleanup: abort streaming + clear timeout on unmount
  useEffect(() => () => {
    abortControllerRef.current?.abort();
    clearTimeout(timeoutIdRef.current);
  }, []);

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsGenerating(false);
  }, []);

  const handleSend = useCallback(async (customPrompt?: string, inputValue?: string, clearInput?: () => void) => {
    const text = customPrompt || inputValue || '';
    if (!text.trim() || isGenerating || !currentSessionId || !currentSession) return;
    if (generationLockRef.current) return;

    // Tier gate: check generation limit (before acquiring lock to avoid permanent lock)
    if (!canGenerate()) {
      setUxError?.({ error: new Error('Free tier limit reached'), retry: () => {} });
      return;
    }
    generationLockRef.current = true;
    // HFCP: classify input and get prompt modifier
    const hfcpResult = processHFCPTurn(hfcpState, text);
    const hfcpPrefix = hfcpResult.promptModifier ? `\n${hfcpResult.promptModifier}\n` : '';
    const directivePrefix = promptDirective ? `\n[작가 지침: ${promptDirective}]\n` : '';
    const OUTPUT_MODE_LABELS: Record<string, string> = {
      'draft': '', 'dialogue-boost': '[출력 모드: 대화문 강화 — 대화 비율 60% 이상]',
      'description-boost': '[출력 모드: 묘사 강화 — 배경/감각/내면 묘사 중심]',
      'ending-hook': '[출력 모드: 엔딩 훅 강화 — 마지막 3문장에 강한 클리프행어]',
      'bridge': '[출력 모드: 연결부 — 이전 에피소드와 자연스럽게 이어지는 브릿지]',
    };
    const outputModePrefix = advancedOutputMode && OUTPUT_MODE_LABELS[advancedOutputMode] ? `\n${OUTPUT_MODE_LABELS[advancedOutputMode]}\n` : '';

    let advancedPrefix = '';
    // Advanced Writing Settings 적용 (집필 스튜디오 고도화)
    if (advancedSettings) {
      const adv = advancedSettings;
      const parts = [];
      if (adv.sceneGoals && adv.sceneGoals.length > 0) parts.push(`- 장면 목표(Scene Goals): ${adv.sceneGoals.join(', ')}`);
      if (adv.constraints) {
        parts.push(`- 시점(POV): ${adv.constraints.pov}`);
        parts.push(`- 대화 비율(Dialogue Ratio): 약 ${adv.constraints.dialogueRatio}%`);
        parts.push(`- 템포(Tempo): ${adv.constraints.tempo}`);
        parts.push(`- 문장 길이(Sentence Length): ${adv.constraints.sentenceLen}`);
        parts.push(`- 감정 노출도(Emotion Exposure): ${adv.constraints.emotionExposure}`);
      }
      if (adv.includes) parts.push(`- 필수 포함 요소(Must Include): ${adv.includes}`);
      if (adv.excludes) parts.push(`- 절대 금지 요소(Must Exclude): ${adv.excludes}`);
      
      if (parts.length > 0) {
        advancedPrefix = `\n[ADVANCED WRITING SETTINGS — 고급 집필 설정]\n${parts.join('\n')}\n`;
      }
    }

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

    const controller = new AbortController();
    abortControllerRef.current = controller;
    clearTimeout(timeoutIdRef.current);
    timeoutIdRef.current = setTimeout(() => abortControllerRef.current?.abort(), 180_000);
    const capturedSessionId = currentSessionId;
    // 비동기 타이밍에 currentSession이 null일 수 있으므로 방어 체크
    if (!currentSession) { clearTimeout(timeoutIdRef.current); generationLockRef.current = false; setIsGenerating(false); return; }
    const capturedConfig = currentSession.config;

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
      generationLockRef.current = false;
      setIsGenerating(false);
      clearTimeout(timeoutIdRef.current);
      const blockedMsg: Message = {
        id: `sys-${Date.now()}`, role: 'assistant', 
        content: language === 'KO' 
          ? `[시스템 통보] 파이프라인 검증 실패로 인해 AI 생성이 차단되었습니다. (${pipelineResultExecution.blockedAt} 완료 필요)` 
          : `[SYSTEM] AI generation blocked due to pipeline verification failure. (${pipelineResultExecution.blockedAt} required)`, 
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
      const profileHint = buildProfileHint(writerProfile, language === 'KO');
      const basePrompt = directivePrefix + outputModePrefix + advancedPrefix + hfcpPrefix + (profileHint ? `\n[Writer Profile] ${profileHint}\n` : '') + text;
      
      const { getDefaultGateConfig } = await import('@/engine/quality-gate');
      const gateConfig = getDefaultGateConfig(writerProfile.skillLevel);
      const maxAttempts = (gateConfig.enabled && gateConfig.autoMode === 'full_auto') ? gateConfig.maxRetries : 1;
      
      let attempt = 1;
      let finalContent = '';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let result: any;
      let dReport: DirectorReport = { findings: [], stats: {}, score: 100 };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let qTag: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let gateResult: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let ipCheck: any;
      let currentRetryHint = '';
      const gateHistory: QualityGateAttemptRecord[] = [];

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
                const visualPrefix = attempt > 1 ? `[Quality Gate: 자동 재작성 시도 ${attempt}/${maxAttempts}]\n\n` : '';
                const msgs = s.messages.map(m => m.id === aiMsgId ? { ...m, content: visualPrefix + displayContent } : m);
                return { ...s, messages: msgs };
              }
              return s;
            }));
          },
          { language, signal: controller.signal, platform: capturedConfig.platform, history: existingMessages, temperature: (() => { const d = getNarrativeDepth(); const base = parseFloat(localStorage.getItem('noa_temperature') || '0.9'); return Math.max(0.1, Math.min(1.5, base + (d - 1.0) * 0.4)); })() }
        );

        // Trademark/IP filter
        const { filterTrademarks } = await import('@/engine/validator');
        ipCheck = filterTrademarks(fullContent);
        if (ipCheck.matches.length > 0) fullContent = ipCheck.filtered;

        finalContent = stripEngineArtifacts(fullContent) || result.content;
        
        try { dReport = analyzeManuscript(finalContent, capturedConfig.publishPlatform); } catch { /* manuscript analysis advisory — non-blocking */ }
        qTag = calculateQualityTag(dReport, capturedConfig.narrativeIntensity || 'standard');

        gateResult = evaluateQuality(finalContent, capturedConfig, gateConfig.thresholds, language, attempt);

        // 시도별 이력 기록
        gateHistory.push({
          attempt,
          grade: gateResult.grade || '?',
          directorScore: dReport?.score ?? 0,
          qualityTag: qTag || '⚪',
          failReasons: [...(gateResult.failReasons || [])],
          passed: gateResult.passed,
        });

        if (gateResult.passed) break;

        currentRetryHint = buildRetryHint(gateResult, attempt, language === 'KO');
        onQualityGateRetry?.(attempt, maxAttempts, gateHistory);
        if (attempt < maxAttempts) {
          attempt++;
        } else {
          break;
        }
      }

      setLastReport(result.report);
      incrementGenerationCount();
      setDirectorReport(dReport);

      const retryHint = !gateResult.passed ? currentRetryHint : '';
      const gateMeta = { qualityGatePassed: gateResult.passed, qualityGateAttempt: gateResult.attempt, qualityGateReasons: gateResult.failReasons, qualityGateRetryHint: retryHint, qualityGateHistory: gateHistory };

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
              _latestUpdates: result.report.worldUpdates,
            }
          };
          updateCurrentSession({ config: updatedWorldSync });
        } catch (e) {
          // Sync fail is advisory, do not block pipeline
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
            const r = m.meta!.engineReport!;
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
      } catch { /* suggestions are advisory — never block */ }

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
      } catch { /* profile learning is meta — never block */ }

      setSessions(prev => prev.map(s => {
        if (s.id === capturedSessionId) {
          const msgs = s.messages.map(m =>
            m.id === aiMsgId
              ? { ...m, content: finalContent, meta: {
                  engineReport: result.report, grade: result.report.grade, eosScore: result.report.eosScore, metrics: result.report.metrics, ipFiltered: ipCheck.matches.length,
                  qualityTag: qTag.tag, qualityLabel: qTag.label,
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  qualityFindings: qTag.visibleFindings.map((f: any) => ({ kind: f.kind, severity: f.severity, message: f.message, lineNo: f.lineNo, excerpt: f.excerpt })),
                  ...gateMeta,
                } }
              : m
          );
          // Auto-collect manuscript on generation complete
          const cleanText = finalContent;
          if (cleanText.length > 100) {
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
          setUxError({ error: classified, retry: classified.retryable ? () => handleSend(text, undefined, undefined) : undefined });
        }
      }
    } finally {
      clearTimeout(timeoutIdRef.current);
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
  }, [isGenerating, currentSessionId, currentSession, hfcpState, promptDirective, language, canvasPass, advancedOutputMode, setSessions, updateCurrentSession, setCanvasContent, setWritingMode, setShowApiKeyModal, setUxError, onSuggestionsUpdate, onQualityGateRetry]);

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
        { language, signal: controller.signal, platform: capturedConfig2.platform, history: historyMessages, temperature: (() => { const d = getNarrativeDepth(); const base = parseFloat(localStorage.getItem('noa_temperature') || '0.9'); return Math.max(0.1, Math.min(1.5, base + (d - 1.0) * 0.4)); })() }
      );

      // Trademark/IP filter
      const { filterTrademarks } = await import('@/engine/validator');
      const ipCheck = filterTrademarks(fullContent);
      if (ipCheck.matches.length > 0) {
        fullContent = ipCheck.filtered;
      }

      const finalContent = stripEngineArtifacts(fullContent) || result.content;
      setLastReport(result.report);
      setSessions(prev => prev.map(s => {
        if (s.id === capturedSessionId2) {
          const msgs = s.messages.map(m => {
            if (m.id !== assistantMsgId) return m;
            const updatedVersions = [...(m.versions ?? []), finalContent];
            return { ...m, content: finalContent, versions: updatedVersions, currentVersionIndex: updatedVersions.length - 1, meta: { engineReport: result.report, grade: result.report.grade, eosScore: result.report.eosScore, metrics: result.report.metrics, ipFiltered: ipCheck.matches.length } };
          });
          return { ...s, messages: msgs };
        }
        return s;
      }));
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') { /* user cancelled */ }
      else {
        const classified = classifyAsStudioError(error);
        logger.error('StudioAI', classified);
        setUxError({ error: classified, retry: classified.retryable ? () => handleRegenerate(assistantMsgId) : undefined });
      }
    } finally {
      generationLockRef.current = false;
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [isGenerating, currentSessionId, currentSession, language, setSessions, setUxError]);

  return {
    isGenerating,
    setIsGenerating,
    lastReport,
    directorReport,
    handleCancel,
    handleSend,
    handleRegenerate,
  };
}
