// ============================================================
// PART 1 — Korean Typo Detector (오타자 특화, 맞춤법 X)
// ============================================================
// 문체 안 건드림. 순수 타이핑 실수만 잡음.

export interface TypoMatch {
  index: number;
  original: string;
  suggestion: string;
  type: 'double-char' | 'jamo-slip' | 'spacing' | 'batchim-swap';
}

// ============================================================
// PART 2 — Detection Rules
// ============================================================

/** 같은 글자 연속 반복: "그그녀는" → "그녀는" */
function detectDoubleChars(text: string): TypoMatch[] {
  const matches: TypoMatch[] = [];
  const regex = /(.)\1{1,}/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const char = m[1];
    // 의도적 반복 제외: ㅋ, ㅎ, ㅠ, ㅜ, ., !, ?, ~, -, ㅡ
    if (/[ㅋㅎㅠㅜ.!?~\-ㅡㅇㅏㅓㅗ]/.test(char)) continue;
    // 숫자 제외
    if (/\d/.test(char)) continue;
    // 공백/줄바꿈 제외
    if (/\s/.test(char)) continue;
    matches.push({
      index: m.index,
      original: m[0],
      suggestion: char,
      type: 'double-char',
    });
  }
  return matches;
}

/** 한글 자모 분해 */
const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

function isHangul(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return code >= 0xAC00 && code <= 0xD7A3;
}

function decomposeHangul(ch: string): [number, number, number] | null {
  const code = ch.charCodeAt(0);
  if (code < 0xAC00 || code > 0xD7A3) return null;
  const base = code - 0xAC00;
  const jong = base % 28;
  const jung = ((base - jong) / 28) % 21;
  const cho = Math.floor((base - jong) / 28 / 21);
  return [cho, jung, jong];
}

/** 흔한 받침 오타 패턴: "했닫" → "했다", "있늘" → "있는" 등 */
const BATCHIM_TYPOS: Record<string, string> = {
  '닫': '다', '닫아': '다',
  '늘': '는',
  '읕': '을',
  '엇': '었',
  '겄': '것',
  '갓': '같',
  '잇': '있',
};

function detectBatchimSwap(text: string): TypoMatch[] {
  const matches: TypoMatch[] = [];
  for (const [typo, fix] of Object.entries(BATCHIM_TYPOS)) {
    let idx = text.indexOf(typo);
    while (idx !== -1) {
      matches.push({
        index: idx,
        original: typo,
        suggestion: fix,
        type: 'batchim-swap',
      });
      idx = text.indexOf(typo, idx + 1);
    }
  }
  return matches;
}

/** 자모 분리 상태로 남은 경우: "ㅎㅏㄴ" (한) — 조합 안 된 자모 연속 */
function detectLooseJamo(text: string): TypoMatch[] {
  const matches: TypoMatch[] = [];
  // 연속 3개 이상 자모가 조합 없이 나열된 경우
  const jamoRange = /[\u3131-\u3163]{3,}/g;
  let m: RegExpExecArray | null;
  while ((m = jamoRange.exec(text)) !== null) {
    // 의도적 이모티컨 패턴(ㅋㅋㅋ, ㅎㅎㅎ) 제외
    if (/^[ㅋㅎㅠㅜㅇㅏㅓㅗ]+$/.test(m[0])) continue;
    matches.push({
      index: m.index,
      original: m[0],
      suggestion: `[자모 분리: ${m[0]}]`,
      type: 'jamo-slip',
    });
  }
  return matches;
}

// ============================================================
// PART 3 — Public API
// ============================================================

export function detectTypos(text: string): TypoMatch[] {
  if (!text || text.length === 0) return [];
  const all = [
    ...detectDoubleChars(text),
    ...detectBatchimSwap(text),
    ...detectLooseJamo(text),
  ];
  // 위치 기준 정렬, 중복 제거
  all.sort((a, b) => a.index - b.index);
  const seen = new Set<number>();
  return all.filter(m => {
    if (seen.has(m.index)) return false;
    seen.add(m.index);
    return true;
  });
}

/** 오타 자동 수정 적용 (뒤에서부터 치환) */
export function applyTypoFixes(text: string, fixes: TypoMatch[]): string {
  const sorted = [...fixes].sort((a, b) => b.index - a.index);
  let result = text;
  for (const fix of sorted) {
    if (fix.type === 'jamo-slip') continue; // 자모 분리는 자동수정 불가
    result = result.slice(0, fix.index) + fix.suggestion + result.slice(fix.index + fix.original.length);
  }
  return result;
}
