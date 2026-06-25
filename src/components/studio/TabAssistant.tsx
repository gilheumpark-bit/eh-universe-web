'use client';

// ============================================================
// PART 1 — Types & Runtime Dependencies
// ============================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, StopCircle, Bot, User, Trash2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { AppLanguage, AppTab, StoryConfig } from '@/lib/studio-types';
import { createT, L4 } from '@/lib/i18n';
import { streamChat, getApiKey, getActiveProvider, getActiveModel, hasDgxService } from '@/lib/ai-providers';
import type { ChatMsg } from '@/lib/ai-providers';
import { HISTORY_LIMITS, truncateMessages } from '@/lib/token-utils';
import {
  applyMemoryPolicy,
  buildProjectScopedMemoryKey,
  clearStoredSummary,
} from '@/lib/ai/chat-memory-policy';
import {
  buildNoaBehaviorDirective,
  readNoaBehaviorPreferences,
} from '@/lib/ai/noa-behavior-profile';
import { getReasoningStageForTab } from '@/lib/ai-reasoning';
import { buildAppBrainDecisionDirective, decideAppBrain } from '@/lib/noa/app-brain-policy';
import { buildTabExpertSystemDirective, normalizeBrainTabId } from '@/lib/noa/tab-expert-registry';
import { classifyError } from './UXHelpers';
import { useStudioBackendLabel } from '@/lib/studio-ai-backend-label';
import {
  TAB_ASSISTANT_STORAGE_PREFIX,
  TAB_CONTEXT,
  TAB_PRESETS,
  buildContextSummary,
} from './TabAssistant.model';

interface TabMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface TabAssistantProps {
  tab: AppTab;
  language: AppLanguage;
  config: StoryConfig | null;
  hostedProviders?: Partial<Record<string, boolean>>;
  currentProjectId?: string | null;
}

// ============================================================
// PART 2 — Component
// ============================================================


