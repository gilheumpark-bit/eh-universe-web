// ============================================================
// PART 1 — Module Header
// ============================================================
//
// translationese-lint.ts — [Z1a-5] KO→EN 어색한 표현 + 영문 습관 결정론적 린트.
//
// 검출 대상 (EN 번역 결과 텍스트):
//   어색한 표현 후보 (translationese):
//     - name-repetition:   이름 반복 (대명사 대신 고유명사 과다 — KO 원문 습관 전이)
//     - honorific-literal: 존칭 로마자 음차 (-nim/-ssi/hyung/oppa 등)
//     - said-bookism:      과잉번역 대사 동사 (said → exclaimed/declared 류)
//   어색한 영문 습관:
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
  message: { ko: string; en: string; ja?: string; zh?: string };
}

export interface TranslationeseLintResult {
  hits: TranslationeseHit[];
  /** 0~100 — 높을수록 어색한 표현/영문 습관 농도 높음 (hit 단위 가중: warn 20 / info 5, 100 클램프) */
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
// PART 4 — 검출기 (어색한 표현 후보 3종)
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
          ko: `"${name}"이 ${total}회 반복됩니다. 대명사나 호칭으로 줄일지 확인해 주세요.`,
          en: `"${name}" appears ${total} times. Consider pronouns or natural forms of address.`,
          ja: `"${name}" が${total}回繰り返されています。代名詞や自然な呼び方に置き換えるか確認してください。`,
          zh: `"${name}" 出现了 ${total} 次。请确认是否可改用代词或更自然的称呼。`,
        },
      });
    }
  }
  return hits;
}

/** 존칭 로마자 음차 — faithful 트랙은 의도 보존 가능 → info. */
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
          ko: `로마자 호칭 ${count}회 (${label}) — 상업 번역이면 자연스러운 호칭으로 바꿀지 확인해 주세요. 원문 보존 모드에서는 의도일 수 있습니다.`,
          en: `Romanized honorifics appear ${count} times (${label}). For market-facing translation, consider more natural address; faithful mode may keep them intentionally.`,
          ja: `ローマ字の敬称・呼称が${count}回あります（${label}）。商業向け翻訳では自然な呼び方にするか確認してください。原文寄りの方針なら意図的に残せます。`,
          zh: `罗马字敬称/称呼出现 ${count} 次（${label}）。面向商业发布时请确认是否改成更自然的称呼；忠实原文模式下也可能保留。`,
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
      ko: `대사 동사가 ${bookisms.length}회로 많습니다. 단순한 said/asked와 행동 묘사로 나눌지 확인해 주세요.`,
      en: `Dialogue verbs appear heavy (${bookisms.length} uses). Consider simpler said/asked plus action beats.`,
      ja: `会話タグの動詞が多めです（${bookisms.length}回）。said/asked と動作描写に分けるか確認してください。`,
      zh: `对话动词偏多（${bookisms.length} 次）。请确认是否改用 said/asked 加动作描写。`,
    },
  }];
}

// ============================================================
// PART 5 — 검출기 (어색한 영문 습관 2종)
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
      ko: `em dash가 ${count}회 보입니다. 쉼표, 마침표, 짧은 문장으로 나눌지 확인해 주세요.`,
      en: `Em dashes appear ${count} times. Consider commas, periods, or shorter sentences.`,
      ja: `em dash が${count}回あります。カンマ、ピリオド、短い文に分けるか確認してください。`,
      zh: `em dash 出现 ${count} 次。请确认是否改用逗号、句号或拆成短句。`,
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
      ko: `곡선 따옴표 ${count}자가 있습니다. 플랫폼이 직선 따옴표를 요구하는지 확인해 주세요.`,
      en: `Curly quotes appear ${count} times. Check whether the platform requires straight quotes.`,
      ja: `曲線引用符が${count}個あります。掲載先が直線引用符を求めるか確認してください。`,
      zh: `弯引号出现 ${count} 个。请确认平台是否要求使用直引号。`,
    },
  }];
}

// ============================================================
// PART 6 — 메인 export
// ============================================================

/**
 * KO→EN 번역 결과의 어색한 표현/영문 습관 린트.
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
