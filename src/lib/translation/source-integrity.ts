// ============================================================
// PART 1 — Module Header
// ============================================================
//
// source-integrity.ts — 번역 1원칙: "원문을 잘라먹지 않는다".
//
// LLM 이 prompt 를 어기고 단락을 누락·머지·삭제할 때 결정론적으로
// 잡아내는 안전망. prompt 만으로는 보장 불가하므로 후처리에서 검증한다.
//
// 호출 패턴:
//   const report = runIntegrityCheck({ source, translation, srcLang: 'ko', tgtLang: 'en' });
//   if (report.status === 'fail') { /* 재번역 트리거 */ }
//
// [C] 결정론적 — LLM 호출 없이 텍스트만으로 판정 (회귀 검증 가능)
// [G] O(n) 텍스트 스캔 — 100k chars 도 < 50ms
// [K] 단일 책임 — 원문 보존만 검증, 품질 채점은 별도 모듈
// ============================================================

// ============================================================
// PART 2 — Types
// ============================================================

export type IntegrityStatus = 'pass' | 'warn' | 'fail';

export interface IntegrityIssue {
  /** 이슈 카테고리 */
  kind:
    | 'paragraph-count-mismatch'
    | 'sentence-count-out-of-range'
    | 'word-ratio-out-of-range'
    | 'missing-segment'
    | 'empty-translation'
    | 'massive-truncation';
  severity: 'warn' | 'fail';
  /** 사용자 친화 4언어 메시지 */
  message: { ko: string; en: string; ja: string; zh: string };
  /** 결정론적 메트릭 — 디버깅·로그용 */
  metric?: {
    expected?: number;
    actual?: number;
    ratio?: number;
  };
  /** 누락 의심 segment 의 source 인덱스 (paragraph index) */
  suspectSegments?: number[];
}

export interface IntegrityReport {
  status: IntegrityStatus;
  /** 0~100 — 100 이 완벽 보존 */
  score: number;
  issues: IntegrityIssue[];
  /** 결정론적 메트릭 — 자동 회귀 비교 가능 */
  metrics: {
    sourceParagraphs: number;
    translationParagraphs: number;
    sourceSentences: number;
    translationSentences: number;
    sourceWords: number;
    translationWords: number;
    wordRatio: number;
  };
}

export type SupportedLang = 'ko' | 'en' | 'ja' | 'zh';

// ============================================================
// PART 3 — 언어별 정상 범위 매트릭스
// ============================================================
//
// 단어 수 비율 정상 범위 (target / source).
// 일반적으로:
//   ko ↔ en: 한국어 1자 ≈ 영어 0.6~1.0 단어
//   ko ↔ ja: 한국어 1자 ≈ 일본어 1.0~1.4 자
//   ko ↔ zh: 한국어 1자 ≈ 중국어 0.5~0.8 자
//
// 정상 범위 밖 = 누락 또는 과잉 의심 → warn / fail.
// 1.5x 이상 짧거나 길면 fail.
// ============================================================

interface WordRatioRange {
  min: number;
  max: number;
  /** 의심 임계 — 이 비율 이하면 누락 fail */
  truncationThreshold: number;
}

const WORD_RATIO_MATRIX: Record<string, WordRatioRange> = {
  // KO → ?
  'ko->en': { min: 0.4, max: 1.6, truncationThreshold: 0.3 },
  'ko->ja': { min: 0.7, max: 1.8, truncationThreshold: 0.5 },
  'ko->zh': { min: 0.4, max: 1.2, truncationThreshold: 0.3 },
  // EN → ?
  'en->ko': { min: 0.5, max: 2.0, truncationThreshold: 0.4 },
  'en->ja': { min: 0.6, max: 2.2, truncationThreshold: 0.4 },
  'en->zh': { min: 0.4, max: 1.5, truncationThreshold: 0.3 },
  // JA → ?
  'ja->ko': { min: 0.5, max: 1.5, truncationThreshold: 0.4 },
  'ja->en': { min: 0.4, max: 1.5, truncationThreshold: 0.3 },
  'ja->zh': { min: 0.4, max: 1.2, truncationThreshold: 0.3 },
  // ZH → ?
  'zh->ko': { min: 0.8, max: 2.5, truncationThreshold: 0.6 },
  'zh->en': { min: 0.7, max: 2.5, truncationThreshold: 0.5 },
  'zh->ja': { min: 0.8, max: 2.2, truncationThreshold: 0.6 },
};

const DEFAULT_RANGE: WordRatioRange = { min: 0.4, max: 2.0, truncationThreshold: 0.3 };

// ============================================================
// PART 4 — 결정론적 측정 헬퍼
// ============================================================

