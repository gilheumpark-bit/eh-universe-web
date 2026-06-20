import {
  runIntegrityCheck,
  summarizeIntegrity,
  type IntegrityReport,
  type SupportedLang,
} from './source-integrity';

export type TranslationTrackId = 'source' | 'faithful' | 'market';
export type TranslationTrackStatus = 'ready' | 'review' | 'missing';

export interface TranslationTrackCard {
  id: TranslationTrackId;
  labelKo: string;
  status: TranslationTrackStatus;
  score: number | null;
  approved: boolean | null;
  summaryKo: string;
  detailKo: string;
}

export interface TranslationTrackComparison {
  noteKo: string;
  sourceChars: number;
  translatedChars: number;
  faithfulReport: IntegrityReport | null;
  marketReport: IntegrityReport | null;
  cards: TranslationTrackCard[];
}

export interface BuildTranslationTrackComparisonInput {
  source: string;
  translation: string;
  targetLang: SupportedLang;
  faithfulApproved?: boolean;
  marketApproved?: boolean;
}

function normalizeText(input: unknown): string {
  return typeof input === 'string' ? input.trim() : '';
}

function reportStatus(report: IntegrityReport | null): TranslationTrackStatus {
  if (!report) return 'missing';
  if (report.status === 'pass') return 'ready';
  return 'review';
}

function approvalText(value: boolean | undefined, label: string): string {
  return value ? `${label} 승인됨` : `${label} 승인 전`;
}

export function buildTranslationTrackComparison(
  input: BuildTranslationTrackComparisonInput,
): TranslationTrackComparison {
  const source = normalizeText(input.source);
  const translation = normalizeText(input.translation);
  const hasSource = source.length > 0;
  const hasTranslation = translation.length > 0;
  const faithfulReport = hasSource && hasTranslation
    ? runIntegrityCheck({
        source,
        translation,
        srcLang: 'ko',
        tgtLang: input.targetLang,
        trackMode: 'faithful',
      })
    : null;
  const marketReport = hasSource && hasTranslation
    ? runIntegrityCheck({
        source,
        translation,
        srcLang: 'ko',
        tgtLang: input.targetLang,
        trackMode: 'market',
      })
    : null;

  const sourceCard: TranslationTrackCard = {
    id: 'source',
    labelKo: '원문',
    status: hasSource ? 'ready' : 'missing',
    score: hasSource ? 100 : null,
    approved: null,
    summaryKo: hasSource ? `원문 ${source.length.toLocaleString()}자를 기준으로 비교합니다.` : '비교할 원문이 없습니다.',
    detailKo: '사용자는 대상 언어를 몰라도 원문 기준의 누락, 단락, 용어 위험을 먼저 봅니다.',
  };

  const faithfulCard: TranslationTrackCard = {
    id: 'faithful',
    labelKo: '충실판',
    status: reportStatus(faithfulReport),
    score: faithfulReport?.score ?? null,
    approved: !!input.faithfulApproved,
    summaryKo: faithfulReport ? summarizeIntegrity(faithfulReport, 'ko') : '충실판 비교 대상이 없습니다.',
    detailKo: `${approvalText(input.faithfulApproved, '충실판')} · 단락 1:1과 누락 위험을 엄격하게 봅니다.`,
  };

  const marketCard: TranslationTrackCard = {
    id: 'market',
    labelKo: '시장판',
    status: reportStatus(marketReport),
    score: marketReport?.score ?? null,
    approved: !!input.marketApproved,
    summaryKo: marketReport ? summarizeIntegrity(marketReport, 'ko') : '시장판 비교 대상이 없습니다.',
    detailKo: `${approvalText(input.marketApproved, '시장판')} · 단락 재구성을 허용하되 대규모 누락은 검토합니다.`,
  };

  return {
    noteKo: '대상 언어를 모르는 사용자를 위해 판단은 한국어 요약, 수치, 승인 상태로 표시합니다.',
    sourceChars: source.length,
    translatedChars: translation.length,
    faithfulReport,
    marketReport,
    cards: [sourceCard, faithfulCard, marketCard],
  };
}
