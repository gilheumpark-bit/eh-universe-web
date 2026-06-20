// ============================================================
// NOA Sanitizer — Zero-Width Character Purge
// Source: NOA v32.0+ (ZWSP/ZWNJ/ZWJ 공격 방어)
// ============================================================

/**
 * 투명 문자 코드포인트 목록.
 * 공격자가 키워드 사이에 삽입하여 정규식 탐지를 우회하는 데 사용됨.
 * 예: "해\u200B킹" → 정규식으로 "해킹" 매칭 실패
 */
export const ZERO_WIDTH_CHARS: readonly number[] = [
  0x200b, // Zero Width Space (ZWSP)
  0x200c, // Zero Width Non-Joiner (ZWNJ)
  0x200d, // Zero Width Joiner (ZWJ)
  0x200e, // Left-to-Right Mark
  0x200f, // Right-to-Left Mark
  0x2060, // Word Joiner
  0x2061, // Function Application
  0x2062, // Invisible Times
  0x2063, // Invisible Separator
  0x2064, // Invisible Plus
  0xfeff, // BOM / Zero Width No-Break Space
  0x00ad, // Soft Hyphen
  0x034f, // Combining Grapheme Joiner
  0x061c, // Arabic Letter Mark
  0x115f, // Hangul Choseong Filler
  0x1160, // Hangul Jungseong Filler
  0x17b4, // Khmer Vowel Inherent Aq
  0x17b5, // Khmer Vowel Inherent Aa
  0x180e, // Mongolian Vowel Separator
] as const;

const ZERO_WIDTH_SET = new Set(ZERO_WIDTH_CHARS);

/**
 * 텍스트에서 Zero-Width 문자를 모두 제거한다.
 *
 * @param text - 원본 텍스트
 * @returns cleaned 텍스트와 제거된 문자 수
 */
export function purgeZeroWidth(text: string): {
  cleaned: string;
  removed: number;
} {
  let removed = 0;
  const chars: string[] = [];

  for (const ch of text) {
    if (ZERO_WIDTH_SET.has(ch.codePointAt(0) ?? 0)) {
      removed++;
    } else {
      chars.push(ch);
    }
  }

  return { cleaned: chars.join(""), removed };
}
