// ============================================================
// global-search-index.ts
// 전역 검색 (탭 너머 통합) — 5탭 어디서든 동일 검색 인덱스를 공유하기 위한 순수 모듈.
// 외부 검색 휴리스틱(search-index 등)을 import 하지 않으며, 자체 구현으로 독립한다.
// 의존성 0 (React/DOM 직접 호출 없음).
// ============================================================

// ============================================================
// PART 1 — 타입 정의
//   외부에서 주입되는 검색 대상 (SearchableItem) 과
//   결과 (SearchResult / HighlightExcerpt) 의 형태를 한 곳에 모은다.
// ============================================================

/** 검색 대상 단위. id 는 결과 식별, group 은 탭/카테고리 분류, label 은 우선순위 매치 영역. */
export interface SearchableItem {
  id: string;
  label: string;
  body: string;
  group: string;
}

/** 단건 검색 결과. score 는 높을수록 우선. excerpt 는 매치 ±40자 컨텍스트. */
export interface SearchResult {
  item: SearchableItem;
  score: number;
  excerpt: string;
}

/** highlightExcerpt 반환. 매치 부분을 분리해 UI 에서 강조 렌더 가능하도록 분해한다. */
export interface HighlightExcerpt {
  before: string;
  match: string;
  after: string;
}

/** searchAll 옵션. limit 는 0/음수 무시(전체 반환), caseSensitive 기본 false. */
export interface SearchOptions {
  limit?: number;
  caseSensitive?: boolean;
}

// ============================================================
// PART 2 — 내부 유틸 (정규식 escape · 안전 검사)
//   사용자 query 는 그대로 패턴화하면 ReDoS/오탐 위험 → 메타문자 escape 필수.
// ============================================================

/** 정규식 메타문자 escape. 비문자열·빈 문자열은 빈 문자열로 정규화. */
function escapeRegex(input: string): string {
  if (typeof input !== 'string' || input.length === 0) return '';
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 입력 값이 유효한 SearchableItem 인지 가드. 누락 필드는 빈 문자열로 보정해 안전 처리. */
function normalizeItem(raw: unknown): SearchableItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<SearchableItem>;
  if (typeof r.id !== 'string' || r.id.length === 0) return null;
  return {
    id: r.id,
    label: typeof r.label === 'string' ? r.label : '',
    body: typeof r.body === 'string' ? r.body : '',
    group: typeof r.group === 'string' ? r.group : '',
  };
}

/** 문자열 내 모든 매치 시작 인덱스. 빈 패턴·빈 텍스트는 [] 반환. */
function findAllIndexes(text: string, pattern: string, caseSensitive: boolean): number[] {
  if (text.length === 0 || pattern.length === 0) return [];
  const escaped = escapeRegex(pattern);
  if (escaped.length === 0) return [];
  const flags = caseSensitive ? 'g' : 'gi';
  let re: RegExp;
  try {
    re = new RegExp(escaped, flags);
  } catch {
    return [];
  }
  const out: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push(m.index);
    // 빈 매치 방지: lastIndex 가 전진하지 않으면 강제 진행.
    if (m.index === re.lastIndex) re.lastIndex += 1;
  }
  return out;
}

// ============================================================
// PART 3 — 점수 계산
//   label 매치를 body 매치보다 강하게 가중.
//   같은 필드 내 매치 횟수도 가산하되 label 가중치를 더 크게 둔다.
// ============================================================

const LABEL_HIT_BASE = 10; // label 첫 매치 기본 점수
const LABEL_HIT_REPEAT = 3; // label 추가 매치 마다
const BODY_HIT_BASE = 4; // body 첫 매치 기본 점수
const BODY_HIT_REPEAT = 1; // body 추가 매치 마다
const LABEL_EXACT_BONUS = 25; // label 전체가 query 와 동일

/** 단일 아이템 점수. 0 이면 결과 제외. */
function scoreItem(item: SearchableItem, q: string, caseSensitive: boolean): number {
  const labelHits = findAllIndexes(item.label, q, caseSensitive);
  const bodyHits = findAllIndexes(item.body, q, caseSensitive);
  if (labelHits.length === 0 && bodyHits.length === 0) return 0;

  let score = 0;
  if (labelHits.length > 0) {
    score += LABEL_HIT_BASE + LABEL_HIT_REPEAT * (labelHits.length - 1);
    const cmpLabel = caseSensitive ? item.label : item.label.toLowerCase();
    const cmpQuery = caseSensitive ? q : q.toLowerCase();
    if (cmpLabel === cmpQuery) score += LABEL_EXACT_BONUS;
  }
  if (bodyHits.length > 0) {
    score += BODY_HIT_BASE + BODY_HIT_REPEAT * (bodyHits.length - 1);
  }
  return score;
}

