import type { ArtifactDescriptor, WorkReceiptJournalItem } from '../submission-package';
import { verifyHumanAccountabilityReplay } from '../human-accountability-audit';

const approvedEntry: WorkReceiptJournalItem = {
  id: 'revision:s1:ep1:f0:voice:aaa:approved',
  at: 1_000,
  fixId: 'revision:s1:ep1:f0:voice:aaa',
  decision: 'approved',
  reason: '퇴고 보고서 승인 — voice/medium',
  receiptText: '[검사 적용]\n✓ fix 승인 — evidence',
};

const rejectedEntry: WorkReceiptJournalItem = {
  id: 'revision:s1:ep1:f1:pace:bbb:rejected',
  at: 2_000,
  fixId: 'revision:s1:ep1:f1:pace:bbb',
  decision: 'rejected',
  reason: '퇴고 보고서 보류 — pace/low',
  receiptText: '[검사 적용]\n✗ fix 거절 — author hold',
};

function workReceiptArtifact(entries: readonly WorkReceiptJournalItem[], count = entries.length): ArtifactDescriptor {
  const content = JSON.stringify(
    {
      kind: 'loreguard.work-receipt-journal.v1',
      count,
      entries,
      limitation:
        'Internal work receipts record author decisions and review handling. They do not determine copyright ownership, direct authorship, or legal compliance.',
    },
    null,
    2,
  );
  return {
    id: 'work-receipt-journal',
    filename: 'work-receipts-test.json',
    mimeType: 'application/json;charset=utf-8',
    size: content.length,
    content,
  };
}

describe('human-accountability-audit — T15 audit replay', () => {
  it('work-receipt journal 을 재생해 승인/보류 작가 결정 로그를 검증한다', () => {
    const result = verifyHumanAccountabilityReplay({
      artifacts: [workReceiptArtifact([approvedEntry, rejectedEntry])],
      expectedFixIds: [approvedEntry.fixId, rejectedEntry.fixId],
    });

    expect(result.valid).toBe(true);
    expect(result.summary).toEqual({
      expectedFixCount: 2,
      decidedFixCount: 2,
      approvedCount: 1,
      rejectedCount: 1,
    });
    expect(result.issues).toEqual([]);
    expect(result.limitation).toContain('does not determine copyright ownership');
  });

  it('동일 fixId 에 승인과 보류가 동시에 있으면 conflicting-decision 으로 잡는다', () => {
    const conflict: WorkReceiptJournalItem = {
      ...rejectedEntry,
      id: `${approvedEntry.fixId}:rejected`,
      fixId: approvedEntry.fixId,
    };

    const result = verifyHumanAccountabilityReplay({
      artifacts: [workReceiptArtifact([approvedEntry, conflict])],
      expectedFixIds: [approvedEntry.fixId],
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: 'conflicting-decision', fixId: approvedEntry.fixId }),
      ]),
    );
  });

  it('expected finding 의 결정 기록이 없으면 missing-human-decision 으로 잡는다', () => {
    const result = verifyHumanAccountabilityReplay({
      entries: [approvedEntry],
      expectedFixIds: [approvedEntry.fixId, rejectedEntry.fixId],
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: 'missing-human-decision', fixId: rejectedEntry.fixId }),
      ]),
    );
  });

  it('decision 과 receiptText 가 불일치하면 receipt-decision-mismatch 로 잡는다', () => {
    const mismatched: WorkReceiptJournalItem = {
      ...approvedEntry,
      receiptText: '[검사 적용]\n✗ fix 거절 — author hold',
    };

    const result = verifyHumanAccountabilityReplay({
      entries: [mismatched],
      expectedFixIds: [mismatched.fixId],
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: 'receipt-decision-mismatch', fixId: mismatched.fixId }),
      ]),
    );
  });

  it('work-receipt artifact 가 없으면 missing-work-receipt-journal 로 잡는다', () => {
    const result = verifyHumanAccountabilityReplay({ artifacts: [], expectedFixIds: [approvedEntry.fixId] });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([{ reason: 'missing-work-receipt-journal' }]);
  });
});
