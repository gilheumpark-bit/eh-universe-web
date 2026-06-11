// ============================================================
// PART 1 — Module Header
// ============================================================
//
// translationese-lint.ts — [Z1a-5] KO→EN 번역투 + AI티 결정론적 린트.
//
// 검출 대상 (EN 번역 결과 텍스트):
//   번역투 (translationese):
//     - name-repetition:   이름 반복 (대명사 대신 고유명사 과다 — KO 원문 습관 전이)
//     - honorific-literal: 존칭 로마자 직역 (-nim/-ssi/hyung/oppa 등)
//     - said-bookism:      과잉번역 대사 동사 (said → exclaimed/declared 류)
//   AI티 (AI signature):
//     - em-dash-overuse:   em-dash(—) 빈도 과다
//     - smart-quotes:      curly quotes(“ ” ‘ ’) 잔존
//
// 정직 한계 표기:
//   - 전부 휴리스틱 grep — 문학적 의도(고의 반복·작가 선택 곡선 따옴표)와
//     기계로 구분 불가. 그래서 결과는 '경고(additive)'이며 차단 게이트가 아니다.
//   - faithful 트랙은 로마자 존칭을 의도적으로 보존할 수 있음 → severity 'info'.
//
// [C] 결정론적 — LLM 호출 0, 동일 입력 → 동일 출력
// [C] 비문자열/빈 입력 방어 — 빈 결과 반환
// [K] 단일 책임 — 린트만. NCT 배선은 ncg-nct.ts 가 담당.
// ============================================================

// ============================================================
// PART 2 — Types
// ============================================================

export type TranslationeseKind =
  | 'name-repetition'
  | 'honorific-literal'
  | 'said-bookism'
  | 'em-dash-overuse'
  | 'smart-quotes';

export interface TranslationeseHit {
  kind: TranslationeseKind;
  /** 적중 패턴/대상 (예: 반복된 이름, "-nim") */
  pattern: string;
  /** 본문 내 적중 횟수 (1 이상) */
  count: number;
  /** warn = 검토 권장 / info = 의도 가능 (faithful 보존 등) */
  severity: 'warn' | 'info';
  message: { ko: string; en: string };
}

export interface TranslationeseLintResult {
  hits: TranslationeseHit[];
  /** 0~100 — 높을수록 번역투/AI티 농도 높음 (hit 단위 가중: warn 20 / info 5, 100 클램프) */
  score: number;
  metrics: { sentences: number; words: number };
}

// ============================================================
// PART 3 — 헬퍼 (문장 분해·토큰)
// ============================================================

