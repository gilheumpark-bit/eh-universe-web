// ============================================================
// signal-compression 테스트 — 하인리히 신호압축 (300→29→1)
// 사양: claude3 _도구/_하인리히_신호압축_결함피라미드.md
//   클러스터 / FMEA lookup(§4) / vital-few 상한(§3.1) / verdict(§3.2) / near-miss(§2)
// ============================================================

import {
  compressFindings,
  recordNearMiss,
  listNearMisses,
  isNearMissPromoted,
  promotedNearMissKeys,
  clearNearMisses,
  DECISION_CAPS,
  TOTAL_DECISION_CAP,
  NEAR_MISS_KEY,
  NEAR_MISS_PROMOTE_THRESHOLD,
  NEAR_MISS_MAX_ENTRIES,
  type RawFinding,
} from '../signal-compression';

/** 결함 raw 신호 헬퍼 (필드 기본값 + 부분 오버라이드). */
function f(over: Partial<RawFinding> & { label: string }): RawFinding {
  return {
    source: 'test',
    severity: 2,
    occurrence: 2,
    detection: 2,
    confidence: 0.8,
    ...over,
  };
}

describe('compressFindings — 빈/깨진 입력', () => {
  it('빈 배열 → PASS·결정 0·카운트 0', () => {
    const r = compressFindings([]);
    expect(r.verdict).toBe('PASS');
    expect(r.decisions).toHaveLength(0);
    expect(r.counts).toEqual({ BLOCKER: 0, WARN: 0, NIT: 0, KEEP: 0 });
    expect(r.rawCount).toBe(0);
    expect(r.clusterCount).toBe(0);
    expect(r.droppedByCap).toBe(0);
  });

  it('비배열/손상 항목 안전 — 라벨·source 없는 항목 드랍', () => {
    const r = compressFindings([
      null as unknown as RawFinding,
      f({ label: '' }),
      f({ label: 'ok', source: '' }),
      f({ label: '정상' }),
    ]);
    expect(r.rawCount).toBe(1);
    expect(r.decisions).toHaveLength(1);
    expect(r.decisions[0].label).toBe('정상');
  });

  it('NaN/범위 밖 수치 클램프 — severity 99 → 5·confidence NaN → 기본 0.70', () => {
    const r = compressFindings([
      f({ label: '폭주', severity: 99, occurrence: -3, detection: NaN, confidence: NaN }),
    ]);
    const d = r.decisions[0];
    expect(d.severity).toBe(5);
    expect(d.occurrence).toBe(1);
    expect(d.detection).toBe(1);
    expect(d.confidence).toBe(0.7);
    // severity 5 이지만 confidence 0.70 < 0.75 → BLOCKER 아님 (§4)
    expect(d.grade).not.toBe('BLOCKER');
  });
});

describe('compressFindings — ① 클러스터 (같은 root cause 묶음)', () => {
  it('같은 clusterKey 는 1 결정으로 병합 — rawCount 합산·대표값 max', () => {
    const r = compressFindings([
      f({ label: '반복어', clusterKey: 'rev:rep', severity: 2, occurrence: 1, source: 'revision' }),
      f({ label: '반복어', clusterKey: 'rev:rep', severity: 3, occurrence: 4, source: 'qa-auditor' }),
    ]);
    expect(r.clusterCount).toBe(1);
    expect(r.decisions).toHaveLength(1);
    const d = r.decisions[0];
    expect(d.rawCount).toBe(2);
    expect(d.severity).toBe(3);
    expect(d.occurrence).toBe(4);
    expect(d.sources).toEqual(['revision', 'qa-auditor']);
  });

  it('clusterKey 미지정 → source:label 기본 키 (같은 라벨·source 병합)', () => {
    const r = compressFindings([f({ label: 'x' }), f({ label: 'x' }), f({ label: 'y' })]);
    expect(r.clusterCount).toBe(2);
    expect(r.rawCount).toBe(3);
  });
});

