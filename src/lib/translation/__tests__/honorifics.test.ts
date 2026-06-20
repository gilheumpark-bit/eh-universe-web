// ============================================================
// honorifics — 한국식 호칭 매트릭스 검증.
// ============================================================

import { suggestHonorific, buildHonorificHint, type CharacterRelation } from '../honorifics';

describe('suggestHonorific', () => {
  const baseRel = (override: Partial<CharacterRelation> = {}): CharacterRelation => ({
    speaker: { name: '철수', gender: 'male' },
    listener: { name: '영희', gender: 'female' },
    distance: 'medium',
    age: 'same',
    hierarchy: 'peer',
    ...override,
  });

  it('female → older male family/romantic = 오빠', () => {
    const top = suggestHonorific(baseRel({
      speaker: { name: '영희', gender: 'female' },
      listener: { name: '철수', gender: 'male' },
      hierarchy: 'romantic',
      age: 'older',
    }))[0];
    expect(top.honorific).toBe('오빠');
    expect(top.confidence).toBeGreaterThan(0.9);
  });

  it('male → older male family = 형', () => {
    const top = suggestHonorific(baseRel({
      hierarchy: 'family',
      age: 'older',
      listener: { name: '민수', gender: 'male' },
    }))[0];
    expect(top.honorific).toBe('형');
  });

  it('male → older female family = 누나', () => {
    const top = suggestHonorific(baseRel({
      hierarchy: 'family',
      age: 'older',
      listener: { name: '지영', gender: 'female' },
    }))[0];
    expect(top.honorific).toBe('누나');
  });

  it('female → older female family = 언니', () => {
    const top = suggestHonorific(baseRel({
      speaker: { name: '미영', gender: 'female' },
      listener: { name: '수진', gender: 'female' },
      hierarchy: 'family',
      age: 'older',
    }))[0];
    expect(top.honorific).toBe('언니');
  });

  it('peer + close → 이름만 (반말)', () => {
    const top = suggestHonorific(baseRel({
      hierarchy: 'peer',
      distance: 'close',
    }))[0];
    expect(top.honorific).toBe('영희');
    expect(top.speechLevel).toBe('casual');
  });

  it('stranger → 이름 씨', () => {
    const top = suggestHonorific(baseRel({
      hierarchy: 'stranger',
      distance: 'distant',
    }))[0];
    expect(top.honorific).toBe('영희 씨');
    expect(top.speechLevel).toBe('polite');
  });

  it('unknown → 이름만 fallback', () => {
    const top = suggestHonorific(baseRel({
      hierarchy: undefined,
      distance: 'unknown',
      age: 'unknown',
    }))[0];
    expect(top.honorific).toBeTruthy();
    expect(top.confidence).toBeLessThanOrEqual(0.5);
  });
});

describe('buildHonorificHint', () => {
  it('빈 list → 빈 string', () => {
    expect(buildHonorificHint([])).toBe('');
  });
  it('list 있음 → Honorific Hints 헤더 포함', () => {
    const hint = buildHonorificHint([
      {
        speaker: { name: '철수', gender: 'male' },
        listener: { name: '민수', gender: 'male' },
        distance: 'close',
        age: 'older',
        hierarchy: 'family',
      },
    ]);
    expect(hint).toContain('Honorific Hints');
    expect(hint).toContain('형');
  });
});
