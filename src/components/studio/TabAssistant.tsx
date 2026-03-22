'use client';

// ============================================================
// PART 1 — Types & Context Builders
// ============================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, StopCircle, Bot, User, Trash2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { AppLanguage, AppTab, StoryConfig } from '@/lib/studio-types';
import { streamChat, getApiKey, getActiveProvider } from '@/lib/ai-providers';
import type { ChatMsg } from '@/lib/ai-providers';
import { HISTORY_LIMITS } from '@/lib/token-utils';
import { classifyError } from './UXHelpers';

interface TabMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface TabAssistantProps {
  tab: AppTab;
  language: AppLanguage;
  config: StoryConfig | null;
}

const TAB_CONTEXT: Record<string, { ko: string; en: string; systemKo: string; systemEn: string }> = {
  world: {
    ko: '세계관 어시스턴트',
    en: 'World Assistant',
    systemKo: '당신은 소설 세계관 설계 전문 어시스턴트입니다. 장르, 배경, 시놉시스를 기반으로 세계관 설계를 도와주세요. 질문에 구체적이고 창의적으로 답하되, 기존 설정과의 일관성을 유지하세요. 한국어로 답하세요.',
    systemEn: 'You are a worldbuilding assistant for fiction. Help design worlds based on genre, setting, and synopsis. Be specific, creative, and maintain consistency with existing settings.',
  },
  critique: {
    ko: '시뮬레이터 어시스턴트',
    en: 'Simulator Assistant',
    systemKo: '당신은 세계관 시뮬레이션 전문 어시스턴트입니다. 문명, 시대 전환, 세력 관계, 장르 규칙에 대해 조언합니다. 시뮬레이터 데이터를 분석하고 개선점을 제안하세요. 한국어로 답하세요.',
    systemEn: 'You are a world simulation assistant. Advise on civilizations, era transitions, faction relations, and genre rules. Analyze simulator data and suggest improvements.',
  },
  characters: {
    ko: '캐릭터 어시스턴트',
    en: 'Character Assistant',
    systemKo: '당신은 소설 캐릭터 설계 전문 어시스턴트입니다. 캐릭터의 성격, 관계, 대사 스타일, 동기, 갈등을 깊이 있게 분석하고 제안합니다. 기존 캐릭터 설정을 참고하세요. 한국어로 답하세요.',
    systemEn: 'You are a character design assistant for fiction. Analyze and suggest character personalities, relationships, dialogue styles, motivations, and conflicts. Reference existing character settings.',
  },
  rulebook: {
    ko: '연출 어시스턴트',
    en: 'Direction Assistant',
    systemKo: '당신은 소설 장면 연출 전문 어시스턴트입니다. 씬 구성, 갈등 배치, 후킹, 클리프행어, 고구마-사이다 밸런스에 대해 조언합니다. 한국어로 답하세요.',
    systemEn: 'You are a scene direction assistant for fiction. Advise on scene composition, conflict placement, hooks, cliffhangers, and tension balance.',
  },
  style: {
    ko: '문체 어시스턴트',
    en: 'Style Assistant',
    systemKo: '당신은 소설 문체 분석 전문 어시스턴트입니다. 문장 리듬, 어휘 선택, 화자 톤, 묘사 밀도, 대화문 스타일을 분석하고 제안합니다. 한국어로 답하세요.',
    systemEn: 'You are a writing style assistant. Analyze and suggest sentence rhythm, vocabulary, narrator tone, description density, and dialogue style.',
  },
};

function buildContextSummary(config: StoryConfig | null, tab: AppTab): string {
  if (!config) return '';
  const parts: string[] = [];
  if (config.genre) parts.push(`장르: ${config.genre}`);
  if (config.title) parts.push(`제목: ${config.title}`);
  if (config.synopsis) parts.push(`시놉시스: ${config.synopsis.slice(0, 300)}`);
  if (config.setting) parts.push(`배경: ${config.setting}`);

  if ((tab === 'characters' || tab === 'world') && config.characters?.length) {
    parts.push(`캐릭터: ${config.characters.map(c => `${c.name}(${c.role})`).join(', ')}`);
  }
  if (tab === 'critique' && config.worldSimData?.civs?.length) {
    parts.push(`문명: ${config.worldSimData.civs.map(c => c.name).join(', ')}`);
  }
  if (tab === 'style' && config.styleProfile) {
    const sp = config.styleProfile;
    if (sp.sentenceLength) parts.push(`문장길이: ${sp.sentenceLength}`);
    if (sp.dialogueRatio) parts.push(`대화비율: ${sp.dialogueRatio}`);
  }
  return parts.length > 0 ? `\n\n[현재 프로젝트 컨텍스트]\n${parts.join('\n')}` : '';
}

// ============================================================
// PART 2 — Component
// ============================================================

