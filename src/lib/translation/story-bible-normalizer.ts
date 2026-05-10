/**
 * story-bible-normalizer.ts (2026-05-10 신설 — P-07 수리)
 *
 * Translator stage 10 (translator-story-bible) 출력의 bullet 표준화.
 *
 * 배경:
 *   - LLM 이 bullet 형식을 `- text` / `• text` / `* text` 등 변동 출력
 *   - UI 표시·markdown 가공 시 일관성 필요
 *   - prompt 가드만으로 100% 강제 어려움 → 사후 정규화
 *
 * 정책:
 *   - 모든 bullet 마커 (dot/asterisk/dash 변형) 를 ASCII '-' 로 통일
 *   - 들여쓰기 보존 (sub-bullet)
 *   - 빈 라인 보존
 *   - 'CONFLICT CHECK:' 라인은 그대로 (특수 마커)
 *
 * [C] 안전성: 입력 unchanged 시 unchanged 출력
 * [G] 성능: 정규식 한 번 + replace
 * [K] 간결성: normalizeBullets + 보조 헬퍼
 */

// 정규식 character class — 유니코드 escape 로 ASCII-safe 작성 (mojibake 방지).
// U+00B7 MIDDLE DOT, U+2022 BULLET, U+002A ASTERISK, U+FF0A FULLWIDTH ASTERISK,
// U+25AA BLACK SMALL SQUARE, U+25AB WHITE SMALL SQUARE, U+25E6 WHITE BULLET,
// U+25C6 BLACK DIAMOND, U+25C7 WHITE DIAMOND,
// U+25A0 BLACK SQUARE, U+25A1 WHITE SQUARE, U+25CF BLACK CIRCLE, U+25CB WHITE CIRCLE
const BULLET_MARKERS = /^(\s*)([·•*＊▪▫◦◆◇■□●○])\s+/gm;
// U+2013 EN DASH, U+2014 EM DASH, U+2212 MINUS SIGN
const ALT_DASH_MARKERS = /^(\s*)([–—−])\s+/gm;

/**
 * Story Bible 출력의 bullet 마커를 `- ` 표준으로 정규화.
 *
 * 변환:
 *   • → -
 *   * → -
 *   ＊ → -
 *   · → -
 *   – / — / − → -
 *   - 그대로 유지
 *
 * 들여쓰기 (들여쓰기 + bullet) 보존:
 *   "  • Sub item" → "  - Sub item"
 */
export function normalizeStoryBibleBullets(text: string): string {
  if (!text) return text;
  return text
    .replace(BULLET_MARKERS, '$1- ')
    .replace(ALT_DASH_MARKERS, '$1- ');
}

/**
 * CONFLICT CHECK 라인 추출. 사용자에게 알림용.
 * 형식: "CONFLICT CHECK: <설명>"
 */
export function extractConflictChecks(text: string): string[] {
  if (!text) return [];
  const lines = text.split('\n');
  return lines
    .map(l => l.trim())
    .filter(l => l.startsWith('CONFLICT CHECK:'))
    .map(l => l.slice('CONFLICT CHECK:'.length).trim());
}

/**
 * 정규화 + conflict 추출 통합. 사용자 UI 에 직접 사용.
 */
export function processStoryBibleOutput(rawText: string): {
  normalized: string;
  conflicts: string[];
} {
  return {
    normalized: normalizeStoryBibleBullets(rawText),
    conflicts: extractConflictChecks(rawText),
  };
}
