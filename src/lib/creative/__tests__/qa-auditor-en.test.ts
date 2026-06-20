// ============================================================
// qa-auditor-en — [Z1a-2] EN 전용 B리더 (외부독자 변형·KO 컨텍스트 구조 차단) 검증.
// ============================================================

import { auditOutsiderEnglish } from '../qa-auditor';

describe('auditOutsiderEnglish — 입력 방어', () => {
  it('빈 문자열 → 빈 결과', () => {
    expect(auditOutsiderEnglish('')).toHaveLength(0);
  });

  it('비문자열 (런타임 방어) → 빈 결과', () => {
    expect(auditOutsiderEnglish(null as unknown as string)).toHaveLength(0);
  });
});

describe('auditOutsiderEnglish — tell 과다', () => {
  it('felt/thought 류 밀도 30% 초과 → high', () => {
    const text =
      'She felt cold. He thought about it. It seemed wrong. She realized the truth. He wondered why. She knew the answer.';
    const findings = auditOutsiderEnglish(text);
    const tell = findings.find((f) => f.issue.includes('tell'));
    expect(tell).toBeDefined();
    expect(tell!.severity).toBe('high');
    expect(tell!.perspective).toBe('outsider');
  });

  it('밀도 15~30% → mid', () => {
    const text =
      'She felt cold. The wind howled outside. Rain hit the glass. The door creaked open. A shadow crossed the floor. Nothing moved after that.';
    const tell = auditOutsiderEnglish(text).find((f) => f.issue.includes('tell'));
    expect(tell).toBeDefined();
    expect(tell!.severity).toBe('mid');
  });

  it('show 중심 본문 → tell 미검출', () => {
    const text =
      'The wind howled outside. Rain hit the glass. The door creaked open. A shadow crossed the floor. Her hands trembled on the rail. Nothing moved after that.';
    expect(auditOutsiderEnglish(text).find((f) => f.issue.includes('tell'))).toBeUndefined();
  });
});

describe('auditOutsiderEnglish — 대사 부족 (400자 이상일 때만)', () => {
  it('긴 본문 + 대사 0 → mid', () => {
    const text = 'The corridor stretched on without end, lined with doors that never opened. '.repeat(8);
    expect(text.length).toBeGreaterThanOrEqual(400);
    const f = auditOutsiderEnglish(text).find((x) => x.issue.includes('대사'));
    expect(f).toBeDefined();
    expect(f!.severity).toBe('mid');
  });

  it('대사 풍부 → 미검출', () => {
    const text =
      ('"Where are we going?" she asked, glancing back. "Somewhere far from here," he answered without slowing down. ').repeat(5);
    expect(text.length).toBeGreaterThanOrEqual(400);
    expect(auditOutsiderEnglish(text).find((x) => x.issue.includes('대사'))).toBeUndefined();
  });

  it('짧은 본문 (400자 미만) → 대사 검사 skip (오탐 방지)', () => {
    const text = 'The corridor stretched on. No one spoke. Lights flickered overhead.';
    expect(auditOutsiderEnglish(text).find((x) => x.issue.includes('대사'))).toBeUndefined();
  });
});
