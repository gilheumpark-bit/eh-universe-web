"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildDockShortInputDirective,
  getAuthorCommandPlaceholder,
  hashDockMemoText,
  readDockOpen,
  toWorkNoteLang,
  writeDockOpen,
  type DockSuggestion,
  type DockSuggestionSource,
} from "@/components/loreguard/ChatCanvasDock.helpers";
import { ChatCanvasDockView } from "@/components/loreguard/ChatCanvasDock.view";
import { useStudio } from "@/app/studio/StudioContext";
import type { Message } from "@/lib/studio-types";
import { streamChat, type ChatMsg } from "@/lib/ai-providers";
import {
  applyMemoryPolicy,
  buildProjectScopedMemoryKey,
  clearStoredSummary,
} from "@/lib/ai/chat-memory-policy";
import {
  buildNoaBehaviorProfile,
  readNoaBehaviorPreferences,
  writeNoaBehaviorPreferences,
  type NoaBehaviorPreferences,
} from "@/lib/ai/noa-behavior-profile";
import { buildNoaSystemHeader } from "@/lib/ai/noa-identity";
import { summarizeJournalWeek, renderJournalWeekText } from "@/lib/creative/work-note";
import { buildNoaContinuationContext } from "@/lib/loreguard/noa-continuity-context";
import { NoaBlockedError } from "@/lib/noa/block-notice";
import { getReasoningStageForTab } from "@/lib/ai-reasoning";
import { buildAppBrainDecisionDirective, decideAppBrain } from "@/lib/noa/app-brain-policy";
import { buildTabExpertSystemDirective } from "@/lib/noa/tab-expert-registry";
import { L4 } from "@/lib/i18n";
import { logger } from "@/lib/logger";

export {
  extractJsonBlocks,
  type DockSuggestion,
  type DockSuggestionSource,
} from "@/components/loreguard/ChatCanvasDock.helpers";

interface ChatCanvasDockProps {
  /** 영속·메모리 네임스페이스 — 'character' | 'plot' | 'direction' */
  tabKey: string;
  /** 노아 역할 모드 (buildNoaSystemHeader 슬롯) — 탭별 유일한 화자 차이 */
  roleMode: string;
  /** 탭별 ```json 제안 형식 시스템 지시 */
  proposalGuide: string;
  /** 캔버스 현황 컨텍스트 (실데이터만 — 탭이 압축 구성, 없으면 미주입) */
  contextBlock?: string;
  /** 완료된 응답 → 구조화 제안 감지 (탭 파서 재사용) */
  extractSuggestions: (content: string) => DockSuggestion[];
  /** 입력 중/최근 대화 → 가벼운 메모 후보 감지 */
  extractQuickSuggestions?: (source: DockSuggestionSource) => DockSuggestion[];
  quickSuggestionTitle?: string;
  /** 입력창 placeholder */
  placeholder: string;
  /** 캔버스 (기존 탭 그리드 — 무수정 children) */
  children: React.ReactNode;
}

// ============================================================
// PART 3 — 도크 본체
// ============================================================

