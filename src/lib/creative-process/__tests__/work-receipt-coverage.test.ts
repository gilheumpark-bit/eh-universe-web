import {
  buildWorkReceiptCoverageAudit,
  type WorkReceiptDecisionLike,
} from '../work-receipt-coverage';
import type { CreativeEvent, SourceRecord } from '../types';

function event(partial: Partial<CreativeEvent>): CreativeEvent {
  return {
    id: partial.id ?? `evt-${Math.random()}`,
    projectId: partial.projectId ?? 'project-1',
    targetType: partial.targetType ?? 'manuscript',
    targetId: partial.targetId ?? 'target-1',
    eventType: partial.eventType ?? 'edit',
    actorType: partial.actorType ?? 'human',
    actorId: partial.actorId ?? 'author',
    originType: partial.originType ?? 'HUMAN_REVISION',
    beforeHash: partial.beforeHash ?? null,
    afterHash: partial.afterHash ?? 'a'.repeat(64),
    createdAt: partial.createdAt ?? '2026-06-13T00:00:00.000Z',
    appVersion: partial.appVersion ?? 'test',
    note: partial.note,
    stage: partial.stage,
  };
}

function source(partial: Partial<SourceRecord>): SourceRecord {
  return {
    id: partial.id ?? 'src-1',
    projectId: partial.projectId ?? 'project-1',
    sourceType: partial.sourceType ?? 'external_doc',
    label: partial.label ?? '불러온 원고',
    importedAt: partial.importedAt ?? '2026-06-13T00:00:00.000Z',
    contentHash: partial.contentHash ?? 'b'.repeat(64),
    visibility: partial.visibility ?? 'private',
  };
}

function decision(partial: Partial<WorkReceiptDecisionLike>): WorkReceiptDecisionLike {
  return {
    fixId: partial.fixId ?? 'candidate:world:001',
    decision: partial.decision ?? 'approved',
    reason: partial.reason ?? '세계관 후보 채택',
    context: partial.context,
  };
}

describe('buildWorkReceiptCoverageAudit', () => {
  it('필수 기록이 없으면 hold', () => {
    const audit = buildWorkReceiptCoverageAudit({
      events: [],
      sources: [],
      decisions: [],
      localReceipts: [],
      expectations: {
        externalImport: false,
        authorDecision: false,
        translationSignoff: false,
        manualRevision: true,
        packageIssuance: true,
      },
    });

    expect(audit.status).toBe('hold');
    expect(audit.coveredCount).toBe(0);
    expect(audit.items.find((item) => item.key === 'manual-revision')?.status).toBe('missing');
    expect(audit.items.find((item) => item.key === 'package-issuance')?.status).toBe('missing');
  });

  it('불러오기, 후보 결정, 수동 수정, 번역 승인, 출고 영수증을 각각 감지한다', () => {
    const audit = buildWorkReceiptCoverageAudit({
      events: [
        event({ eventType: 'edit', actorType: 'human', originType: 'HUMAN_REVISION' }),
        event({
          targetId: 'signoff-market-1',
          eventType: 'edit',
          actorType: 'human',
          originType: 'HUMAN_REVISION',
          note: 'Author sign-off · market track',
        }),
      ],
      sources: [source({ sourceType: 'external_doc' })],
      decisions: [decision({ fixId: 'candidate:plot:beat-1' })],
      localReceipts: ['[검사 적용]\n✓ 출고 검수 — 90점\n✓ IP 준비도 산출 — 70점'],
    });

    expect(audit.status).toBe('ready');
    expect(audit.coveredCount).toBe(5);
    expect(audit.expectedCount).toBe(5);
    expect(audit.items.every((item) => item.status === 'covered')).toBe(true);
  });

  it('관련 기록은 있으나 정확한 승인 이벤트가 아니면 partial', () => {
    const audit = buildWorkReceiptCoverageAudit({
      events: [
        event({ stage: 'translate', eventType: 'create', actorType: 'system', originType: 'SYSTEM_GENERATED' }),
        event({ actorType: 'human', originType: 'HUMAN_REVISION' }),
      ],
      localReceipts: ['[검사 적용]\n✓ 출고 검수 — 88점'],
      expectations: {
        externalImport: false,
        authorDecision: false,
        translationSignoff: true,
        manualRevision: true,
        packageIssuance: true,
      },
    });

    const translation = audit.items.find((item) => item.key === 'translation-signoff');
    expect(translation?.status).toBe('partial');
    expect(audit.status).toBe('review');
  });

  it('해당 없는 항목은 not-applicable로 둔다', () => {
    const audit = buildWorkReceiptCoverageAudit({
      events: [event({ actorType: 'human', originType: 'HUMAN_DRAFT' })],
      localReceipts: ['[검사 적용]\n✓ 출고 검수 — 88점'],
      expectations: {
        externalImport: false,
        authorDecision: false,
        translationSignoff: false,
        manualRevision: true,
        packageIssuance: true,
      },
    });

    expect(audit.status).toBe('ready');
    expect(audit.items.find((item) => item.key === 'external-import')?.status).toBe('not-applicable');
    expect(audit.items.find((item) => item.key === 'translation-signoff')?.status).toBe('not-applicable');
  });
});
