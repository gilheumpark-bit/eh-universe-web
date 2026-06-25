import {
  auditManuscript,
  auditVerdict,
  type AuditFinding,
  type AuditPerspective,
} from '../qa-auditor';

describe('auditManuscript', () => {
  // 1) 빈 입력 — 빈 배열
  it('빈 문자열은 빈 결과를 반환한다', () => {
    expect(auditManuscript('')).toEqual([]);
    expect(auditManuscript('   \n\t  ')).toEqual([]);
  });

  // 2) 이상값 — null/undefined/숫자 가드(크래시 없이 빈 결과)
  it('null/undefined/숫자 입력에도 크래시 없이 빈 배열', () => {
    // @ts-expect-error 의도적 잘못된 타입 주입
    expect(auditManuscript(null)).toEqual([]);
    // @ts-expect-error 의도적 잘못된 타입 주입
    expect(auditManuscript(undefined)).toEqual([]);
    // @ts-expect-error 의도적 잘못된 타입 주입
    expect(auditManuscript(12345)).toEqual([]);
  });

  // 3) 관점 A 정합검사관 — 따옴표 짝 불일치 + 문장 미완
  it('따옴표 짝이 안 맞고 종결부호가 없으면 consistency 결함 검출', () => {
    const text = '“안녕하세요 그가 말했다 그리고 돌아섰다';
    const findings = auditManuscript(text);
    const cons = findings.filter((f) => f.perspective === 'consistency');
    expect(cons.length).toBeGreaterThanOrEqual(1);
    expect(cons.some((f) => f.severity === 'high')).toBe(true); // 따옴표 불일치
  });

  // 4) 관점 B 외부독자 — tell 과다
  it('tell 신호가 문장당 30%를 넘으면 outsider high 결함 검출', () => {
    const text =
      '그는 슬픔을 느꼈다. 그녀도 슬픔을 느꼈다. 모두가 그렇게 생각했다. 끝이라고 느꼈다.';
    const findings = auditManuscript(text);
    const out = findings.find((f) => f.perspective === 'outsider' && f.severity === 'high');
    expect(out).toBeDefined();
  });

  // 5) 관점 C 반증가 — 반복어 과다
  it('반복어 비율이 높으면 refuter 결함 + 최다 반복어 명시', () => {
    const text = '늑대 늑대 늑대 늑대 늑대 늑대 늑대 늑대 사냥 사냥.';
    const findings = auditManuscript(text);
    const ref = findings.find((f) => f.perspective === 'refuter');
    expect(ref).toBeDefined();
    expect(ref?.issue).toContain('늑대');
  });

  // 6) 관점 D 구조검사관 — 긴 본문 단일 문단
  it('긴 본문이 한 문단이면 structure 결함 검출', () => {
    const text = '가'.repeat(500); // 줄바꿈 없는 긴 본문
    const findings = auditManuscript(text);
    const str = findings.find((f) => f.perspective === 'structure');
    expect(str).toBeDefined();
    expect(str?.issue).toContain('문단');
  });

  // 7) 깨끗한 본문 — high 결함 없음(통과 가능)
  it('정합·구조·대사를 갖춘 본문은 high 결함이 없다', () => {
    const text =
      '“가자.” 그가 칼을 뽑았다. 빗속에서 강철이 번뜩였다.\n\n' +
      '“아직 늦지 않았어.” 그녀가 속삭였다. 둘은 골목을 빠져나갔다. 멀리서 종이 울렸다.\n\n' +
      '추격자의 발소리가 점점 가까워졌다. 그들은 담을 넘었다.';
    const findings = auditManuscript(text);
    expect(findings.every((f) => f.severity !== 'high')).toBe(true);
  });

  // 8) 비수렴성 — 각 관점이 자기 휴리스틱만으로 독립 동작(perspective 라벨 정확)
  it('모든 결함은 4 관점 중 하나로만 라벨링된다', () => {
    const text = '“열린 따옴표 그는 느꼈다 느꼈다 느꼈다 같았다';
    const valid: AuditPerspective[] = ['consistency', 'outsider', 'refuter', 'structure'];
    for (const f of auditManuscript(text)) {
      expect(valid).toContain(f.perspective);
    }
  });
});

describe('auditVerdict', () => {
  // 9) 빈 findings — passed true + 4 관점 0 초기화
  it('빈 결함은 통과 + byPerspective 4키 모두 0', () => {
    const v = auditVerdict([]);
    expect(v.passed).toBe(true);
    expect(v.byPerspective).toEqual({
      consistency: 0,
      outsider: 0,
      refuter: 0,
      structure: 0,
    });
  });

  // 10) high 결함 존재 — passed false
  it('high 결함이 하나라도 있으면 통과 실패', () => {
    const findings: AuditFinding[] = [
      { perspective: 'consistency', issue: 'x', severity: 'high' },
      { perspective: 'outsider', issue: 'y', severity: 'low' },
    ];
    const v = auditVerdict(findings);
    expect(v.passed).toBe(false);
    expect(v.byPerspective.consistency).toBe(1);
    expect(v.byPerspective.outsider).toBe(1);
  });

  // 11) mid/low만 — passed true, 관점별 카운트 정확
  it('high가 없으면 mid/low가 있어도 통과', () => {
    const findings: AuditFinding[] = [
      { perspective: 'refuter', issue: 'a', severity: 'mid' },
      { perspective: 'refuter', issue: 'b', severity: 'low' },
      { perspective: 'structure', issue: 'c', severity: 'low' },
    ];
    const v = auditVerdict(findings);
    expect(v.passed).toBe(true);
    expect(v.byPerspective.refuter).toBe(2);
    expect(v.byPerspective.structure).toBe(1);
  });

  // 12) 이상값 — 비배열/깨진 항목 가드
  it('비배열/미지 관점/null 항목에도 크래시 없이 0 집계', () => {
    // @ts-expect-error 의도적 잘못된 타입 주입
    expect(auditVerdict(null).byPerspective.consistency).toBe(0);
    const dirty = [
      null,
      { perspective: 'unknown', issue: 'z', severity: 'high' },
    ] as unknown as AuditFinding[];
    const v = auditVerdict(dirty);
    // 미지 관점은 무시 → 4 키 모두 0, high도 무시되어 통과
    expect(v.passed).toBe(true);
    expect(v.byPerspective.consistency).toBe(0);
  });
});