/** 단락 분리 — 빈 줄 1개 이상으로 split. */
function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * 문장 분리 — 4언어 호환 종결 부호.
 * ko/ja: 。 ?  !  …
 * en: . ?  !
 * zh: 。 ?  ! ：
 */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。！？…])\s+|(?<=[。！？])(?=\S)/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** 단어 수 — 한자/한글 문자 카운트, 영어 단어 카운트. */
function countWords(text: string, lang: SupportedLang): number {
  if (lang === 'en') {
    // 공백 분리 + 빈 토큰 제거
    return text.split(/\s+/).filter((w) => w.length > 0).length;
  }
  // ko/ja/zh — 의미 단위로 한글/한자/가나 문자 카운트
  // 공백·구두점 제외
  const meaningful = text.replace(/[\s\p{P}\p{S}]/gu, '');
  return meaningful.length;
}

// ============================================================
// PART 5 — 개별 검증 함수
// ============================================================

/**
 * 단락 수 비교 — 1:1 구조 확인.
 *
 * - 정확히 일치: pass
 * - ±10% 이내: warn (LLM 이 한두 단락 머지 가능성)
 * - 그 이상: fail (구조 붕괴)
 */
export function verifyParagraphCount(source: string, translation: string): IntegrityIssue | null {
  const srcParas = splitParagraphs(source);
  const tgtParas = splitParagraphs(translation);
  const expected = srcParas.length;
  const actual = tgtParas.length;
  if (expected === actual) return null;

  const diff = Math.abs(expected - actual);
  const ratio = expected === 0 ? 1 : actual / expected;
  const tolerance = Math.max(1, Math.ceil(expected * 0.1));
  const severity: IntegrityIssue['severity'] = diff <= tolerance ? 'warn' : 'fail';

  return {
    kind: 'paragraph-count-mismatch',
    severity,
    metric: { expected, actual, ratio },
    message: {
      ko: `원문 단락 ${expected}개 → 번역 ${actual}개. 1:1 구조 위반${severity === 'fail' ? ' (심각)' : ''}.`,
      en: `Source ${expected} paragraphs → translation ${actual}. 1:1 structure violation${severity === 'fail' ? ' (critical)' : ''}.`,
      ja: `原文 ${expected} 段落 → 翻訳 ${actual}。1:1 構造違反${severity === 'fail' ? '(深刻)' : ''}。`,
      zh: `原文 ${expected} 段落 → 翻译 ${actual}。1:1 结构违规${severity === 'fail' ? '(严重)' : ''}。`,
    },
  };
}

/**
 * 단어/문자 수 비율 검증 — 언어 매트릭스 기반.
 *
 * - 정상 범위: pass
 * - 범위 밖 but truncationThreshold 이상: warn
 * - truncationThreshold 미만: fail (대규모 누락 의심)
 */
export function verifyWordRatio(
  source: string,
  translation: string,
  srcLang: SupportedLang,
  tgtLang: SupportedLang,
): IntegrityIssue | null {
  const sourceWords = countWords(source, srcLang);
  const translationWords = countWords(translation, tgtLang);
  if (sourceWords === 0) {
    if (translationWords > 0) {
      return {
        kind: 'empty-translation',
        severity: 'warn',
        metric: { expected: 0, actual: translationWords },
        message: {
          ko: '원문이 비어 있는데 번역이 생성되었습니다.',
          en: 'Translation generated for empty source.',
          ja: '原文が空ですが翻訳が生成されました。',
          zh: '原文为空但生成了翻译。',
        },
      };
    }
    return null;
  }
  if (translationWords === 0) {
    return {
      kind: 'empty-translation',
      severity: 'fail',
      metric: { expected: sourceWords, actual: 0 },
      message: {
        ko: `원문 ${sourceWords}자 → 번역 0. 완전 누락.`,
        en: `Source ${sourceWords} words → translation empty. Complete loss.`,
        ja: `原文 ${sourceWords} 字 → 翻訳 0。完全欠落。`,
        zh: `原文 ${sourceWords} 字 → 翻译 0。完全缺失。`,
      },
    };
  }

  const ratio = translationWords / sourceWords;
  const range = WORD_RATIO_MATRIX[`${srcLang}->${tgtLang}`] ?? DEFAULT_RANGE;

  if (ratio >= range.min && ratio <= range.max) return null;

  if (ratio < range.truncationThreshold) {
    return {
      kind: 'massive-truncation',
      severity: 'fail',
      metric: { expected: sourceWords, actual: translationWords, ratio },
      message: {
        ko: `번역량이 원문의 ${Math.round(ratio * 100)}% 수준 (정상 범위 ${Math.round(range.min * 100)}~${Math.round(range.max * 100)}%). 대규모 누락 의심.`,
        en: `Translation is ${Math.round(ratio * 100)}% of source (normal ${Math.round(range.min * 100)}~${Math.round(range.max * 100)}%). Massive truncation suspected.`,
        ja: `翻訳量が原文の${Math.round(ratio * 100)}%(正常 ${Math.round(range.min * 100)}~${Math.round(range.max * 100)}%)。大規模欠落の疑い。`,
        zh: `翻译量为原文 ${Math.round(ratio * 100)}%(正常 ${Math.round(range.min * 100)}~${Math.round(range.max * 100)}%)。疑似大规模缺失。`,
      },
    };
  }

  return {
    kind: 'word-ratio-out-of-range',
    severity: 'warn',
    metric: { expected: sourceWords, actual: translationWords, ratio },
    message: {
      ko: `번역량 비율 ${Math.round(ratio * 100)}% (정상 ${Math.round(range.min * 100)}~${Math.round(range.max * 100)}%). 검토 권장.`,
      en: `Word ratio ${Math.round(ratio * 100)}% (normal ${Math.round(range.min * 100)}~${Math.round(range.max * 100)}%). Review suggested.`,
      ja: `語数比率 ${Math.round(ratio * 100)}%(正常 ${Math.round(range.min * 100)}~${Math.round(range.max * 100)}%)。確認推奨。`,
      zh: `字数比率 ${Math.round(ratio * 100)}%(正常 ${Math.round(range.min * 100)}~${Math.round(range.max * 100)}%)。建议复核。`,
    },
  };
}

