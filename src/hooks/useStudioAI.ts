// ============================================================
// PART 1 — Types & Imports
// ============================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Message, ChatSession, AppLanguage,
} from '@/lib/studio-types';
import { type HFCPState as HFCPStateType, processHFCPTurn } from '@/engine/hfcp';
import { EngineReport } from '@/engine/types';
import { canGenerate, incrementGenerationCount } from '@/lib/tier';
import { trackAIGeneration } from '@/lib/analytics';
import { generateStoryStream } from '@/services/geminiService';
import { analyzeManuscript, calculateQualityTag, type DirectorReport } from '@/engine/director';
import { stripEngineArtifacts } from '@/engine/pipeline';

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
}

// ============================================================
// PART 2 — Hook implementation
// ============================================================

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
}: UseStudioAIParams) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastReport, setLastReport] = useState<EngineReport | null>(null);
  const [directorReport, setDirectorReport] = useState<DirectorReport | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup: abort streaming on unmount
  useEffect(() => () => { abortControllerRef.current?.abort(); }, []);

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsGenerating(false);
  }, []);

  const handleSend = useCallback(async (customPrompt?: string, inputValue?: string, clearInput?: () => void) => {
    const text = customPrompt || inputValue || '';
    if (!text.trim() || isGenerating || !currentSessionId || !currentSession) return;

    // Tier gate: check generation limit
    if (!canGenerate()) {
      setUxError?.({ error: new Error('Free tier limit reached'), retry: () => {} });
      return;
    }
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
    const capturedSessionId = currentSessionId;
    // currentSession null 체크는 69행에서 이미 수행 — 여기서 early return하면
    // isGenerating이 true로 고정되므로 제거
    const capturedConfig = currentSession!.config;

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
      const result = await generateStoryStream(
        configForAI, directivePrefix + outputModePrefix + hfcpPrefix + text,
        (chunk) => {
          fullContent += chunk;
          const displayContent = stripEngineArtifacts(fullContent);
          setSessions(prev => prev.map(s => {
            if (s.id === capturedSessionId) {
              const msgs = s.messages.map(m => m.id === aiMsgId ? { ...m, content: displayContent } : m);
              return { ...s, messages: msgs };
            }
            return s;
          }));
        },
        { language, signal: controller.signal, platform: capturedConfig.platform, history: existingMessages }
      );

      // Trademark/IP filter
      const { filterTrademarks } = await import('@/engine/validator');
      const ipCheck = filterTrademarks(fullContent);
      if (ipCheck.matches.length > 0) {
        fullContent = ipCheck.filtered;
        console.info(`[IP Filter] ${ipCheck.matches.length}건 치환: ${[...new Set(ipCheck.matches.map(m => m.original))].join(', ')}`);
      }

      const finalContent = stripEngineArtifacts(fullContent) || result.content;
      setLastReport(result.report);
      incrementGenerationCount();
      // NOD Director analysis + Quality Tag (with error guard)
      let dReport: DirectorReport = { findings: [], stats: {}, score: 100 };
      try {
        dReport = analyzeManuscript(finalContent, capturedConfig.publishPlatform);
      } catch (dirErr) {
        console.warn('[Director] Analysis failed:', dirErr);
      }
      setDirectorReport(dReport);
      const qTag = calculateQualityTag(dReport, capturedConfig.narrativeIntensity || 'standard');
      setSessions(prev => prev.map(s => {
        if (s.id === capturedSessionId) {
          const msgs = s.messages.map(m =>
            m.id === aiMsgId
              ? { ...m, content: finalContent, meta: {
                  engineReport: result.report, grade: result.report.grade, eosScore: result.report.eosScore, metrics: result.report.metrics, ipFiltered: ipCheck.matches.length,
                  qualityTag: qTag.tag, qualityLabel: qTag.label,
                  qualityFindings: qTag.visibleFindings.map(f => ({ kind: f.kind, severity: f.severity, message: f.message, lineNo: f.lineNo, excerpt: f.excerpt })),
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
        // Show API key modal when server also has no key (401)
        const errMsg = error instanceof Error ? error.message : '';
        if (/401/i.test(errMsg)) {
          setShowApiKeyModal(true);
        } else {
          console.error(error);
          setUxError({ error, retry: () => handleSend(text, undefined, undefined) });
        }
      }
    } finally {
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
  }, [isGenerating, currentSessionId, currentSession, hfcpState, promptDirective, language, canvasPass, advancedOutputMode, setSessions, updateCurrentSession, setCanvasContent, setWritingMode, setShowApiKeyModal, setUxError]);

  const handleRegenerate = useCallback(async (assistantMsgId: string) => {
    if (isGenerating || !currentSessionId || !currentSession) return;
    const msgIndex = currentSession.messages.findIndex(m => m.id === assistantMsgId);
    if (msgIndex <= 0) return;
    const userMsg = currentSession.messages[msgIndex - 1];
    if (userMsg.role !== 'user') return;
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
        { language, signal: controller.signal, platform: capturedConfig2.platform, history: historyMessages }
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
        console.error(error);
        setUxError({ error, retry: () => handleRegenerate(assistantMsgId) });
      }
    } finally {
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
