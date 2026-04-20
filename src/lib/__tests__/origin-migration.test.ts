// ============================================================
// PART 1 — Imports
// ============================================================

import {
  isTaggedField,
  unwrap,
  wrap,
  recordEdit,
  getOrigin,
  migrateToV2,
  migrateFromV2,
  calculateOriginStats,
} from '../origin-migration';
import type { SceneDirectionData, SceneDirectionDataV2 } from '../studio-types';

// ============================================================
// PART 2 — Type guards & primitives
// ============================================================

describe('isTaggedField', () => {
  it('returns true for valid TaggedValue shape', () => {
    expect(isTaggedField({ value: 'hello', meta: { origin: 'USER', createdAt: 1 } })).toBe(true);
  });

  it('returns false for plain string', () => {
    expect(isTaggedField('hello')).toBe(false);
  });

  it('returns false for plain object missing meta', () => {
    expect(isTaggedField({ value: 'hello' })).toBe(false);
  });

  it('returns false for null/undefined/array', () => {
    expect(isTaggedField(null)).toBe(false);
    expect(isTaggedField(undefined)).toBe(false);
    expect(isTaggedField([])).toBe(false);
  });

  it('rejects invalid origin enum', () => {
    expect(isTaggedField({ value: 1, meta: { origin: 'BOGUS', createdAt: 0 } })).toBe(false);
  });

  it('rejects non-numeric createdAt', () => {
    expect(isTaggedField({ value: 1, meta: { origin: 'USER', createdAt: 'now' } })).toBe(false);
  });
});

describe('unwrap', () => {
  it('returns value for TaggedValue', () => {
    expect(unwrap({ value: 'x', meta: { origin: 'USER', createdAt: 0 } })).toBe('x');
  });

  it('returns input as-is for plain value', () => {
    expect(unwrap('plain')).toBe('plain');
    expect(unwrap(42)).toBe(42);
    expect(unwrap(null as never)).toBe(null);
  });
});

describe('wrap', () => {
  it('wraps plain value with origin', () => {
    const w = wrap('hello', 'TEMPLATE');
    expect(w.value).toBe('hello');
    expect(w.meta.origin).toBe('TEMPLATE');
    expect(typeof w.meta.createdAt).toBe('number');
  });

  it('preserves sourceReferenceId', () => {
    const w = wrap('hi', 'TEMPLATE', 'preset-thriller');
    expect(w.meta.sourceReferenceId).toBe('preset-thriller');
  });

  it('returns same object if already wrapped with same origin', () => {
    const orig = wrap('hi', 'USER');
    const again = wrap(orig, 'USER');
    expect(again).toBe(orig); // referential equality
  });

  it('updates origin if different', () => {
    const orig = wrap('hi', 'TEMPLATE');
    const promoted = wrap(orig, 'USER');
    expect(promoted.meta.origin).toBe('USER');
    expect(promoted.value).toBe('hi');
  });
});

describe('recordEdit', () => {
  it('appends edit event and updates origin', () => {
    const initial = wrap('hi', 'ENGINE_DRAFT');
    const edited = recordEdit(initial, 'USER');
    expect(edited.meta.origin).toBe('USER');
    expect(edited.meta.editedBy).toHaveLength(1);
    expect(edited.meta.editedBy?.[0].origin).toBe('USER');
  });

  it('limits history to 20 entries (FIFO)', () => {
    let f = wrap('x', 'USER');
    for (let i = 0; i < 25; i++) f = recordEdit(f, 'USER');
    expect(f.meta.editedBy).toHaveLength(20);
  });

  it('handles plain (unwrapped) input gracefully', () => {
    const edited = recordEdit('plain' as never, 'USER');
    expect(edited.value).toBe('plain');
    expect(edited.meta.editedBy).toHaveLength(1);
  });
});

describe('getOrigin', () => {
  it('returns USER fallback for unwrapped value', () => {
    expect(getOrigin('plain').origin).toBe('USER');
  });

  it('returns wrapped meta', () => {
    const f = wrap('hi', 'TEMPLATE');
    expect(getOrigin(f).origin).toBe('TEMPLATE');
  });
});

// ============================================================
// PART 3 — V1 → V2 forward migration (14 fields)
// ============================================================

