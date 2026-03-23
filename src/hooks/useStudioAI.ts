// ============================================================
// PART 1 — Types & Imports
// ============================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Message, StoryConfig, ChatSession, AppLanguage,
} from '@/lib/studio-types';
import { type HFCPState as HFCPStateType, processHFCPTurn } from '@/engine/hfcp';
import { EngineReport } from '@/engine/types';
import { canGenerate, incrementGenerationCount } from '@/lib/tier';
import { trackAIGeneration } from '@/lib/analytics';
import { generateStoryStream } from '@/services/geminiService';
import { analyzeManuscript, type DirectorReport } from '@/engine/director';

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
    if (!text.trim() || isGenerating || !currentSessionId) return;

    // Tier gate: check generation limit
    if (!canGenerate()) {
      setUxError?.({ error: new Error('Free tier limit reached'), retry: () => {} });
      return;
    }
    incrementGenerationCount();

    // HFCP: classify input and get prompt modifier
    const hfcpResult = processHFCPTurn(hfcpState, text);
    const hfcpPrefix = hfcpResult.promptModifier ? `\n${hfcpResult.promptModifier}\n` : '';
    const directivePrefix = promptDirective ? `\n[작가 지침: ${promptDirective}]\n` : '';

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
    if (!currentSession) return;
    const capturedConfig = currentSession.config;

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
        configForAI, directivePrefix + hfcpPrefix + text,
        (chunk) => {
          fullContent += chunk;
          setSessions(prev => prev.map(s => {
            if (s.id === capturedSessionId) {
              const msgs = s.messages.map(m => m.id === aiMsgId ? { ...m, content: fullContent } : m);
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

      setLastReport(result.report);
      // NOD Director analysis
      const dirClean = fullContent.replace(/```json[\s\S]*?```/g, '').trim();
      setDirectorReport(analyzeManuscript(dirClean, capturedConfig.publishPlatform));
      setSessions(prev => prev.map(s => {
        if (s.id === capturedSessionId) {
          const msgs = s.messages.map(m =>
            m.id === aiMsgId
              ? { ...m, content: fullContent, meta: { engineReport: result.report, grade: result.report.grade, eosScore: result.report.eosScore, metrics: result.report.metrics, ipFiltered: ipCheck.matches.length } }
              : m
          );
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
        const clean = fullContent.replace(/```json[\s\S]*?```/g, '').trim();
        if (clean) setCanvasContent(clean);
        setWritingMode('canvas');
      }
      setIsGenerating(false);
      abortControllerRef.current = null;
      trackAIGeneration('unknown', 'unknown', canvasPass > 0 ? 'canvas' : 'ai');
    }
  }, [isGenerating, currentSessionId, currentSession, hfcpState, promptDirective, language, canvasPass, setSessions, updateCurrentSession, setCanvasContent, setWritingMode, setShowApiKeyModal, setUxError]);

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
          setSessions(prev => prev.map(s => {
            if (s.id === capturedSessionId2) {
              const msgs = s.messages.map(m => m.id === assistantMsgId ? { ...m, content: fullContent } : m);
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

      setLastReport(result.report);
      setSessions(prev => prev.map(s => {
        if (s.id === capturedSessionId2) {
          const msgs = s.messages.map(m => {
            if (m.id !== assistantMsgId) return m;
            const updatedVersions = [...(m.versions ?? []), fullContent];
            return { ...m, content: fullContent, versions: updatedVersions, currentVersionIndex: updatedVersions.length - 1, meta: { engineReport: result.report, grade: result.report.grade, eosScore: result.report.eosScore, metrics: result.report.metrics, ipFiltered: ipCheck.matches.length } };
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
