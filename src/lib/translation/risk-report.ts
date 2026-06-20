import {
  runIntegrityCheck,
  summarizeIntegrity,
  type IntegrityReport,
  type SupportedLang,
} from './source-integrity';
import {
  lintTranslationese,
  type TranslationeseLintResult,
} from './translationese-lint';

export type TranslationRiskLevel = 'ready' | 'review' | 'high';
export type TranslationRiskStatus = TranslationRiskLevel | 'missing';
export type TranslationRiskCardId =
  | 'source-integrity'
  | 'translationese'
  | 'glossary'
  | 'signoff'
  | 'back-translation';

export interface TranslationRiskCard {
  id: TranslationRiskCardId;
  labelKo: string;
  status: TranslationRiskStatus;
  scoreImpact: number;
  count: number;
  summaryKo: string;
  detailKo: string;
}

export interface TranslationGlossaryMiss {
  source: string;
  expected: string;
  locked: boolean;
}

export interface TranslationBackSummary {
  status: 'ready' | 'missing';
  summaryKo: string;
}

export interface TranslationRiskReport {
  level: TranslationRiskLevel;
  score: number;
  noteKo: string;
  integrityReport: IntegrityReport | null;
  translationese: TranslationeseLintResult | null;
  glossaryMisses: TranslationGlossaryMiss[];
  backTranslation: TranslationBackSummary;
  cards: TranslationRiskCard[];
}

export interface BuildTranslationRiskReportInput {
  source: string;
  translation: string;
  targetLang: SupportedLang;
  glossary?: { source: string; target: string; locked?: boolean }[];
  faithfulApproved?: boolean;
  marketApproved?: boolean;
  backTranslationSummaryKo?: string;
}

