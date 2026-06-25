"use client";

import type React from "react";
import { Check, Chevron, ChevronL, MessageSquare, Send, Settings, Sync, X } from "@/components/loreguard/icons";
import type { DockSuggestion } from "@/components/loreguard/ChatCanvasDock.helpers";
import {
  NOA_CONVERSATION_LEVELS,
  NOA_PROPOSAL_MODES,
  NOA_RESPONSE_STYLES,
  getNoaConversationLabel,
  getNoaProposalLabel,
  getNoaStyleLabel,
  type NoaBehaviorPreferences,
  type NoaConversationLevel,
  type NoaProposalMode,
  type NoaResponseStyle,
} from "@/lib/ai/noa-behavior-profile";
import { L4 } from "@/lib/i18n";
import type { AppLanguage, Message } from "@/lib/studio-types";

type BehaviorProfileViewModel = {
  publicLabel: string;
  visibleHint: string;
};

type ChatCanvasDockViewProps = {
  applied: Set<string>;
  behaviorProfile: BehaviorProfileViewModel;
  bodyRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
  dockTitle: string;
  handleAbort: () => void;
  handleApply: (msgId: string, suggestion: DockSuggestion) => void;
  handleClear: () => void;
  handleQuickApply: (suggestion: DockSuggestion) => void;
  input: string;
  language: AppLanguage;
  loading: boolean;
  messages: Message[];
  open: boolean;
  panelId: string;
  preferences: NoaBehaviorPreferences;
  quickSuggestionTitle?: string;
  quickSuggestions: DockSuggestion[];
  resolvedPlaceholder: string;
  roleMode: string;
  sendChat: () => Promise<void>;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  setShowPrefs: React.Dispatch<React.SetStateAction<boolean>>;
  showPrefs: boolean;
  suggestionsByMsg: Map<string, DockSuggestion[]>;
  toggleOpen: () => void;
  updatePreferences: (patch: Partial<NoaBehaviorPreferences>) => void;
};

function ChatDockHeader({
  dockTitle,
  handleClear,
  language,
  loading,
  messages,
  panelId,
  roleMode,
  toggleOpen,
}: Pick<ChatCanvasDockViewProps, "dockTitle" | "handleClear" | "language" | "loading" | "messages" | "panelId" | "roleMode" | "toggleOpen">) {
  return (
    <div className="lg-chatdock-head">
      <div className="wd-chat-title lg-chatdock-title">
        <MessageSquare size={15} />
        {L4(language, { ko: "노아", en: "Noa", ja: "ノア", zh: "诺亚" })}
        <span className="wd-online lg-chatdock-online">
          <span className={`rdot ${loading ? "amber" : "green"}`} />
          {loading
            ? L4(language, { ko: "준비 중...", en: "Preparing...", ja: "準備中...", zh: "准备中..." })
            : roleMode}
        </span>
      </div>
      <div className="lg-chatdock-head-actions">
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
  );
}

