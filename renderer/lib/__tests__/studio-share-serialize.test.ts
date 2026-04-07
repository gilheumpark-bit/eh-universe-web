import {
  buildShareCharacterSheet,
  buildShareEpisodeContent,
  buildShareStyleProfile,
  buildShareWorldBible,
} from '@/lib/studio-share-serialize';
import type { Message, StoryConfig } from '@/lib/studio-types';

describe('studio-share-serialize', () => {
  test('world bible includes tier-2 fields when present', () => {
    const config = {
      corePremise: 'A',
      worldHistory: 'B',
      worldSimData: { civs: [{ name: 'X', era: '1', color: '#fff', traits: ['t'] }] },
    } as unknown as StoryConfig;
    const out = buildShareWorldBible(config, true);
    expect(out).toContain('역사');
    expect(out).toContain('세계 시뮬레이터');
  });

  test('character sheet includes desire when set', () => {
    const config = {
      characters: [
        { id: '1', name: 'N', role: 'R', traits: 'T', appearance: '', dna: 1, desire: 'want' },
      ],
    } as unknown as StoryConfig;
    expect(buildShareCharacterSheet(config, true)).toContain('욕망');
  });

  test('episode appends scene direction block', () => {
    const messages: Message[] = [{ id: 'm1', role: 'assistant', content: 'Hello', timestamp: Date.now() }];
    const config = {
      sceneDirection: { plotStructure: 'three-act', writerNotes: 'note' },
    } as unknown as StoryConfig;
    const out = buildShareEpisodeContent(messages, config, false);
    expect(out).toContain('Scene direction');
    expect(out).toContain('three-act');
  });

  test('style profile lists sliders', () => {
    const config = {
      styleProfile: {
        selectedDNA: [0],
        sliders: { s1: 3 },
        checkedSF: [],
        checkedWeb: [],
      },
    } as unknown as StoryConfig;
    expect(buildShareStyleProfile(config, false)).toContain('s1: 3/5');
  });
});