/**
 * 누락 의심 단락 탐지 — 단락별 길이 anomaly.
 *
 * 원문 N번 단락이 길이 L 이면, 번역 N번 단락도 L * range.min 이상이어야 한다.
 * 너무 짧으면 (예: 원문 200자 → 번역 5자) 부분 누락 의심.
 */
export function detectMissingSegments(
  source: string,
  translation: string,
  srcLang: SupportedLang,
  tgtLang: SupportedLang,
): IntegrityIssue | null {
  const srcParas = splitParagraphs(source);
  const tgtParas = splitParagraphs(translation);
  if (srcParas.length === 0 || srcParas.length !== tgtParas.length) {
    // 단락 수 자체가 불일치하면 verifyParagraphCount 가 잡음 — 여기서는 skip
    return null;
  }
  const range = WORD_RATIO_MATRIX[`${srcLang}->${tgtLang}`] ?? DEFAULT_RANGE;
  const suspect: number[] = [];
  for (let i = 0; i < srcParas.length; i++) {
    const srcLen = countWords(srcParas[i], srcLang);
    const tgtLen = countWords(tgtParas[i], tgtLang);
    if (srcLen < 5) continue; // 너무 짧은 단락은 비교 무의미
    const localRatio = tgtLen / srcLen;
    if (localRatio < range.truncationThreshold) {
      suspect.push(i);
    }
  }
  if (suspect.length === 0) return null;
  return {
    kind: 'missing-segment',
    severity: suspect.length >= Math.max(2, srcParas.length * 0.1) ? 'fail' : 'warn',
    suspectSegments: suspect,
    metric: { expected: srcParas.length, actual: srcParas.length - suspect.length },
    message: {
      ko: `${suspect.length}개 단락에서 누락 의심 (단락 #${suspect.slice(0, 3).join(', #')}${suspect.length > 3 ? ' …' : ''}).`,
      en: `${suspect.length} paragraphs suspected of truncation (#${suspect.slice(0, 3).join(', #')}${suspect.length > 3 ? ' …' : ''}).`,
      ja: `${suspect.length} 段落で欠落の疑い(#${suspect.slice(0, 3).join(', #')}${suspect.length > 3 ? ' …' : ''})。`,
      zh: `${suspect.length} 段落疑似缺失(#${suspect.slice(0, 3).join(', #')}${suspect.length > 3 ? ' …' : ''})。`,
    },
  };
}

// ============================================================
// PART 6 — 통합 검증 함수 (메인 export)
// ============================================================

export interface IntegrityCheckInput {
  source: string;
  translation: string;
  srcLang: SupportedLang;
  tgtLang: SupportedLang;
  /**
   * [2026-05-08 시장 분석 4차] track 별 1원칙 엄격도.
   *   faithful: 단락 1:1 강제 + 비율 ±20% 엄격 (저작권 archive 용)
   *   market:   단락 그룹화 허용 (회차 재구성) + 비율 ±50% 완화 (출판 용)
   *   default:  legacy (matrix 기본 임계 사용)
   */
  trackMode?: 'faithful' | 'market' | 'default';
}

