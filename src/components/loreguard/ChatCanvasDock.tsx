"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Chevron, ChevronL, MessageSquare, Send, Settings, Sync, X } from "@/components/loreguard/icons";
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
import { useStudio } from "@/app/studio/StudioContext";
import type { Message } from "@/lib/studio-types";
import { streamChat, type ChatMsg } from "@/lib/ai-providers";
import {
  applyMemoryPolicy,
  buildProjectScopedMemoryKey,
  clearStoredSummary,
} from "@/lib/ai/chat-memory-policy";
import {
  NOA_CONVERSATION_LEVELS,
  NOA_PROPOSAL_MODES,
  NOA_RESPONSE_STYLES,
  buildNoaBehaviorProfile,
  getNoaConversationLabel,
  getNoaProposalLabel,
  getNoaStyleLabel,
  readNoaBehaviorPreferences,
  writeNoaBehaviorPreferences,
  type NoaBehaviorPreferences,
  type NoaConversationLevel,
  type NoaProposalMode,
  type NoaResponseStyle,
} from "@/lib/ai/noa-behavior-profile";
import { buildNoaSystemHeader } from "@/lib/ai/noa-identity";
import { summarizeJournalWeek, renderJournalWeekText } from "@/lib/creative/work-note";
import { buildNoaContinuationContext } from "@/lib/loreguard/noa-continuity-context";
import { NoaBlockedError } from "@/lib/noa/block-notice";
import { getReasoningStageForTab } from "@/lib/ai-reasoning";
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
      const system = [
        buildNoaSystemHeader(roleMode),
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
            m.id === assistantId && !m.content ? { ...m, content: `🛡 ${err.message}` } : m,
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
            m.id === assistantId && !m.content ? { ...m, content: `⚠ ${msg}` } : m,
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
    proposalGuide,
    contextBlock,
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
    <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
      {open ? (
        <section
          id={panelId}
          className="lg-chatdock-panel"
          aria-label={dockTitle}
          style={{
            flex: "0 0 33.333%",
            minWidth: 260,
            maxWidth: 720,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid var(--line)",
            background: "var(--card)",
          }}
        >
          {/* 헤더 — 노아 단일 화자 + 상태 + 새 대화/접기 */}
          <div
            style={{
              flex: "0 0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              padding: "12px 14px",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <div className="wd-chat-title" style={{ fontSize: 13.5, minWidth: 0 }}>
              <MessageSquare size={15} />
              {L4(language, { ko: "노아", en: "Noa", ja: "ノア", zh: "诺亚" })}
              <span className="wd-online" style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <span className={`rdot ${loading ? "amber" : "green"}`} />
                {loading
                  ? L4(language, { ko: "준비 중…", en: "Preparing…", ja: "準備中…", zh: "准备中…" })
                  : roleMode}
              </span>
            </div>
            <div style={{ display: "flex", gap: 4, flex: "0 0 auto" }}>
              {messages.length > 0 && (
                <button
                  type="button"
                  className="eh-icbtn"
                  onClick={handleClear}
                  aria-label={L4(language, { ko: "새 대화", en: "New chat", ja: "新しい対話", zh: "新对话" })}
                  title={L4(language, { ko: "새 대화", en: "New chat", ja: "新しい対話", zh: "新对话" })}
                >
                  <Sync size={14} aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                className="eh-icbtn"
                onClick={toggleOpen}
                aria-expanded={true}
                aria-controls={panelId}
                aria-label={L4(language, { ko: "대화 접기", en: "Collapse dialog", ja: "対話を折りたたむ", zh: "收起对话" })}
                title={L4(language, { ko: "대화 접기", en: "Collapse dialog", ja: "対話を折りたたむ", zh: "收起对话" })}
              >
                <ChevronL size={15} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* 본문 — wd-chat-body 재사용 (스크롤·간격) */}
          <div ref={bodyRef} className="wd-chat-body" style={{ padding: "16px 14px" }}>
            {messages.length === 0 ? (
              <div className="wd-msg ai">
                <div className="wd-ai-av">EH</div>
                <div className="wd-ai-body">
                  <div className="wd-bubble ai">
                    <p className="wd-p">
                      {L4(language, {
                        ko: "노아는 작가의 지시를 기다립니다. 방향은 작가가 정하고, 노아는 선택지를 정리합니다. 캔버스 반영은 항상 작가가 확정합니다.",
                        en: "Noa waits for the author's direction. You set the direction; Noa organizes options. Canvas changes are always confirmed by you.",
                        ja: "ノアは作者の指示を待ちます。方向は作者が決め、ノアは選択肢を整理します。キャンバス反映は常に作者が確定します。",
                        zh: "诺亚等待作者指示。方向由作者决定，诺亚负责整理选项。画布变更始终由作者确认。",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg, i) =>
                msg.role === "user" ? (
                  <div key={msg.id} className="wd-msg user">
                    <div className="wd-time">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="wd-bubble user">{msg.content}</div>
                  </div>
                ) : (
                  <div key={msg.id} className="wd-msg ai">
                    <div className="wd-ai-av">EH</div>
                    <div className="wd-ai-body">
                      <div className="wd-time">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="wd-bubble ai">
                        <p className="wd-p" style={{ whiteSpace: "pre-wrap" }}>
                          {msg.content ||
                            (loading && i === messages.length - 1
                              ? L4(language, { ko: "준비 중…", en: "Preparing…", ja: "準備中…", zh: "准备中…" })
                              : "")}
                        </p>
                        {(suggestionsByMsg.get(msg.id) ?? []).length > 0 && (
                          <div className="wd-msg-actions" style={{ flexWrap: "wrap" }}>
                            {(suggestionsByMsg.get(msg.id) ?? []).map((sugg) => {
                              const k = `${msg.id}:${sugg.key}`;
                              const done = applied.has(k);
                              return (
                                <button
                                  key={k}
                                  type="button"
                                  className="btn"
                                  style={{ fontSize: 12, padding: "4px 10px" }}
                                  disabled={done}
                                  onClick={() => handleApply(msg.id, sugg)}
                                  title={
                                    done
                                      ? L4(language, { ko: "캔버스에 반영됨", en: "Applied to canvas", ja: "キャンバスに反映済み", zh: "已应用到画布" })
                                      : sugg.label
                                  }
                                >
                                  <Check size={13} aria-hidden="true" />
                                  {done
                                    ? L4(language, { ko: "반영됨", en: "Applied", ja: "反映済み", zh: "已应用" })
                                    : sugg.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ),
              )
            )}
            {quickSuggestions.length > 0 ? (
              <div className="wd-msg ai">
                <div className="wd-ai-av">EH</div>
                <div className="wd-ai-body">
                  <div className="wd-bubble ai">
                    <p className="wd-p" style={{ fontWeight: 700 }}>
                      {quickSuggestionTitle ??
                        L4(language, {
                          ko: "대화 메모 후보",
                          en: "Conversation note candidates",
                          ja: "会話メモ候補",
                          zh: "对话备忘候选",
                        })}
                    </p>
                    <div className="wd-msg-actions" style={{ flexWrap: "wrap" }}>
                      {quickSuggestions.map((sugg) => (
                        <button
                          key={sugg.key}
                          type="button"
                          className="btn"
                          style={{ fontSize: 12, padding: "4px 10px" }}
                          onClick={() => handleQuickApply(sugg)}
                          title={sugg.label}
                        >
                          <Check size={13} aria-hidden="true" />
                          {sugg.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* 입력바 — wd-input 재사용 */}
          <div className="wd-input lg-chatdock-input" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                minHeight: 28,
              }}
            >
              <button
                type="button"
                className="btn ghost"
                style={{
                  minHeight: 28,
                  padding: "3px 8px",
                  fontSize: 11.5,
                  borderColor: "var(--line)",
                  color: "var(--ink-2)",
                  minWidth: 0,
                }}
                aria-expanded={showPrefs}
                onClick={() => setShowPrefs((prev) => !prev)}
                title={L4(language, { ko: "노아 응답 스타일", en: "Noa response style", ja: "ノア応答スタイル", zh: "诺亚回复风格" })}
              >
                <Settings size={13} aria-hidden="true" />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {behaviorProfile.publicLabel}
                </span>
                <Chevron size={13} aria-hidden="true" />
              </button>
              <span
                style={{
                  color: "var(--ink-3)",
                  fontSize: 11,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {behaviorProfile.visibleHint}
              </span>
            </div>
            {showPrefs ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(112px, 1fr))",
                  gap: 8,
                }}
              >
                <label style={{ display: "grid", gap: 4, fontSize: 11, color: "var(--ink-3)" }}>
                  {L4(language, { ko: "응답 스타일", en: "Response style", ja: "応答スタイル", zh: "回复风格" })}
                  <select
                    value={preferences.responseStyle}
                    onChange={(event) =>
                      updatePreferences({ responseStyle: event.target.value as NoaResponseStyle })
                    }
                    style={{
                      minHeight: 36,
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                      background: "var(--card)",
                      color: "var(--ink-1)",
                      padding: "0 8px",
                      fontSize: 12,
                    }}
                  >
                    {NOA_RESPONSE_STYLES.map((style) => (
                      <option key={style} value={style}>
                        {getNoaStyleLabel(language, style)}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: "grid", gap: 4, fontSize: 11, color: "var(--ink-3)" }}>
                  {L4(language, { ko: "제안 방식", en: "Suggestion mode", ja: "提案方式", zh: "建议方式" })}
                  <select
                    value={preferences.proposalMode}
                    onChange={(event) =>
                      updatePreferences({ proposalMode: event.target.value as NoaProposalMode })
                    }
                    style={{
                      minHeight: 36,
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                      background: "var(--card)",
                      color: "var(--ink-1)",
                      padding: "0 8px",
                      fontSize: 12,
                    }}
                  >
                    {NOA_PROPOSAL_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {getNoaProposalLabel(language, mode)}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: "grid", gap: 4, fontSize: 11, color: "var(--ink-3)" }}>
                  {L4(language, { ko: "대화 밀도", en: "Conversation level", ja: "会話密度", zh: "对话密度" })}
                  <select
                    value={preferences.conversationLevel}
                    onChange={(event) =>
                      updatePreferences({ conversationLevel: event.target.value as NoaConversationLevel })
                    }
                    style={{
                      minHeight: 36,
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                      background: "var(--card)",
                      color: "var(--ink-1)",
                      padding: "0 8px",
                      fontSize: 12,
                    }}
                  >
                    {NOA_CONVERSATION_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {getNoaConversationLabel(language, level)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              className="wd-in-field"
              placeholder={resolvedPlaceholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendChat();
                }
              }}
              disabled={loading}
            />
            {loading ? (
              <button
                type="button"
                className="wd-in-send"
                aria-label={L4(language, { ko: "제안 중지", en: "Stop suggestion", ja: "提案を停止", zh: "停止建议" })}
                title={L4(language, { ko: "제안 중지", en: "Stop suggestion", ja: "提案を停止", zh: "停止建议" })}
                onClick={handleAbort}
              >
                <X size={16} aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                className="wd-in-send"
                aria-label={L4(language, { ko: "전송", en: "Send", ja: "送信", zh: "发送" })}
                onClick={() => void sendChat()}
                disabled={!input.trim()}
              >
                <Send size={16} aria-hidden="true" />
              </button>
            )}
            </div>
          </div>
        </section>
      ) : (
        // 접힘 — 슬림 스트립 (기본 상태·캔버스 무방해)
        <div
          style={{
            flex: "0 0 auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "10px 5px",
            borderRight: "1px solid var(--line)",
          }}
        >
          <button
            type="button"
            className="eh-icbtn"
            onClick={toggleOpen}
            aria-expanded={false}
            aria-controls={panelId}
            aria-label={dockTitle}
            title={dockTitle}
          >
            <MessageSquare size={17} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* 캔버스 — 기존 탭 그리드 무수정 (flex:1 그대로 작동) */}
      <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
}
