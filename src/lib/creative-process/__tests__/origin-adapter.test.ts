// ============================================================
// origin-adapter.test.ts — 단방향 매핑 6 케이스
// ============================================================

import { mapEntryOriginToCreativeOrigin, ENTRY_ORIGIN_CASES } from '../origin-adapter';

describe('origin-adapter — mapEntryOriginToCreativeOrigin', () => {
  it('USER + hasPriorContent: false → HUMAN_DRAFT', () => {
    expect(mapEntryOriginToCreativeOrigin('USER')).toBe('HUMAN_DRAFT');
    expect(mapEntryOriginToCreativeOrigin('USER', { hasPriorContent: false })).toBe('HUMAN_DRAFT');
  });

  it('USER + hasPriorContent: true → HUMAN_REVISION', () => {
    expect(mapEntryOriginToCreativeOrigin('USER', { hasPriorContent: true })).toBe('HUMAN_REVISION');
  });

  it('TEMPLATE → TEMPLATE_SEED', () => {
    expect(mapEntryOriginToCreativeOrigin('TEMPLATE')).toBe('TEMPLATE_SEED');
  });

  it('ENGINE_SUGGEST → AI_SUGGESTION', () => {
    expect(mapEntryOriginToCreativeOrigin('ENGINE_SUGGEST')).toBe('AI_SUGGESTION');
  });

  it('ENGINE_DRAFT + isRewriteOnHumanText: false → AI_DRAFT', () => {
    expect(mapEntryOriginToCreativeOrigin('ENGINE_DRAFT')).toBe('AI_DRAFT');
    expect(mapEntryOriginToCreativeOrigin('ENGINE_DRAFT', { isRewriteOnHumanText: false })).toBe('AI_DRAFT');
  });

  it('ENGINE_DRAFT + isRewriteOnHumanText: true → AI_REWRITE', () => {
    expect(mapEntryOriginToCreativeOrigin('ENGINE_DRAFT', { isRewriteOnHumanText: true })).toBe('AI_REWRITE');
  });

  it('ENTRY_ORIGIN_CASES — 모든 4 케이스가 매핑됨 (no throw)', () => {
    for (const origin of ENTRY_ORIGIN_CASES) {
      const result = mapEntryOriginToCreativeOrigin(origin);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    }
  });
});