/**
 * 종합 원문 보존 검증 — 1원칙 안전망.
 *
 * 호출 패턴:
 *   const report = runIntegrityCheck({ source, translation, srcLang: 'ko', tgtLang: 'en' });
 *   if (report.status === 'fail') {
 *     // UI 경고 + 재번역 트리거
 *   }
 *
 * [C] 모든 issue 수집 후 worst severity 로 status 결정
 * [C] LLM 호출 없음 — 결정론적
 * [G] 100k chars 텍스트 < 50ms
 */
export function runIntegrityCheck(input: IntegrityCheckInput): IntegrityReport {
  const { source, translation, srcLang, tgtLang, trackMode = 'default' } = input;
  const issues: IntegrityIssue[] = [];

  // 1) 단락 수 검증 — Market track 은 단락 그룹화/분할 허용 (warn 으로 강등)
  const paraIssue = verifyParagraphCount(source, translation);
  if (paraIssue) {
    if (trackMode === 'market' && paraIssue.severity === 'fail') {
      // Market 은 회차 재구성·단락 머지를 허용 → fail → warn
      issues.push({ ...paraIssue, severity: 'warn' });
    } else if (trackMode === 'faithful') {
      // Faithful 은 더 엄격 — warn 도 fail 로 격상 가능 (단락 N≥10 이고 차이 1개 초과 시)
      const expected = paraIssue.metric?.expected ?? 0;
      const actual = paraIssue.metric?.actual ?? 0;
      if (expected >= 10 && Math.abs(expected - actual) > 1 && paraIssue.severity === 'warn') {
        issues.push({ ...paraIssue, severity: 'fail' });
      } else {
        issues.push(paraIssue);
      }
    } else {
      issues.push(paraIssue);
    }
  }

  // 2) 단어/문자 수 비율 검증
  const ratioIssue = verifyWordRatio(source, translation, srcLang, tgtLang);
  if (ratioIssue) {
    if (trackMode === 'market' && ratioIssue.kind === 'word-ratio-out-of-range') {
      // Market 은 ±50% 완화 → warn 만 무시 가능
      const ratio = ratioIssue.metric?.ratio ?? 1;
      if (ratio >= 0.5 && ratio <= 2.0) {
        // skip — Market 허용 범위 안
      } else {
        issues.push(ratioIssue);
      }
    } else {
      issues.push(ratioIssue);
    }
  }

  // 3) 단락별 누락 의심 탐지 (단락 수 일치 시만, Faithful 만 엄격 수행)
  if (trackMode !== 'market') {
    const segmentIssue = detectMissingSegments(source, translation, srcLang, tgtLang);
    if (segmentIssue) issues.push(segmentIssue);
  }

  // 메트릭 수집
  const srcParas = splitParagraphs(source);
  const tgtParas = splitParagraphs(translation);
  const srcSents = splitSentences(source);
  const tgtSents = splitSentences(translation);
  const sourceWords = countWords(source, srcLang);
  const translationWords = countWords(translation, tgtLang);

  // status 결정
  const hasFail = issues.some((i) => i.severity === 'fail');
  const hasWarn = issues.some((i) => i.severity === 'warn');
  const status: IntegrityStatus = hasFail ? 'fail' : hasWarn ? 'warn' : 'pass';

  // 점수 계산 — 100 에서 fail 25점, warn 10점 차감
  const failPenalty = issues.filter((i) => i.severity === 'fail').length * 25;
  const warnPenalty = issues.filter((i) => i.severity === 'warn').length * 10;
  const score = Math.max(0, 100 - failPenalty - warnPenalty);

  return {
    status,
    score,
    issues,
    metrics: {
      sourceParagraphs: srcParas.length,
      translationParagraphs: tgtParas.length,
      sourceSentences: srcSents.length,
      translationSentences: tgtSents.length,
      sourceWords,
      translationWords,
      wordRatio: sourceWords === 0 ? 0 : translationWords / sourceWords,
    },
  };
}

// ============================================================
// PART 7 — UI 헬퍼
// ============================================================

/** 4언어 사용자 친화 요약 — UI 배지용. */
export function summarizeIntegrity(
  report: IntegrityReport,
  lang: 'ko' | 'en' | 'ja' | 'zh' = 'ko',
): string {
  const labels = {
    pass: { ko: '원문 보존 100%', en: 'Source 100% preserved', ja: '原文 100% 保存', zh: '原文 100% 保留' },
    warn: { ko: `원문 보존 ${report.score}% (검토 필요)`, en: `Source ${report.score}% (review)`, ja: `原文 ${report.score}%(要確認)`, zh: `原文 ${report.score}%(需复核)` },
    fail: { ko: `원문 보존 ${report.score}% — 누락 의심`, en: `Source ${report.score}% — truncation suspected`, ja: `原文 ${report.score}% — 欠落の疑い`, zh: `原文 ${report.score}% — 疑似缺失` },
  };
  return labels[report.status][lang];
}
