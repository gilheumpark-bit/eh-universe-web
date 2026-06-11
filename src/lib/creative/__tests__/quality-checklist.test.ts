// ============================================================
// quality-checklist 단위 테스트
// 정상 / 빈입력 / 0분모 / null / 경계 / 미지 도메인 커버
// ============================================================

import {
  CHECKLISTS,
  getChecklist,
  evaluateChecklist,
  checklistCompleteness,
  type Domain,
} from '../quality-checklist';

const DOMAINS: Domain[] = ['world', 'character', 'scene', 'direction', 'writing'];

describe('CHECKLISTS 매핑', () => {
  it('5개 도메인 전부 존재 + 각 항목은 id/label/required 구조', () => {
    expect(Object.keys(CHECKLISTS).sort()).toEqual([...DOMAINS].sort());
    for (const d of DOMAINS) {
      const list = CHECKLISTS[d];
      expect(list.length).toBeGreaterThan(0);
      for (const item of list) {
        expect(typeof item.id).toBe('string');
        expect(item.id.length).toBeGreaterThan(0);
        expect(typeof item.label).toBe('string');
        expect(typeof item.required).toBe('boolean');
      }
    }
  });

  it('도메인 내 id 중복 없음 + 필수 항목 최소 1개', () => {
    for (const d of DOMAINS) {
      const ids = CHECKLISTS[d].map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(CHECKLISTS[d].some((i) => i.required)).toBe(true);
    }
  });
});

describe('getChecklist', () => {
  it('정상: 도메인 항목 반환', () => {
    expect(getChecklist('world').length).toBe(CHECKLISTS.world.length);
    expect(getChecklist('character')[0]).toHaveProperty('id');
  });

  it('알 수 없는 도메인 → 빈 배열', () => {
    // @ts-expect-error 의도적 미지 도메인 주입
    expect(getChecklist('unknown')).toEqual([]);
    // @ts-expect-error null 주입 방어
    expect(getChecklist(null)).toEqual([]);
  });

  it('반환 배열 변형이 원본 CHECKLISTS 에 영향 없음(복사본)', () => {
    const list = getChecklist('scene');
    list[0].label = 'MUTATED';
    list.push({ id: 'x', label: 'y', required: false });
    expect(CHECKLISTS.scene[0].label).not.toBe('MUTATED');
    expect(getChecklist('scene').length).toBe(CHECKLISTS.scene.length);
  });
});

describe('evaluateChecklist', () => {
  it('정상: 일부 충족 → passed/total/missing 정확', () => {
    // world 필수: world-premise, world-rules, world-tone (3개)
    const res = evaluateChecklist('world', ['world-premise', 'world-geography']);
    expect(res.total).toBe(CHECKLISTS.world.length);
    expect(res.passed).toBe(2);
    // 충족 안 된 필수만 missing → rules, tone
    expect(res.missing.sort()).toEqual(['world-rules', 'world-tone']);
  });

  it('전부 충족 → missing 빈 배열 + passed=total', () => {
    const allIds = CHECKLISTS.character.map((i) => i.id);
    const res = evaluateChecklist('character', allIds);
    expect(res.passed).toBe(CHECKLISTS.character.length);
    expect(res.total).toBe(CHECKLISTS.character.length);
    expect(res.missing).toEqual([]);
  });

  it('빈 입력 → passed 0, missing 은 필수 전체', () => {
    const res = evaluateChecklist('scene', []);
    expect(res.passed).toBe(0);
    const requiredIds = CHECKLISTS.scene.filter((i) => i.required).map((i) => i.id);
    expect(res.missing.sort()).toEqual(requiredIds.sort());
  });

  it('중복 id / 미지 id / 비문자열 섞여도 안전', () => {
    const res = evaluateChecklist('direction', [
      'dir-camera',
      'dir-camera', // 중복
      'ghost-id', // 존재하지 않는 id
      // @ts-expect-error 비문자열 잡음
      42,
      // @ts-expect-error null 잡음
      null,
    ]);
    expect(res.passed).toBe(1); // dir-camera 1회만 카운트, ghost/비문자열 무시
    expect(res.missing).not.toContain('dir-camera');
  });

  it('present 가 null/배열 아님 → 빈 입력으로 처리', () => {
    // @ts-expect-error null 주입 방어
    const r1 = evaluateChecklist('writing', null);
    expect(r1.passed).toBe(0);
    expect(r1.total).toBe(CHECKLISTS.writing.length);
    // @ts-expect-error 비배열 주입 방어
    const r2 = evaluateChecklist('writing', 'write-pov');
    expect(r2.passed).toBe(0);
  });

  it('알 수 없는 도메인 → 0/0/[]', () => {
    // @ts-expect-error 미지 도메인
    expect(evaluateChecklist('nope', ['anything'])).toEqual({
      passed: 0,
      total: 0,
      missing: [],
    });
  });
});

describe('checklistCompleteness', () => {
  it('정상: 비율 반올림 정수(0~100)', () => {
    // direction 4항목 중 1개 충족 → 25
    expect(checklistCompleteness('direction', ['dir-camera'])).toBe(25);
    // world 5항목 전부 → 100
    expect(checklistCompleteness('world', CHECKLISTS.world.map((i) => i.id))).toBe(100);
  });

  it('빈 입력 → 0', () => {
    expect(checklistCompleteness('character', [])).toBe(0);
  });

  it('0분모 방어: 미지 도메인 → 0 (NaN/Infinity 아님)', () => {
    // @ts-expect-error 미지 도메인
    const v = checklistCompleteness('void', ['x']);
    expect(v).toBe(0);
    expect(Number.isFinite(v)).toBe(true);
  });

  it('미지 id 만 채워도 0', () => {
    expect(checklistCompleteness('scene', ['nonexistent-1', 'nonexistent-2'])).toBe(0);
  });
});
