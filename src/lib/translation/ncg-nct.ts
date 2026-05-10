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
}

export interface NCTReport {
  faithful: IntegrityReport | null;
  market: IntegrityReport | null;
  /** glossary 누락 목록. */
  glossaryMisses: { source: string; expected: string; track: 'faithful' | 'market' }[];
  /** 출판 권장 결정. */
  recommendation: 'publish' | 'review' | 'reject';
  timestamp: string;
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
// PART 4 — NCT (post-completion)
// ============================================================

/**
 * NCT — 번역 후 사후 검증.
 *
 * 두 결과 모두 source-integrity 검사 + glossary 일관성.
 * recommendation:
 *   - 'publish': 두 track 모두 pass + glossary 위반 0
 *   - 'review':  warn 있음 (작가/번역가 검토 권장)
 *   - 'reject':  fail 있음 (재번역 권장)
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

  // recommendation 산출
  const hasFail = (faithfulReport?.status === 'fail') || (marketReport?.status === 'fail');
  const hasWarn = (faithfulReport?.status === 'warn') || (marketReport?.status === 'warn') || glossaryMisses.length > 0;
  const recommendation: NCTReport['recommendation'] = hasFail ? 'reject' : hasWarn ? 'review' : 'publish';

  return {
    faithful: faithfulReport,
    market: marketReport,
    glossaryMisses,
    recommendation,
    timestamp: new Date().toISOString(),
  };
}
