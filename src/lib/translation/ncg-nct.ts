// ============================================================
// PART 1 — Module Header
// ============================================================
//
// ncg-nct.ts — NCG (pre-flight gate) + NCT (post-completion test) 파이프라인.
//
// IR 보고서 §"NCG/NCT" 직접 매핑:
//   NCG = "Novel Compliance Gate" — 번역 전 사전 게이트
//   NCT = "Novel Compliance Test" — 번역 후 사후 검증
//
// NCG (pre-flight):
//   - canon 검사 (캐릭터·세계관 위반)
//   - glossary 사전 검증 (필수 용어 정의됨)
//   - IP guard (저작권 위험 단어)
//   - source integrity 사전 (source 자체 quality)
//   → block / warn / pass 단계화
//
// NCT (post-completion):
//   - source-integrity 결정론적 (Faithful + Market 둘 다)
//   - 6축 채점 (외부 호출자 필요 시)
//   - artifact 생성 (창작 과정 확인서 hook)
//   → fail / warn / pass + recommendation
//
// [C] 결정론적 (LLM 호출 0)
// [G] 일찍 fail — block 시 LLM 호출 자체 회피 (비용 절감)
// [K] gate vs test 명확 분리
// ============================================================

import { runIntegrityCheck, type IntegrityReport, type SupportedLang } from './source-integrity';
import { pickGlossaryTarget, type GlossaryEntry } from './glossary-manager';
// [Z1a-2 2026-06-11] qa-auditor 번역 배선 — 4 관점 비수렴 감사 + EN 전용 B리더 (순수 TS·LLM 0).
import {
  auditManuscript,
  auditVerdict,
  auditOutsiderEnglish,
  type AuditFinding,
  type AuditVerdict,
} from '@/lib/creative/qa-auditor';
// [Z1a-5 2026-06-11] KO→EN 어색한 표현/영문 습관 린트 — additive 경고 (차단 아님).
import { lintTranslationese, type TranslationeseLintResult } from './translationese-lint';

// ============================================================
// PART 2 — Types
// ============================================================

export type GateDecision = 'block' | 'warn' | 'pass';

export interface NCGViolation {
  kind:
    | 'source-too-short'
    | 'source-too-long'
    | 'glossary-empty-but-required'
    | 'ip-flagged-term'
    | 'language-mismatch';
  severity: 'error' | 'warn' | 'info';
  message: { ko: string; en: string };
  metric?: { value?: number; threshold?: number };
}

export interface NCGReport {
  decision: GateDecision;
  violations: NCGViolation[];
  /** Block 시 LLM 호출 차단 권고. */
  shouldProceed: boolean;
  timestamp: string;
}

export interface NCGInput {
  source: string;
  srcLang: SupportedLang;
  tgtLang: SupportedLang;
  glossary?: GlossaryEntry[];
  /** track 별 다른 임계 적용. */
  track?: 'faithful' | 'market' | 'default' | 'dual';
  /** IP guard 단어 list — 외부 주입 가능. */
  ipFlaggedTerms?: string[];
}

export interface NCTInput {
  source: string;
  srcLang: SupportedLang;
  tgtLang: SupportedLang;
  faithful?: string;
  market?: string;
  glossary?: GlossaryEntry[];
  /** [Z1a-3] catastrophic 임계 override (테스트·운영 조정용 — 미지정 시 기본). */
  catastrophicThresholds?: Partial<CatastrophicThresholds>;
}

/** [Z1a-2] 번역 결과 1건에 대한 qa-auditor 4 관점 감사 + EN B리더 변형. */
export interface TranslationQaAudit {
  findings: AuditFinding[];
  verdict: AuditVerdict;
  /** EN 전용 B리더 (KO 컨텍스트 구조 차단) — tgtLang==='en' 일 때만 채워짐. */
  enReaderFindings?: AuditFinding[];
}