describe('compressFindings — ② FMEA lookup (§4 표 그대로)', () => {
  it('severity 5 · confidence≥0.75 → BLOCKER', () => {
    const r = compressFindings([f({ label: 'b', severity: 5, confidence: 0.75 })]);
    expect(r.decisions[0].grade).toBe('BLOCKER');
  });

  it('severity 5 · confidence<0.75 → BLOCKER 아님', () => {
    const r = compressFindings([f({ label: 'b', severity: 5, confidence: 0.74 })]);
    expect(r.decisions[0].grade).not.toBe('BLOCKER');
  });

  it('severity 4 · occurrence≥3 · confidence≥0.75 → BLOCKER (WARN 상위/BLOCKER 행)', () => {
    const r = compressFindings([f({ label: 'b', severity: 4, occurrence: 3, confidence: 0.8 })]);
    expect(r.decisions[0].grade).toBe('BLOCKER');
  });

  it('severity 4 · detection≥4 · confidence<0.75 → WARN (보수: 낮은 확신은 차단 안 함)', () => {
    const r = compressFindings([
      f({ label: 'w', severity: 4, occurrence: 1, detection: 4, confidence: 0.7 }),
    ]);
    expect(r.decisions[0].grade).toBe('WARN');
  });

  it('severity 3 · occurrence≥4 → WARN / occurrence<4 → NIT (표 조건 보존)', () => {
    const warn = compressFindings([f({ label: 'w', severity: 3, occurrence: 4 })]);
    expect(warn.decisions[0].grade).toBe('WARN');
    const nit = compressFindings([f({ label: 'n', severity: 3, occurrence: 3 })]);
    expect(nit.decisions[0].grade).toBe('NIT');
  });

  it('severity≤2 · intent_risk≥3 → NIT (결함은 KEEP 불가 — KEEP 은 강점 전용)', () => {
    const r = compressFindings([f({ label: 'n', severity: 2, intentRisk: 4 })]);
    expect(r.decisions[0].grade).toBe('NIT');
  });

  it("polarity 'strength' → KEEP (§8 과교정 차단)", () => {
    const r = compressFindings([f({ label: '좋은 구조', polarity: 'strength' })]);
    expect(r.decisions[0].grade).toBe('KEEP');
    expect(r.verdict).toBe('PASS');
  });

  it('confidence<0.55 → judge=true (HOLD_JUDGE 개발자 확인)', () => {
    const r = compressFindings([f({ label: 'j', severity: 3, occurrence: 4, confidence: 0.5 })]);
    expect(r.decisions[0].judge).toBe(true);
    expect(r.judgeCount).toBe(1);
  });
});

describe('compressFindings — ③ vital-few 상한 (§3.1: blocker≤5·warn≤12·nit≤6·keep≤6·total≤29)', () => {
  it('BLOCKER 8개 입력 → 표시 5개·초과 3 droppedByCap·verdict 는 상한 전 분포(8) 기준 FAIL', () => {
    const raws = Array.from({ length: 8 }, (_, i) =>
      f({ label: `b${i}`, severity: 5, confidence: 0.9 }),
    );
    const r = compressFindings(raws);
    expect(r.counts.BLOCKER).toBe(8);
    expect(r.decisions.filter((d) => d.grade === 'BLOCKER')).toHaveLength(DECISION_CAPS.BLOCKER);
    expect(r.droppedByCap).toBe(3);
    expect(r.verdict).toBe('FAIL');
  });

  it('전 등급 과밀 → 총 표시 ≤ 29', () => {
    const raws: RawFinding[] = [
      ...Array.from({ length: 10 }, (_, i) => f({ label: `b${i}`, severity: 5, confidence: 0.9 })),
      ...Array.from({ length: 20 }, (_, i) => f({ label: `w${i}`, severity: 3, occurrence: 4 })),
      ...Array.from({ length: 10 }, (_, i) => f({ label: `n${i}`, severity: 1 })),
      ...Array.from({ length: 10 }, (_, i) => f({ label: `k${i}`, polarity: 'strength' })),
    ];
    const r = compressFindings(raws);
    expect(r.decisions.length).toBeLessThanOrEqual(TOTAL_DECISION_CAP);
    expect(r.rawCount).toBe(50);
  });

  it('등급 내 정렬 = severity → occurrence 우선 (vital-few 가 위로)', () => {
    const r = compressFindings([
      f({ label: '약한', severity: 3, occurrence: 4 }),
      f({ label: '강한', severity: 4, occurrence: 1, detection: 4, confidence: 0.7 }),
    ]);
    const warns = r.decisions.filter((d) => d.grade === 'WARN');
    expect(warns[0].label).toBe('강한');
  });
});

