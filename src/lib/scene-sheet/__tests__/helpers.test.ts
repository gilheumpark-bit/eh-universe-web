// ============================================================
// scene-sheet/helpers — 단위 테스트.
// ============================================================

import { upsertSheet, removeSheet, findSheet, listSheetsSorted } from '../helpers';
import type { StoryConfig, EpisodeSceneSheet } from '@/lib/studio-types';

const baseSheet = (episode: number, overrides: Partial<EpisodeSceneSheet> = {}): EpisodeSceneSheet => ({
  episode,
  title: `EP ${episode}`,
  lastUpdate: episode * 1000,
  ...overrides,
});

const baseConfig = (sheets: EpisodeSceneSheet[]): StoryConfig => ({
  // StoryConfig 의 다른 필드는 테스트에 무관 — minimal stub
  synopsis: '',
  characters: [],
  episodeSceneSheets: sheets,
} as unknown as StoryConfig);

describe('upsertSheet', () => {
  it('빈 array → 단일 추가', () => {
    const config = baseConfig([]);
    const next = upsertSheet(config, baseSheet(1));
    expect(next.episodeSceneSheets).toHaveLength(1);
    expect(next.episodeSceneSheets![0].episode).toBe(1);
  });

  it('기존 episode 와 동일 → 교체', () => {
    const config = baseConfig([baseSheet(1, { title: 'old' })]);
    const next = upsertSheet(config, baseSheet(1, { title: 'new' }));
    expect(next.episodeSceneSheets).toHaveLength(1);
    expect(next.episodeSceneSheets![0].title).toBe('new');
  });

  it('새 episode → 추가 + 정렬', () => {
    const config = baseConfig([baseSheet(3), baseSheet(1)]);
    const next = upsertSheet(config, baseSheet(2));
    expect(next.episodeSceneSheets!.map((s) => s.episode)).toEqual([1, 2, 3]);
  });

  it('원본 config 미변경 (immutable)', () => {
    const config = baseConfig([baseSheet(1)]);
    const before = config.episodeSceneSheets;
    upsertSheet(config, baseSheet(2));
    expect(config.episodeSceneSheets).toBe(before); // 참조 동일
  });
});

describe('removeSheet', () => {
  it('존재 episode 제거', () => {
    const config = baseConfig([baseSheet(1), baseSheet(2), baseSheet(3)]);
    const next = removeSheet(config, 2);
    expect(next.episodeSceneSheets!.map((s) => s.episode)).toEqual([1, 3]);
  });

  it('미존재 episode → no-op', () => {
    const config = baseConfig([baseSheet(1)]);
    const next = removeSheet(config, 99);
    expect(next.episodeSceneSheets).toEqual(config.episodeSceneSheets);
  });

  it('빈 array → no-op', () => {
    const config = baseConfig([]);
    const next = removeSheet(config, 1);
    expect(next.episodeSceneSheets).toEqual([]);
  });
});

describe('findSheet', () => {
  it('존재 → sheet 반환', () => {
    const config = baseConfig([baseSheet(1, { title: 'A' }), baseSheet(2, { title: 'B' })]);
    expect(findSheet(config, 2)?.title).toBe('B');
  });

  it('미존재 → undefined', () => {
    const config = baseConfig([baseSheet(1)]);
    expect(findSheet(config, 99)).toBeUndefined();
  });

  it('episodeSceneSheets undefined → undefined', () => {
    const config = { episodeSceneSheets: undefined } as unknown as StoryConfig;
    expect(findSheet(config, 1)).toBeUndefined();
  });
});

describe('listSheetsSorted', () => {
  it('episode 순 정렬', () => {
    const config = baseConfig([baseSheet(3), baseSheet(1), baseSheet(2)]);
    expect(listSheetsSorted(config).map((s) => s.episode)).toEqual([1, 2, 3]);
  });

  it('빈 array → 빈 array', () => {
    const config = baseConfig([]);
    expect(listSheetsSorted(config)).toEqual([]);
  });
});