const TabAssistant: React.FC<TabAssistantProps> = ({ tab, language, config, hostedProviders = {}, currentProjectId = null }) => {
  const ctx = TAB_CONTEXT[tab];
  const lk: 'ko' | 'en' = (language === 'KO' || language === 'JP') ? 'ko' : 'en';
  const tl = createT(language);
  const backendLabel = useStudioBackendLabel(language, hostedProviders);
  const scopedTab = buildProjectScopedMemoryKey(tab, currentProjectId);
  const storageKey = `${TAB_ASSISTANT_STORAGE_PREFIX}${scopedTab}`;

  // Check AI access: local key OR hosted provider
  // UX backlog: Ctrl+/ keyboard shortcut would be useful to toggle this assistant panel open/closed.
  const hasAiKey = Boolean(getApiKey(getActiveProvider()) || hostedProviders[getActiveProvider()] || hasDgxService());

  const [messages, setMessages] = useState<TabMessage[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [behaviorPreferences] = useState(() => readNoaBehaviorPreferences());
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const skipPersistRef = useRef(false);

  // 프로젝트 전환 시 화면 메시지도 해당 프로젝트 저장분으로 교체한다.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(storageKey);
      skipPersistRef.current = true;
      setMessages(stored ? JSON.parse(stored) : []);
    } catch {
      skipPersistRef.current = true;
      setMessages([]);
    }
  }, [storageKey]);

  // Persist messages
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    localStorage.setItem(storageKey, JSON.stringify(messages.slice(-HISTORY_LIMITS.STORAGE)));
  }, [messages, storageKey]);

  // Auto-scroll
  useEffect(() => {
    if (!collapsed) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, collapsed]);

  const handleSend = useCallback(async () => {
    if (!ctx) return;
    const text = input.trim();
    if (!text || isStreaming) return;

    if (!hasAiKey) {
      const errMsg: TabMessage = { id: `te-${Date.now()}`, role: 'assistant', content: tl('tabAssistant.apiKeyMissing') };
      setMessages(prev => [...prev, errMsg]);
      return;
    }

    const userMsg: TabMessage = { id: `tu-${Date.now()}`, role: 'user', content: text };
    const aiMsgId = `ta-${Date.now()}`;
    const aiMsg: TabMessage = { id: aiMsgId, role: 'assistant', content: '' };

    setMessages(prev => [...prev, userMsg, aiMsg]);
    setInput('');
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    // [N3-memory-hybrid] slice(-HISTORY_LIMITS.CHAT_API) → 탭 차등 정책 모듈 경유.
    // heavy(world·direction·writing)=full+요약 / light(기타)=최근 20+이전 구간 요약 1블록.
    // 요약 블록은 system에 부착 — 아래 truncateMessages(최후 안전망)는 messages만 자르므로 충돌 X.
    const memory = applyMemoryPolicy(
      scopedTab,
      messages.map(m => ({ role: m.role, content: m.content })),
      language,
    );
    const behaviorDirective = buildNoaBehaviorDirective({
      language,
      responseStyle: behaviorPreferences.responseStyle,
      proposalMode: behaviorPreferences.proposalMode,
      conversationLevel: behaviorPreferences.conversationLevel,
      projectId: currentProjectId,
      tabKey: tab,
      hasProjectBasis: Boolean(config),
    });
    const normalizedBrainTab = normalizeBrainTabId(tab);
    const appBrainDecision = decideAppBrain({
      actionKind: 'noa_suggestion',
      tabId: normalizedBrainTab,
      approxChars: text.length,
      scores: {
        intentClarity: text.length < 12 ? 0.42 : 0.72,
        contextFit: config ? 0.72 : 0.46,
        evidenceFit: config ? 0.68 : 0.44,
        userControl: 0.82,
        reversibility: 0.78,
        expertConfidence: 0.64,
        userIntentUnclear: text.length < 12 ? 0.62 : 0.24,
      },
    });
    const systemPrompt = [
      lk === 'ko' ? ctx.systemKo : ctx.systemEn,
      buildTabExpertSystemDirective(normalizedBrainTab, language),
      behaviorDirective,
      buildAppBrainDecisionDirective(appBrainDecision),
      buildContextSummary(config, tab),
      memory.summaryBlock,
    ].filter(Boolean).join('\n\n');
    const recentMsgs: ChatMsg[] = [...memory.messages];
    const model = getActiveModel();
    const { messages: trimmedHistory } = truncateMessages(systemPrompt, recentMsgs, model);
    const chatHistory: ChatMsg[] = [...trimmedHistory, { role: 'user', content: text }];

    let fullContent = '';
    try {
      await streamChat({
        systemInstruction: systemPrompt,
        messages: chatHistory,
        temperature: ctx.temperature,
        reasoningStage: getReasoningStageForTab(tab),
        signal: controller.signal,
        isChatMode: true,
        onChunk: (chunk) => {
          fullContent += chunk;
          const snapshot = fullContent;
          setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: snapshot } : m));
        },
      });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') { /* cancelled */ }
      else {
        const info = classifyError(err, language);
        const detail = info.action ? `\n\n💡 ${info.action}` : '';
        setMessages(prev => prev.map(m =>
          m.id === aiMsgId ? { ...m, content: `⚠️ ${info.title}\n${info.message}${detail}` } : m
        ));
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [
    input,
    isStreaming,
    messages,
    config,
    tab,
    scopedTab,
    language,
    lk,
    ctx,
    tl,
    hasAiKey,
    behaviorPreferences,
    currentProjectId,
  ]);

  const handleCancel = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(storageKey);
    // [N3-memory-hybrid] 이전 대화 요약도 함께 삭제 — 새 대화 누수 방지
    clearStoredSummary(scopedTab);
  };

  if (!ctx) return null;

  return (
    <div className="border border-border rounded-2xl bg-bg-secondary/50 overflow-hidden flex flex-col">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}
        aria-label="Toggle tab assistant"
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg-secondary/80 transition-colors"
      >
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-black uppercase tracking-widest text-accent-purple font-mono min-w-0 text-left">
          <span className="inline-flex items-center gap-2 shrink-0">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            {ctx[lk]}
          </span>
          {backendLabel ? (
            <span className="text-[10px] font-mono font-bold text-text-tertiary normal-case tracking-normal truncate max-w-[min(100%,14rem)]" title={backendLabel}>
              · {backendLabel}
            </span>
          ) : null}
        </span>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <span className="text-xs text-text-tertiary font-mono">{messages.length} msg</span>
          )}
          {collapsed ? <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" /> : <ChevronUp className="w-3.5 h-3.5 text-text-tertiary" />}
        </div>
      </button>

      {!collapsed && (
        <>
          {/* Messages */}
          <div className="max-h-60 sm:max-h-80 overflow-y-auto px-4 py-2 space-y-3 custom-scrollbar">
            {messages.length === 0 && (
              <div className="py-4 space-y-3">
                <p className="text-sm text-text-tertiary italic text-center">
                  {tl('tabAssistant.askAnything').replace('{name}', ctx[lk])}
                </p>
                {TAB_PRESETS[tab] && (
                  <div className="flex flex-wrap gap-1.5 justify-center px-2">
                    {TAB_PRESETS[tab].map((preset, i) => {
                      // 2026-04-21 [i18n] L4로 4언어 동적 선택 (이전엔 lk='ko'|'en' 만 지원)
                      const label = L4(language, preset);
                      return (
                        <button
                          key={i}
                          onClick={() => { setInput(label); }}
                          className="px-3 py-1.5 bg-bg-tertiary/50 border border-border rounded-lg text-xs text-text-tertiary hover:text-accent-purple hover:border-accent-purple/50 transition-colors font-mono leading-tight"
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${
                  msg.role === 'user' ? 'bg-bg-tertiary' : 'bg-accent-purple/20'
                }`}>
                  {msg.role === 'user' ? <User className="w-3 h-3 text-text-tertiary" /> : <Bot className="w-3 h-3 text-accent-purple" />}
                </div>
                <div className={`max-w-[90%] sm:max-w-[80%] px-3 py-2.5 rounded-xl text-sm leading-relaxed ${
                  msg.role === 'user' ? 'bg-bg-tertiary/80 text-text-secondary' :
                  msg.content?.includes('NOA 보안 차단') ? 'bg-accent-red/10 text-accent-red border border-accent-red/30' :
                  'bg-transparent text-text-secondary'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content || (isStreaming ? '...' : '')}</p>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border">
            <div className="flex items-end gap-2">
              {messages.length > 0 && (
                <button onClick={clearChat} aria-label={tl('tabAssistant.clearChat')} className="p-2 rounded-lg text-text-tertiary hover:text-accent-red hover:bg-bg-tertiary/50 transition-colors shrink-0" title={tl('tabAssistant.clearChat')}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.nativeEvent.isComposing || e.keyCode === 229) return; if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={!hasAiKey
                  ? tl('tabAssistant.apiKeyRequired')
                  : tl('tabAssistant.askQuestion')}
                maxLength={5000}
                className={`flex-1 bg-bg-tertiary/50 border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder-text-tertiary resize-none outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-purple/30 max-h-24 transition-colors ${!hasAiKey ? 'opacity-60' : ''}`}
                rows={1}
                disabled={isStreaming || !hasAiKey}
              />
              {isStreaming ? (
                <button onClick={handleCancel} aria-label="중단" className="p-2 rounded-xl bg-accent-red text-white shrink-0 hover:opacity-80 transition-opacity">
                  <StopCircle className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={handleSend} disabled={!input.trim()} aria-label="전송" className={`p-2 rounded-xl shrink-0 transition-colors ${input.trim() ? 'bg-accent-purple text-white' : 'bg-bg-tertiary text-text-tertiary'}`}>
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TabAssistant;
