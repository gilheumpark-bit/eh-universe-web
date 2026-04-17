/**
 * RAG Service Client — DGX Spark 포트 8082
 *
 * 99만개 세계관 설정(Lore) 검색 + LLM 프롬프트 자동 조립.
 * 소설/대사 생성 LLM 호출 **직전**에 호출하여 환각(Hallucination) 차단.
 *
 * 엔드포인트:
 *   POST /search       → 단순 검색 (문서 배열)
 *   POST /rag_prompt   → 완성된 프롬프트 자동 조립 (권장)
 */

import { SPARK_RAG_URL } from '@/lib/dgx-models';
import { logger } from '@/lib/logger';

// ============================================================
// PART 1 — 타입
// ============================================================

export interface RagSearchRequest {
  query: string;
  /** Top-K 문서 수 (기본 5) */
  top_k?: number;
}

export interface RagDocument {
  id?: string;
  title?: string;
  content: string;
  score?: number;
  /** 검색 순위 (서버가 반환) */
  rank?: number;
  /** 출처 메타 — 카테고리/태그 등 */
  meta?: Record<string, unknown>;
}

export interface RagSearchResponse {
  /** 서버 실 응답 포맷: {query, results[]} */
  query?: string;
  results?: RagDocument[];
  /** 호환용 (과거/다른 서버 변형) */
  documents?: RagDocument[];
}

export interface RagPromptResponse {
  /** 세계관 컨텍스트가 덧붙여진 완성된 LLM 프롬프트 */
  prompt: string;
  /** 참조된 문서 id 목록 (선택) */
  sourceIds?: string[];
}

export interface RagRequestOpts {
  signal?: AbortSignal;
  /** 타임아웃 ms (기본 6000) */
  timeoutMs?: number;
}

// ============================================================
// PART 2 — 헬퍼
// ============================================================

function buildSignal(opts?: RagRequestOpts): AbortSignal {
  if (opts?.signal) return opts.signal;
  return AbortSignal.timeout(opts?.timeoutMs ?? 6000);
}

async function postJson<T>(path: string, body: unknown, opts?: RagRequestOpts): Promise<T> {
  const url = `${SPARK_RAG_URL}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: buildSignal(opts),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`RAG ${path} failed: ${res.status} ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

// ============================================================
// PART 3 — 공개 API
// ============================================================

/**
 * 단순 Top-K 검색 — 원본 문서 배열 반환.
 * 게이트웨이 경로: POST ${SPARK_RAG_URL}/search
 */
export async function ragSearch(req: RagSearchRequest, opts?: RagRequestOpts): Promise<RagDocument[]> {
  const { query, top_k = 5 } = req;
  if (!query || !query.trim()) return [];
  try {
    const data = await postJson<RagSearchResponse | RagDocument[]>('/search', { query, top_k }, opts);
    if (Array.isArray(data)) return data;
    // 서버 정식 포맷: {query, results[]}
    if (Array.isArray(data.results)) return data.results;
    // 레거시/대체: {documents[]}
    if (Array.isArray(data.documents)) return data.documents;
    return [];
  } catch (err) {
    logger.warn('RAG', 'search failed', err);
    return [];
  }
}

/**
 * 프롬프트 자동 조립 — 권장 경로.
 * 게이트웨이 경로: POST ${SPARK_RAG_URL}/prompt
 * (백엔드 통합 후 endpoint가 /rag_prompt → /prompt로 단순화됨)
 */
export async function ragBuildPrompt(req: RagSearchRequest, opts?: RagRequestOpts): Promise<string> {
  const { query, top_k = 5 } = req;
  if (!query || !query.trim()) return query;
  try {
    const data = await postJson<RagPromptResponse | { prompt?: string }>('/prompt', { query, top_k }, opts);
    if (typeof data?.prompt === 'string' && data.prompt.trim()) return data.prompt;
    return query;
  } catch (err) {
    logger.warn('RAG', 'build prompt failed — fallback to raw query', err);
    return query;
  }
}

/**
 * 헬스 체크 — RAG 서버 가용성 확인.
 */
export async function ragHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${SPARK_RAG_URL}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

// IDENTITY_SEAL: ragService | role=rag-client-8082 | inputs=query+top_k | outputs=documents|prompt
