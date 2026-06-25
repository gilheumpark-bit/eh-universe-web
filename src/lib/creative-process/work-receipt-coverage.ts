import type { CreativeEvent, SourceRecord } from './types';

// ============================================================
// PART 1 — 타입 정의
// ============================================================

export type WorkReceiptCoverageKey =
  | 'external-import'
  | 'author-decision'
  | 'manual-revision'
  | 'translation-signoff'
  | 'package-issuance';

export type WorkReceiptCoverageStatus = 'covered' | 'partial' | 'missing' | 'not-applicable';

export type WorkReceiptCoverageOverallStatus = 'ready' | 'review' | 'hold';

export interface WorkReceiptDecisionLike {
  fixId?: string | null;
  decision?: string | null;
  reason?: string | null;
  context?: {
    taskId?: string;
    role?: string;
    actor?: string;
    decision?: string;
    approvedBy?: string;
    skippedReason?: string;
  };
}

export interface WorkReceiptCoverageExpectations {
  externalImport?: boolean;
  authorDecision?: boolean;
  manualRevision?: boolean;
  translationSignoff?: boolean;
  packageIssuance?: boolean;
}

export interface WorkReceiptCoverageInput {
  events?: readonly CreativeEvent[] | null;
  sources?: readonly SourceRecord[] | null;
  decisions?: readonly WorkReceiptDecisionLike[] | null;
  localReceipts?: readonly string[] | null;
  expectations?: WorkReceiptCoverageExpectations;
}

export interface WorkReceiptCoverageEvidence {
  source: 'event' | 'source' | 'receipt' | 'state';
  label: string;
  detail: string;
}

export interface WorkReceiptCoverageItem {
  key: WorkReceiptCoverageKey;
  labelKo: string;
  required: boolean;
  expected: boolean;
  status: WorkReceiptCoverageStatus;
  evidence: WorkReceiptCoverageEvidence[];
  missingKo: string;
}

export interface WorkReceiptCoverageAudit {
  status: WorkReceiptCoverageOverallStatus;
  coveredCount: number;
  expectedCount: number;
  items: WorkReceiptCoverageItem[];
  summaryKo: string;
}

// ============================================================
// PART 2 — registry
// ============================================================

const COVERAGE_KEYS: readonly WorkReceiptCoverageKey[] = Object.freeze([
  'external-import',
  'author-decision',
  'manual-revision',
  'translation-signoff',
  'package-issuance',
]);

const COVERAGE_META: Readonly<
  Record<WorkReceiptCoverageKey, { labelKo: string; required: boolean; missingKo: string }>
> = Object.freeze({
  'external-import': {
    labelKo: '불러오기 출처',
    required: false,
    missingKo: '불러온 자료가 있다면 SourceRecord 또는 편입 이벤트가 필요합니다.',
  },
  'author-decision': {
    labelKo: '채택·보류 결정',
    required: false,
    missingKo: '후보 채택, 보류, 폐기 결정이 영수증으로 남아야 합니다.',
  },
  'manual-revision': {
    labelKo: '수동 작성·수정',
    required: true,
    missingKo: '작가가 직접 작성하거나 고친 이벤트가 필요합니다.',
  },
  'translation-signoff': {
    labelKo: '번역 승인',
    required: false,
    missingKo: '번역본이 있다면 작가 승인 이벤트가 필요합니다.',
  },
  'package-issuance': {
    labelKo: '출고·확인서 발급',
    required: true,
    missingKo: '출고 영수증 또는 확인서 발급 이벤트가 필요합니다.',
  },
});

// ============================================================
// PART 3 — detector helpers
// ============================================================

function asArray<T>(value: readonly T[] | null | undefined): readonly T[] {
  return Array.isArray(value) ? value : [];
}

function compact(input: unknown, fallback: string): string {
  return typeof input === 'string' && input.trim() ? input.trim().slice(0, 180) : fallback;
}

function eventEvidence(event: CreativeEvent, label: string): WorkReceiptCoverageEvidence {
  return {
    source: 'event',
    label,
    detail: `${event.eventType} · ${event.targetType}/${event.targetId}`,
  };
}

function sourceEvidence(source: SourceRecord, label: string): WorkReceiptCoverageEvidence {
  return {
    source: 'source',
    label,
    detail: `${source.sourceType} · ${source.label}`,
  };
}

function receiptEvidence(receipt: WorkReceiptDecisionLike, label: string): WorkReceiptCoverageEvidence {
  return {
    source: 'receipt',
    label,
    detail: `${compact(receipt.fixId, 'receipt')} · ${compact(receipt.reason, receipt.decision ?? '기록')}`,
  };
}

function isExternalSource(source: SourceRecord): boolean {
  return source.sourceType !== 'ai_output';
}

function isExternalImportEvent(event: CreativeEvent): boolean {
  return event.eventType === 'import' || event.originType === 'EXTERNAL_IMPORT';
}

function isDecisionReceipt(receipt: WorkReceiptDecisionLike): boolean {
  const fixId = receipt.fixId ?? '';
  const decision = receipt.context?.decision ?? receipt.decision ?? '';
  return fixId.startsWith('candidate:') || decision.startsWith('candidate-');
}

function isDecisionEvent(event: CreativeEvent): boolean {
  return event.eventType === 'accept' || event.eventType === 'reject';
}

