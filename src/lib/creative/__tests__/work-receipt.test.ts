// ============================================================
// work-receipt 테스트 — 정상 · 빈입력 · 경계 · 이상값 커버
// ============================================================

import { buildReceipt, type WorkReceipt } from '../work-receipt';

describe('buildReceipt', () => {
  // --- 정상 케이스 ---------------------------------------------------------
  it('did/skipped/metrics 모두 채워진 정상 영수증을 포맷한다', () => {
    const r: WorkReceipt = {
      did: [{ action: 'None 가드 추가', evidence: 'page.tsx:23' }],
      skipped: [{ action: '대규모 리팩토링', reason: '범위 밖' }],
      metrics: { chars: 5500, dialogueRatio: 42, keyInfo: 3 },
    };
    const out = buildReceipt(r);
    expect(out).toContain('[검사 적용]');
    expect(out).toContain('✓ None 가드 추가 — page.tsx:23');
    expect(out).toContain('✗ 대규모 리팩토링 — 범위 밖');
    expect(out).toContain('[정량]');
    expect(out).toContain('- 글자수: 5500자');
    expect(out).toContain('- 대사 비율: 42%');
    expect(out).toContain('- 핵심 정보: 3건');
  });

  it('did 여러 건을 모두 ✓ 라인으로 나열한다', () => {
    const r: WorkReceipt = {
      did: [
        { action: 'A', evidence: 'a.ts:1' },
        { action: 'B', evidence: 'b.ts:2' },
      ],
      skipped: [],
    };
    const lines = buildReceipt(r).split('\n');
    expect(lines.filter((l) => l.startsWith('✓'))).toHaveLength(2);
  });

  // --- 빈 입력 케이스 -------------------------------------------------------
  it('did/skipped 빈 배열이면 "(기록 없음)" 한 줄을 넣는다', () => {
    const out = buildReceipt({ did: [], skipped: [] });
    expect(out).toBe('[검사 적용]\n(기록 없음)');
    expect(out).not.toContain('[정량]');
  });

  it('metrics 누락 시 정량블록을 통째로 생략한다', () => {
    const r: WorkReceipt = {
      did: [{ action: '문장 다듬기', evidence: '3문장' }],
      skipped: [],
    };
    const out = buildReceipt(r);
    expect(out).toContain('✓ 문장 다듬기 — 3문장');
    expect(out).not.toContain('[정량]');
  });

  // --- 경계값 케이스 -------------------------------------------------------
  it('metrics 값이 0이어도 라인을 표시한다 (falsy 누락 버그 방지)', () => {
    const r: WorkReceipt = {
      did: [],
      skipped: [],
      metrics: { chars: 0, dialogueRatio: 0, keyInfo: 0 },
    };
    const out = buildReceipt(r);
    expect(out).toContain('- 글자수: 0자');
    expect(out).toContain('- 대사 비율: 0%');
    expect(out).toContain('- 핵심 정보: 0건');
  });

  it('대사 비율은 0~100으로 clamp 한다 (음수/초과 경계)', () => {
    const over = buildReceipt({ did: [], skipped: [], metrics: { dialogueRatio: 150 } });
    expect(over).toContain('- 대사 비율: 100%');
    const under = buildReceipt({ did: [], skipped: [], metrics: { dialogueRatio: -20 } });
    expect(under).toContain('- 대사 비율: 0%');
  });

  // --- 이상값 / 방어 케이스 -----------------------------------------------
  it('receipt 자체가 null/undefined여도 빈 영수증을 반환한다', () => {
    expect(buildReceipt(null)).toBe('[검사 적용]\n(기록 없음)');
    expect(buildReceipt(undefined)).toBe('[검사 적용]\n(기록 없음)');
  });

  it('did/skipped가 비배열(null)이어도 throw 없이 처리한다', () => {
    // 런타임에 잘못된 타입이 들어와도 방어
    const bad = { did: null, skipped: undefined } as unknown as WorkReceipt;
    expect(() => buildReceipt(bad)).not.toThrow();
    expect(buildReceipt(bad)).toContain('(기록 없음)');
  });

  it('항목 내 문자열이 null/빈값이면 (미상)으로 대체한다', () => {
    const bad = {
      did: [{ action: null, evidence: '' }],
      skipped: [{ action: undefined, reason: null }],
    } as unknown as WorkReceipt;
    const out = buildReceipt(bad);
    expect(out).toContain('✓ (미상) — (미상)');
    expect(out).toContain('✗ (미상) — (미상)');
  });

  it('NaN/Infinity metrics는 무효 처리하여 정량블록에서 제외한다', () => {
    const r: WorkReceipt = {
      did: [{ action: 'x', evidence: 'y' }],
      skipped: [],
      metrics: { chars: NaN, dialogueRatio: Infinity, keyInfo: -Infinity },
    };
    const out = buildReceipt(r);
    expect(out).not.toContain('[정량]');
    expect(out).not.toContain('글자수');
  });

  it('음수 글자수/핵심정보는 0으로 하한 보정한다', () => {
    const out = buildReceipt({ did: [], skipped: [], metrics: { chars: -100, keyInfo: -5 } });
    expect(out).toContain('- 글자수: 0자');
    expect(out).toContain('- 핵심 정보: 0건');
  });
});
