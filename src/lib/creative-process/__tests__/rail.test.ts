// ============================================================
// rail.test — classifyRail / partitionEventsByRail (Phase 1 토대)
// ============================================================
//
// dual-rail 분류의 단일 진실 원천을 회귀로 박는다:
//   - 9 stage × actorType 전수 매트릭스
//   - translate 의 인간/AI 분기 (2차적저작물 vs 기계번역 — cross-conflict §1)
//   - stage 없음(legacy) → unclassified (어느 레일도 오염 X)
// ============================================================

import { classifyRail, partitionEventsByRail, type CreativeRail } from '../rail';
import type { CreativeActorType, CreativeStage } from '../types';

function ev(stage: CreativeStage | undefined, actorType: CreativeActorType = 'human') {
  return { stage, actorType };
}

describe('classifyRail — stage → rail', () => {
  const IP: CreativeStage[] = ['world', 'character', 'plot', 'scene-sheet', 'direction'];
  const AUTHORSHIP: CreativeStage[] = ['writing', 'revision'];

  test.each(IP)('IP 레일: %s → ip (actorType 무관)', (stage) => {
    expect(classifyRail(ev(stage, 'human'))).toBe('ip');
    expect(classifyRail(ev(stage, 'ai'))).toBe('ip');
    expect(classifyRail(ev(stage, 'system'))).toBe('ip');
    expect(classifyRail(ev(stage, 'collaborator'))).toBe('ip');
  });

  test.each(AUTHORSHIP)('저작 레일: %s → authorship (actorType 무관)', (stage) => {
    expect(classifyRail(ev(stage, 'human'))).toBe('authorship');
    expect(classifyRail(ev(stage, 'ai'))).toBe('authorship');
  });

  test('publish → unclassified (창작 자산 아님)', () => {
    expect(classifyRail(ev('publish', 'human'))).toBe('unclassified');
    expect(classifyRail(ev('publish', 'system'))).toBe('unclassified');
  });

  test('stage 없음(legacy 이벤트) → unclassified', () => {
    expect(classifyRail(ev(undefined, 'human'))).toBe('unclassified');
    expect(classifyRail(ev(undefined, 'ai'))).toBe('unclassified');
  });
});

describe('classifyRail — translate 2차적저작물 분기 (§1)', () => {
  test('인간 번역가 → authorship (2차적저작물, 저작권 성립)', () => {
    expect(classifyRail(ev('translate', 'human'))).toBe('authorship');
  });
  test('외부 협업 번역가(collaborator) → authorship', () => {
    expect(classifyRail(ev('translate', 'collaborator'))).toBe('authorship');
  });
  test('AI 기계번역 → ip (저작 아님 — 저작레일 over-claim 차단)', () => {
    expect(classifyRail(ev('translate', 'ai'))).toBe('ip');
  });
  test('시스템 번역 → ip', () => {
    expect(classifyRail(ev('translate', 'system'))).toBe('ip');
  });
});

describe('partitionEventsByRail', () => {
  test('레일별로 정확히 분할하고 누락·중복이 없다', () => {
    const events = [
      ev('world', 'ai'), // ip
      ev('character', 'human'), // ip
      ev('writing', 'human'), // authorship
      ev('revision', 'ai'), // authorship
      ev('translate', 'human'), // authorship
      ev('translate', 'ai'), // ip
      ev('publish', 'system'), // unclassified
      ev(undefined, 'human'), // unclassified
    ];
    const parts = partitionEventsByRail(events);

    expect(parts.ip).toHaveLength(3); // world, character, translate(ai)
    expect(parts.authorship).toHaveLength(3); // writing, revision, translate(human)
    expect(parts.unclassified).toHaveLength(2); // publish, no-stage

    const total = (['ip', 'authorship', 'unclassified'] as CreativeRail[]).reduce(
      (sum, rail) => sum + parts[rail].length,
      0,
    );
    expect(total).toBe(events.length); // 누락·중복 없음
  });

  test('빈 배열 → 빈 레일 3개', () => {
    const parts = partitionEventsByRail([]);
    expect(parts.ip).toEqual([]);
    expect(parts.authorship).toEqual([]);
    expect(parts.unclassified).toEqual([]);
  });
});
