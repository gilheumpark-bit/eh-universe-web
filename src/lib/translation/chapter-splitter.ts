// ============================================================
// PART 1 — Module Header
// ============================================================
//
// chapter-splitter.ts — 영어 long-form chapter → 한국 웹소설 회차 단위 자동 분할.
//
// 시장 분석 4차 §3 §4 §5 핵심 요구:
//   "한국식 회차 리듬 / 빠른 전개 구조 / 회차 단위 재구성"
//
// 정책:
//   - Market track 전용 (Faithful 은 원본 1:1 보존이므로 분할 X)
//   - 한국 웹소설 표준 5,500자 ± 500 chunk
//   - 자연 break 우선 (장면 전환 / scene break / 시간 점프)
//   - 회차 끝 cliffhanger 권장 위치 marker (선택)
//
// [C] 결정론적 — LLM 호출 0
// [G] 한 번 패스 — O(n)
// [K] 분할만 담당, 후킹·재작성은 LLM (Stage 4 market track)
// ============================================================

// ============================================================
// PART 2 — Types
// ============================================================

export interface ChapterSplit {
  index: number;
  title: string;
  content: string;
  charCount: number;
  /** 자연 break 사용 여부 (true) vs 강제 분할 (false) */
  naturalBreak: boolean;
}

export interface SplitOptions {
  /** 목표 회차 길이 — 기본 5500자 (한국 웹소설 표준) */
  targetCharCount?: number;
  /** 허용 변동폭 — 기본 ±500 */
  tolerance?: number;
  /** 회차 제목 prefix — 기본 "Episode" */
  titlePrefix?: string;
  /** scene break marker 패턴 — 기본 ['\n***\n', '\n---\n', '\n# '] */
  breakPatterns?: string[];
}

const DEFAULTS: Required<SplitOptions> = {
  targetCharCount: 5500,
  tolerance: 500,
  titlePrefix: 'Episode',
  breakPatterns: ['\n\n***\n\n', '\n\n---\n\n', '\n\n# ', '\n\n## '],
};

// ============================================================
// PART 3 — Helpers
// ============================================================

/** 텍스트에서 자연 break 위치 list (target ± tolerance 내). */
function findNaturalBreaks(
  text: string,
  start: number,
  target: number,
  tolerance: number,
  patterns: string[],
): number[] {
  const min = start + target - tolerance;
  const max = start + target + tolerance;
  const positions: number[] = [];
  for (const pat of patterns) {
    let idx = text.indexOf(pat, min);
    while (idx !== -1 && idx <= max) {
      positions.push(idx + pat.length);
      idx = text.indexOf(pat, idx + 1);
    }
  }
  // 단락 break (빈 줄 2개) 도 후보
  let nlIdx = text.indexOf('\n\n', min);
  while (nlIdx !== -1 && nlIdx <= max) {
    positions.push(nlIdx + 2);
    nlIdx = text.indexOf('\n\n', nlIdx + 1);
  }
  return [...new Set(positions)].sort((a, b) => a - b);
}

/** target 에 가장 가까운 break 선택. */
function pickClosestBreak(positions: number[], start: number, target: number): number | null {
  if (positions.length === 0) return null;
  const ideal = start + target;
  let best = positions[0];
  let bestDiff = Math.abs(positions[0] - ideal);
  for (const p of positions) {
    const diff = Math.abs(p - ideal);
    if (diff < bestDiff) {
      best = p;
      bestDiff = diff;
    }
  }
  return best;
}

// ============================================================
// PART 4 — 메인 export
// ============================================================

/**
 * 긴 텍스트 → 5,500자 단위 회차 분할.
 *
 * 알고리즘:
 *   1) start=0
 *   2) target=5500 위치 ± tolerance 내 자연 break 후보 수집
 *   3) 가장 target 에 가까운 break 선택 → 회차 끝
 *   4) break 없으면 강제 분할 (target 위치)
 *   5) 다음 회차 start=break, 반복
 *
 * 호출 패턴:
 *   const splits = splitIntoChapters(longMarketText);
 *   // splits.length 회차, 각 회차 ~5500자
 */
export function splitIntoChapters(
  text: string,
  options: SplitOptions = {},
): ChapterSplit[] {
  const opts = { ...DEFAULTS, ...options };
  const { targetCharCount, tolerance, titlePrefix, breakPatterns } = opts;

  if (text.length <= targetCharCount + tolerance) {
    // 한 회차로 충분
    return [{
      index: 1,
      title: `${titlePrefix} 1`,
      content: text.trim(),
      charCount: text.length,
      naturalBreak: true,
    }];
  }

  const splits: ChapterSplit[] = [];
  let start = 0;
  let index = 1;

  while (start < text.length) {
    const remaining = text.length - start;
    if (remaining <= targetCharCount + tolerance) {
      // 마지막 회차
      splits.push({
        index,
        title: `${titlePrefix} ${index}`,
        content: text.slice(start).trim(),
        charCount: remaining,
        naturalBreak: true,
      });
      break;
    }

    const candidates = findNaturalBreaks(text, start, targetCharCount, tolerance, breakPatterns);
    const breakAt = pickClosestBreak(candidates, start, targetCharCount);
    let end: number;
    let natural: boolean;
    if (breakAt !== null) {
      end = breakAt;
      natural = true;
    } else {
      // 강제 분할 — 가장 가까운 단어 경계
      const forcedTarget = start + targetCharCount;
      const wordBoundary = text.indexOf(' ', forcedTarget);
      end = wordBoundary !== -1 && wordBoundary - forcedTarget < 100 ? wordBoundary + 1 : forcedTarget;
      natural = false;
    }

    const content = text.slice(start, end).trim();
    splits.push({
      index,
      title: `${titlePrefix} ${index}`,
      content,
      charCount: content.length,
      naturalBreak: natural,
    });
    start = end;
    index++;
  }

  return splits;
}

// ============================================================
// PART 5 — UI/리포트 헬퍼
// ============================================================

/** 분할 통계 — UI 표시용. */
export function summarizeSplit(splits: ChapterSplit[]): {
  total: number;
  avgCharCount: number;
  naturalBreakRate: number;
  totalChars: number;
} {
  if (splits.length === 0) {
    return { total: 0, avgCharCount: 0, naturalBreakRate: 1, totalChars: 0 };
  }
  const totalChars = splits.reduce((s, c) => s + c.charCount, 0);
  const naturalCount = splits.filter((c) => c.naturalBreak).length;
  return {
    total: splits.length,
    avgCharCount: Math.round(totalChars / splits.length),
    naturalBreakRate: naturalCount / splits.length,
    totalChars,
  };
}
