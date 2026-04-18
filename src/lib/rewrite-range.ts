// ============================================================
// rewrite-range — 범위 기반 텍스트 치환 유틸
// ============================================================
// [C] 경계 검증, [G] O(n) 단일 슬라이스, [K] 최소 표면적.
//
// Why this exists:
//   InlineActionPopup 은 `editorSelection.from/to` (ProseMirror doc pos)
//   을 전달하지만, EditModeSection 의 원본 상태는 `editor.getText()`
//   (플레인 텍스트)로, 단락 노드 사이에 "\n" 가 삽입돼 오프셋이
//   살짝 어긋날 수 있다.
//   따라서 (1) 범위 기반 치환을 기본 경로로 사용하되,
//   (2) 선택된 텍스트가 해당 범위와 실제로 일치하는지 검증하고,
//   (3) 일치하지 않으면 안전한 "첫 매치" 폴백으로 내려간다.
//
//   이렇게 하면 "같은 문장이 여러 번 나오는 원고"에서
//   잘못된 위치가 치환되는 P0 버그를 차단한다.
// ============================================================

import { logger } from '@/lib/logger';

export interface ReplaceRangeResult {
  /** 치환이 적용된 전체 텍스트 */
  content: string;
  /** 어떤 전략이 실제로 사용됐는지 */
  strategy: 'range' | 'fallback-first-match' | 'no-op';
  /** 실제 치환이 일어난 시작 오프셋 (no-op 이면 -1) */
  appliedAt: number;
}

/**
 * 지정된 [start, end) 범위를 replacement 로 치환한다.
 * 범위가 유효하지 않으면 원본을 그대로 반환한다.
 */
export function replaceRange(
  fullText: string,
  startOffset: number,
  endOffset: number,
  replacement: string,
): string {
  if (
    !Number.isFinite(startOffset) ||
    !Number.isFinite(endOffset) ||
    startOffset < 0 ||
    endOffset > fullText.length ||
    startOffset > endOffset
  ) {
    logger.warn('rewrite-range', 'invalid range — returning original', {
      startOffset,
      endOffset,
      length: fullText.length,
    });
    return fullText;
  }
  return fullText.slice(0, startOffset) + replacement + fullText.slice(endOffset);
}

/**
 * 범위 기반 치환을 우선 시도하고, 해당 범위의 실제 텍스트가
 * `oldText` 와 일치하지 않으면 첫 매치로 폴백한다.
 * 전역에 존재하지 않으면 no-op.
 *
 * 정확한 범위를 알 수 없는 경우 (`startOffset == null`) 에도
 * 첫 매치 폴백을 시도한다 — 단, 이 경우 호출자에게 책임이 있다.
 */
export function safeReplaceRange(
  fullText: string,
  oldText: string,
  newText: string,
  startOffset: number | null | undefined,
  endOffset: number | null | undefined,
): ReplaceRangeResult {
  // [C] 빈 oldText 는 무한 루프/모호성 유발 → 차단
  if (!oldText) {
    return { content: fullText, strategy: 'no-op', appliedAt: -1 };
  }

  // 1) 정확한 범위가 있고 실제 슬라이스가 oldText 와 일치 → 범위 치환
  if (
    typeof startOffset === 'number' &&
    typeof endOffset === 'number' &&
    startOffset >= 0 &&
    endOffset <= fullText.length &&
    startOffset < endOffset
  ) {
    const actual = fullText.slice(startOffset, endOffset);
    if (actual === oldText) {
      return {
        content: replaceRange(fullText, startOffset, endOffset, newText),
        strategy: 'range',
        appliedAt: startOffset,
      };
    }
    // [C] 범위 밖으로 표류했을 가능성 — 경고 남기고 폴백
    logger.warn('rewrite-range', 'range mismatch — falling back to first match', {
      expected: oldText.slice(0, 40),
      actual: actual.slice(0, 40),
      startOffset,
      endOffset,
    });
  }

  // 2) 폴백 — 첫 매치 치환. 없으면 no-op.
  const idx = fullText.indexOf(oldText);
  if (idx === -1) {
    return { content: fullText, strategy: 'no-op', appliedAt: -1 };
  }
  return {
    content: fullText.slice(0, idx) + newText + fullText.slice(idx + oldText.length),
    strategy: 'fallback-first-match',
    appliedAt: idx,
  };
}