// ============================================================
// PART 4 — excerpt 생성
//   매치 위치 ±40자 컨텍스트. label 우선, 없으면 body 에서 추출.
//   원문 보존 (대소문자 유지) — UI 강조는 highlightExcerpt 에 위임.
// ============================================================

const EXCERPT_RADIUS = 40;

function buildExcerpt(item: SearchableItem, q: string, caseSensitive: boolean): string {
  const labelHits = findAllIndexes(item.label, q, caseSensitive);
  if (labelHits.length > 0) {
    return sliceAround(item.label, labelHits[0], q.length);
  }
  const bodyHits = findAllIndexes(item.body, q, caseSensitive);
  if (bodyHits.length > 0) {
    return sliceAround(item.body, bodyHits[0], q.length);
  }
  // 매치 없는 경우 (이 경로는 score>0 통과 후라 진입 안 됨, 방어용)
  return item.label || item.body.slice(0, EXCERPT_RADIUS);
}

function sliceAround(source: string, hitIndex: number, hitLen: number): string {
  const start = Math.max(0, hitIndex - EXCERPT_RADIUS);
  const end = Math.min(source.length, hitIndex + hitLen + EXCERPT_RADIUS);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < source.length ? '…' : '';
  return prefix + source.slice(start, end) + suffix;
}

// ============================================================
// PART 5 — 공개 API
//   searchAll: 다건 검색 + 점수 정렬 + limit
//   highlightExcerpt: 단일 excerpt 의 매치 위치를 before/match/after 로 분해
// ============================================================

/**
 * 전체 아이템에서 query 매치를 찾아 점수 내림차순 정렬.
 * - 빈 query 또는 공백만 → [] 반환 (조기 반환).
 * - 동점일 때는 입력 순서 유지 (안정 정렬).
 * - opts.limit 가 양의 정수일 때만 자르고, 0/음수/누락은 전체 반환.
 */
export function searchAll(
  items: readonly SearchableItem[] | null | undefined,
  q: string | null | undefined,
  opts?: SearchOptions,
): SearchResult[] {
  if (!Array.isArray(items) || items.length === 0) return [];
  if (typeof q !== 'string') return [];
  const query = q.trim();
  if (query.length === 0) return [];

  const caseSensitive = opts?.caseSensitive === true;
  const limit = typeof opts?.limit === 'number' && opts.limit > 0 ? Math.floor(opts.limit) : undefined;

  const scored: Array<{ result: SearchResult; order: number }> = [];
  for (let i = 0; i < items.length; i += 1) {
    const norm = normalizeItem(items[i]);
    if (!norm) continue;
    const score = scoreItem(norm, query, caseSensitive);
    if (score <= 0) continue;
    scored.push({
      result: {
        item: norm,
        score,
        excerpt: buildExcerpt(norm, query, caseSensitive),
      },
      order: i,
    });
  }

  scored.sort((a, b) => {
    if (b.result.score !== a.result.score) return b.result.score - a.result.score;
    return a.order - b.order;
  });

  const out = scored.map((s) => s.result);
  return limit !== undefined ? out.slice(0, limit) : out;
}

/**
 * 본문(body 또는 임의 문자열)에서 query 첫 매치를 찾아 before/match/after 로 분해.
 * - 매치 없음 / 빈 query / 빈 body → { before: body|'', match: '', after: '' }.
 * - 대소문자 무시가 기본. caseSensitive 옵션은 호출자가 별도 처리하고 싶을 때 확장 여지를 둠.
 */
export function highlightExcerpt(body: string | null | undefined, q: string | null | undefined): HighlightExcerpt {
  const safeBody = typeof body === 'string' ? body : '';
  if (typeof q !== 'string' || q.length === 0 || safeBody.length === 0) {
    return { before: safeBody, match: '', after: '' };
  }
  const hits = findAllIndexes(safeBody, q, false);
  if (hits.length === 0) {
    return { before: safeBody, match: '', after: '' };
  }
  const at = hits[0];
  return {
    before: safeBody.slice(0, at),
    match: safeBody.slice(at, at + q.length),
    after: safeBody.slice(at + q.length),
  };
}
