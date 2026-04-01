import { useState, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDb, collectionName } from '@/lib/firebase';
// 1. searchAgent: 내 데이터(또는 공개 데이터) 검색 시 사용
// 2. ingestAgent: 새 행성, 새 설정, 새 글을 저장할 때 동시에 Agent Builder로 전송

export interface NetworkSearchResult {
  id: string;
  title: string;
  snippet: string;
  userId: string;
  planetId?: string;
}

export function useNetworkAgent() {
  const [isSearching, setIsSearching] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 멀티테넌트 검색 (내 데이터 또는 공개 데이터)
  const searchAgent = useCallback(async (
    query: string,
    options?: { planetId?: string; onlyPublic?: boolean; token?: string }
  ) => {
    setIsSearching(true);
    setError(null);
    try {
      // 1. 캐시 검사 (동일 질문 방어선)
      const tokenStr = options?.token || 'user';
      // 간단한 고유키 생성 (영문/숫자만 남기거나 base64 활용, 여기서는 단순화하여 50자 제한)
      const rawKey = `${tokenStr}_${options?.planetId || 'all'}_${query}`;
      let safeKey = '';
      for (let i = 0; i < rawKey.length; i++) safeKey += rawKey.charCodeAt(i).toString(16);
      safeKey = safeKey.slice(0, 100);

      let cachedRef = null;
      let cachedDoc = null;
      const db = getDb();
      if (db) {
        cachedRef = doc(db, collectionName('agent_cache'), safeKey);
        cachedDoc = await getDoc(cachedRef).catch(() => null);
        if (cachedDoc && cachedDoc.exists()) {
          const cachedData = cachedDoc.data();
          // 보관 기한 24시간 설정
          const isFresh = Date.now() - (cachedData.timestamp || 0) < 24 * 60 * 60 * 1000;
          if (isFresh) {
            return {
              summary: cachedData.summary,
              results: cachedData.results,
              cached: true // 캐시 적중 여부 로깅 가능
            };
          }
        }
      }

      // 2. 구글 클라우드 탐색 (크레딧 사용)
      const res = await fetch('/api/network-agent/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: 실제로는 auth context 또는 Firebase token을 가져와서 넣어주어야 함
          'Authorization': `Bearer ${options?.token || 'test-session-user123'}`,
        },
        body: JSON.stringify({
          query,
          planetId: options?.planetId,
          onlyPublic: options?.onlyPublic,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');

      // 3. 캐시 저장
      let summaryText = data.summary as string;
      if (summaryText.includes('<SILENCE>')) {
        summaryText = '[SYSTEM] ⚠️ 의미 없는 요청 혹은 세계관과 무관한 트롤링으로 판단되어 AI가 응답을 거부합니다. (HSE - 침묵할 권리 행사)';
      }

      const finalResult = {
        summary: summaryText,
        results: data.results as NetworkSearchResult[],
      };

      if (db && cachedRef && finalResult.summary) {
        // 캐시 비동기 저장 (결과 반환 블로킹 안 함)
        setDoc(cachedRef, {
          ...finalResult,
          timestamp: Date.now(),
        }).catch(err => console.warn('Cache write failed:', err));
      }

      return finalResult;
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setIsSearching(false);
    }
  }, []);

  // 세계관/소설 저장 시 Agent Builder 동기화
  const ingestAgent = useCallback(async (
    doc: { documentId: string; title: string; content: string; planetId?: string; isPublic?: boolean },
    token?: string
  ) => {
    setIsIngesting(true);
    setError(null);
    try {
      const res = await fetch('/api/network-agent/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || 'test-session-user123'}`,
        },
        body: JSON.stringify(doc),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ingest failed');

      return true;
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setIsIngesting(false);
    }
  }, []);

  return { searchAgent, ingestAgent, isSearching, isIngesting, error };
}
