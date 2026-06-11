"use client";

/* ===========================================================
   ChatCanvasDock — 채팅+캔버스 공용 접이식 도크 (Z2a-chatcanvas — 2026-06-11)

   R1 인터뷰 확정: 폼 탭 = 중앙 AI 채팅 + 우측 캔버스. TabWorld 가 이미
   그 구도(중앙 채팅 + 우측 보드)의 원형 — 본 도크는 그 패턴을 캔버스가
   화면 전체인 탭(캐릭터·플롯·연출)에 *접이식*으로 확산한다.

   - 기본 접힘: 좌측 슬림 스트립(토글 버튼)만 — 기존 캔버스 작업 무방해.
   - 열면: 좌측 1/3 채팅 패널 + 캔버스 자동 축소(우측 2/3).
   - 접힘 상태는 localStorage `noa-lg-chatdock` {[tabKey]:bool} 영속
     (TabWorld noa-lg-world-sections 패턴 동일).

   엔진 (전부 기존 재사용 — 신규 엔진 0):
   - 화자: buildNoaSystemHeader(roleMode) — 단일 노아 (N1-noa-identity).
   - 메모리: applyMemoryPolicy `lg-dock-{tabKey}` — HEAVY_TABS 미등록 키
     = light 정책 (sliding 20 + 요약 1블록). 새 대화 시 clearStoredSummary.
   - 전송: streamChat (@/lib/ai-providers) → /api/chat 경유 — NOA 게이트·
     Security Gate·ARI 폴백 자동 적용 (useWritingChat 와 동일 경로).
   - 에러: NoaBlockedError = 인라인 🛡 (notifyNoaBlock 가 고지 발신) /
     일반 에러 = 인라인 ⚠ + noa:toast error (ToastHost 계약·사일런트 금지).

   캔버스 반영 (b):
   - proposalGuide(탭별)가 노아에게 ```json 제안 블록 형식을 지시.
   - extractSuggestions(탭별)가 완료된 응답에서 구조화 제안을 감지 →
     메시지 아래 "채택" 버튼 렌더. 클릭 = 사용자 확인 (자동 덮어쓰기 금지).
   - 적용 로직은 탭이 소유 (DockSuggestion.apply — 기존 채택 경로 재사용:
     플롯 = adoptSuggestion(BEAT_SUGGEST 파서), 연출 = adoptSuggestion,
     캐릭터 = setConfig merge). 기존 AI 제안 버튼과 트리거 분리 (채팅은
     대화형 보완 — 기존 버튼 엔진을 재호출하지 않음).

   CSS: loreguard.css 기존 클래스만 재사용 (wd-chat-body·wd-msg·wd-bubble·
   wd-input·eh-icbtn·rdot·btn — 신규 CSS 0). 배치는 인라인 (공유 CSS 수정 금지).
   =========================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronL, MessageSquare, Send, Sync, X } from "@/components/loreguard/icons";
import { useStudio } from "@/app/studio/StudioContext";
import type { Message } from "@/lib/studio-types";
import { streamChat, type ChatMsg } from "@/lib/ai-providers";
import { applyMemoryPolicy, clearStoredSummary } from "@/lib/ai/chat-memory-policy";
import { buildNoaSystemHeader } from "@/lib/ai/noa-identity";
import { NoaBlockedError } from "@/lib/noa/block-notice";
import { L4 } from "@/lib/i18n";
import { logger } from "@/lib/logger";

// ============================================================
// PART 1 — 접힘 상태 영속 (localStorage `noa-lg-chatdock`)
// ============================================================
// {[tabKey]: boolean} — true = 열림. 기본 접힘 (캔버스 무방해).
// TabWorld readCollapsedTiers 와 동일한 SSR-safe lazy init 패턴.

const DOCK_STORE_KEY = "noa-lg-chatdock";

function readDockOpen(tabKey: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(DOCK_STORE_KEY);
    if (!raw) return false;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return false;
    return (parsed as Record<string, unknown>)[tabKey] === true;
  } catch {
    return false;
  }
}

function writeDockOpen(tabKey: string, open: boolean): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(DOCK_STORE_KEY);
    let obj: Record<string, unknown> = {};
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) obj = parsed as Record<string, unknown>;
    }
    obj[tabKey] = open;
    window.localStorage.setItem(DOCK_STORE_KEY, JSON.stringify(obj));
  } catch {
    /* noop — 프라이빗 모드 등 저장 불가 시 세션 내 상태만 유지 */
  }
}

// ============================================================
// PART 2 — 구조화 제안 추출 유틸 + 계약 타입
// ============================================================

/**
 * 응답 본문에서 ```json 코드 블록(또는 전체가 JSON 객체인 응답)을 파싱.
 * 스트리밍 중 부분 JSON·비JSON 블록은 조용히 스킵 (순수함수 — side effect 0).
 * 탭별 extractSuggestions 가 이 결과를 자기 파서(parseBeatSuggestions 등)에 넘긴다.
 */
