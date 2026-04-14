'use client';

import React, { useCallback, useRef, useState } from 'react';
import { MessageSquare, Send, Sparkles } from 'lucide-react';
import { useTranslator } from '../core/TranslatorContext';
import { PROVIDERS as AI_PROVIDER_DEFS } from '@/lib/ai-providers';
import { isServerProviderId, type ServerProviderId } from '@/lib/server-ai';
import { logger } from '@/lib/logger';

type ChatMsg = { id: number; role: 'user' | 'assistant'; text: string };

function resolveChatApi(
  selectedProvider: string,
  getKey: (id: string) => string,
  hostedGemini: boolean
): { provider: ServerProviderId; model: string; apiKey: string } | { error: string } {
  const fallback = ['openai', 'claude', 'gemini', 'groq', 'mistral', 'ollama', 'lmstudio'] as const;
  const order =
    selectedProvider === 'deepseek'
      ? [...fallback]
      : [selectedProvider, ...fallback.filter((p) => p !== selectedProvider)];

  const seen = new Set<string>();
  for (const id of order) {
    if (seen.has(id)) continue;
    seen.add(id);
    if (!isServerProviderId(id)) continue;

    const key = getKey(id).trim();
    if (id === 'gemini' && !key && hostedGemini) {
      return {
        provider: 'gemini',
        model: AI_PROVIDER_DEFS.gemini.defaultModel,
        apiKey: '',
      };
    }
    if (key) {
      return { provider: id, model: AI_PROVIDER_DEFS[id].defaultModel, apiKey: key };
    }
  }

  return {
    error:
      '채팅에 사용할 API 키가 없습니다. 설정(번역 본체)에서 BYOK 키를 등록하거나 Google 로그인 후 호스팅 Gemini를 이용해 주세요.',
  };
}

async function consumeSseAssistantText(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onFullText: (full: string) => void
): Promise<string> {
  const decoder = new TextDecoder();
  let full = '';
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') continue;
      try {
        const json = JSON.parse(data) as Record<string, unknown>;
        const text =
          (json.choices as { delta?: { content?: string } }[] | undefined)?.[0]?.delta?.content ??
          (json.candidates as { content?: { parts?: { text?: string }[] } }[] | undefined)?.[0]?.content?.parts?.[0]
            ?.text ??
          (json.type === 'content_block_delta'
            ? (json.delta as { text?: string } | undefined)?.text
            : null);
        if (typeof text === 'string' && text) {
          full += text;
          onFullText(full);
        }
      } catch {
        /* non-JSON SSE line */
      }
    }
  }
  return full;
}

