// ============================================================
// NOA Sanitizer — Korean Jamo Reassembly Map
// Source: NOA v31.2 Ultimate Sovereign (JAMO_MAP)
// ============================================================
// 호환용 자모(Hangul Compatibility Jamo, U+3130~U+318F)를
// 초성/중성(Hangul Jamo, U+1100~U+1175)으로 변환하여
// NFC 정규화 시 완성형 한글로 결합되도록 한다.
//
// 공격 예: "ㅎㅐ킹" (3개 호환 자모) → NFKC로도 "해킹"이 안 됨
//          JAMO_MAP 적용 후 NFC → "해킹" 복원 → 패턴 탐지 가능
// ============================================================

/**
 * 호환용 자모 → 결합용 자모 매핑 테이블.
 * Key: 호환용 자모 코드포인트 (U+3131~U+3163)
 * Value: 결합용 자모 코드포인트 (U+1100~U+1175)
 */
export const JAMO_MAP: ReadonlyMap<number, number> = new Map<number, number>([
  // 초성 (Choseong)
  [0x3131, 0x1100], // ㄱ
  [0x3132, 0x1101], // ㄲ
  [0x3134, 0x1102], // ㄴ (0x3133 ㄳ은 겹받침)
  [0x3137, 0x1103], // ㄷ
  [0x3138, 0x1104], // ㄸ
  [0x3139, 0x1105], // ㄹ
  [0x3141, 0x1106], // ㅁ
  [0x3142, 0x1107], // ㅂ
  [0x3143, 0x1108], // ㅃ
  [0x3145, 0x1109], // ㅅ
  [0x3146, 0x110a], // ㅆ
  [0x3147, 0x110b], // ㅇ
  [0x3148, 0x110c], // ㅈ
  [0x3149, 0x110d], // ㅉ
  [0x314a, 0x110e], // ㅊ
  [0x314b, 0x110f], // ㅋ
  [0x314c, 0x1110], // ㅌ
  [0x314d, 0x1111], // ㅍ
  [0x314e, 0x1112], // ㅎ

  // 중성 (Jungseong)
  [0x314f, 0x1161], // ㅏ
  [0x3150, 0x1162], // ㅐ
  [0x3151, 0x1163], // ㅑ
  [0x3152, 0x1164], // ㅒ
  [0x3153, 0x1165], // ㅓ
  [0x3154, 0x1166], // ㅔ
  [0x3155, 0x1167], // ㅕ
  [0x3156, 0x1168], // ㅖ
  [0x3157, 0x1169], // ㅗ
  [0x3158, 0x116a], // ㅘ
  [0x3159, 0x116b], // ㅙ
  [0x315a, 0x116c], // ㅚ
  [0x315b, 0x116d], // ㅛ
  [0x315c, 0x116e], // ㅜ
  [0x315d, 0x116f], // ㅝ
  [0x315e, 0x1170], // ㅞ
  [0x315f, 0x1171], // ㅟ
  [0x3160, 0x1172], // ㅠ
  [0x3161, 0x1173], // ㅡ
  [0x3162, 0x1174], // ㅢ
  [0x3163, 0x1175], // ㅣ
]);

/**
 * 호환용 자모를 결합용 자모로 변환 후 NFC 정규화하여
 * 분리된 자모를 완성형 한글로 재조립한다.
 *
 * @param text - 자모 분리 공격이 포함될 수 있는 텍스트
 * @returns 재조립된 텍스트
 */
export function reassembleJamo(text: string): string {
  const chars: string[] = [];

  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    const mapped = JAMO_MAP.get(cp);
    chars.push(mapped !== undefined ? String.fromCodePoint(mapped) : ch);
  }

  return chars.join("").normalize("NFC");
}
