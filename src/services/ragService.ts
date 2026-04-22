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
import { quickIPCheck } from '@/lib/ip-guard/scan';

// ============================================================
// PART 1 — 타입
// ============================================================

/**
 * RAG 결과 IP 정제 모드.
 *   - 'off'      : 스캔 안 함 (성능 중시, 레거시)
 *   - 'annotate' : 모든 문서에 meta.ipRisk/ipScore/ipGrade 태깅만, 필터링 X (기본)
 *   - 'strict'   : critical 브랜드·저작권 매칭 문서를 결과에서 제거
 */
export type RagSanitizeMode = 'off' | 'annotate' | 'strict';

export interface RagSearchRequest {
  query: string;
  /** Top-K 문서 수 (기본 5) */
  top_k?: number;
  /** 프로젝트 식별자 — 서버가 지원하면 검색 범위 제한, 미지원 서버는 무시 */
  project_id?: string;
  /** 메타 필터 (예: { type: 'translatedPair' }) — 서버 미지원 시 무시 */
  filters?: Record<string, unknown>;
  /** IP 리스크 정제 모드 (기본 'annotate') */
  sanitize?: RagSanitizeMode;
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
 * RAG 결과 문서 IP 정제.
 *
 *   - 각 문서 content에 대해 brand-blocklist + suspicious pattern 빠른 스캔.
 *   - 'annotate': meta.ipScore/ipGrade/ipRisk 부착 (기본)
 *   - 'strict':   critical 매칭 있는 문서 제거
 *
 * RAG 오염(타사 소설 발췌·저작권 문구 포함 문서)이 프롬프트로 새어나가는
 * 마지막 방어선. 서버 측 ingestion 필터가 있어도 클라이언트에서 한 번 더.
 */
export function sanitizeRagResults(
  docs: RagDocument[],
  mode: RagSanitizeMode = 'annotate',
): RagDocument[] {
  if (mode === 'off' || docs.length === 0) return docs;
  const out: RagDocument[] = [];
  for (const doc of docs) {
    const scan = quickIPCheck(doc.content ?? '', { brandMinSeverity: 'critical' });
    if (mode === 'strict' && scan.critical > 0) continue;
    const nextMeta: Record<string, unknown> = { ...(doc.meta ?? {}) };
    nextMeta.ipScore = scan.score;
    nextMeta.ipGrade = scan.grade;
    nextMeta.ipRisk = scan.critical > 0 ? 'high' : scan.score < 70 ? 'medium' : 'low';
    out.push({ ...doc, meta: nextMeta });
  }
  return out;
}

/**
 * 단순 Top-K 검색 — 원본 문서 배열 반환.
 * 게이트웨이 경로: POST ${SPARK_RAG_URL}/search
 *
 * 2026-04-23: 결과에 IP 리스크 정제 레이어 추가 (기본 'annotate').
 *   - 'strict' 모드는 critical 매칭 문서를 결과에서 제거 — 생성 경로용.
 *   - 'annotate'는 meta에 ipRisk 태깅만 — 호출 측이 UI/필터 결정.
 */
export async function ragSearch(req: RagSearchRequest, opts?: RagRequestOpts): Promise<RagDocument[]> {
  const { query, top_k = 5, project_id, filters, sanitize = 'annotate' } = req;
  if (!query || !query.trim()) return [];
  try {
    // [C] undefined 필드 제외 — spread 조건부로 신규 필드 추가 (하위 호환)
    const body: Record<string, unknown> = { query, top_k };
    if (project_id) body.project_id = project_id;
    if (filters && Object.keys(filters).length > 0) body.filters = filters;
    const data = await postJson<RagSearchResponse | RagDocument[]>('/search', body, opts);
    let docs: RagDocument[];
    if (Array.isArray(data)) docs = data;
    // 서버 정식 포맷: {query, results[]}
    else if (Array.isArray(data.results)) docs = data.results;
    // 레거시/대체: {documents[]}
    else if (Array.isArray(data.documents)) docs = data.documents;
    else docs = [];
    return sanitizeRagResults(docs, sanitize);
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

// ============================================================
// PART 4 — 번역 엔진 전용 컨텍스트 빌더
// ============================================================

/**
 * 번역 엔진 전용 RAG 컨텍스트.
 * worldBible: /prompt 로 조립된 세계관 프롬프트(단일 문자열).
 * pastTerms / pastEpisodeSummary / genreRules: /search 결과의 meta 카테고리에서 분류.
 * fetched: false 이면 번역 엔진은 기존 프롬프트 그대로 사용 (RAG 블록 생략).
 */
export interface RAGTranslationContext {
  worldBible: string;
  pastTerms: Array<{ src: string; tgt: string; episode: number }>;
  pastEpisodeSummary: string[];
  genreRules: string;
  fetched: boolean;
}

export interface RAGTranslationInput {
  projectId?: string;
  sourceText: string;
  characterNames?: string[];
  targetGenre?: string;
  targetLang: 'KO' | 'EN' | 'JP' | 'CN';
  episodeNo?: number;
}

const EMPTY_TRANSLATION_CTX: RAGTranslationContext = {
  worldBible: '',
  pastTerms: [],
  pastEpisodeSummary: [],
  genreRules: '',
  fetched: false,
};

function buildTranslationQuery(input: RAGTranslationInput): string {
  const parts: string[] = [
    input.sourceText.slice(0, 800),
    ...(input.characterNames ?? []).slice(0, 5),
  ];
  if (input.targetGenre) parts.push(input.targetGenre);
  return parts.filter(s => s && s.trim()).join(' | ');
}

/**
 * RagDocument[] 을 카테고리별로 분류한다.
 * meta.type / meta.category / title 를 우선적으로 본다.
 * 서버 스키마가 확정 전이므로 방어적으로 필드를 검사한다.
 */
function partitionDocuments(docs: RagDocument[]): {
  pastTerms: Array<{ src: string; tgt: string; episode: number }>;
  pastEpisodeSummary: string[];
  genreRules: string;
} {
  const pastTerms: Array<{ src: string; tgt: string; episode: number }> = [];
  const pastEpisodeSummary: string[] = [];
  const genreRuleChunks: string[] = [];

  for (const doc of docs) {
    const meta = (doc.meta ?? {}) as Record<string, unknown>;
    const rawType = (meta['type'] ?? meta['category'] ?? meta['kind'] ?? '') as string;
    const type = typeof rawType === 'string' ? rawType.toLowerCase() : '';

    if (type === 'glossary' || type === 'term') {
      const src = typeof meta['source'] === 'string' ? (meta['source'] as string) : doc.title ?? '';
      const tgt = typeof meta['target'] === 'string' ? (meta['target'] as string) : doc.content;
      const ep = typeof meta['episode'] === 'number' ? (meta['episode'] as number) : 0;
      if (src && tgt) pastTerms.push({ src, tgt, episode: ep });
      continue;
    }
    if (type === 'pastepisode' || type === 'episode' || type === 'summary') {
      if (doc.content) pastEpisodeSummary.push(doc.content);
      continue;
    }
    if (type === 'genrerule' || type === 'genre' || type === 'rule') {
      if (doc.content) genreRuleChunks.push(doc.content);
      continue;
    }
    // 분류 불가 — worldBible에 이미 포함되므로 skip
  }

  return {
    pastTerms,
    pastEpisodeSummary,
    genreRules: genreRuleChunks.join('\n').slice(0, 2000),
  };
}

/**
 * 번역 엔진 전용 RAG 컨텍스트 빌더.
 * /prompt + /search 를 병렬 호출하여 4종 필드를 조립한다.
 * timeout 6000ms (기본). 실패 시 EMPTY_TRANSLATION_CTX (fetched=false) 반환 — 번역 엔진은 계속 진행.
 */
export async function buildRAGTranslationContext(
  input: RAGTranslationInput,
  options: { timeoutMs?: number } = {},
): Promise<RAGTranslationContext> {
  // 환경 가드 — 서버 사이드(Node/Edge) 또는 브라우저 모두 fetch 존재 여부만 확인
  if (typeof fetch === 'undefined') return EMPTY_TRANSLATION_CTX;
  if (!input.sourceText || !input.sourceText.trim()) return EMPTY_TRANSLATION_CTX;

  const timeoutMs = options.timeoutMs ?? 6000;
  const query = buildTranslationQuery(input);
  if (!query) return EMPTY_TRANSLATION_CTX;

  try {
    const [promptResult, docsResult] = await Promise.allSettled([
      ragBuildPrompt({ query, top_k: 6 }, { timeoutMs }),
      ragSearch({ query, top_k: 6 }, { timeoutMs }),
    ]);

    const worldBible =
      promptResult.status === 'fulfilled' && promptResult.value && promptResult.value !== query
        ? promptResult.value.slice(0, 2000)
        : '';

    const partitioned =
      docsResult.status === 'fulfilled' && Array.isArray(docsResult.value)
        ? partitionDocuments(docsResult.value)
        : { pastTerms: [], pastEpisodeSummary: [], genreRules: '' };

    // 두 호출 모두 실패했으면 fetched=false (번역 엔진 무시)
    const anySuccess =
      promptResult.status === 'fulfilled' || docsResult.status === 'fulfilled';

    if (!anySuccess) return EMPTY_TRANSLATION_CTX;

    return {
      worldBible,
      pastTerms: partitioned.pastTerms,
      pastEpisodeSummary: partitioned.pastEpisodeSummary,
      genreRules: partitioned.genreRules,
      fetched: true,
    };
  } catch (err) {
    logger.warn('RAG', 'translation ctx build failed (non-blocking)', err);
    return EMPTY_TRANSLATION_CTX;
  }
}

// IDENTITY_SEAL: ragService | role=rag-client-8082 | inputs=query+top_k | outputs=documents|prompt|translationContext