export function ChatPanel() {
  const {
    provider,
    getEffectiveApiKeyForProvider,
    hostedGemini,
    from,
    to,
    source,
    result,
    langKo,
    getIdToken,
  } = useTranslator();

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>(() => [
    {
      id: 1,
      role: 'assistant',
      text: langKo
        ? '번역 뉘앙스·톤·대안 표현을 물어보세요. 현재 엔진 설정과 원·번역 발췌를 참고해 답합니다.'
        : 'Ask about nuance, tone, or alternative phrasing. Replies use your engine settings and short excerpts of the current pair.',
    },
  ]);
  const [sending, setSending] = useState(false);
  const [errorLine, setErrorLine] = useState('');
  const nextId = useRef(2);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMsg[]>(messages);
  messagesRef.current = messages;

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    });
  };

  const sendUserText = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || sending) return;

      const resolved = resolveChatApi(provider, getEffectiveApiKeyForProvider, hostedGemini);
      if ('error' in resolved) {
        setErrorLine(resolved.error);
        return;
      }

      setErrorLine('');
      setSending(true);
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const userMsg: ChatMsg = { id: nextId.current++, role: 'user', text };
      const assistantId = nextId.current++;
      setMessages((prev) => [...prev, userMsg, { id: assistantId, role: 'assistant', text: '' }]);

      const excerpt = (a: string, max: number) => (a.length <= max ? a : `${a.slice(0, max)}…`);
      const systemInstruction = langKo
        ? `당신은 번역 스튜디오용 조언자입니다. 사용자 메시지 언어로 답하세요. 허위 인용·원문/번역문 전문 지어내기 금지. 언어 쌍: ${from} → ${to}.\n[원문 발췌]\n${excerpt(source, 1600)}\n[번역 발췌]\n${excerpt(result, 1600)}`
        : `You are a translation workspace assistant. Reply in the user's language. Do not invent long quotes. Language pair: ${from} → ${to}.\n[Source excerpt]\n${excerpt(source, 1600)}\n[Translation excerpt]\n${excerpt(result, 1600)}`;

      const historyForApi = [...messagesRef.current, userMsg]
        .filter((m) => m.role === 'user' || (m.role === 'assistant' && m.text.trim()))
        .slice(-16)
        .map((m) => ({ role: m.role, content: m.text }));

      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        try {
          const tok = await getIdToken();
          if (tok) headers.Authorization = `Bearer ${tok}`;
        } catch {
          /* ignore */
        }

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers,
          signal: abortRef.current.signal,
          body: JSON.stringify({
            provider: resolved.provider,
            model: resolved.model,
            apiKey: resolved.apiKey || undefined,
            systemInstruction,
            messages: historyForApi,
            temperature: 0.65,
            maxTokens: 2048,
            isChatMode: true,
          }),
        });

        if (!res.ok) {
          let errMsg = `HTTP ${res.status}`;
          try {
            const errData = (await res.json()) as { error?: string; noa?: { reason?: string } };
            if (errData.noa?.reason) errMsg = errData.noa.reason;
            else if (errData.error) errMsg = errData.error;
          } catch {
            /* ignore */
          }
          throw new Error(errMsg);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No response body');

        await consumeSseAssistantText(reader, (full) => {
          setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, text: full } : m)));
          scrollToBottom();
        });
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId && !m.text ? { ...m, text: langKo ? '(중단됨)' : '(Stopped)' } : m))
          );
        } else {
          logger.error('ChatPanel', 'chat request failed', e);
          const msg = e instanceof Error ? e.message : 'request failed';
          setErrorLine(msg);
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        }
      } finally {
        setSending(false);
        abortRef.current = null;
        scrollToBottom();
      }
    },
    [
      sending,
      provider,
      getEffectiveApiKeyForProvider,
      hostedGemini,
      from,
      to,
      source,
      result,
      langKo,
      getIdToken,
    ]
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendUserText(input);
    setInput('');
  };

  const preset = (ko: string, en: string) => {
    setInput(langKo ? ko : en);
    setErrorLine('');
  };

  return (
    <div className="flex h-full flex-col font-sans">
      <div className="p-4 shrink-0 border-b border-white/5">
        <div className="flex items-center gap-2 text-text-secondary">
          <MessageSquare className="w-4 h-4 text-accent-cyan" />
          <span className="text-[13px] font-medium">Assistant Chat</span>
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-4 pointer-events-auto">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-[90%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
          >
            <div
              className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 
              ${msg.role === 'user' ? 'bg-accent-indigo text-white' : 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'}`}
            >
              {msg.role === 'user' ? <MessageSquare className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
            </div>
            <div
              className={`p-3 rounded-lg text-[13px] leading-relaxed whitespace-pre-wrap
              ${msg.role === 'user' ? 'bg-accent-indigo/10 text-text-primary border border-accent-indigo/20 rounded-tr-sm' : 'bg-white/5 text-text-secondary border border-white/10 rounded-tl-sm'}`}
            >
              {msg.text || (msg.role === 'assistant' && sending ? (langKo ? '응답 생성 중…' : 'Thinking…') : msg.text)}
            </div>
          </div>
        ))}
      </div>

      {errorLine ? (
        <div className="px-4 text-[11px] text-red-400/90 leading-snug shrink-0">{errorLine}</div>
      ) : null}

      <div className="p-4 shrink-0 border-t border-white/5 pointer-events-auto">
        <form onSubmit={onSubmit} className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void sendUserText(input);
                setInput('');
              }
            }}
            placeholder={langKo ? '번역에 대해 질문…' : 'Ask about this translation…'}
            disabled={sending}
            className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 pl-3 pr-10 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 focus:border-accent-cyan/50 focus:ring-1 focus:ring-accent-cyan/50 transition-all resize-none h-[44px] max-h32 disabled:opacity-50"
            rows={1}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="absolute right-2 top-[50%] -translate-y-1/2 p-1.5 rounded-md hover:bg-white/10 text-white/50 hover:text-accent-cyan transition-colors disabled:opacity-30"
            aria-label="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            type="button"
            disabled={sending}
            onClick={() =>
              preset(
                `다음 번역문의 톤과 격조를 짧게 평가하고, ${from}→${to} 쌍에서 어색한 점이 있으면 구체적으로 짚어 주세요.`,
                `Briefly assess tone and register of the current translation; flag anything awkward for ${from}→${to}.`
              )
            }
            className="text-[11px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-text-tertiary hover:text-text-secondary transition-colors border border-white/10 disabled:opacity-40"
          >
            {langKo ? '톤 점검' : 'Check tone'}
          </button>
          <button
            type="button"
            disabled={sending}
            onClick={() =>
              preset(
                '현재 번역문에 대한 대체 표현을 2~3가지 제안하고, 각각의 뉘앙스 차이를 한 줄로 설명해 주세요.',
                'Suggest 2–3 alternative renderings of the current translation with one-line nuance notes each.'
              )
            }
            className="text-[11px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-text-tertiary hover:text-text-secondary transition-colors border border-white/10 disabled:opacity-40"
          >
            {langKo ? '대안 표현' : 'Alternatives'}
          </button>
        </div>
      </div>
    </div>
  );
}
