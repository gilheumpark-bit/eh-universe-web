// ============================================================
// Translation Memory (TM) — 번역 재활용 시스템
// ============================================================
// 이전 번역 결과를 저장하고, 유사 문장 발견 시 재활용.
// localStorage 기반 (오프라인 지원).

import { logger } from '@/lib/logger';

const TM_STORAGE_KEY = 'eh-translation-memory';
const MAX_TM_ENTRIES = 5000;

export interface TMEntry {
  source: string;
  target: string;
  sourceLang: string;
  targetLang: string;
  domain?: string;
  /** 확정된 번역인지 (human-confirmed) */
  confirmed: boolean;
  timestamp: number;
  /** 사용 횟수 */
  useCount: number;
}

export interface TMMatch {
  entry: TMEntry;
  /** 유사도 (0-1) */
  similarity: number;
  /** 매칭 타입 */
  type: 'exact' | 'fuzzy';
}

// ── Storage + Trigram 캐시 ──

let _tmCache: TMEntry[] | null = null;
let _trigramIndex: Map<string, number[]> | null = null;
let _cacheVersion = 0;

function toTrigrams(s: string): Set<string> {
  const norm = s.toLowerCase().replace(/\s+/g, ' ').trim();
  const tgs = new Set<string>();
  for (let i = 0; i <= norm.length - 3; i++) tgs.add(norm.slice(i, i + 3));
  return tgs;
}

function buildTrigramIndex(entries: TMEntry[]): Map<string, number[]> {
  const idx = new Map<string, number[]>();
  for (let i = 0; i < entries.length; i++) {
    for (const tg of toTrigrams(entries[i].source)) {
      const arr = idx.get(tg);
      if (arr) arr.push(i); else idx.set(tg, [i]);
    }
  }
  return idx;
}

function getCachedTM(): { entries: TMEntry[]; index: Map<string, number[]> } {
  if (!_tmCache) {
    _tmCache = loadTMRaw();
    _trigramIndex = buildTrigramIndex(_tmCache);
  }
  return { entries: _tmCache, index: _trigramIndex! };
}

/** 캐시 무효화 (addToTM/saveTM 후 호출) */
function invalidateCache() { _tmCache = null; _trigramIndex = null; _cacheVersion++; }

function loadTMRaw(): TMEntry[] {
  try {
    const raw = localStorage.getItem(TM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    logger.warn('TranslationMemory', 'localStorage load/parse failed', err);
    return [];
  }
}

export function loadTM(): TMEntry[] {
  return getCachedTM().entries;
}

export function saveTM(entries: TMEntry[]): void {
  const trimmed = entries
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_TM_ENTRIES);
  localStorage.setItem(TM_STORAGE_KEY, JSON.stringify(trimmed));
  invalidateCache();
}

/** TM에 번역 결과 추가 */
export function addToTM(
  source: string, target: string,
  sourceLang: string, targetLang: string,
  confirmed: boolean = false, domain?: string,
): void {
  const entries = loadTM();
  const existing = entries.find(e => e.source === source && e.targetLang === targetLang);
  if (existing) {
    existing.target = target;
    existing.confirmed = confirmed || existing.confirmed;
    existing.timestamp = Date.now();
    existing.useCount++;
  } else {
    entries.push({ source, target, sourceLang, targetLang, domain, confirmed, timestamp: Date.now(), useCount: 0 });
  }
  saveTM(entries);
}

/** 배치로 TM에 추가 */
export function addBatchToTM(
  pairs: Array<{ source: string; target: string }>,
  sourceLang: string, targetLang: string,
  confirmed: boolean = false,
): void {
  const entries = loadTM();
  for (const { source, target } of pairs) {
    if (!source.trim() || !target.trim()) continue;
    const existing = entries.find(e => e.source === source && e.targetLang === targetLang);
    if (existing) {
      existing.target = target;
      existing.confirmed = confirmed || existing.confirmed;
      existing.timestamp = Date.now();
    } else {
      entries.push({ source, target, sourceLang, targetLang, confirmed, timestamp: Date.now(), useCount: 0 });
    }
  }
  saveTM(entries);
}