describe('migrateToV2', () => {
  it('returns empty V2 for null/undefined input', () => {
    expect(migrateToV2(null)).toEqual({ _originVersion: 2 });
    expect(migrateToV2(undefined)).toEqual({ _originVersion: 2 });
  });

  it('marks output with _originVersion: 2', () => {
    const v1: SceneDirectionData = { writerNotes: 'hello' };
    const v2 = migrateToV2(v1);
    expect(v2._originVersion).toBe(2);
  });

  it('returns same object if already V2', () => {
    const v2: SceneDirectionDataV2 = { _originVersion: 2 };
    const result = migrateToV2(v2);
    expect(result).toBe(v2);
  });

  it('wraps array fields with USER origin', () => {
    const v1: SceneDirectionData = {
      goguma: [{ type: 'goguma', intensity: 'medium', desc: 'test' }],
      hooks: [{ position: 'opening', hookType: 'shock', desc: 'wow' }],
    };
    const v2 = migrateToV2(v1);
    expect(Array.isArray(v2.goguma)).toBe(true);
    expect(isTaggedField(v2.goguma![0])).toBe(true);
    expect(getOrigin(v2.goguma![0]).origin).toBe('USER');
    expect(unwrap(v2.goguma![0])).toEqual({ type: 'goguma', intensity: 'medium', desc: 'test' });
  });

  it('wraps single fields (cliffhanger, plotStructure, writerNotes)', () => {
    const v1: SceneDirectionData = {
      cliffhanger: { cliffType: 'shock', desc: '!' },
      plotStructure: 'hero-journey',
      writerNotes: 'note',
    };
    const v2 = migrateToV2(v1);
    expect(unwrap(v2.cliffhanger!)).toEqual({ cliffType: 'shock', desc: '!' });
    expect(unwrap(v2.plotStructure!)).toBe('hero-journey');
    expect(unwrap(v2.writerNotes!)).toBe('note');
  });

  it('honors custom defaultOrigin', () => {
    const v1: SceneDirectionData = { writerNotes: 'preset note' };
    const v2 = migrateToV2(v1, 'TEMPLATE');
    expect(getOrigin(v2.writerNotes!).origin).toBe('TEMPLATE');
  });

  it('skips empty/missing fields cleanly', () => {
    const v1: SceneDirectionData = { writerNotes: '' };
    const v2 = migrateToV2(v1);
    expect(v2.writerNotes).toBeUndefined();
  });

  it('handles all 13 array fields', () => {
    const v1: SceneDirectionData = {
      goguma: [{ type: 'goguma', intensity: 'low', desc: 'x' }],
      hooks: [{ position: 'mid', hookType: 't', desc: 'd' }],
      emotionTargets: [{ emotion: 'joy', intensity: 50 }],
      dialogueTones: [{ character: 'A', tone: 'cold', notes: '' }],
      dopamineDevices: [{ scale: 'small', device: 'flag', desc: '' }],
      foreshadows: [{ planted: 'a', payoff: 'b', episode: 1, resolved: false }],
      pacings: [{ section: 'open', percent: 20, desc: 'fast' }],
      tensionCurve: [{ position: 0, level: 50, label: 'start' }],
      canonRules: [{ character: 'A', rule: 'always cold' }],
      sceneTransitions: [{ fromScene: '1', toScene: '2', method: 'cut' }],
      activeCharacters: ['A', 'B'],
      activeItems: ['item-1'],
      activeSkills: ['skill-1'],
    };
    const v2 = migrateToV2(v1);
    const arrayKeys: Array<keyof SceneDirectionDataV2> = [
      'goguma', 'hooks', 'emotionTargets', 'dialogueTones', 'dopamineDevices',
      'foreshadows', 'pacings', 'tensionCurve', 'canonRules', 'sceneTransitions',
      'activeCharacters', 'activeItems', 'activeSkills',
    ];
    for (const k of arrayKeys) {
      const val = (v2 as Record<string, unknown>)[k as string];
      expect(Array.isArray(val)).toBe(true);
      expect(isTaggedField((val as unknown[])[0])).toBe(true);
    }
  });
});

// ============================================================
// PART 4 — V2 → V1 reverse migration (lossless on values)
// ============================================================

describe('migrateFromV2', () => {
  it('returns {} for null/undefined', () => {
    expect(migrateFromV2(null)).toEqual({});
    expect(migrateFromV2(undefined)).toEqual({});
  });

  it('returns input as-is if not V2', () => {
    const v1: SceneDirectionData = { writerNotes: 'plain' };
    expect(migrateFromV2(v1)).toBe(v1);
  });

  it('round-trips V1 → V2 → V1 with value preservation', () => {
    const v1: SceneDirectionData = {
      goguma: [{ type: 'goguma', intensity: 'high', desc: 'twist' }],
      cliffhanger: { cliffType: 'info-before', desc: '!' },
      plotStructure: 'three-act',
      writerNotes: 'remember the plot',
      activeCharacters: ['hero'],
    };
    const v2 = migrateToV2(v1);
    const back = migrateFromV2(v2);
    expect(back.goguma).toEqual(v1.goguma);
    expect(back.cliffhanger).toEqual(v1.cliffhanger);
    expect(back.plotStructure).toBe('three-act');
    expect(back.writerNotes).toBe('remember the plot');
    expect(back.activeCharacters).toEqual(['hero']);
    // _originVersion 안 새는지
    expect((back as Record<string, unknown>)._originVersion).toBeUndefined();
  });

  it('discards metadata gracefully', () => {
    const v2 = migrateToV2({ writerNotes: 'x' } as SceneDirectionData);
    const back = migrateFromV2(v2);
    expect(back.writerNotes).toBe('x');
  });
});

