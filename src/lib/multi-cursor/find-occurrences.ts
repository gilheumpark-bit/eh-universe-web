// ============================================================
// PART 1 — Module Header
// ============================================================
//
// find-occurrences.ts — 본문에서 동일 표현 모든 위치 찾기.
//
// 기존 rename-engine 은 프로젝트 전체 일괄 치환용 (큰 batch).
// Multi-cursor 는 활성 episode 단일 본문 내에서 N개 위치 동시 편집.
//
// [C] 빈 텍스트 / 빈 query → 빈 array / [G] 단일 패스 / [K] 단일 책임
// ============================================================

export interface Occurrence {
  /** 시작 char offset */
  start: number;
  /** 끝 char offset (exclusive) */
  end: number;
  /** 매칭 텍스트 */
  text: string;
}

export interface FindOptions {
  caseSensitive?: boolean;
  /** 단어 경계 매칭 (한글에선 불완전, 영어 효과적) */
  wholeWord?: boolean;
  /** 정규식 모드 */
  regex?: boolean;
}

export function findAllOccurrences(
  text: string,
  query: string,
  options: FindOptions = {},
): Occurrence[] {
  if (!text || !query) return [];

  let pattern: string;
  if (options.regex) {
    pattern = query;
  } else {
    pattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (options.wholeWord) {
      pattern = `\\b${pattern}\\b`;
    }
  }

  let re: RegExp;
  try {
    re = new RegExp(pattern, options.caseSensitive ? 'g' : 'gi');
  } catch {
    return []; // [C] invalid regex 방어
  }

  const out: Occurrence[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[0].length === 0) {
      // [C] zero-width match 무한 루프 방어
      re.lastIndex++;
      continue;
    }
    out.push({
      start: m.index,
      end: m.index + m[0].length,
      text: m[0],
    });
  }
  return out;
}

/**
 * Multi-cursor 일괄 치환 — 모든 occurrence 를 replacement 로 교체.
 * 뒤에서 앞으로 치환 (offset 무효화 방지).
 */
export function replaceAllOccurrences(
  text: string,
  occurrences: Occurrence[],
  replacement: string,
): string {
  if (occurrences.length === 0) return text;
  const sorted = [...occurrences].sort((a, b) => b.start - a.start);
  let result = text;
  for (const occ of sorted) {
    result = result.slice(0, occ.start) + replacement + result.slice(occ.end);
  }
  return result;
}
