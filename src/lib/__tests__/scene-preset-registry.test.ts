// ============================================================
// PART 1 — Setup
// ============================================================
//
// Scene Preset Registry 테스트.
// 외부 fake-idb shim 재사용 (save-engine/__tests__/_fake-idb.ts).

import { installFakeIndexedDB, resetFakeIndexedDB } from '@/lib/save-engine/__tests__/_fake-idb';
installFakeIndexedDB();

import {
  buildPreset,
  savePreset,
  loadPreset,
  deletePreset,
  listPresets,
  applyPreset,
  applyPresetPartial,
  recordUsage,
  getTopUsedPresets,
  countPresetFields,
  _resetPresetDBCache,
  type ScenePreset,
} from '@/lib/scene-preset-registry';
import type { SceneDirectionData } from '@/lib/studio-types';

beforeEach(() => {
  resetFakeIndexedDB();
  _resetPresetDBCache();
});

// ============================================================
// PART 2 — buildPreset / savePreset / loadPreset 왕복
// ============================================================

describe('scene-preset-registry — CRUD round-trip', () => {
  test('buildPreset 기본 필드 채움', () => {
    const p = buildPreset({
      name: 'Romance Cliff',
      description: '로맨스 절벽 엔딩',
      sceneDirection: { writerNotes: '오해 → 화해' },
      genre: 'romance',
      tags: ['romance', 'cliffhanger'],
    });
    expect(p.id).toMatch(/^[0-9A-Z]{26}$/);
    expect(p.name).toBe('Romance Cliff');
    expect(p.usageCount).toBe(0);
    expect(p.visibility).toBe('private');
    expect(p.authorId).toBe('local');
    expect(p.createdAt).toBeGreaterThan(0);
    expect(p.updatedAt).toBe(p.createdAt);
  });

  test('빈 이름은 Untitled로 폴백', () => {
    const p = buildPreset({ name: '   ', sceneDirection: {} });
    expect(p.name).toBe('Untitled Preset');
  });

  test('태그/설명 길이 제한', () => {
    const longName = 'a'.repeat(200);
    const longTags = Array.from({ length: 20 }, (_, i) => `t${i}`.repeat(30));
    const p = buildPreset({ name: longName, tags: longTags, sceneDirection: {} });
    expect(p.name.length).toBeLessThanOrEqual(100);
    expect(p.tags?.length).toBeLessThanOrEqual(10);
    p.tags?.forEach(t => expect(t.length).toBeLessThanOrEqual(30));
  });

  test('savePreset → loadPreset 왕복', async () => {
    const p = buildPreset({
      name: 'Test Preset',
      sceneDirection: { writerNotes: 'note' },
      genre: 'thriller',
    });
    const saved = await savePreset(p);
    expect(saved).toBe(true);

    const loaded = await loadPreset(p.id);
    expect(loaded).not.toBeNull();
    expect(loaded?.name).toBe('Test Preset');
    expect(loaded?.sceneDirection.writerNotes).toBe('note');
  });

  test('savePreset invalid 거부', async () => {
    const result = await savePreset({} as ScenePreset);
    expect(result).toBe(false);
  });

  test('loadPreset 존재하지 않는 id → null', async () => {
    const loaded = await loadPreset('nonexistent');
    expect(loaded).toBeNull();
  });

  test('deletePreset 후 loadPreset null', async () => {
    const p = buildPreset({ name: 'Doomed', sceneDirection: {} });
    await savePreset(p);
    const ok = await deletePreset(p.id);
    expect(ok).toBe(true);
    const loaded = await loadPreset(p.id);
    expect(loaded).toBeNull();
  });
});

// ============================================================
// PART 3 — listPresets + filter
// ============================================================

describe('scene-preset-registry — listPresets filter', () => {
  beforeEach(async () => {
    await savePreset(buildPreset({ name: 'A', genre: 'romance', tags: ['warm'], sceneDirection: {} }));
    await savePreset(buildPreset({ name: 'B', genre: 'thriller', tags: ['cliff'], sceneDirection: {} }));
    await savePreset(buildPreset({
      name: 'C', genre: 'romance', tags: ['cliff', 'rom'],
      sceneDirection: {}, visibility: 'community',
    }));
  });

  test('전체 조회 — 3개', async () => {
    const list = await listPresets();
    expect(list.length).toBe(3);
  });

  test('genre 필터', async () => {
    const list = await listPresets({ genre: 'romance' });
    expect(list.length).toBe(2);
    expect(list.every(p => p.genre === 'romance')).toBe(true);
  });

  test('visibility 필터', async () => {
    const list = await listPresets({ visibility: 'community' });
    expect(list.length).toBe(1);
    expect(list[0].name).toBe('C');
  });

  test('searchText 필터 — name 부분일치', async () => {
    const list = await listPresets({ searchText: 'a' });
    expect(list.length).toBeGreaterThan(0);
    expect(list.some(p => p.name === 'A')).toBe(true);
  });

  test('searchText 필터 — tags 부분일치', async () => {
    const list = await listPresets({ searchText: 'cliff' });
    expect(list.length).toBe(2);
  });
});

