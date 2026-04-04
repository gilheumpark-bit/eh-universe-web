import { useState, useCallback, useRef } from 'react';
import type { Message, AppLanguage } from '@/lib/studio-types';
import { streamChat, type ChatMsg } from '@/lib/ai-providers';
import { logger } from '@/lib/logger';

interface NovelContext {
  genre?: string;
  synopsis?: string;
  characters?: string;
  currentChapter?: string;
}

function buildWritingChatSystem(language: AppLanguage, ctx?: NovelContext): string {
  const isKo = language === 'KO' || language === 'JP';
  const base = isKo
    ? `당신은 전문 소설 집필 컨설턴트입니다. 사용자의 언어로 응답하세요.`
    : `You are a professional fiction writing consultant. Respond in the user's language.`;

  const rules = isKo
    ? `규칙:
1. 플롯, 캐릭터 개발, 페이싱, 텐션에 대한 실행 가능한 조언을 제공합니다
2. 제공된 소설 맥락을 참조하여 제안합니다
3. 응답은 간결하게 3-5문단 이내로 유지합니다
4. 명시적 요청이 없는 한 실제 소설 본문을 작성하지 않습니다`
    : `Rules:
1. Give actionable advice on plot, character development, pacing, tension
2. Reference the provided novel context in your suggestions
3. Keep responses concise (3-5 paragraphs max)
4. Never write the actual novel text unless explicitly asked`;

  const parts = [base, '', rules];

  if (ctx?.genre) parts.push(`\nGenre: ${ctx.genre}`);
  if (ctx?.synopsis) parts.push(`Synopsis: ${ctx.synopsis}`);
  if (ctx?.characters) parts.push(`Characters: ${ctx.characters}`);
  if (ctx?.currentChapter) parts.push(`Current chapter context:\n${ctx.currentChapter.slice(0, 2000)}`);

  return parts.join('\n');
}

/**
 * useWritingChat - 집필 탭 전용 독립 AI 채팅 훅
 * streamChat()를 통해 실제 AI 응답을 스트리밍.
 */
export function useWritingChat(novelContext?: NovelContext) {
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendChat = useCallback(async (text: string, language: AppLanguage) => {
    if (!text.trim() || chatLoading) return;

    const userMsg: Message = {
      id: `chat-u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const assistantMsgId = `chat-a-${Date.now()}`;
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };

    setChatMessages(prev => [...prev, userMsg, assistantMsg]);
    setChatLoading(true);

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      const history: ChatMsg[] = chatMessages
        .slice(-10)
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
      history.push({ role: 'user', content: text });

      await streamChat({
        systemInstruction: buildWritingChatSystem(language, novelContext),
        messages: history,
        temperature: 0.7,
        signal: abortControllerRef.current.signal,
        isChatMode: true,
        onChunk: (chunk) => {
          setChatMessages(prev =>
            prev.map(m =>
              m.id === assistantMsgId
                ? { ...m, content: m.content + chunk }
                : m
            )
          );
        },
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        logger.warn('Writing chat aborted');
      } else {
        logger.error('Writing chat error:', err);
        setChatMessages(prev =>
          prev.map(m =>
            m.id === assistantMsgId && !m.content
              ? { ...m, content: language === 'KO' ? '⚠ AI 응답 실패. 다시 시도해주세요.' : '⚠ AI response failed. Please try again.' }
              : m
          )
        );
      }
    } finally {
      setChatLoading(false);
      abortControllerRef.current = null;
    }
  }, [chatLoading, chatMessages, novelContext]);

  const abortChat = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setChatLoading(false);
    }
  }, []);

  const clearChat = useCallback(() => {
    setChatMessages([]);
    abortChat();
  }, [abortChat]);

  return {
    chatMessages,
    sendChat,
    chatLoading,
    abortChat,
    clearChat
  };
}