function normalizeText(input: unknown): string {
  return typeof input === 'string' ? input.trim() : '';
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function cardStatusFromScore(scoreImpact: number, hasInput: boolean): TranslationRiskStatus {
  if (!hasInput) return 'missing';
  if (scoreImpact >= 30) return 'high';
  if (scoreImpact > 0) return 'review';
  return 'ready';
}

function buildGlossaryMisses(
  source: string,
  translation: string,
  glossary: { source: string; target: string; locked?: boolean }[],
): TranslationGlossaryMiss[] {
  const misses: TranslationGlossaryMiss[] = [];
  for (const entry of glossary) {
    const sourceTerm = normalizeText(entry.source);
    const targetTerm = normalizeText(entry.target);
    if (!sourceTerm || !source.includes(sourceTerm)) continue;
    if (!targetTerm || !translation.includes(targetTerm)) {
      misses.push({
        source: sourceTerm,
        expected: targetTerm || '대상 용어 미지정',
        locked: !!entry.locked,
      });
    }
  }
  return misses;
}

function buildIntegrityCard(
  report: IntegrityReport | null,
  hasSource: boolean,
  hasTranslation: boolean,
): TranslationRiskCard {
  if (!hasSource) {
    return {
      id: 'source-integrity',
      labelKo: '원문 보존',
      status: 'missing',
      scoreImpact: 20,
      count: 0,
      summaryKo: '비교할 원문이 없습니다.',
      detailKo: '원문을 먼저 불러오거나 작성해야 누락 여부를 판단할 수 있습니다.',
    };
  }
  if (!hasTranslation || !report) {
    return {
      id: 'source-integrity',
      labelKo: '원문 보존',
      status: 'missing',
      scoreImpact: 50,
      count: 0,
      summaryKo: '번역문이 아직 없습니다.',
      detailKo: '번역문이 생기면 단락 수, 분량 비율, 누락 의심 단락을 비교합니다.',
    };
  }

  const scoreImpact = report.status === 'fail' ? 35 : report.status === 'warn' ? 15 : 0;
  return {
    id: 'source-integrity',
    labelKo: '원문 보존',
    status: cardStatusFromScore(scoreImpact, true),
    scoreImpact,
    count: report.issues.length,
    summaryKo: summarizeIntegrity(report, 'ko'),
    detailKo: report.issues.length > 0
      ? report.issues.slice(0, 2).map((issue) => issue.message.ko).join(' / ')
      : '원문 대비 단락·분량 기준에서 큰 누락 징후가 없습니다.',
  };
}

function buildTranslationeseCard(
  targetLang: SupportedLang,
  lint: TranslationeseLintResult | null,
  hasTranslation: boolean,
): TranslationRiskCard {
  if (!hasTranslation) {
    return {
      id: 'translationese',
      labelKo: '문체 자연도',
      status: 'missing',
      scoreImpact: 0,
      count: 0,
      summaryKo: '번역문 대기 중입니다.',
      detailKo: '번역문이 확정되면 이름 반복, 로마자 호칭, 과잉 대사 동사 등을 점검합니다.',
    };
  }
  if (targetLang !== 'en') {
    return {
      id: 'translationese',
      labelKo: '문체 자연도',
      status: 'ready',
      scoreImpact: 0,
      count: 0,
      summaryKo: '현재 결정론적 문체 린트는 영어 트랙에 우선 적용됩니다.',
      detailKo: '일본어·중국어 문체 린트는 별도 규칙 확장 대상입니다.',
    };
  }
  const warnCount = lint?.hits.filter((hit) => hit.severity === 'warn').length ?? 0;
  const infoCount = lint?.hits.filter((hit) => hit.severity === 'info').length ?? 0;
  const scoreImpact = Math.min(30, warnCount * 10 + infoCount * 3);
  return {
    id: 'translationese',
    labelKo: '문체 자연도',
    status: cardStatusFromScore(scoreImpact, true),
    scoreImpact,
    count: lint?.hits.length ?? 0,
    summaryKo: scoreImpact === 0 ? '어색한 영어 표현 징후가 낮습니다.' : `검토 징후 ${lint?.hits.length ?? 0}건`,
    detailKo: lint?.hits.length
      ? lint.hits.slice(0, 2).map((hit) => hit.message.ko.replace(/A[Ii]\s*출력 특성\.\s*/, '')).join(' / ')
      : '이름 반복, 로마자 호칭, 과잉 대사 동사 기준에서 큰 징후가 없습니다.',
  };
}

function buildGlossaryCard(misses: TranslationGlossaryMiss[], hasTranslation: boolean): TranslationRiskCard {
  if (!hasTranslation) {
    return {
      id: 'glossary',
      labelKo: '용어 일치',
      status: 'missing',
      scoreImpact: 0,
      count: 0,
      summaryKo: '번역문 대기 중입니다.',
      detailKo: '번역문이 생기면 원문 용어와 대상 용어의 반영 여부를 비교합니다.',
    };
  }
  const lockedMisses = misses.filter((miss) => miss.locked).length;
  const scoreImpact = Math.min(30, misses.length * 10 + lockedMisses * 5);
  return {
    id: 'glossary',
    labelKo: '용어 일치',
    status: cardStatusFromScore(scoreImpact, true),
    scoreImpact,
    count: misses.length,
    summaryKo: misses.length === 0 ? '등록 용어가 번역문에 반영되었습니다.' : `누락 의심 ${misses.length}건`,
    detailKo: misses.length === 0
      ? '용어 사전 기준으로 누락된 항목이 보이지 않습니다.'
      : misses.slice(0, 2).map((miss) => `${miss.source} → ${miss.expected}`).join(' / '),
  };
}

function buildSignoffCard(
  hasTranslation: boolean,
  faithfulApproved: boolean | undefined,
  marketApproved: boolean | undefined,
): TranslationRiskCard {
  if (!hasTranslation) {
    return {
      id: 'signoff',
      labelKo: '승인 상태',
      status: 'missing',
      scoreImpact: 0,
      count: 0,
      summaryKo: '승인할 번역문이 없습니다.',
      detailKo: '충실판과 시장판을 분리해 검토한 뒤 승인 기록을 남깁니다.',
    };
  }
  const missing = [
    faithfulApproved ? null : '충실판',
    marketApproved ? null : '시장판',
  ].filter(Boolean) as string[];
  const scoreImpact = missing.length * 8;
  return {
    id: 'signoff',
    labelKo: '승인 상태',
    status: cardStatusFromScore(scoreImpact, true),
    scoreImpact,
    count: missing.length,
    summaryKo: missing.length === 0 ? '충실판·시장판 승인이 완료되었습니다.' : `${missing.join('·')} 승인 대기`,
    detailKo: '승인 전 번역은 출고 패키지에 검토 대기 상태로 남깁니다.',
  };
}

function buildBackTranslationCard(
  hasTranslation: boolean,
  summary: TranslationBackSummary,
): TranslationRiskCard {
  if (!hasTranslation) {
    return {
      id: 'back-translation',
      labelKo: '역번역 요약',
      status: 'missing',
      scoreImpact: 0,
      count: 0,
      summaryKo: '번역문 대기 중입니다.',
      detailKo: '번역문이 생긴 뒤 한국어 역요약으로 의미 변형을 확인합니다.',
    };
  }
  const scoreImpact = summary.status === 'ready' ? 0 : 5;
  return {
    id: 'back-translation',
    labelKo: '역번역 요약',
    status: summary.status === 'ready' ? 'ready' : 'review',
    scoreImpact,
    count: summary.status === 'ready' ? 1 : 0,
    summaryKo: summary.status === 'ready' ? '역번역 요약 준비됨' : '역번역 요약 대기',
    detailKo: summary.summaryKo,
  };
}

export function buildTranslationRiskReport(
  input: BuildTranslationRiskReportInput,
): TranslationRiskReport {
  const source = normalizeText(input.source);
  const translation = normalizeText(input.translation);
  const hasSource = source.length > 0;
  const hasTranslation = translation.length > 0;
  const integrityReport = hasSource && hasTranslation
    ? runIntegrityCheck({
        source,
        translation,
        srcLang: 'ko',
        tgtLang: input.targetLang,
        trackMode: 'faithful',
      })
    : null;
  const translationese = input.targetLang === 'en' && hasTranslation
    ? lintTranslationese(translation)
    : null;
  const glossaryMisses = hasSource && hasTranslation
    ? buildGlossaryMisses(source, translation, input.glossary ?? [])
    : [];
  const backTranslation: TranslationBackSummary = normalizeText(input.backTranslationSummaryKo)
    ? { status: 'ready', summaryKo: normalizeText(input.backTranslationSummaryKo) }
    : {
        status: 'missing',
        summaryKo: '역번역 요약은 아직 생성되지 않았습니다. 대상 언어를 모르는 사용자는 이 요약이 생긴 뒤 의미 변형을 확인합니다.',
      };

  const cards = [
    buildIntegrityCard(integrityReport, hasSource, hasTranslation),
    buildTranslationeseCard(input.targetLang, translationese, hasTranslation),
    buildGlossaryCard(glossaryMisses, hasTranslation),
    buildSignoffCard(hasTranslation, input.faithfulApproved, input.marketApproved),
    buildBackTranslationCard(hasTranslation, backTranslation),
  ];
  const score = clampScore(cards.reduce((sum, card) => sum + card.scoreImpact, 0));
  const level: TranslationRiskLevel = score >= 50 ? 'high' : score > 0 ? 'review' : 'ready';

  return {
    level,
    score,
    noteKo: '대상 언어를 모르는 사용자를 위해 원문 보존, 문체 자연도, 용어, 승인, 역번역 요약을 한국어로 모아 봅니다.',
    integrityReport,
    translationese,
    glossaryMisses,
    backTranslation,
    cards,
  };
}