function ChatDockBody({
  applied,
  bodyRef,
  handleApply,
  handleQuickApply,
  language,
  loading,
  messages,
  quickSuggestionTitle,
  quickSuggestions,
  suggestionsByMsg,
}: Pick<ChatCanvasDockViewProps, "applied" | "bodyRef" | "handleApply" | "handleQuickApply" | "language" | "loading" | "messages" | "quickSuggestionTitle" | "quickSuggestions" | "suggestionsByMsg">) {
  return (
    <div ref={bodyRef} className="wd-chat-body lg-chatdock-body">
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
        messages.map((msg, index) =>
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
                  <p className="wd-p wd-prewrap">
                    {msg.content ||
                      (loading && index === messages.length - 1
                        ? L4(language, { ko: "준비 중...", en: "Preparing...", ja: "準備中...", zh: "准备中..." })
                        : "")}
                  </p>
                  {(suggestionsByMsg.get(msg.id) ?? []).length > 0 && (
                    <div className="wd-msg-actions lg-chatdock-actions">
                      {(suggestionsByMsg.get(msg.id) ?? []).map((suggestion) => {
                        const key = `${msg.id}:${suggestion.key}`;
                        const done = applied.has(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            className="btn lg-chatdock-action-btn"
                            disabled={done}
                            onClick={() => handleApply(msg.id, suggestion)}
                            title={
                              done
                                ? L4(language, { ko: "캔버스에 반영됨", en: "Applied to canvas", ja: "キャンバスに反映済み", zh: "已应用到画布" })
                                : suggestion.label
                            }
                          >
                            <Check size={13} aria-hidden="true" />
                            {done
                              ? L4(language, { ko: "반영됨", en: "Applied", ja: "反映済み", zh: "已应用" })
                              : suggestion.label}
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
              <p className="wd-p lg-chatdock-note-title">
                {quickSuggestionTitle ??
                  L4(language, {
                    ko: "대화 메모 후보",
                    en: "Conversation note candidates",
                    ja: "会話メモ候補",
                    zh: "对话备忘候选",
                  })}
              </p>
              <div className="wd-msg-actions lg-chatdock-actions">
                {quickSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.key}
                    type="button"
                    className="btn lg-chatdock-action-btn"
                    onClick={() => handleQuickApply(suggestion)}
                    title={suggestion.label}
                  >
                    <Check size={13} aria-hidden="true" />
                    {suggestion.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChatDockInput({
  behaviorProfile,
  handleAbort,
  input,
  language,
  loading,
  preferences,
  resolvedPlaceholder,
  sendChat,
  setInput,
  setShowPrefs,
  showPrefs,
  updatePreferences,
}: Pick<ChatCanvasDockViewProps, "behaviorProfile" | "handleAbort" | "input" | "language" | "loading" | "preferences" | "resolvedPlaceholder" | "sendChat" | "setInput" | "setShowPrefs" | "showPrefs" | "updatePreferences">) {
  return (
    <div className="wd-input lg-chatdock-input">
      <div className="lg-chatdock-prefbar">
        <button
          type="button"
          className="btn ghost lg-chatdock-prefbtn"
          aria-expanded={showPrefs}
          onClick={() => setShowPrefs((prev) => !prev)}
          title={L4(language, { ko: "노아 응답 스타일", en: "Noa response style", ja: "ノア応答スタイル", zh: "诺亚回复风格" })}
        >
          <Settings size={13} aria-hidden="true" />
          <span className="lg-chatdock-ellipsis">
            {behaviorProfile.publicLabel}
          </span>
          <Chevron size={13} aria-hidden="true" />
        </button>
        <span className="lg-chatdock-hint">
          {behaviorProfile.visibleHint}
        </span>
      </div>
      {showPrefs ? (
        <div className="lg-chatdock-prefs-grid">
          <label className="lg-chatdock-pref-field">
            {L4(language, { ko: "응답 스타일", en: "Response style", ja: "応答スタイル", zh: "回复风格" })}
            <select
              value={preferences.responseStyle}
              onChange={(event) =>
                updatePreferences({ responseStyle: event.target.value as NoaResponseStyle })
              }
              className="lg-chatdock-pref-select"
            >
              {NOA_RESPONSE_STYLES.map((style) => (
                <option key={style} value={style}>
                  {getNoaStyleLabel(language, style)}
                </option>
              ))}
            </select>
          </label>
          <label className="lg-chatdock-pref-field">
            {L4(language, { ko: "제안 방식", en: "Suggestion mode", ja: "提案方式", zh: "建议方式" })}
            <select
              value={preferences.proposalMode}
              onChange={(event) =>
                updatePreferences({ proposalMode: event.target.value as NoaProposalMode })
              }
              className="lg-chatdock-pref-select"
            >
              {NOA_PROPOSAL_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {getNoaProposalLabel(language, mode)}
                </option>
              ))}
            </select>
          </label>
          <label className="lg-chatdock-pref-field">
            {L4(language, { ko: "대화 밀도", en: "Conversation level", ja: "会話密度", zh: "对话密度" })}
            <select
              value={preferences.conversationLevel}
              onChange={(event) =>
                updatePreferences({ conversationLevel: event.target.value as NoaConversationLevel })
              }
              className="lg-chatdock-pref-select"
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
      <div className="lg-chatdock-input-row">
        <input
          className="wd-in-field"
          placeholder={resolvedPlaceholder}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
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
  );
}

export function ChatCanvasDockView(props: ChatCanvasDockViewProps) {
  const {
    children,
    dockTitle,
    open,
    panelId,
    toggleOpen,
  } = props;

  return (
    <div className="lg-chatdock-layout">
      {open ? (
        <section id={panelId} className="lg-chatdock-panel" aria-label={dockTitle}>
          <ChatDockHeader {...props} />
          <ChatDockBody {...props} />
          <ChatDockInput {...props} />
        </section>
      ) : (
        <div className="lg-chatdock-strip">
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

      <div className="lg-chatdock-canvas">
        {children}
      </div>
    </div>
  );
}