export default function ChatCanvasDock({
  tabKey,
  roleMode,
  proposalGuide,
  contextBlock,
  extractSuggestions,
  extractQuickSuggestions,
  quickSuggestionTitle,
  placeholder,
  children,
}: ChatCanvasDockProps) {
  const { language, hasAiAccess, setShowApiKeyModal, currentProjectId, currentSession } =
    useStudio();

  const [open, setOpen] = useState<boolean>(() => readDockOpen(tabKey));
  const [continuityNow] = useState(() => Date.now());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [preferences, setPreferences] = useState<NoaBehaviorPreferences>(() => readNoaBehaviorPreferences());
  /** 적용 완료 추적 — `${msgId}:${suggestion.key}` (재클릭 중복 반영 방지) */
  const [applied, setApplied] = useState<Set<string>>(() => new Set());

  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const bodyRef = useRef<HTMLDivElement | null>(null);
  // applied 미러 ref — 더블클릭·재렌더 사이 race 에서도 apply() 1회 보장
  // (side effect 를 setState updater 안에 두면 StrictMode 이중 호출 위험 → 분리).
  const appliedRef = useRef<Set<string>>(new Set());

  // [P1 project-memory-isolation 2026-06-14] 노아 도크 요약은 프로젝트 단위로 격리.
  // 같은 tabKey라도 다른 작품이면 이전 대화 요약이 systemInstruction에 붙으면 안 된다.
  const memoryTab = useMemo(
    () => buildProjectScopedMemoryKey(`lg-dock-${tabKey}`, currentProjectId),
    [currentProjectId, tabKey],
  );

  const workJournalText = useMemo(() => {
    if (!currentProjectId) return "";
    return renderJournalWeekText(
      summarizeJournalWeek(currentProjectId, continuityNow),
      toWorkNoteLang(language),
    );
  }, [continuityNow, currentProjectId, language]);

  const continuationContext = useMemo(
    () =>
      buildNoaContinuationContext({
        tabKey,
        projectId: currentProjectId,
        sessionMessages: currentSession?.messages ?? [],
        workJournalText,
      }),
    [currentProjectId, currentSession?.messages, tabKey, workJournalText],
  );

  const resolvedPlaceholder = useMemo(
    () => getAuthorCommandPlaceholder(language, tabKey, placeholder),
    [language, placeholder, tabKey],
  );

  const behaviorProfile = useMemo(
    () =>
      buildNoaBehaviorProfile({
        language,
        responseStyle: preferences.responseStyle,
        proposalMode: preferences.proposalMode,
        conversationLevel: preferences.conversationLevel,
        projectId: currentProjectId,
        tabKey,
        hasProjectBasis: continuationContext.hasStoredBasis || Boolean(contextBlock),
      }),
    [
      contextBlock,
      continuationContext.hasStoredBasis,
      currentProjectId,
      language,
      preferences.conversationLevel,
      preferences.proposalMode,
      preferences.responseStyle,
      tabKey,
    ],
  );

  const tabExpertDirective = useMemo(
    () => buildTabExpertSystemDirective(tabKey, language),
    [language, tabKey],
  );

  const updatePreferences = useCallback((patch: Partial<NoaBehaviorPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...patch };
      writeNoaBehaviorPreferences(next);
      return next;
    });
  }, []);

  // 언마운트 시 진행 중 스트림 중단 (setState-after-unmount 방지)
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  // 새 메시지·스트림 청크 도착 시 하단 고정 스크롤
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const toggleOpen = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      writeDockOpen(tabKey, next);
      return next;
    });
  }, [tabKey]);

  const handleAbort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }, []);

  // 새 대화 — 이전 대화 요약 누수 차단 (useWritingChat.clearChat 패턴)
  const handleClear = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setMessages([]);
    appliedRef.current = new Set();
    setApplied(new Set());
    clearStoredSummary(memoryTab);
  }, [memoryTab]);

  const sendChat = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    // 접근 게이트 — 키/크레딧 없으면 silent failure 대신 연결 키 모달 (탭 기존 패턴)
    if (!hasAiAccess) {
      setShowApiKeyModal(true);
      return;
    }

    const userMsg: Message = {
      id: `dock-u-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    const assistantId = `dock-a-${Date.now()}`;
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };

    // history 는 setState 반영 전 ref 스냅샷 + 이번 user 턴 수동 push (useWritingChat 동일)
    const base = messagesRef.current.map(
      (m) => ({ role: m.role, content: m.content }) as ChatMsg,
    );
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setLoading(true);

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const memory = applyMemoryPolicy(memoryTab, base, language);
      const history: ChatMsg[] = [...memory.messages, { role: "user", content: text }];
      const appBrainDecision = decideAppBrain({
        actionKind: "noa_suggestion",
        tabId: tabKey,
        approxChars: text.length,
        scores: {
          intentClarity: text.length < 12 ? 0.42 : 0.72,
          contextFit: contextBlock ? 0.74 : 0.46,
          evidenceFit: continuationContext.hasStoredBasis || contextBlock ? 0.7 : 0.45,
          userControl: 0.82,
          reversibility: 0.78,
          expertConfidence: 0.66,
          userIntentUnclear: text.length < 12 ? 0.62 : 0.24,
        },
      });
      const system = [
        buildNoaSystemHeader(roleMode),
        tabExpertDirective,
        buildAppBrainDecisionDirective(appBrainDecision),
        behaviorProfile.directive,
        buildDockShortInputDirective(language, tabKey, text),
        proposalGuide,
        contextBlock ? `[캔버스 현황 — 실데이터]\n${contextBlock}` : "",
        continuationContext.block,
      ]
        .filter(Boolean)
        .join("\n\n");

      await streamChat({
        systemInstruction: system + memory.summaryBlock,
        messages: history,
        temperature: 0.7,
        reasoningStage: getReasoningStageForTab(tabKey),
        signal: ctrl.signal,
        isChatMode: true,
        onChunk: (chunk) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
          );
        },
      });
    } catch (err) {
      if (abortRef.current !== ctrl) return; // 후속 요청·언마운트로 대체됨
      if (err instanceof Error && err.name === "AbortError") {
        logger.warn("ChatCanvasDock", "chat aborted");
      } else if (err instanceof NoaBlockedError) {
        // 게이트 차단 — notifyNoaBlock(ai-providers)가 고지 발신, 채팅엔 인라인 사유
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId && !m.content ? { ...m, content: `[차단] ${err.message}` } : m,
          ),
        );
      } else {
        logger.error("ChatCanvasDock", "chat failed", err);
        const msg = L4(language, {
          ko: "노아가 응답하지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
          en: "Noa response failed. Please try again.",
          ja: "ノアの応答に失敗しました。もう一度お試しください。",
          zh: "诺亚响应失败，请重试。",
        });
        try {
          window.dispatchEvent(
            new CustomEvent("noa:toast", { detail: { message: msg, variant: "error" } }),
          );
        } catch {
          /* noop */
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId && !m.content ? { ...m, content: `[오류] ${msg}` } : m,
          ),
        );
      }
    } finally {
      if (abortRef.current === ctrl) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  }, [
    input,
    loading,
    hasAiAccess,
    setShowApiKeyModal,
    memoryTab,
    language,
    roleMode,
    behaviorProfile.directive,
    tabExpertDirective,
    proposalGuide,
    contextBlock,
    continuationContext.hasStoredBasis,
    continuationContext.block,
    tabKey,
  ]);

  // 완료된 assistant 응답에서만 제안 추출 (스트리밍 중 마지막 메시지 = 부분 JSON 스킵)
  const suggestionsByMsg = useMemo(() => {
    const map = new Map<string, DockSuggestion[]>();
    messages.forEach((m, i) => {
      if (m.role !== "assistant" || !m.content) return;
      if (loading && i === messages.length - 1) return;
      const suggs = extractSuggestions(m.content);
      if (suggs.length > 0) map.set(m.id, suggs);
    });
    return map;
  }, [messages, loading, extractSuggestions]);

  const quickSuggestions = useMemo(() => {
    if (!extractQuickSuggestions) return [];
    const sources: DockSuggestionSource[] = messages
      .filter((m) => m.content.trim().length > 0)
      .slice(-6)
      .map((m) => ({
        id: m.id,
        role: m.role as DockSuggestionSource["role"],
        content: m.content,
      }));
    const liveInput = input.trim();
    if (liveInput) {
      sources.push({
        id: `live-${hashDockMemoText(liveInput)}`,
        role: "user",
        content: liveInput,
        live: true,
      });
    }

    const seen = new Set<string>();
    const out: DockSuggestion[] = [];
    for (const source of sources) {
      for (const suggestion of extractQuickSuggestions(source)) {
        const key = `quick:${source.id}:${suggestion.key}`;
        if (seen.has(key) || applied.has(key) || appliedRef.current.has(key)) continue;
        seen.add(key);
        out.push({ ...suggestion, key });
        if (out.length >= 5) return out;
      }
    }
    return out;
  }, [applied, extractQuickSuggestions, input, messages]);

  const handleApply = useCallback((msgId: string, sugg: DockSuggestion) => {
    const k = `${msgId}:${sugg.key}`;
    if (appliedRef.current.has(k)) return; // 중복 반영 방지 (1회 보장)
    const next = new Set(appliedRef.current);
    next.add(k);
    appliedRef.current = next;
    sugg.apply(); // 사용자 확인(클릭) 후 1회 — updater 밖 (StrictMode 안전)
    setApplied(next);
  }, []);

  const handleQuickApply = useCallback((sugg: DockSuggestion) => {
    if (appliedRef.current.has(sugg.key)) return;
    const next = new Set(appliedRef.current);
    next.add(sugg.key);
    appliedRef.current = next;
    sugg.apply();
    setApplied(next);
  }, []);

  const dockTitle = L4(language, {
    ko: "노아 작업창",
    en: "Noa work dock",
    ja: "ノア作業ドック",
    zh: "诺亚工作栏",
  });
  const panelId = `lg-chatdock-${tabKey}`;

  return (
    <ChatCanvasDockView
      applied={applied}
      behaviorProfile={behaviorProfile}
      bodyRef={bodyRef}
      dockTitle={dockTitle}
      handleAbort={handleAbort}
      handleApply={handleApply}
      handleClear={handleClear}
      handleQuickApply={handleQuickApply}
      input={input}
      language={language}
      loading={loading}
      messages={messages}
      open={open}
      panelId={panelId}
      preferences={preferences}
      quickSuggestionTitle={quickSuggestionTitle}
      quickSuggestions={quickSuggestions}
      resolvedPlaceholder={resolvedPlaceholder}
      roleMode={roleMode}
      sendChat={sendChat}
      setInput={setInput}
      setShowPrefs={setShowPrefs}
      showPrefs={showPrefs}
      suggestionsByMsg={suggestionsByMsg}
      toggleOpen={toggleOpen}
      updatePreferences={updatePreferences}
    >
      {children}
    </ChatCanvasDockView>
  );
}