describe('compressFindings — ④ 1 verdict (§3.2 규칙 그대로)', () => {
  it('BLOCKER≥2 → FAIL', () => {
    const r = compressFindings([
      f({ label: 'b1', severity: 5, confidence: 0.9 }),
      f({ label: 'b2', severity: 5, confidence: 0.9 }),
    ]);
    expect(r.verdict).toBe('FAIL');
  });

  it('BLOCKER 1 → HOLD', () => {
    const r = compressFindings([f({ label: 'b1', severity: 5, confidence: 0.9 })]);
    expect(r.verdict).toBe('HOLD');
  });

  it('WARN≥5 (BLOCKER 0) → HOLD', () => {
    const raws = Array.from({ length: 5 }, (_, i) =>
      f({ label: `w${i}`, severity: 3, occurrence: 4 }),
    );
    expect(compressFindings(raws).verdict).toBe('HOLD');
  });

  it('BLOCKER 0 · WARN 4 → PASS', () => {
    const raws = Array.from({ length: 4 }, (_, i) =>
      f({ label: `w${i}`, severity: 3, occurrence: 4 }),
    );
    expect(compressFindings(raws).verdict).toBe('PASS');
  });
});

describe('compressFindings — near-miss 승격 (promoteKeys)', () => {
  it('promoteKeys 매칭 NIT → WARN 승격·promoted 플래그', () => {
    const r = compressFindings([f({ label: 'n', severity: 2, clusterKey: 'k1' })], {
      promoteKeys: ['k1'],
    });
    expect(r.decisions[0].grade).toBe('WARN');
    expect(r.decisions[0].promoted).toBe(true);
  });

  it('이미 WARN 인 결정은 등급 유지·promoted 플래그만', () => {
    const r = compressFindings(
      [f({ label: 'w', severity: 3, occurrence: 4, clusterKey: 'k1' })],
      { promoteKeys: ['k1'] },
    );
    expect(r.decisions[0].grade).toBe('WARN');
    expect(r.decisions[0].promoted).toBe(true);
  });

  it('강점(KEEP)은 승격 대상 아님', () => {
    const r = compressFindings([f({ label: 's', polarity: 'strength', clusterKey: 'k1' })], {
      promoteKeys: ['k1'],
    });
    expect(r.decisions[0].grade).toBe('KEEP');
    expect(r.decisions[0].promoted).toBe(false);
  });
});

describe('near-miss 레지스트리 — recordNearMiss / listNearMisses', () => {
  beforeEach(() => clearNearMisses());
  afterAll(() => clearNearMisses());

  it('기록 누적 — 같은 key 2회 → count 2·lastAt 갱신', () => {
    recordNearMiss('k1', '무시된 경고', 1000);
    const e = recordNearMiss('k1', '무시된 경고', 2000);
    expect(e).not.toBeNull();
    expect(e!.count).toBe(2);
    expect(e!.firstAt).toBe(1000);
    expect(e!.lastAt).toBe(2000);
    expect(listNearMisses()).toHaveLength(1);
  });

  it('임계 도달 → 승격 (보수 기본값 3 — 문서에 수치 없음)', () => {
    recordNearMiss('k1', 'w', 1);
    recordNearMiss('k1', 'w', 2);
    expect(promotedNearMissKeys()).toEqual([]);
    const e = recordNearMiss('k1', 'w', 3);
    expect(e!.count).toBe(NEAR_MISS_PROMOTE_THRESHOLD);
    expect(isNearMissPromoted(e!)).toBe(true);
    expect(promotedNearMissKeys()).toEqual(['k1']);
  });

  it('빈 key → null·기록 없음', () => {
    expect(recordNearMiss('', 'x', 1)).toBeNull();
    expect(listNearMisses()).toHaveLength(0);
  });

  it('손상 JSON → 빈 배열 (크래시 없음)', () => {
    window.localStorage.setItem(NEAR_MISS_KEY, '{broken');
    expect(listNearMisses()).toEqual([]);
  });

  it('보관 상한 초과 → 최신 lastAt 우선 유지', () => {
    for (let i = 0; i < NEAR_MISS_MAX_ENTRIES + 5; i++) {
      recordNearMiss(`k${i}`, `w${i}`, i);
    }
    const list = listNearMisses();
    expect(list.length).toBeLessThanOrEqual(NEAR_MISS_MAX_ENTRIES);
    // 가장 오래된 k0~k4 는 폐기, 최신 키는 생존
    expect(list.some((e) => e.key === `k${NEAR_MISS_MAX_ENTRIES + 4}`)).toBe(true);
    expect(list.some((e) => e.key === 'k0')).toBe(false);
  });

  it('승격 키 → compressFindings 연동 (end-to-end)', () => {
    for (let i = 0; i < NEAR_MISS_PROMOTE_THRESHOLD; i++) recordNearMiss('rev:rep', '반복어', i);
    const r = compressFindings(
      [f({ label: '반복어', severity: 2, clusterKey: 'rev:rep' })],
      { promoteKeys: promotedNearMissKeys() },
    );
    expect(r.decisions[0].grade).toBe('WARN');
    expect(r.decisions[0].promoted).toBe(true);
  });
});
