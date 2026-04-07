import { useState, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDb, collectionName } from '@/lib/firebase';
import { logger } from '@/lib/logger';
// 1. searchAgent: 내 데이터(또는 공개 데이터) 검색 시 사용
// 2. ingestAgent: 새 행성, 새 설정, 새 글을 저장할 때 동시에 Agent Builder로 전송

export interface NetworkSearchResult {
  id: string;
  title: string;
  snippet: string;
  userId: string;
  planetId?: string;
  documentType?: string;
  translationProjectId?: string;
}

export function useNetworkAgent() {
  const [isSearching, setIsSearching] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 멀티테넌트 검색 (내 데이터 또는 공개 데이터)
  const searchAgent = useCallback(async (
    query: string,
    options?: {
      planetId?: string;
      onlyPublic?: boolean;
      idToken?: string;
      userKey?: string;
      narrowDocumentType?: 'universe' | 'translation';
      translationProjectId?: string;
    }
  ) => {
    const idToken = options?.idToken?.trim();
    if (!idToken) {
      logger.warn('useNetworkAgent', 'searchAgent skipped: no Firebase ID token');
      setError('Unauthorized');
      return null;
    }

    setIsSearching(true);
    setError(null);
    try {
      const cacheSeg = options?.userKey ?? '';
      const rawKey = `${cacheSeg}_${options?.planetId || 'all'}_${query}`;
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
          const isFresh = Date.now() - (cachedData.timestamp || 0) < 24 * 60 * 60 * 1000;
          if (isFresh) {
            return {
              summary: cachedData.summary,
              results: cachedData.results,
              cached: true,
            };
          }
        }
      }

      const res = await fetch('/api/network-agent/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          query,
          planetId: options?.planetId,
          onlyPublic: options?.onlyPublic,
          narrowDocumentType: options?.narrowDocumentType,
          translationProjectId: options?.translationProjectId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');

      let summaryText = data.summary as string;
      if (summaryText.includes('<SILENCE>')) {
        summaryText = '[SYSTEM] ⚠️ 의미 없는 요청 혹은 세계관과 무관한 트롤링으로 판단되어 AI가 응답을 거부합니다. (HSE - 침묵할 권리 행사)';
      }

      const finalResult = {
        summary: summaryText,
        results: data.results as NetworkSearchResult[],
      };

      if (db && cachedRef && finalResult.summary) {
        setDoc(cachedRef, {
          ...finalResult,
          timestamp: Date.now(),
        }).catch((err: unknown) => logger.warn('useNetworkAgent', 'Cache write failed', err));
      }

      return finalResult;
    } catch (err) {
      logger.error('useNetworkAgent/search', err);
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setIsSearching(false);
    }
  }, []);

  const ingestAgent = useCallback(async (
    payload: {
      documentId: string;
      title: string;
      content: string;
      planetId?: string;
      isPublic?: boolean;
      documentType?: 'universe' | 'translation';
      translationProjectId?: string;
    },
    idToken?: string
  ) => {
    const tok = idToken?.trim();
    if (!tok) {
      logger.warn('useNetworkAgent', 'ingestAgent skipped: no Firebase ID token');
      setError('Unauthorized');
      return false;
    }

    setIsIngesting(true);
    setError(null);
    try {
      const res = await fetch('/api/network-agent/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tok}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ingest failed');

      return true;
    } catch (err) {
      logger.error('useNetworkAgent/ingest', err);
      setError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setIsIngesting(false);
    }
  }, []);

  return { searchAgent, ingestAgent, isSearching, isIngesting, error };
}
