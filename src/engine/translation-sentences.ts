const QUOTE_PAIRS: Record<string, string> = {
  '\u201C': '\u201D', // " → "
  '\u300C': '\u300D', // 「 → 」
  '"': '"',           // 일반 큰따옴표 (열림/닫힘 동일)
};
const QUOTE_OPENERS = new Set(Object.keys(QUOTE_PAIRS));
const QUOTE_CLOSERS = new Set(Object.values(QUOTE_PAIRS));

/**
 * 단락 내 문장 분리.
 * - 따옴표 스택으로 중첩 대사 보호 (열림/닫힘 페어 매칭)
 * - 줄임표(...)가 포함된 문장은 다음 종결까지 이어붙임
 * - 영문 약어(U.S.A.) 오분리 방지: 단일 대문자 + . 패턴 스킵
 */
export function splitSentences(paragraph: string): string[] {
  const sentences: string[] = [];
  let current = '';
  const quoteStack: string[] = [];
  let inEllipsis = false;

  for (let i = 0; i < paragraph.length; i++) {
    const ch = paragraph[i];
    const next = paragraph[i + 1];
    current += ch;

    // 따옴표 스택 관리
    if (QUOTE_OPENERS.has(ch)) {
      // 일반 큰따옴표(")는 토글: 스택 top이 "이면 닫기, 아니면 열기
      if (ch === '"') {
        if (quoteStack.length > 0 && quoteStack[quoteStack.length - 1] === '"') {
          quoteStack.pop();
        } else {
          quoteStack.push(ch);
        }
      } else {
        quoteStack.push(ch);
      }
      continue;
    }
    if (QUOTE_CLOSERS.has(ch) && quoteStack.length > 0) {
      const top = quoteStack[quoteStack.length - 1];
      if (QUOTE_PAIRS[top] === ch) quoteStack.pop();
      continue;
    }

    // 줄임표 감지: 연속 3개 이상의 마침표
    if (ch === '.' && next === '.') { inEllipsis = true; continue; }
    if (inEllipsis && ch === '.') continue; // 줄임표 내부
    if (inEllipsis && ch !== '.') { inEllipsis = false; } // 줄임표 끝

    // 대사(따옴표) 안에서는 분리하지 않음
    if (quoteStack.length > 0) continue;

    // 영문 약어 스킵: 대문자 1글자 + . (e.g. U.S.A.)
    if (ch === '.' && i >= 1) {
      const prev = paragraph[i - 1];
      if (prev >= 'A' && prev <= 'Z' && next && next >= 'A' && next <= 'Z') continue;
    }

    // 문장 종결 감지: [.!?。] 뒤에 공백/줄바꿈/EOF
    if ((ch === '.' || ch === '!' || ch === '?' || ch === '\u3002') &&
        (next === undefined || next === ' ' || next === '\n' || next === '\t')) {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        sentences.push(trimmed);
        current = '';
      }
    }
  }

  const trimmed = current.trim();
  if (trimmed.length > 0) sentences.push(trimmed);

  return sentences;
}

// ============================================================
// PART 7 — 채점 프롬프트 (모드별 분기)
// ============================================================
// buildScoringPrompt + 모드별 빌더 — engine/scoring/scoring-prompt.ts 로 이전 (2026-05-09).
