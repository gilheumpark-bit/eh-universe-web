// ============================================================
// Intl Utilities — 브라우저 내장 국제화 API 활용
// ============================================================

/** CJK 텍스트를 문장 단위로 정확하게 분할 (Intl.Segmenter) */
export function segmentSentences(text: string, locale: string = 'ko'): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    // @ts-ignore
    const segmenter = new Intl.Segmenter(locale, { granularity: 'sentence' });
    // @ts-ignore
    return Array.from(segmenter.segment(text), (s: { segment: string }) => s.segment.trim()).filter(Boolean);
  }
  // fallback
  return text.split(/(?<=[.!?。！？])\s+/).filter(Boolean);
}

/** 단어 단위 분할 (CJK 대응) */
export function segmentWords(text: string, locale: string = 'ko'): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    // @ts-ignore
    const segmenter = new Intl.Segmenter(locale, { granularity: 'word' });
    // @ts-ignore
    return Array.from(segmenter.segment(text), (s: { segment: string; isWordLike: boolean }) => s.isWordLike ? s.segment : null).filter(Boolean) as string[];
  }
  return text.split(/\s+/).filter(Boolean);
}

/** 날짜 포맷 (로케일 자동) */
export function formatDate(date: Date | number, locale: string = 'ko', style: 'short' | 'medium' | 'long' = 'medium'): string {
  const opts: Intl.DateTimeFormatOptions = style === 'short'
    ? { month: 'numeric', day: 'numeric' }
    : style === 'long'
      ? { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }
      : { year: 'numeric', month: 'short', day: 'numeric' };
  return new Intl.DateTimeFormat(locale, opts).format(typeof date === 'number' ? new Date(date) : date);
}

/** 숫자 포맷 (로케일 자동) */
export function formatNumber(num: number, locale: string = 'ko'): string {
  return new Intl.NumberFormat(locale).format(num);
}

/** 상대 시간 (3분 전, 2시간 전) */
export function formatRelativeTime(timestamp: number, locale: string = 'ko'): string {
  const diff = Date.now() - timestamp;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (diff < 60_000) return rtf.format(-Math.round(diff / 1000), 'second');
  if (diff < 3_600_000) return rtf.format(-Math.round(diff / 60_000), 'minute');
  if (diff < 86_400_000) return rtf.format(-Math.round(diff / 3_600_000), 'hour');
  return rtf.format(-Math.round(diff / 86_400_000), 'day');
}

/** 텍스트 방향 감지 (RTL/LTR) */
export function detectTextDirection(text: string): 'ltr' | 'rtl' {
  // 아랍어/히브리어 범위 체크
  const rtlPattern = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
  return rtlPattern.test(text.slice(0, 100)) ? 'rtl' : 'ltr';
}

/** Unicode NFKC 정규화 */
export function normalizeText(text: string): string {
  return text.normalize('NFKC');
}
