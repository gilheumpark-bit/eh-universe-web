// ============================================================
// PART 1 — Module Header
// ============================================================
//
// segment-adoption.ts — 세그먼트별 Faithful/Market 채택 시스템.
//
// 시장 분석 4차 §8 §11 핵심 요구:
//   "번역가 검토 → Faithful 채택 / Market 채택 / 직접 편집"
//   "작가 승인 → 출판 패키지"
//
// 한 챕터를 세그먼트(단락) 단위로 쪼개고, 각 세그먼트 별로 4개 액션:
//   - 'faithful'  Source-faithful 결과 채택
//   - 'market'    Market-ready 결과 채택
//   - 'manual'    번역가 직접 편집 (manualText 사용)
//   - 'pending'   미결 (기본값)
//
// finalize() 호출 시 채택된 세그먼트 → 최종 번역본 생성.
//
// [C] 결정론적 — LLM 호출 0
// [G] 단락 split + index 매핑 — O(n)
// [K] segment 모델만 책임 (UI 는 별도)
// ============================================================

// ============================================================
// PART 2 — Types
// ============================================================

export type AdoptionAction = 'faithful' | 'market' | 'manual' | 'pending';

export interface TranslationSegmentAdoption {
  /** 0-based segment index (단락 순서). */
  index: number;
  /** 원문 단락. */
  source: string;
  /** Faithful 결과 단락 (없으면 null). */
  faithful: string | null;
  /** Market 결과 단락 (없으면 null). */
  market: string | null;
  /** 채택 결정. */
  action: AdoptionAction;
  /** action='manual' 일 때 번역가 직접 편집 본문. */
  manualText?: string;
  /** 번역가/작가 코멘트 (옵션). */
  comment?: string;
  /** 마지막 변경 시각 (Unix ms). */
  updatedAt?: number;
}

// ============================================================
// PART 3 — Build / Update / Finalize
// ============================================================

/**
 * 원문 + faithful + market → segment 배열.
 * 단락 수 불일치 시 최대값 기준으로 정렬, 짧은 쪽은 null.
 */
export function buildSegments(
  source: string,
  faithful: string | null,
  market: string | null,
): TranslationSegmentAdoption[] {
  const splitParas = (text: string | null): string[] =>
    (text ?? '')
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

  const srcParas = splitParas(source);
  const fParas = faithful !== null ? splitParas(faithful) : [];
  const mParas = market !== null ? splitParas(market) : [];

  const max = Math.max(srcParas.length, fParas.length, mParas.length);
  const segments: TranslationSegmentAdoption[] = [];
  for (let i = 0; i < max; i++) {
    segments.push({
      index: i,
      source: srcParas[i] ?? '',
      faithful: fParas[i] ?? null,
      market: mParas[i] ?? null,
      action: 'pending',
    });
  }
  return segments;
}

/** 세그먼트 액션 갱신 (immutable). */
export function setSegmentAction(
  segments: TranslationSegmentAdoption[],
  index: number,
  action: AdoptionAction,
  patch?: { manualText?: string; comment?: string },
): TranslationSegmentAdoption[] {
  return segments.map((s) =>
    s.index === index
      ? { ...s, action, ...(patch ?? {}), updatedAt: Date.now() }
      : s,
  );
}

/**
 * 모든 세그먼트 채택 결과 → 최종 번역본.
 *
 * pending 세그먼트는 fallback 으로 market → faithful → '' 순.
 * 행간은 빈 줄로 단락 분리.
 */
export function finalizeSegments(segments: TranslationSegmentAdoption[]): string {
  return segments
    .map((s) => {
      switch (s.action) {
        case 'faithful':
          return s.faithful ?? '';
        case 'market':
          return s.market ?? '';
        case 'manual':
          return s.manualText ?? '';
        case 'pending':
        default:
          return s.market ?? s.faithful ?? '';
      }
    })
    .join('\n\n');
}

/** 채택 통계 — UI 표시용. */
export function summarizeAdoption(segments: TranslationSegmentAdoption[]): {
  total: number;
  faithful: number;
  market: number;
  manual: number;
  pending: number;
  completionRate: number;
} {
  const total = segments.length;
  const faithful = segments.filter((s) => s.action === 'faithful').length;
  const market = segments.filter((s) => s.action === 'market').length;
  const manual = segments.filter((s) => s.action === 'manual').length;
  const pending = segments.filter((s) => s.action === 'pending').length;
  const completionRate = total === 0 ? 0 : (total - pending) / total;
  return { total, faithful, market, manual, pending, completionRate };
}