function isManualRevisionEvent(event: CreativeEvent): boolean {
  if (event.actorType !== 'human') return false;
  if (event.originType !== 'HUMAN_DRAFT' && event.originType !== 'HUMAN_REVISION') return false;
  return event.eventType === 'create' || event.eventType === 'edit' || event.eventType === 'merge';
}

function isTranslationSignoffEvent(event: CreativeEvent): boolean {
  const note = event.note ?? '';
  return event.targetId.startsWith('signoff-') || note.includes('Author sign-off');
}

function isPackageIssuanceEvent(event: CreativeEvent): boolean {
  const note = event.note ?? '';
  return event.targetId.startsWith('certificate:') || note.includes('certificate-issued');
}

function isPackageReceipt(text: string): boolean {
  return text.includes('출고 검수') || text.includes('IP 준비도 산출') || text.includes('플랫폼 자수 적합 점검');
}

function expectedValue(
  key: WorkReceiptCoverageKey,
  expectations: WorkReceiptCoverageExpectations | undefined,
): boolean {
  if (!expectations) return true;
  const lookup: Record<WorkReceiptCoverageKey, boolean | undefined> = {
    'external-import': expectations.externalImport,
    'author-decision': expectations.authorDecision,
    'manual-revision': expectations.manualRevision,
    'translation-signoff': expectations.translationSignoff,
    'package-issuance': expectations.packageIssuance,
  };
  return lookup[key] ?? true;
}

function statusFromEvidence(
  expected: boolean,
  evidence: readonly WorkReceiptCoverageEvidence[],
  relatedCount = 0,
): WorkReceiptCoverageStatus {
  if (!expected) return 'not-applicable';
  if (evidence.length > 0) return 'covered';
  if (relatedCount > 0) return 'partial';
  return 'missing';
}

// ============================================================
// PART 4 — main builder
// ============================================================

export function buildWorkReceiptCoverageAudit(
  input: WorkReceiptCoverageInput,
): WorkReceiptCoverageAudit {
  const events = asArray(input.events);
  const sources = asArray(input.sources);
  const decisions = asArray(input.decisions);
  const localReceipts = asArray(input.localReceipts);

  const externalEvidence = [
    ...sources.filter(isExternalSource).map((source) => sourceEvidence(source, '외부 출처')),
    ...events.filter(isExternalImportEvent).map((event) => eventEvidence(event, '편입 이벤트')),
  ];

  const decisionEvidence = [
    ...decisions.filter(isDecisionReceipt).map((receipt) => receiptEvidence(receipt, '후보 결정')),
    ...events.filter(isDecisionEvent).map((event) => eventEvidence(event, '채택·보류 이벤트')),
  ];

  const manualEvidence = events
    .filter(isManualRevisionEvent)
    .map((event) => eventEvidence(event, '작가 작성·수정'));

  const translationEvidence = events
    .filter(isTranslationSignoffEvent)
    .map((event) => eventEvidence(event, '번역 승인'));

  const packageEvidence = [
    ...events.filter(isPackageIssuanceEvent).map((event) => eventEvidence(event, '발급 이벤트')),
    ...localReceipts
      .filter(isPackageReceipt)
      .map((text) => ({
        source: 'receipt' as const,
        label: '출고 영수증',
        detail: text.split('\n').slice(0, 2).join(' · '),
      })),
  ];

  const evidenceByKey: Record<WorkReceiptCoverageKey, WorkReceiptCoverageEvidence[]> = {
    'external-import': externalEvidence,
    'author-decision': decisionEvidence,
    'manual-revision': manualEvidence,
    'translation-signoff': translationEvidence,
    'package-issuance': packageEvidence,
  };

  const relatedCountByKey: Record<WorkReceiptCoverageKey, number> = {
    'external-import': sources.length,
    'author-decision': decisions.length,
    'manual-revision': events.filter((event) => event.actorType === 'human').length,
    'translation-signoff': events.filter((event) => event.stage === 'translate').length,
    'package-issuance': localReceipts.length,
  };

  const items = COVERAGE_KEYS.map((key): WorkReceiptCoverageItem => {
    const meta = COVERAGE_META[key];
    const expected = expectedValue(key, input.expectations);
    const evidence = evidenceByKey[key];
    return {
      key,
      labelKo: meta.labelKo,
      required: meta.required,
      expected,
      status: statusFromEvidence(expected, evidence, relatedCountByKey[key]),
      evidence,
      missingKo: meta.missingKo,
    };
  });

  const expectedItems = items.filter((item) => item.expected);
  const coveredCount = expectedItems.filter((item) => item.status === 'covered').length;
  const requiredMissing = expectedItems.some((item) => item.required && item.status !== 'covered');
  const anyGap = expectedItems.some((item) => item.status === 'missing' || item.status === 'partial');
  const status: WorkReceiptCoverageOverallStatus = requiredMissing ? 'hold' : anyGap ? 'review' : 'ready';

  return {
    status,
    coveredCount,
    expectedCount: expectedItems.length,
    items,
    summaryKo:
      status === 'ready'
        ? '필수 과정기록이 출고 패키지 근거로 연결되어 있습니다.'
        : status === 'review'
          ? '출고는 가능하지만 보강하면 확인서 근거가 더 탄탄해집니다.'
          : '필수 과정기록이 부족해 출고 전 기록 보강이 필요합니다.',
  };
}
