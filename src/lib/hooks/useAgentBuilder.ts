// ============================================================
// Agent Builder — React Hook
// ============================================================
// 클라이언트 컴포넌트에서 Agent Builder 검색/대화를 쉽게 호출할 수 있는 훅
// 비용: 142만 원(GenAI App Builder) 전용 크레딧에서 지출
// ============================================================

'use client';

import { useState, useCallback, useRef } from 'react';

export type AgentStudio = 'universe' | 'novel' | 'code';

export type AgentReference = {
  id: string;
  title: string;
  snippet: string;
  uri?: string;
  relevanceScore?: number;
};

export type AgentSearchResult = {
  summary: string;
  results: AgentReference[];
  totalSize: number;
};

export type AgentConverseResult = {
  reply: string;
  conversationId: string;
  references: AgentReference[];
};

type AgentState = {
  loading: boolean;
  error: string | null;
  searchResult: AgentSearchResult | null;
  converseResult: AgentConverseResult | null;
};

export function useAgentBuilder(studio: AgentStudio) {
  const [state, setState] = useState<AgentState>({
    loading: false,
    error: null,
    searchResult: null,
    converseResult: null,
  });

  const conversationIdRef = useRef<string | undefined>(undefined);

  /** RAG 검색: 설정 문서에서 관련 정보를 찾아 요약과 함께 반환 */
  const search = useCallback(async (query: string, pageSize = 10): Promise<AgentSearchResult | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const res = await fetch('/api/agent-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studio, query, pageSize, mode: 'search' }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        const error = data.error || `Agent Builder 오류 (${res.status})`;
        setState(prev => ({ ...prev, loading: false, error }));
        return null;
      }

      const result: AgentSearchResult = {
        summary: data.summary || '',
        results: data.results || [],
        totalSize: data.totalSize || 0,
      };

      setState(prev => ({ ...prev, loading: false, searchResult: result }));
      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Network error';
      setState(prev => ({ ...prev, loading: false, error }));
      return null;
    }
  }, [studio]);

  /** 대화형 모드: 에이전트와 멀티턴 대화 (설정 확인, 서사 검증 등) */
  const converse = useCallback(async (query: string): Promise<AgentConverseResult | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const res = await fetch('/api/agent-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studio,
          query,
          mode: 'converse',
          conversationId: conversationIdRef.current,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        const error = data.error || `Agent Builder 오류 (${res.status})`;
        setState(prev => ({ ...prev, loading: false, error }));
        return null;
      }

      // 다음 대화를 위한 conversationId 저장
      conversationIdRef.current = data.conversationId;

      const result: AgentConverseResult = {
        reply: data.reply || '',
        conversationId: data.conversationId || '',
        references: data.references || [],
      };

      setState(prev => ({ ...prev, loading: false, converseResult: result }));
      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Network error';
      setState(prev => ({ ...prev, loading: false, error }));
      return null;
    }
  }, [studio]);

  /** 대화 세션 초기화 */
  const resetConversation = useCallback(() => {
    conversationIdRef.current = undefined;
    setState(prev => ({ ...prev, converseResult: null, error: null }));
  }, []);

  /** 에러 초기화 */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    search,
    converse,
    resetConversation,
    clearError,
  };
}
