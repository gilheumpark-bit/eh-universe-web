import {
  buildRevisionDecisionRecord,
  buildRevisionDecisionRecordFromKey,
  buildRevisionFindingKey,
  type RevisionDecisionFinding,
} from '../revision-decision-record';

const finding: RevisionDecisionFinding = {
  type: 'voice',
  severity: 'medium',
  location: '3문단',
  diagnosis: '화자의 말투가 앞 장면보다 설명적으로 이동했다.',
  suggestion: '대사와 행동으로 다시 돌린다.',
};

describe('revision-decision-record', () => {
  it('같은 발견 항목은 같은 안정 키를 만든다', () => {
    const a = buildRevisionFindingKey({ sessionId: 'sess-1', episode: 2, index: 0, finding });
    const b = buildRevisionFindingKey({ sessionId: 'sess-1', episode: 2, index: 0, finding });

    expect(a).toBe(b);
    expect(a).toContain('revision:sess-1:ep2:f0:voice');
  });

  it('승인/보류 결정은 같은 fixId 에 다른 id 를 부여한다', () => {
    const approved = buildRevisionDecisionRecord({
      sessionId: 'sess-1',
      episode: 2,
      index: 0,
      finding,
      decision: 'approved',
    });
    const rejected = buildRevisionDecisionRecord({
      sessionId: 'sess-1',
      episode: 2,
      index: 0,
      finding,
      decision: 'rejected',
    });

    expect(approved.fixId).toBe(rejected.fixId);
    expect(approved.id).not.toBe(rejected.id);
    expect(approved.reason).toContain('승인');
    expect(rejected.reason).toContain('보류');
    expect(approved.scoreDelta).toBeNull();
  });

  it('깨진 입력은 fallback 으로 안전하게 정규화한다', () => {
    const record = buildRevisionDecisionRecord({
      sessionId: '',
      episode: Number.NaN,
      index: -10,
      finding: { type: '', severity: '', diagnosis: '' },
      decision: 'approved',
    });

    expect(record.id).toContain('session-unknown');
    expect(record.fixId).toContain('ep0:f0:finding');
    expect(record.reason).toContain('(진단 없음)');
  });

  it('긴 텍스트는 영수증 사유 안에서 절단한다', () => {
    const record = buildRevisionDecisionRecord({
      sessionId: 'sess-1',
      episode: 1,
      index: 1,
      finding: {
        type: 'pacing',
        severity: 'high',
        diagnosis: '가'.repeat(1_000),
        suggestion: '나'.repeat(1_000),
      },
      decision: 'approved',
    });

    expect(record.reason.length).toBeLessThanOrEqual(700);
    expect(record.reason).toContain('…');
  });

  it('보고서가 만든 decisionKey를 fixId로 그대로 사용할 수 있다', () => {
    const decisionKey = 'revision:sess-1:ep2:f7:mechanical-glued-sentence-boundary:abc1234';
    const record = buildRevisionDecisionRecordFromKey({
      decisionKey,
      finding,
      decision: 'approved',
    });

    expect(record.fixId).toBe(decisionKey);
    expect(record.id).toBe(`${decisionKey}:approved`);
    expect(record.reason).toContain('승인');
  });
});