export interface NCTReport {
  faithful: IntegrityReport | null;
  market: IntegrityReport | null;
  /** glossary 누락 목록. */
  glossaryMisses: { source: string; expected: string; track: 'faithful' | 'market' }[];
  /** 출판 권장 결정. */
  recommendation: 'publish' | 'review' | 'reject';
  timestamp: string;
  /**
   * [Z1a-3 — additive] Catastrophic 게이트 — blocked=true 시 recommendation 은 'reject' 로 강제.
   * 기존 호출자는 필드 무시해도 동작 동일 (recommendation 에 이미 반영).
   */
  catastrophic?: { faithful: CatastrophicReport | null; market: CatastrophicReport | null };
  /**
   * [Z1a-2 — additive] qa-auditor 4 관점 비수렴 감사 — 경고 정보 (recommendation 에 영향 X).
   * 휴리스틱 한계 정직: KO 패턴 기반이라 EN 본문에는 구조 검사 중심으로만 유효 →
   * EN 은 enReaderFindings (B리더 변형) 가 보완.
   */
  qaAudit?: { faithful: TranslationQaAudit | null; market: TranslationQaAudit | null };
  /**
   * [Z1a-5 — additive] 어색한 표현/영문 습관 린트 — tgtLang==='en' 일 때만 실행. 경고용 (차단 X).
   */
  translationese?: { faithful: TranslationeseLintResult | null; market: TranslationeseLintResult | null };
}

// ============================================================
// PART 3 — NCG (pre-flight)
// ============================================================

const SOURCE_MIN = 50;       // chars
const SOURCE_MAX = 500_000;  // 50만 자 — 안전 cap

/**
 * NCG — 번역 전 사전 게이트.
 *
 * decision='block' 시 LLM 호출 회피 권고.
 * decision='warn' 시 사용자 confirm 후 진행.
 * decision='pass' 시 즉시 진행.
 */
export function runNCG(input: NCGInput): NCGReport {
  const violations: NCGViolation[] = [];
  const src = (input.source ?? '').trim();

  if (src.length < SOURCE_MIN) {
    violations.push({
      kind: 'source-too-short',
      severity: 'error',
      metric: { value: src.length, threshold: SOURCE_MIN },
      message: {
        ko: `원문이 너무 짧습니다 (${src.length}자, 최소 ${SOURCE_MIN}자).`,
        en: `Source too short (${src.length} chars, min ${SOURCE_MIN}).`,
      },
    });
  }
  if (src.length > SOURCE_MAX) {
    violations.push({
      kind: 'source-too-long',
      severity: 'error',
      metric: { value: src.length, threshold: SOURCE_MAX },
      message: {
        ko: `원문이 너무 깁니다 (${src.length}자). 분할 후 시도하세요.`,
        en: `Source too long (${src.length} chars). Split and retry.`,
      },
    });
  }

  // IP flagged terms 검사
  const ipTerms = input.ipFlaggedTerms ?? [];
  for (const term of ipTerms) {
    if (!term) continue;
    if (src.includes(term)) {
      violations.push({
        kind: 'ip-flagged-term',
        severity: 'warn',
        message: {
          ko: `저작권 주의 단어 발견: "${term}"`,
          en: `IP-flagged term detected: "${term}"`,
        },
      });
    }
  }

  // 언어 매칭 — srcLang 과 tgtLang 동일 시 의미 없음
  if (input.srcLang === input.tgtLang) {
    violations.push({
      kind: 'language-mismatch',
      severity: 'warn',
      message: {
        ko: '원본 언어와 목표 언어가 동일합니다.',
        en: 'Source and target languages are identical.',
      },
    });
  }

  // dual 모드인데 glossary 비어 있으면 info — 시장 분석 4차 §3 §4 권장
  if (input.track === 'dual' && (!input.glossary || input.glossary.length === 0)) {
    violations.push({
      kind: 'glossary-empty-but-required',
      severity: 'info',
      message: {
        ko: '듀얼 출력에서는 glossary 정의를 권장합니다 (Faithful/Market 분기 매핑).',
        en: 'Dual output recommends defined glossary entries (Faithful/Market mappings).',
      },
    });
  }

  const hasError = violations.some((v) => v.severity === 'error');
  const hasWarn = violations.some((v) => v.severity === 'warn');
  const decision: GateDecision = hasError ? 'block' : hasWarn ? 'warn' : 'pass';

  return {
    decision,
    violations,
    shouldProceed: decision !== 'block',
    timestamp: new Date().toISOString(),
  };
}