export function extractJsonBlocks(content: string): unknown[] {
  const out: unknown[] = [];
  const re = /```(?:json)?\s*\n?([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const body = m[1].trim();
    if (!body.startsWith("{") && !body.startsWith("[")) continue;
    try {
      out.push(JSON.parse(body));
    } catch {
      /* 부분 스트림·비JSON — 무시 */
    }
  }
  if (out.length === 0) {
    const t = content.trim();
    if (t.startsWith("{")) {
      try {
        out.push(JSON.parse(t));
      } catch {
        /* 무시 */
      }
    }
  }
  return out;
}

/** 탭이 소유하는 캔버스 반영 1건 — apply 실행 = 사용자 확인(버튼 클릭) 후에만. */
export interface DockSuggestion {
  /** 메시지 내 dedupe·적용됨 추적 키 (예: `beat-${title}`) */
  key: string;
  /** 채택 버튼 라벨 (탭 어휘 — 예: "비트 채택: 제목") */
  label: string;
  /** 사용자 클릭 시 캔버스 반영 (탭 기존 채택 경로 재사용) */
  apply: () => void;
}

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
  placeholder,
  children,
}: ChatCanvasDockProps) {
  const { language, hasAiAccess, setShowApiKeyModal } = useStudio();

  // [N3-memory-hybrid] HEAVY_TABS 미등록 접두 키 → light 정책 (스펙: 메모리 light).
  const memoryTab = `lg-dock-${tabKey}`;

  const [open, setOpen] = useState<boolean>(() => readDockOpen(tabKey));
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  /** 적용 완료 추적 — `${msgId}:${suggestion.key}` (재클릭 중복 반영 방지) */
  const [applied, setApplied] = useState<Set<string>>(() => new Set());

  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const bodyRef = useRef<HTMLDivElement | null>(null);
  // applied 미러 ref — 더블클릭·재렌더 사이 race 에서도 apply() 1회 보장
  // (side effect 를 setState updater 안에 두면 StrictMode 이중 호출 위험 → 분리).
  const appliedRef = useRef<Set<string>>(new Set());

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
    // 접근 게이트 — 키/크레딧 없으면 silent failure 대신 API 키 모달 (탭 기존 패턴)
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
        proposalGuide,
        contextBlock ? `[캔버스 현황 — 실데이터]\n${contextBlock}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      await streamChat({
        systemInstruction: system + memory.summaryBlock,
        messages: history,
        temperature: 0.7,
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
          ko: "AI 응답에 실패했습니다. 다시 시도해주세요.",
          en: "AI response failed. Please try again.",
          ja: "AI応答に失敗しました。もう一度お試しください。",
          zh: "AI 响应失败,请重试。",
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
    proposalGuide,
    contextBlock,
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

  const handleApply = useCallback((msgId: string, sugg: DockSuggestion) => {
    const k = `${msgId}:${sugg.key}`;
    if (appliedRef.current.has(k)) return; // 중복 반영 방지 (1회 보장)
    const next = new Set(appliedRef.current);
    next.add(k);
    appliedRef.current = next;
    sugg.apply(); // 사용자 확인(클릭) 후 1회 — updater 밖 (StrictMode 안전)
    setApplied(next);
  }, []);

  const dockTitle = L4(language, {
    ko: "노아와 대화",
    en: "Chat with NOA",
    ja: "ノアと対話",
    zh: "与NOA对话",
  });
  const panelId = `lg-chatdock-${tabKey}`;

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
      {open ? (
        <section
          id={panelId}
          aria-label={dockTitle}
          style={{
            flex: "0 0 33.333%",
            minWidth: 300,
            maxWidth: 520,
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
              {L4(language, { ko: "노아", en: "NOA", ja: "ノア", zh: "NOA" })}
              <span className="wd-online" style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <span className={`rdot ${loading ? "amber" : "green"}`} />
                {loading
                  ? L4(language, { ko: "생성 중…", en: "Generating…", ja: "生成中…", zh: "生成中…" })
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
                aria-label={L4(language, { ko: "채팅 접기", en: "Collapse chat", ja: "チャットを折りたたむ", zh: "收起聊天" })}
                title={L4(language, { ko: "채팅 접기", en: "Collapse chat", ja: "チャットを折りたたむ", zh: "收起聊天" })}
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
                        ko: "노아입니다. 이 탭의 작업에 대해 무엇이든 물어보십시오. 구체적인 제안이 나오면 메시지 아래 채택 버튼으로 캔버스에 반영할 수 있습니다 — 반영은 항상 작가가 확정합니다.",
                        en: "This is NOA. Ask anything about this tab's work. When a concrete proposal appears, you can apply it to the canvas with the button under the message — you always confirm the change.",
                        ja: "ノアです。このタブの作業について何でも聞いてください。具体的な提案が出たら、メッセージ下のボタンでキャンバスに反映できます — 反映は常に作家が確定します。",
                        zh: "我是NOA。关于此标签页的工作,随时提问。出现具体提案时,可通过消息下方的按钮应用到画布 — 应用始终由作者确认。",
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
                              ? L4(language, { ko: "생성 중…", en: "Generating…", ja: "生成中…", zh: "生成中…" })
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
          </div>

          {/* 입력바 — wd-input 재사용 */}
          <div className="wd-input" style={{ margin: "0 12px 12px" }}>
            <input
              className="wd-in-field"
              placeholder={placeholder}
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
                aria-label={L4(language, { ko: "생성 중지", en: "Stop generating", ja: "生成を停止", zh: "停止生成" })}
                title={L4(language, { ko: "생성 중지", en: "Stop generating", ja: "生成を停止", zh: "停止生成" })}
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