/** 소스 문장에 대한 TM 매치 검색 (trigram 프리필터 → Jaro-Winkler 정밀 비교) */
export function searchTM(source: string, targetLang: string, threshold: number = 0.7): TMMatch[] {
  const { entries, index } = getCachedTM();
  const matches: TMMatch[] = [];

  // 1단계: trigram 프리필터 — 후보 O(trigram수) 로 축소
  const sourceTrigrams = toTrigrams(source);
  const candidateSet = new Set<number>();
  for (const tg of sourceTrigrams) {
    const idxs = index.get(tg);
    if (idxs) for (const i of idxs) candidateSet.add(i);
  }

  // 2단계: 후보만 Jaro-Winkler 정밀 비교
  const normSource = normalize(source);
  for (const i of candidateSet) {
    const entry = entries[i];
    if (entry.targetLang !== targetLang) continue;

    if (entry.source === source) {
      matches.push({ entry, similarity: 1.0, type: 'exact' });
      continue;
    }
    const sim = jaroWinkler(normSource, normalize(entry.source));
    if (sim >= threshold) {
      matches.push({ entry, similarity: sim, type: 'fuzzy' });
    }
  }

  return matches
    .sort((a, b) => b.similarity - a.similarity || (b.entry.confirmed ? 1 : 0) - (a.entry.confirmed ? 1 : 0))
    .slice(0, 5);
}

/** TM 내보내기 (JSON) */
export function exportTM(): string {
  return JSON.stringify(loadTM(), null, 2);
}

/** TM 가져오기 (JSON) */
export function importTM(json: string): number {
  try {
    const imported = JSON.parse(json);
    if (!Array.isArray(imported)) return 0;
    const existing = loadTM();
    let added = 0;
    for (const entry of imported) {
      if (!entry.source || !entry.target) continue;
      const dup = existing.find(e => e.source === entry.source && e.targetLang === entry.targetLang);
      if (!dup) {
        existing.push({ ...entry, timestamp: entry.timestamp || Date.now(), useCount: 0 });
        added++;
      }
    }
    saveTM(existing);
    return added;
  } catch (err) {
    logger.warn('TranslationMemory', 'importTM JSON parse failed', err);
    return 0;
  }
}

/** TM 통계 */
export function tmStats(): { total: number; confirmed: number; languages: string[] } {
  const entries = loadTM();
  return {
    total: entries.length,
    confirmed: entries.filter(e => e.confirmed).length,
    languages: [...new Set(entries.map(e => e.targetLang))],
  };
}

// ── 유사도 계산 (Jaro-Winkler) ──

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0;

  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;

  // Winkler prefix bonus
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

// ============================================================
// PART N — RAG Fallback (Phase 5)
// ============================================================
// 로컬 TM 검색 결과가 부족할 때 RAG (DGX Spark 8082) 보강 검색.
// 신규 export만 추가. 기존 searchTM/loadTM/addToTM 시그니처 미수정.

import { ragSearch, type RagDocument } from '@/services/ragService';

export interface TMSuggestion {
  source: string;
  target: string;
  /** 0~1 유사도 */
  similarity: number;
  source_type: 'local' | 'rag';
  meta?: {
    episode?: number;
    projectId?: string;
    confidence?: number;
  };
}

export interface TMRagFallbackOptions {
  /** 반환 최대 개수 (기본 3) */
  topK?: number;
  /** 로컬 결과로 충분하다고 판단할 임계값 (기본 0.75) */
  similarityThreshold?: number;
  /** RAG 호출 시 query에 결합될 프로젝트 식별자 */
  projectId?: string;
  /** 대상 언어 — TM 매칭/필터에 사용 (기본 EN) */
  targetLang?: string;
  /** RAG 타임아웃 (기본 4000ms) */
  timeoutMs?: number;
}

