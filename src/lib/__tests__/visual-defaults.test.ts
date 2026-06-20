import { DEFAULT_LEVELS, VISUAL_PRESETS, createVisualCard, createCardFromAnalysis } from '../visual-defaults';

describe('visual-defaults', () => {
  describe('DEFAULT_LEVELS', () => {
    it('has expected keys', () => {
      expect(DEFAULT_LEVELS).toHaveProperty('subjectFocus');
      expect(DEFAULT_LEVELS).toHaveProperty('backgroundDensity');
      expect(DEFAULT_LEVELS).toHaveProperty('symbolismWeight');
    });
  });

  describe('VISUAL_PRESETS', () => {
    it('contains at least one preset', () => {
      expect(VISUAL_PRESETS.length).toBeGreaterThan(0);
    });

    it('each preset has required fields', () => {
      for (const p of VISUAL_PRESETS) {
        expect(p.id).toBeTruthy();
        expect(p.name).toBeTruthy();
        expect(p.levels).toBeDefined();
        expect(p.defaultShotType).toBeTruthy();
      }
    });
  });

  describe('createVisualCard', () => {
    it('creates a card with defaults', () => {
      const card = createVisualCard(1);
      expect(card.episode).toBe(1);
      expect(card.id).toMatch(/^vc-/);
      expect(card.shotType).toBe('key_scene');
      expect(card.targetUse).toBe('illustration');
      expect(card.selectedCharacters).toEqual([]);
      expect(card.negativePrompt).toContain('blurry');
      expect(card.levels).toEqual(DEFAULT_LEVELS);
    });

    it('applies overrides', () => {
      const card = createVisualCard(5, { title: 'Test', shotType: 'cover' });
      expect(card.title).toBe('Test');
      expect(card.shotType).toBe('cover');
      expect(card.episode).toBe(5);
    });
  });

  describe('createCardFromAnalysis', () => {
    it('creates key scene card with minimal analysis', () => {
      const cards = createCardFromAnalysis(1, {});
      expect(cards.length).toBe(1);
      expect(cards[0].title).toContain('EP1');
    });

    it('creates character focus card when characterState provided', () => {
      const cards = createCardFromAnalysis(2, {
        characterState: [{ name: 'Alice', emotion: { primary: 'happy' }, pose: 'sitting' }],
      });
      expect(cards.length).toBe(2);
      expect(cards[1].shotType).toBe('character_focus');
      expect(cards[1].title).toContain('Alice');
    });

    it('creates background card when location provided', () => {
      const cards = createCardFromAnalysis(3, {
        backgroundState: { location: 'Castle', lighting: 'dim', mood: 'dark', time: 'night' },
      });
      expect(cards.length).toBe(2);
      expect(cards[1].shotType).toBe('background_focus');
      expect(cards[1].title).toContain('Castle');
    });

    it('creates all 3 cards with full analysis', () => {
      const cards = createCardFromAnalysis(4, {
        characterState: [{ name: 'Bob', emotion: { primary: 'angry' }, pose: 'running' }],
        backgroundState: { location: 'Forest', lighting: 'sunlight', mood: ['eerie', 'calm'], time: 'dawn' },
        sceneState: { summary: 'A chase scene', turningPoint: 'caught', tension: 'high' },
        imagePromptPack: { characterFocus: 'Bob running', backgroundFocus: 'dark forest', sceneFocus: 'chase' },
      });
      expect(cards.length).toBe(3);
      // Key scene uses high tension
      expect(cards[0].levels.sceneTension).toBe(3);
    });

    it('handles medium tension', () => {
      const cards = createCardFromAnalysis(5, {
        sceneState: { tension: 'medium' },
      });
      expect(cards[0].levels.sceneTension).toBe(2);
    });

    it('handles array mood in backgroundState', () => {
      const cards = createCardFromAnalysis(6, {
        backgroundState: { location: 'Lab', mood: ['tense', 'cold'] },
      });
      expect(cards.length).toBe(2);
    });
  });
});