const STORAGE_PREFIX = 'noa_tab_chat_';

const TabAssistant: React.FC<TabAssistantProps> = ({ tab, language, config }) => {
  const ctx = TAB_CONTEXT[tab];
  if (!ctx) return null;

  const isKO = language === 'KO';
  const [messages, setMessages] = useState<TabMessage[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${tab}`);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Persist messages
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${STORAGE_PREFIX}${tab}`, JSON.stringify(messages.slice(-HISTORY_LIMITS.STORAGE)));
  }, [messages, tab]);

  // Auto-scroll
  useEffect(() => {
    if (!collapsed) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, collapsed]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const apiKey = getApiKey(getActiveProvider());
    if (!apiKey) {
      const errMsg: TabMessage = { id: `te-${Date.now()}`, role: 'assistant', content: isKO ? '⚠️ API 키가 설정되지 않았습니다.\n\n설정(Settings) 탭 → API Key에서 키를 입력해주세요.' : '⚠️ API key not set.\n\nGo to Settings tab → API Key to enter your key.' };
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

    const systemPrompt = (isKO ? ctx.systemKo : ctx.systemEn) + buildContextSummary(config, tab);
    const chatHistory: ChatMsg[] = messages.slice(-HISTORY_LIMITS.CHAT_API).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
    chatHistory.push({ role: 'user', content: text });

    let fullContent = '';
    try {
      await streamChat({
        systemInstruction: systemPrompt,
        messages: chatHistory,
        temperature: 0.8,
        signal: controller.signal,
        onChunk: (chunk) => {
          fullContent += chunk;
          const snapshot = fullContent;
          setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: snapshot } : m));
        },
      });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') { /* cancelled */ }
      else {
        const info = classifyError(err, isKO);
        const detail = info.action ? `\n\n💡 ${info.action}` : '';
        setMessages(prev => prev.map(m =>
          m.id === aiMsgId ? { ...m, content: `⚠️ ${info.title}\n${info.message}${detail}` } : m
        ));
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [input, isStreaming, messages, config, tab, language, isKO, ctx]);

  const handleCancel = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(`${STORAGE_PREFIX}${tab}`);
  };

  return (
    <div className="border border-border rounded-2xl bg-bg-secondary/50 overflow-hidden flex flex-col">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg-secondary/80 transition-colors"
      >
        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent-purple font-[family-name:var(--font-mono)]">
          <Sparkles className="w-3.5 h-3.5" />
          {isKO ? ctx.ko : ctx.en}
        </span>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <span className="text-[8px] text-text-tertiary font-[family-name:var(--font-mono)]">{messages.length} msg</span>
          )}
          {collapsed ? <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" /> : <ChevronUp className="w-3.5 h-3.5 text-text-tertiary" />}
        </div>
      </button>

      {!collapsed && (
        <>
          {/* Messages */}
          <div className="max-h-60 sm:max-h-80 overflow-y-auto px-4 py-2 space-y-3 custom-scrollbar">
            {messages.length === 0 && (
              <p className="text-[11px] text-text-tertiary italic text-center py-6">
                {isKO ? `${ctx.ko}에게 무엇이든 물어보세요.` : `Ask the ${ctx.en} anything.`}
              </p>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${
                  msg.role === 'user' ? 'bg-zinc-800' : 'bg-accent-purple/20'
                }`}>
                  {msg.role === 'user' ? <User className="w-3 h-3 text-zinc-500" /> : <Bot className="w-3 h-3 text-accent-purple" />}
                </div>
                <div className={`max-w-[90%] sm:max-w-[80%] px-3 py-2 rounded-xl text-[12px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-zinc-800/80 text-zinc-300'
                    : 'bg-transparent text-zinc-300'
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
                <button onClick={clearChat} className="p-2 rounded-lg text-zinc-700 hover:text-accent-red hover:bg-zinc-800/50 transition-colors shrink-0" title={isKO ? '대화 초기화' : 'Clear chat'}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={isKO ? '질문을 입력하세요...' : 'Ask a question...'}
                className="flex-1 bg-bg-tertiary/50 border border-border rounded-xl px-3 py-2 text-[12px] text-text-primary placeholder-text-tertiary resize-none outline-none focus:border-accent-purple/30 max-h-20 transition-colors"
                rows={1}
                disabled={isStreaming}
              />
              {isStreaming ? (
                <button onClick={handleCancel} className="p-2 rounded-xl bg-accent-red text-white shrink-0 hover:opacity-80 transition-opacity">
                  <StopCircle className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={handleSend} disabled={!input.trim()} className={`p-2 rounded-xl shrink-0 transition-colors ${input.trim() ? 'bg-accent-purple text-white' : 'bg-bg-tertiary text-text-tertiary'}`}>
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