// ============================================================
// PART 3.5 — [Z1a-3] Catastrophic 게이트 (결정론적 차단 + 사유)
// ============================================================
//
// MT catastrophic failure 3종을 순수 함수로 검출한다 (LLM 0):
//   1) pronoun-ratio-delta:   성별 대명사 비율 큰 변화 (>60%) — 인물 성별 변경 확인
//   2) paragraph-loss:        번역 문단 수 / 원문 문단 수 < 0.85 — 대규모 누락
//   3) new-proper-noun-flood: 원문/용어집에 없는 신규 고유명사 set-diff 임계 초과 — 새 이름 오삽입 확인
//
// 정직 한계:
//   - 성별 대명사: ko '그+조사' 휴리스틱은 지시사 '그'와 일부 충돌 가능 → 양측
//     표본 ≥ minGenderedPronouns 일 때만 판정 (표본 부족 시 skip — 오차단 방지).
//   - 신규 고유명사: 로마자 표기 한국 이름 ↔ 한글 원문 매핑은 결정론으로 불가 →
//     glossary 등록분 + 원문 라틴 토큰만 제외 가능. 그래서 기본 임계(12)를 관대하게
//     잡아 '환각 홍수'만 차단한다. 정밀 차단은 glossary 등록으로 좁힌다.
//   - en 외 target 은 대문자 휴리스틱 부재 → 신규 고유명사 검사 skip.
// ============================================================

export interface CatastrophicThresholds {
  /** 성별 대명사 비율(male share) 절대 delta 임계 — 초과 시 차단 (기본 0.6). */
  genderPronounDelta: number;
  /** 성별 대명사 최소 표본 — 원문/번역 각각 이 수 미만이면 판정 skip (기본 3). */
  minGenderedPronouns: number;
  /** 번역 문단 수 / 원문 문단 수 하한 — 미만 시 차단 (기본 0.85). */
  paragraphRatioFloor: number;
  /** 신규 고유명사 distinct 개수 임계 — 초과 시 차단 (기본 12 — 관대·환각 홍수만). */
  newProperNounLimit: number;
}

export const DEFAULT_CATASTROPHIC_THRESHOLDS: CatastrophicThresholds = {
  genderPronounDelta: 0.6,
  minGenderedPronouns: 3,
  paragraphRatioFloor: 0.85,
  newProperNounLimit: 12,
};

export interface CatastrophicReason {
  kind: 'pronoun-ratio-delta' | 'paragraph-loss' | 'new-proper-noun-flood';
  message: { ko: string; en: string; ja?: string; zh?: string };
  metric: { value: number; threshold: number };
  /** 신규 고유명사 샘플 (최대 5) — 사유 추적용. */
  samples?: string[];
}

export interface CatastrophicReport {
  blocked: boolean;
  reasons: CatastrophicReason[];
  metrics: {
    /** 성별 대명사 male-share delta (0~1) — 표본 부족 시 null. */
    genderDelta: number | null;
    /** 번역 문단 수 / 원문 문단 수 (원문 0 문단이면 1). */
    paragraphRatio: number;
    /** 검출된 신규 고유명사 distinct 목록 (en target 만, 그 외 빈 배열). */
    newProperNouns: string[];
  };
}

export interface CatastrophicCheckInput {
  source: string;
  translation: string;
  srcLang: SupportedLang;
  tgtLang: SupportedLang;
  glossary?: GlossaryEntry[];
  thresholds?: Partial<CatastrophicThresholds>;
}

// 언어별 성별 대명사 패턴 — ko '그' 는 조사 lookahead 로 지시사 오탐을 줄임 (정직 한계 위 참조).
const GENDER_PRONOUNS: Record<SupportedLang, { male: RegExp; female: RegExp }> = {
  ko: { male: /그(?=[가는도를의와에])/g, female: /그녀/g },
  en: { male: /\b(he|him|his)\b/gi, female: /\b(she|her|hers)\b/gi },
  ja: { male: /彼(?!女)/g, female: /彼女/g },
  zh: { male: /他/g, female: /她/g },
};

