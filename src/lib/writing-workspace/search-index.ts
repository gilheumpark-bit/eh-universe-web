// ============================================================
// search-index — 본문 검색 (Ctrl+F)
// findMatches / nextMatchIndex 순수 TS.
// React/DOM 직접 호출 0. 절대금지 8파일 import 0. 신규 모듈 상호 import 0.
// ============================================================

// ============================================================
// PART 1 — 타입 · 옵션 (공개 계약)
// ============================================================

/** UTF-16 인덱스 기준 [start, end) 매치 범위. end는 exclusive. */
export interface MatchRange {
  start: number;
  end: number;
}

/** findMatches 옵션 — 모두 선택. 기본: 대소문자 무시·부분 일치. */
export interface FindOptions {
  /** true → 대소문자 구분. 기본 false. */
  caseSensitive?: boolean;
  /** true → 단어 경계(\b)에서만 매치. 기본 false. */
  wholeWord?: boolean;
}

/** 다음/이전 방향 — UI 화살표 키 매핑. */
export type MatchDirection = 'next' | 'prev';

// ============================================================
// PART 2 — 내부 헬퍼 (정규식 escape · 빈입력 가드)
// ============================================================

/**
 * 정규식 메타 특수문자 escape.
 * 사용자 입력 query를 RegExp에 안전 주입하기 위함.
 * 대상: . * + ? ^ $ { } ( ) | [ ] \ /
 */
function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

/**
 * 빈 입력/null/undefined/비문자열 가드.
 * text 또는 query가 비어있으면 검색 불가 → 호출부에서 [] 반환.
 */
function isUsable(text: unknown, query: unknown): text is string {
  if (typeof text !== 'string' || typeof query !== 'string') return false;
  if (text.length === 0 || query.length === 0) return false;
  return true;
}

// ============================================================
// PART 3 — findMatches (본문 검색)
// ============================================================

/**
 * 본문 text 에서 query 의 모든 매치 위치를 반환.
 * - UTF-16 코드 유닛 인덱스 ({start, end}, end exclusive).
 * - 빈 query / 빈 text / 비문자열 → [].
 * - 정규식 메타 특수문자는 escape 처리 → 평문 검색만.
 * - opts.caseSensitive: 기본 false (대소문자 무시).
 * - opts.wholeWord: 기본 false. true 시 \b 양쪽 강제.
 * - 매치 범위는 서로 겹치지 않음 (lastIndex 사용 → 0-너비 매치 무한루프 방어).
 */
export function findMatches(
  text: string,
  query: string,
  opts?: FindOptions,
): MatchRange[] {
  if (!isUsable(text, query)) return [];

  const caseSensitive = opts?.caseSensitive === true;
  const wholeWord = opts?.wholeWord === true;

  const escaped = escapeRegExp(query);
  const pattern = wholeWord ? `(?:^|\\b)(?:${escaped})(?=\\b|$)` : escaped;
  const flags = caseSensitive ? 'g' : 'gi';

  let re: RegExp;
  try {
    re = new RegExp(pattern, flags);
  } catch {
    // RegExp 생성 실패 (이론상 불가 — escape 후) → 안전하게 빈 결과
    return [];
  }

  const out: MatchRange[] = [];
  let safety = 0;
  // 매우 큰 본문 + 짧은 query 조합을 고려해 상한선만 둠 (실효 무한).
  const HARD_CAP = 1_000_000;

  while (safety < HARD_CAP) {
    const m = re.exec(text);
    if (m === null) break;
    const start = m.index;
    const end = start + m[0].length;
    if (end === start) {
      // 0-너비 매치 방어 (wholeWord ^ 등) — 1 전진.
      re.lastIndex = start + 1;
      safety += 1;
      continue;
    }
    out.push({ start, end });
    safety += 1;
  }

  return out;
}

// ============================================================
// PART 4 — nextMatchIndex (다음/이전 이동)
// ============================================================

/**
 * 매치 배열에서 current 위치 기준 다음/이전 인덱스 반환.
 * - matches 빈 배열 → -1.
 * - direction === 'next' → (current + 1) % len.
 * - direction === 'prev' → (current - 1 + len) % len.
 * - current 가 범위 밖이거나 음수면:
 *   - 'next' → 0 (첫 번째로).
 *   - 'prev' → len - 1 (마지막으로).
 * - 비정상 입력(null/비배열/NaN) → -1.
 *
 * 충돌 없음 보장: findMatches 결과를 그대로 넣으면 항상 유효 인덱스 반환.
 */
export function nextMatchIndex(
  matches: ReadonlyArray<MatchRange> | null | undefined,
  current: number,
  direction: MatchDirection,
): number {
  if (!Array.isArray(matches)) return -1;
  const len = matches.length;
  if (len === 0) return -1;
  if (direction !== 'next' && direction !== 'prev') return -1;

  const cur = typeof current === 'number' && Number.isFinite(current) ? Math.trunc(current) : -1;

  if (cur < 0 || cur >= len) {
    return direction === 'next' ? 0 : len - 1;
  }

  return direction === 'next' ? (cur + 1) % len : (cur - 1 + len) % len;
}