// ============================================================
// PART 4 — applyPreset 병합
// ============================================================

describe('scene-preset-registry — applyPreset', () => {
  test('preset 우선 병합 (truthy)', () => {
    const current: SceneDirectionData = {
      writerNotes: 'old',
      goguma: [{ type: 'goguma', intensity: 'small', desc: 'old' }],
    };
    const preset = buildPreset({
      name: 'P',
      sceneDirection: {
        writerNotes: 'new',
        goguma: [{ type: 'cider', intensity: 'large', desc: 'new' }],
      },
    });
    const merged = applyPreset(preset, current);
    expect(merged.writerNotes).toBe('new');
    expect(merged.goguma?.[0].desc).toBe('new');
    expect(merged.goguma?.length).toBe(1);
  });

  test('preset에 없는 필드는 current 유지', () => {
    const current: SceneDirectionData = {
      writerNotes: 'keep',
      plotStructure: 'three-act',
    };
    const preset = buildPreset({
      name: 'P',
      sceneDirection: { writerNotes: 'new' },
    });
    const merged = applyPreset(preset, current);
    expect(merged.writerNotes).toBe('new');
    expect(merged.plotStructure).toBe('three-act'); // 유지
  });

  test('빈 배열은 명시적 교체로 간주', () => {
    const current: SceneDirectionData = {
      hooks: [{ position: 'opening', hookType: 'shock', desc: 'old' }],
    };
    const preset = buildPreset({
      name: 'P',
      sceneDirection: { hooks: [] },
    });
    const merged = applyPreset(preset, current);
    expect(merged.hooks).toEqual([]);
  });

  test('applyPresetPartial — 선택 필드만', () => {
    const current: SceneDirectionData = {
      writerNotes: 'keep',
      plotStructure: 'old-plot',
    };
    const preset = buildPreset({
      name: 'P',
      sceneDirection: {
        writerNotes: 'new-notes',
        plotStructure: 'new-plot',
      },
    });
    const merged = applyPresetPartial(preset, current, ['writerNotes']);
    expect(merged.writerNotes).toBe('new-notes');
    expect(merged.plotStructure).toBe('old-plot'); // 미선택 → 유지
  });
});

// ============================================================
// PART 5 — recordUsage / getTopUsedPresets
// ============================================================

describe('scene-preset-registry — usage tracking', () => {
  test('recordUsage → usageCount 증가', async () => {
    const p = buildPreset({ name: 'Hot', sceneDirection: {} });
    await savePreset(p);
    await recordUsage(p.id);
    await recordUsage(p.id);
    await recordUsage(p.id);
    const loaded = await loadPreset(p.id);
    expect(loaded?.usageCount).toBe(3);
  });

  test('getTopUsedPresets — usageCount desc', async () => {
    const a = buildPreset({ name: 'A', sceneDirection: {} });
    const b = buildPreset({ name: 'B', sceneDirection: {} });
    const c = buildPreset({ name: 'C', sceneDirection: {} });
    await savePreset(a);
    await savePreset(b);
    await savePreset(c);
    await recordUsage(b.id);
    await recordUsage(b.id);
    await recordUsage(c.id);

    const top = await getTopUsedPresets(3);
    expect(top.length).toBe(3);
    expect(top[0].name).toBe('B'); // 2회
    expect(top[1].name).toBe('C'); // 1회
    expect(top[2].name).toBe('A'); // 0회
  });

  test('getTopUsedPresets limit', async () => {
    const a = buildPreset({ name: 'A', sceneDirection: {} });
    const b = buildPreset({ name: 'B', sceneDirection: {} });
    await savePreset(a);
    await savePreset(b);

    const top = await getTopUsedPresets(1);
    expect(top.length).toBe(1);
  });
});

// ============================================================
// PART 6 — countPresetFields helper
// ============================================================

describe('scene-preset-registry — countPresetFields', () => {
  test('비어있는 프리셋 → 0', () => {
    const p = buildPreset({ name: 'Empty', sceneDirection: {} });
    expect(countPresetFields(p)).toBe(0);
  });

  test('writerNotes만 있는 프리셋 → 1', () => {
    const p = buildPreset({ name: 'Notes', sceneDirection: { writerNotes: 'something' } });
    expect(countPresetFields(p)).toBe(1);
  });

  test('빈 문자열은 카운트하지 않음', () => {
    const p = buildPreset({ name: 'Blank', sceneDirection: { writerNotes: '   ' } });
    expect(countPresetFields(p)).toBe(0);
  });

  test('빈 배열은 카운트하지 않음', () => {
    const p = buildPreset({ name: 'Empty Arr', sceneDirection: { hooks: [] } });
    expect(countPresetFields(p)).toBe(0);
  });

  test('여러 필드 카운트', () => {
    const p = buildPreset({
      name: 'Full',
      sceneDirection: {
        writerNotes: 'note',
        plotStructure: 'three-act',
        hooks: [{ position: 'opening', hookType: 'shock', desc: 'd' }],
      },
    });
    expect(countPresetFields(p)).toBe(3);
  });
});