// ============================================================
// PART 5 — Stress test (1000 round-trips, 0 data loss)
// ============================================================

describe('migration stress test', () => {
  const sample: SceneDirectionData = {
    goguma: [
      { type: 'goguma', intensity: 'medium', desc: 'plot beat' },
      { type: 'cider', intensity: 'high', desc: 'release' },
    ],
    hooks: [{ position: 'opening', hookType: 'shock', desc: 'lead' }],
    foreshadows: [
      { planted: 'a', payoff: 'b', episode: 1, resolved: false },
      { planted: 'c', payoff: 'd', episode: 5, resolved: true },
    ],
    cliffhanger: { cliffType: 'shock', desc: 'final line' },
    plotStructure: 'kishōtenketsu',
    writerNotes: '여러 줄 메모.\n두 번째 줄.',
    activeCharacters: ['A', 'B', 'C'],
    activeItems: ['item-1', 'item-2'],
  };

  it('1000× V1 → V2 → V1 conversions preserve data', () => {
    let cur: SceneDirectionData = sample;
    for (let i = 0; i < 1000; i++) {
      const v2 = migrateToV2(cur);
      cur = migrateFromV2(v2);
    }
    expect(cur).toEqual(sample);
  });

  it('1000× V2 → V1 → V2 conversions preserve data shape', () => {
    let cur: SceneDirectionDataV2 = migrateToV2(sample);
    for (let i = 0; i < 1000; i++) {
      const v1 = migrateFromV2(cur);
      cur = migrateToV2(v1);
    }
    // 값 보존 (메타는 USER로 리셋되지만 OK)
    expect(unwrap(cur.cliffhanger!)).toEqual(sample.cliffhanger);
    expect(unwrap(cur.writerNotes!)).toBe(sample.writerNotes);
    expect(cur.goguma?.length).toBe(2);
  });
});

// ============================================================
// PART 6 — Origin statistics
// ============================================================

describe('calculateOriginStats', () => {
  it('returns all-zero for empty data', () => {
    const stats = calculateOriginStats(null);
    expect(stats.totalEntries).toBe(0);
    expect(stats.userPct).toBe(0);
  });

  it('counts V1 (unwrapped) data as 100% USER', () => {
    const v1: SceneDirectionData = {
      writerNotes: 'a',
      goguma: [
        { type: 'goguma', intensity: 'low', desc: 'x' },
        { type: 'goguma', intensity: 'high', desc: 'y' },
      ],
    };
    const stats = calculateOriginStats(v1);
    expect(stats.totalEntries).toBe(3);
    expect(stats.userPct).toBe(100);
    expect(stats.templatePct).toBe(0);
  });

  it('mixes USER + TEMPLATE + ENGINE_SUGGEST + ENGINE_DRAFT', () => {
    const v2: SceneDirectionDataV2 = {
      _originVersion: 2,
      writerNotes: wrap('user note', 'USER'),
      plotStructure: wrap('three-act', 'TEMPLATE'),
      cliffhanger: wrap({ cliffType: 'shock', desc: 'drafted' }, 'ENGINE_DRAFT'),
      goguma: [
        wrap({ type: 'goguma', intensity: 'low', desc: 'a' }, 'USER'),
        wrap({ type: 'goguma', intensity: 'mid', desc: 'b' }, 'ENGINE_SUGGEST'),
      ],
    };
    const stats = calculateOriginStats(v2);
    expect(stats.totalEntries).toBe(5);
    expect(stats.userCount).toBe(2);
    expect(stats.templateCount).toBe(1);
    expect(stats.engineSuggestCount).toBe(1);
    expect(stats.engineDraftCount).toBe(1);
    expect(stats.userPct).toBe(40);
    expect(stats.templatePct).toBe(20);
  });

  it('skips empty arrays / empty strings', () => {
    const v1: SceneDirectionData = { writerNotes: '', goguma: [] };
    const stats = calculateOriginStats(v1);
    expect(stats.totalEntries).toBe(0);
  });
});
