import { useState, useCallback, useRef } from 'react';
import type { Message, AppLanguage } from '@/lib/studio-types';
import { logger } from '@/lib/logger';

/**
 * useWritingChat - 집필 탭 전용 독립 AI 채팅 훅
 * 소설 생성(useStudioAI)과 별개로 동작하며, 별도의 AbortController를 가짐.
 */
export function useWritingChat() {
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendChat = useCallback(async (text: string, language: AppLanguage) => {
    if (!text.trim() || chatLoading) return;

    // 1. 사용자 메시지 추가
    const userMsg: Message = {
      id: `chat-u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    
    setChatMessages(prev => [...prev, userMsg]);
    setChatLoading(true);

    // 2. AbortController 설정
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      // [MOCK] 실제 구현 시에는 별도의 채팅 API 엔드포인트 호출
      // 여기서는 지시서의 구조적 분리에 집중하여 시뮬레이션
      logger.info('Sending Chat Message:', text);
      
      await new Promise(resolve => setTimeout(resolve, 1500)); // AI 생각 중...
      
      const assistantMsg: Message = {
        id: `chat-a-${Date.now()}`,
        role: 'assistant',
        content: language === 'KO' 
          ? `[AI 답변]: "${text}"에 대한 분석 및 조언입니다. 소설의 맥락을 고려할 때 다음 전개가 기대됩니다.`
          : `[AI Response]: Advice for "${text}". Considering the context, I suggest focusing on the character's internal conflict.`,
        timestamp: Date.now(),
      };

      setChatMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        logger.warn('AI Chat Aborted');
      } else {
        logger.error('AI Chat Error:', err);
      }
    } finally {
      setChatLoading(false);
      abortControllerRef.current = null;
    }
  }, [chatLoading]);

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