function countGenderPronouns(text: string, lang: SupportedLang): { male: number; female: number; total: number } {
  const p = GENDER_PRONOUNS[lang];
  const male = (text.match(new RegExp(p.male.source, p.male.flags)) ?? []).length;
  const female = (text.match(new RegExp(p.female.source, p.female.flags)) ?? []).length;
  return { male, female, total: male + female };
}

function countParagraphs(text: string): number {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 0).length;
}

// 신규 고유명사 후보에서 제외할 일반 대문자 어휘 (영어 통용어 — 문중 대문자).
const CATASTROPHIC_CAP_ALLOWLIST = new Set([
  'God', 'Mr', 'Mrs', 'Ms', 'Dr', 'Sir', 'Madam', 'Lord', 'Lady', 'Miss',
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December',
  'English', 'Korean', 'Japanese', 'Chinese', 'Christmas',
]);

/** EN 번역에서 문두 제외 대문자 토큰(고유명사 후보) distinct 수집. */
function extractMidSentenceCapitalized(text: string): Set<string> {
  const out = new Set<string>();
  const sentences = text.split(/(?<=[.!?…])\s+|\n+/);
  for (const s of sentences) {
    const tokens = s.match(/[A-Za-z][A-Za-z'-]*/g) ?? [];
    for (let i = 1; i < tokens.length; i++) {
      const tok = tokens[i];
      if (/^[A-Z][a-z]/.test(tok) && !CATASTROPHIC_CAP_ALLOWLIST.has(tok)) out.add(tok);
    }
  }
  return out;
}

/**
 * Catastrophic 게이트 — 순수 함수 (결정론적 차단 + 사유).
 *
 * blocked=true 면 출판 불가 권고. reasons 에 사유·메트릭 명시.
 *
 * [C] LLM 호출 0 — 동일 입력 → 동일 출력 (회귀 검증 가능)
 * [C] 표본 부족 시 해당 검사 skip — 오차단보다 미검출을 택함 (정직 분리)
 */
export function runCatastrophicCheck(input: CatastrophicCheckInput): CatastrophicReport {
  const t = { ...DEFAULT_CATASTROPHIC_THRESHOLDS, ...input.thresholds };
  const source = input.source ?? '';
  const translation = input.translation ?? '';
  const reasons: CatastrophicReason[] = [];

  // 1) 성별 대명사 비율 delta
  const srcG = countGenderPronouns(source, input.srcLang);
  const tgtG = countGenderPronouns(translation, input.tgtLang);
  let genderDelta: number | null = null;
  if (srcG.total >= t.minGenderedPronouns && tgtG.total >= t.minGenderedPronouns) {
    const srcShare = srcG.male / srcG.total;
    const tgtShare = tgtG.male / tgtG.total;
    genderDelta = Math.abs(srcShare - tgtShare);
    if (genderDelta > t.genderPronounDelta) {
      reasons.push({
        kind: 'pronoun-ratio-delta',
        metric: { value: genderDelta, threshold: t.genderPronounDelta },
        message: {
          ko: `성별 대명사 비율이 크게 달라졌습니다. 인물 성별이 바뀌지 않았는지 확인해 주세요.`,
          en: `Gendered pronoun usage changed sharply. Check whether a character's gender was changed by mistake.`,
          ja: `性別代名詞の比率が大きく変わっています。人物の性別が誤って変わっていないか確認してください。`,
          zh: `性别代词比例变化较大。请确认人物性别是否被误改。`,
        },
      });
    }
  }

  // 2) 문단 수 손실
  const srcParas = countParagraphs(source);
  const tgtParas = countParagraphs(translation);
  const paragraphRatio = srcParas === 0 ? 1 : tgtParas / srcParas;
  if (srcParas > 0 && paragraphRatio < t.paragraphRatioFloor) {
    reasons.push({
      kind: 'paragraph-loss',
      metric: { value: paragraphRatio, threshold: t.paragraphRatioFloor },
      message: {
        ko: `문단 수가 ${srcParas}개에서 ${tgtParas}개로 줄었습니다. 빠진 장면이나 문단이 없는지 확인해 주세요.`,
        en: `Paragraph count fell from ${srcParas} to ${tgtParas}. Check whether any scene or paragraph was omitted.`,
        ja: `段落数が${srcParas}個から${tgtParas}個に減っています。抜けた場面や段落がないか確認してください。`,
        zh: `段落数从 ${srcParas} 段减少到 ${tgtParas} 段。请确认是否遗漏了场景或段落。`,
      },
    });
  }

  // 3) 신규 고유명사 set-diff (en target 만 — 대문자 휴리스틱 가능 언어)
  let newProperNouns: string[] = [];
  if (input.tgtLang === 'en' && translation.length > 0) {
    const candidates = extractMidSentenceCapitalized(translation);
    // 제외 집합: glossary target 토큰 전부 + 원문에 이미 있는 라틴 토큰
    const known = new Set<string>();
    for (const e of input.glossary ?? []) {
      for (const target of [e.target, e.targetFaithful, e.targetMarket]) {
        for (const tok of (target ?? '').match(/[A-Za-z][A-Za-z'-]*/g) ?? []) known.add(tok);
      }
    }
    for (const tok of source.match(/[A-Za-z][A-Za-z'-]*/g) ?? []) known.add(tok);
    newProperNouns = [...candidates].filter((c) => !known.has(c)).sort();
    if (newProperNouns.length > t.newProperNounLimit) {
      reasons.push({
        kind: 'new-proper-noun-flood',
        metric: { value: newProperNouns.length, threshold: t.newProperNounLimit },
        samples: newProperNouns.slice(0, 5),
        message: {
          ko: `원문이나 용어집에 없는 고유명사가 ${newProperNouns.length}개 보입니다. 새 이름이 잘못 생긴 것은 아닌지 확인해 주세요. 예: ${newProperNouns.slice(0, 3).join(', ')}`,
          en: `${newProperNouns.length} proper nouns are not in the source or glossary. Check whether new names were introduced by mistake. Examples: ${newProperNouns.slice(0, 3).join(', ')}`,
          ja: `原文や用語集にない固有名詞が${newProperNouns.length}個あります。不要な新しい名前が入っていないか確認してください。例: ${newProperNouns.slice(0, 3).join(', ')}`,
          zh: `发现 ${newProperNouns.length} 个原文或术语表中没有的专有名词。请确认是否误新增了名称。例：${newProperNouns.slice(0, 3).join(', ')}`,
        },
      });
    }
  }

  return {
    blocked: reasons.length > 0,
    reasons,
    metrics: { genderDelta, paragraphRatio, newProperNouns },
  };
}

// Market track 은 회차 재구성·문단 그룹화 허용 (source-integrity trackMode='market' 정합)
// → 문단 하한만 0.6 으로 완화. 그 외 임계 동일.
const MARKET_PARAGRAPH_FLOOR = 0.6;

// ============================================================
// PART 4 — NCT (post-completion)
// ============================================================

/**
 * NCT — 번역 후 사후 검증.
 *
 * 두 결과 모두 source-integrity 검사 + glossary 일관성.
 * recommendation:
 *   - 'publish': 두 track 모두 pass + glossary 위반 0 + catastrophic 0
 *   - 'review':  warn 있음 (작가/번역가 검토 권장)
 *   - 'reject':  fail 또는 catastrophic 차단 있음 (재번역 권장)
 *
 * [Z1a 2026-06-11 additive] catastrophic / qaAudit / translationese 필드 추가.
 * qaAudit·translationese 는 경고 정보만 — recommendation 에 영향 X (additive 보장).
 * catastrophic 차단만 recommendation='reject' 로 강제 (결정적 차단 — 본질).
 */
export function runNCT(input: NCTInput): NCTReport {
  const { source, srcLang, tgtLang, faithful, market, glossary = [] } = input;

  let faithfulReport: IntegrityReport | null = null;
  let marketReport: IntegrityReport | null = null;

  if (faithful && faithful.length > 0) {
    try {
      faithfulReport = runIntegrityCheck({
        source,
        translation: faithful,
        srcLang,
        tgtLang,
        trackMode: 'faithful',
      });
    } catch { /* skip */ }
  }
  if (market && market.length > 0) {
    try {
      marketReport = runIntegrityCheck({
        source,
        translation: market,
        srcLang,
        tgtLang,
        trackMode: 'market',
      });
    } catch { /* skip */ }
  }

  // Glossary 검증 — 두 track 모두
  const glossaryMisses: NCTReport['glossaryMisses'] = [];
  for (const entry of glossary) {
    if (!entry.source || !entry.locked) continue;
    if (faithful) {
      const expectedF = pickGlossaryTarget(entry, 'faithful');
      if (expectedF && !faithful.includes(expectedF)) {
        glossaryMisses.push({ source: entry.source, expected: expectedF, track: 'faithful' });
      }
    }
    if (market) {
      const expectedM = pickGlossaryTarget(entry, 'market');
      if (expectedM && !market.includes(expectedM)) {
        glossaryMisses.push({ source: entry.source, expected: expectedM, track: 'market' });
      }
    }
  }

  // [Z1a-3] Catastrophic 게이트 — track 별 (market 은 문단 그룹화 허용 → 하한 완화)
  let catFaithful: CatastrophicReport | null = null;
  let catMarket: CatastrophicReport | null = null;
  try {
    if (faithful && faithful.length > 0) {
      catFaithful = runCatastrophicCheck({
        source, translation: faithful, srcLang, tgtLang, glossary,
        thresholds: input.catastrophicThresholds,
      });
    }
    if (market && market.length > 0) {
      catMarket = runCatastrophicCheck({
        source, translation: market, srcLang, tgtLang, glossary,
        thresholds: { paragraphRatioFloor: MARKET_PARAGRAPH_FLOOR, ...input.catastrophicThresholds },
      });
    }
  } catch { /* skip — 게이트 자체 오류가 본 흐름 차단하지 않음 */ }

  // [Z1a-2] qa-auditor 4 관점 비수렴 감사 + EN B리더 (경고 정보 — recommendation 영향 X)
  let qaFaithful: TranslationQaAudit | null = null;
  let qaMarket: TranslationQaAudit | null = null;
  try {
    const buildQa = (text: string): TranslationQaAudit => {
      const findings = auditManuscript(text);
      const qa: TranslationQaAudit = { findings, verdict: auditVerdict(findings) };
      if (tgtLang === 'en') qa.enReaderFindings = auditOutsiderEnglish(text);
      return qa;
    };
    if (faithful && faithful.length > 0) qaFaithful = buildQa(faithful);
    if (market && market.length > 0) qaMarket = buildQa(market);
  } catch { /* skip */ }

  // [Z1a-5] 어색한 표현/영문 습관 린트 — KO→EN 휴리스틱이므로 tgtLang==='en' 만 (경고용)
  let lintFaithful: TranslationeseLintResult | null = null;
  let lintMarket: TranslationeseLintResult | null = null;
  if (tgtLang === 'en') {
    try {
      if (faithful && faithful.length > 0) lintFaithful = lintTranslationese(faithful);
      if (market && market.length > 0) lintMarket = lintTranslationese(market);
    } catch { /* skip */ }
  }

  // recommendation 산출 — catastrophic 차단은 fail 과 동급 (결정적 reject)
  const hasCatastrophic = !!catFaithful?.blocked || !!catMarket?.blocked;
  const hasFail = (faithfulReport?.status === 'fail') || (marketReport?.status === 'fail') || hasCatastrophic;
  const hasWarn = (faithfulReport?.status === 'warn') || (marketReport?.status === 'warn') || glossaryMisses.length > 0;
  const recommendation: NCTReport['recommendation'] = hasFail ? 'reject' : hasWarn ? 'review' : 'publish';

  return {
    faithful: faithfulReport,
    market: marketReport,
    glossaryMisses,
    recommendation,
    timestamp: new Date().toISOString(),
    catastrophic: { faithful: catFaithful, market: catMarket },
    qaAudit: { faithful: qaFaithful, market: qaMarket },
    translationese: tgtLang === 'en' ? { faithful: lintFaithful, market: lintMarket } : undefined,
  };
}
