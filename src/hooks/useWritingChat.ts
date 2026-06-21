import { useState, useCallback, useMemo, useRef } from 'react';
import type { Message, AppLanguage } from '@/lib/studio-types';
import { streamChat, type ChatMsg } from '@/lib/ai-providers';
import {
  applyMemoryPolicy,
  buildProjectScopedMemoryKey,
  clearStoredSummary,
} from '@/lib/ai/chat-memory-policy';
import { NoaBlockedError } from '@/lib/noa/block-notice';
import { logger } from '@/lib/logger';

/**
 * [N3-memory-hybrid] 집필 탭 채팅 = heavy 정책 (full 이력 + 장기 요약 1블록).
 * TabAssistant 'writing' 탭과는 별도 대화이므로 요약 store 키 분리.
 */
const WRITING_CHAT_TAB = 'writing-chat';

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
export function useWritingChat(novelContext?: NovelContext, projectId?: string | null) {
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const memoryTab = useMemo(
    () => buildProjectScopedMemoryKey(WRITING_CHAT_TAB, projectId),
    [projectId],
  );

  // Ref to avoid stale closure over chatMessages in sendChat
  const chatMessagesRef = useRef(chatMessages);
  chatMessagesRef.current = chatMessages;

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
      // [N3-memory-hybrid] slice(-10) → 탭 차등 정책 모듈 경유.
      // heavy(집필) = full 이력 + 요약 블록(system에 부착 — truncateMessages 최후 안전망과 충돌 X).
      const memory = applyMemoryPolicy(
        memoryTab,
        chatMessagesRef.current.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        language,
      );
      const history: ChatMsg[] = [...memory.messages];
      history.push({ role: 'user', content: text });

      await streamChat({
        systemInstruction: buildWritingChatSystem(language, novelContext) + memory.summaryBlock,
        messages: history,
        temperature: 0.7,
        reasoningStage: 'draft',
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
      } else if (err instanceof NoaBlockedError) {
        // [N4 — 2026-06-11] NOA 정책 차단 — 사유 + 해결 경로를 채팅에 인라인 고지 (사일런트 차단 금지)
        logger.warn('Writing chat blocked by NOA policy:', err.message);
        setChatMessages(prev =>
          prev.map(m =>
            m.id === assistantMsgId && !m.content
              ? { ...m, content: `🛡 ${err.message}` }
              : m
          )
        );
      } else {
        logger.error('Writing chat error:', err);
        setChatMessages(prev =>
          prev.map(m =>
            m.id === assistantMsgId && !m.content
              ? { ...m, content: language === 'KO' ? '⚠ 노아 응답 실패. 다시 시도해주세요.' : '⚠ Noa response failed. Please try again.' }
              : m
          )
        );
      }
    } finally {
      setChatLoading(false);
      abortControllerRef.current = null;
    }
  }, [chatLoading, memoryTab, novelContext]);

  const abortChat = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setChatLoading(false);
    }
  }, []);

  const clearChat = useCallback(() => {
    setChatMessages([]);
    // [N3-memory-hybrid] 이전 대화 요약이 새 대화로 누수되지 않게 함께 삭제
    clearStoredSummary(memoryTab);
    abortChat();
  }, [abortChat, memoryTab]);

  return {
    chatMessages,
    sendChat,
    chatLoading,
    abortChat,
    clearChat
  };
}