function splitSentencesEn(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** 문장 내 첫 토큰(문두 대문자)을 제외한 대문자 시작 토큰 수집 — 고유명사 후보. */
function collectMidSentenceCapitalized(sentences: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const s of sentences) {
    const tokens = s.match(/[A-Za-z][A-Za-z'-]*/g) ?? [];
    for (let i = 1; i < tokens.length; i++) {
      const tok = tokens[i];
      if (/^[A-Z][a-z]/.test(tok) && !COMMON_CAPITALIZED.has(tok)) {
        counts.set(tok, (counts.get(tok) ?? 0) + 1);
      }
    }
  }
  return counts;
}

/** 고유명사 후보에서 제외할 일반 대문자 어휘 (문두 외에도 대문자인 영어 통용어). */
const COMMON_CAPITALIZED = new Set([
  'God', 'Mr', 'Mrs', 'Ms', 'Dr', 'Sir', 'Madam', 'Lord', 'Lady', 'Miss',
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December',
  'English', 'Korean', 'Japanese', 'Chinese', 'Christmas',
]);

// ============================================================
// PART 4 — 검출기 (번역투 3종)
// ============================================================

/**
 * 이름 반복 — 영어 서사는 대명사를 쓰는데 KO 원문 습관대로 이름을 매 문장 반복.
 * 기준: 최다 고유명사 후보의 전체 등장 횟수 ≥ 6 그리고 문장당 밀도 ≥ 0.4.
 */
function detectNameRepetition(text: string, sentences: string[]): TranslationeseHit[] {
  if (sentences.length < 5) return []; // 표본 부족 — 오탐 방지
  const candidates = collectMidSentenceCapitalized(sentences);
  const hits: TranslationeseHit[] = [];
  for (const [name, midCount] of candidates) {
    if (midCount < 2) continue; // 문중 2회 미만 — 고유명사 확신 부족
    // 전체 등장 횟수 (문두 포함)
    const total = (text.match(new RegExp(`\\b${name}\\b`, 'g')) ?? []).length;
    if (total >= 6 && total / sentences.length >= 0.4) {
      hits.push({
        kind: 'name-repetition',
        pattern: name,
        count: total,
        severity: 'warn',
        message: {
          ko: `"${name}" ${total}회 반복 (문장당 ${(total / sentences.length).toFixed(2)}) — 대명사 치환 검토 (번역투).`,
          en: `"${name}" repeated ${total}x (${(total / sentences.length).toFixed(2)}/sentence) — consider pronouns (translationese).`,
        },
      });
    }
  }
  return hits;
}

/** 존칭 로마자 직역 — faithful 트랙은 의도 보존 가능 → info. */
const HONORIFIC_PATTERNS: { label: string; regex: RegExp }[] = [
  { label: '-nim/-ssi suffix', regex: /\b[A-Za-z]+-(?:nim|ssi)\b/gi },
  {
    label: 'romanized kinship address',
    regex: /\b(?:hyung|hyeong|oppa|noona|nuna|unnie|eonni|sunbae|seonbae|hoobae|hubae|ajusshi|ajussi|ahjussi|ajumma|ahjumma)\b/gi,
  },
];

function detectHonorificLiteral(text: string): TranslationeseHit[] {
  const hits: TranslationeseHit[] = [];
  for (const { label, regex } of HONORIFIC_PATTERNS) {
    const count = (text.match(new RegExp(regex.source, regex.flags)) ?? []).length;
    if (count > 0) {
      hits.push({
        kind: 'honorific-literal',
        pattern: label,
        count,
        severity: 'info',
        message: {
          ko: `로마자 존칭/호칭 ${count}회 (${label}) — Market 트랙이면 자연 호칭 검토 (faithful 의도 보존 가능).`,
          en: `Romanized honorific ${count}x (${label}) — consider natural address for Market track (may be intentional for faithful).`,
        },
      });
    }
  }
  return hits;
}

/**
 * said-bookism — said/asked 대신 exclaimed/declared 류 과잉.
 * 기준: bookism ≥ 3 그리고 bookism > said/asked 합계.
 */
const BOOKISM_RE = /\b(exclaimed|proclaimed|declared|retorted|interjected|queried|bellowed|opined|uttered|articulated)\b/gi;
const SAID_RE = /\b(said|asked)\b/gi;

function detectSaidBookism(text: string): TranslationeseHit[] {
  const bookisms = text.match(new RegExp(BOOKISM_RE.source, BOOKISM_RE.flags)) ?? [];
  if (bookisms.length < 3) return [];
  const saidCount = (text.match(new RegExp(SAID_RE.source, SAID_RE.flags)) ?? []).length;
  if (bookisms.length <= saidCount) return [];
  return [{
    kind: 'said-bookism',
    pattern: 'exclaimed/declared/…',
    count: bookisms.length,
    severity: 'warn',
    message: {
      ko: `과잉 대사 동사 ${bookisms.length}회 vs said/asked ${saidCount}회 — said+행동 비트 권장 (과잉번역).`,
      en: `Said-bookisms ${bookisms.length}x vs said/asked ${saidCount}x — prefer said + action beats (over-translation).`,
    },
  }];
}

// ============================================================
// PART 5 — 검출기 (AI티 2종)
// ============================================================

/** em-dash 과다 — 기준: 총 4회 이상 그리고 문장당 0.25 초과. */
function detectEmDashOveruse(text: string, sentenceCount: number): TranslationeseHit[] {
  const count = (text.match(/—/g) ?? []).length;
  if (count < 4 || sentenceCount === 0) return [];
  const density = count / sentenceCount;
  if (density <= 0.25) return [];
  return [{
    kind: 'em-dash-overuse',
    pattern: '—',
    count,
    severity: 'warn',
    message: {
      ko: `em-dash ${count}회 (문장당 ${density.toFixed(2)}) — AI 출력 특성. 쉼표/마침표 치환 검토.`,
      en: `Em-dash ${count}x (${density.toFixed(2)}/sentence) — common AI signature. Consider commas/periods.`,
    },
  }];
}

/** smart quotes 잔존 — 출판 규격에 따라 의도일 수 있어 info. */
function detectSmartQuotes(text: string): TranslationeseHit[] {
  const count = (text.match(/[“”‘’]/g) ?? []).length;
  if (count === 0) return [];
  return [{
    kind: 'smart-quotes',
    pattern: '“ ” ‘ ’',
    count,
    severity: 'info',
    message: {
      ko: `곡선 따옴표 ${count}자 — 플랫폼 규격(직선 따옴표 요구) 확인 (의도된 조판일 수 있음).`,
      en: `Curly quotes ${count} chars — verify platform style guide (may be intentional typesetting).`,
    },
  }];
}

// ============================================================
// PART 6 — 메인 export
// ============================================================

/**
 * KO→EN 번역 결과의 번역투/AI티 린트.
 *
 * @param text  EN 번역 결과 본문 (비문자열/빈 입력 안전)
 * @returns hits + score (0~100, 높을수록 농도 높음 — 경고용, 차단 아님)
 *
 * [C] 결정론적·순수 — 회귀 테스트 가능
 */
export function lintTranslationese(text: string): TranslationeseLintResult {
  if (typeof text !== 'string' || text.trim().length === 0) {
    return { hits: [], score: 0, metrics: { sentences: 0, words: 0 } };
  }
  const sentences = splitSentencesEn(text);
  const words = text.split(/\s+/).filter((w) => w.length > 0).length;

  const hits: TranslationeseHit[] = [
    ...detectNameRepetition(text, sentences),
    ...detectHonorificLiteral(text),
    ...detectSaidBookism(text),
    ...detectEmDashOveruse(text, sentences.length),
    ...detectSmartQuotes(text),
  ];

  // hit 단위 가중 (발생 횟수 아님 — 한 종류 폭주가 점수 독점하는 것 방지)
  const raw = hits.reduce((acc, h) => acc + (h.severity === 'warn' ? 20 : 5), 0);
  const score = Math.min(100, raw);

  return { hits, score, metrics: { sentences: sentences.length, words } };
}