/**
 * 로컬 TM 검색 → 부족 시 RAG fallback.
 *
 * 흐름:
 *   1. searchTM(query, targetLang)으로 로컬 결과 수집
 *   2. 로컬 결과가 topK 이상 + 최고 similarity > threshold → 로컬만 반환
 *   3. 그 외 → RAG search 호출, 결과를 TMSuggestion으로 매핑
 *   4. 로컬 + RAG 병합 → source 텍스트 기준 dedup → similarity 내림차순 → topK 절단
 *
 * RAG 실패 시 로컬 결과 유지 (예외 throw 안 함).
 */
export async function searchWithRAGFallback(
  query: string,
  options: TMRagFallbackOptions = {}
): Promise<TMSuggestion[]> {
  const topK = options.topK ?? 3;
  const threshold = options.similarityThreshold ?? 0.75;
  const targetLang = options.targetLang ?? 'EN';

  // [C] 빈 query 가드
  if (!query || !query.trim()) return [];

  // 1. 로컬 TM 검색 (기존 searchTM 그대로 사용)
  const localMatches = searchTM(query, targetLang, 0.5);
  const localResults: TMSuggestion[] = localMatches
    .slice(0, topK)
    .map((m) => ({
      source: m.entry.source,
      target: m.entry.target,
      similarity: m.similarity,
      source_type: 'local' as const,
      meta: {
        confidence: m.entry.confirmed ? 1 : 0.7,
      },
    }))
    .filter((r) => r.source && r.target);

  // 2. 로컬이 충분하면 그대로 반환
  if (localResults.length >= topK && (localResults[0]?.similarity ?? 0) > threshold) {
    return localResults;
  }

  // 3. RAG fallback — 실패해도 로컬 결과 유지
  try {
    // ragSearch 정식 필드(project_id/filters)로 전달 — 쿼리 결합 우회 폐기.
    // 서버가 신규 필드 미지원이면 그냥 무시되고 결과 반환됨 (하위 호환).
    const ragDocs: RagDocument[] = await ragSearch(
      {
        query: query.slice(0, 400),
        top_k: topK,
        project_id: options.projectId,
        filters: { type: 'translatedPair' },
      },
      { timeoutMs: options.timeoutMs ?? 4000 }
    );

    const ragSuggestions: TMSuggestion[] = ragDocs
      .map((doc) => {
        const meta = (doc.meta ?? {}) as Record<string, unknown>;
        const src =
          typeof meta['source'] === 'string'
            ? (meta['source'] as string)
            : doc.title ?? '';
        const tgt =
          typeof meta['target'] === 'string'
            ? (meta['target'] as string)
            : doc.content ?? '';
        const sim =
          typeof doc.score === 'number'
            ? Math.max(0, Math.min(1, doc.score))
            : 0.5;
        const ep = typeof meta['episode'] === 'number' ? (meta['episode'] as number) : undefined;
        return {
          source: src,
          target: tgt,
          similarity: sim,
          source_type: 'rag' as const,
          meta: {
            episode: ep,
            projectId: options.projectId,
            confidence: typeof doc.score === 'number' ? doc.score : undefined,
          },
        } satisfies TMSuggestion;
      })
      .filter((r) => r.source && r.target);

    // 4. 로컬 + RAG 병합 + dedup + 정렬 + topK
    const seen = new Set<string>();
    const combined: TMSuggestion[] = [];
    for (const r of [...localResults, ...ragSuggestions]) {
      const key = r.source.trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      combined.push(r);
    }
    combined.sort((a, b) => b.similarity - a.similarity);
    return combined.slice(0, topK);
  } catch (err) {
    // RAG 실패 → 로컬만 반환 (예외 전파 안 함)
    logger.warn('TranslationMemory', 'RAG fallback failed — local only', err);
    return localResults;
  }
}
