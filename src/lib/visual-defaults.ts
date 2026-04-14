// ============================================================
// PART 1 — Default Values & Presets
// ============================================================

import {
  VisualLevelPack,
  VisualPromptCard,
  
  VisualPreset,
} from './studio-types';

export const DEFAULT_LEVELS: VisualLevelPack = {
  subjectFocus: 2,
  backgroundDensity: 1,
  sceneTension: 1,
  emotionIntensity: 1,
  compositionDrama: 1,
  styleStrength: 1,
  symbolismWeight: 0,
};

export const VISUAL_PRESETS: VisualPreset[] = [
  {
    id: 'webnovel-thumb',
    name: '웹소설 썸네일',
    levels: { subjectFocus: 3, backgroundDensity: 0, sceneTension: 2, emotionIntensity: 3, compositionDrama: 2, styleStrength: 1, symbolismWeight: 0 },
    defaultShotType: 'character_focus',
    defaultTargetUse: 'thumbnail',
  },
  {
    id: 'hardsf-illust',
    name: '하드SF 삽화',
    levels: { subjectFocus: 1, backgroundDensity: 3, sceneTension: 1, emotionIntensity: 1, compositionDrama: 1, styleStrength: 1, symbolismWeight: 1 },
    defaultShotType: 'background_focus',
    defaultTargetUse: 'illustration',
  },
  {
    id: 'cover-art',
    name: '표지 일러스트',
    levels: { subjectFocus: 2, backgroundDensity: 2, sceneTension: 2, emotionIntensity: 2, compositionDrama: 3, styleStrength: 3, symbolismWeight: 2 },
    defaultShotType: 'key_scene',
    defaultTargetUse: 'cover',
  },
  {
    id: 'concept-art',
    name: '컨셉 아트',
    levels: { subjectFocus: 1, backgroundDensity: 3, sceneTension: 1, emotionIntensity: 0, compositionDrama: 2, styleStrength: 3, symbolismWeight: 2 },
    defaultShotType: 'background_focus',
    defaultTargetUse: 'concept_art',
  },
  {
    id: 'character-sheet',
    name: '캐릭터 시트',
    levels: { subjectFocus: 3, backgroundDensity: 0, sceneTension: 0, emotionIntensity: 1, compositionDrama: 0, styleStrength: 1, symbolismWeight: 0 },
    defaultShotType: 'character_focus',
    defaultTargetUse: 'character_sheet',
  },
];

// IDENTITY_SEAL: PART-1 | role=presets and defaults | inputs=none | outputs=DEFAULT_LEVELS, VISUAL_PRESETS

// ============================================================
// PART 2 — Card Factory
// ============================================================

export function createVisualCard(
  episode: number,
  overrides?: Partial<VisualPromptCard>,
): VisualPromptCard {
  return {
    id: `vc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    episode,
    title: '',
    shotType: 'key_scene',
    targetUse: 'illustration',
    selectedCharacters: [],
    selectedObjects: [],
    subjectPrompt: '',
    backgroundPrompt: '',
    scenePrompt: '',
    compositionPrompt: '',
    lightingPrompt: '',
    stylePrompt: '',
    negativePrompt: 'blurry, low quality, watermark, text, logo, cropped, deformed',
    moodTags: [],
    consistencyTags: [],
    levels: { ...DEFAULT_LEVELS },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

export function createCardFromAnalysis(
  episode: number,
  analysis: {
    characterState?: Array<{ name?: string; emotion?: { primary?: string }; pose?: string }>;
    backgroundState?: { location?: string; lighting?: string; mood?: string | string[]; time?: string };
    sceneState?: { summary?: string; turningPoint?: string; tension?: string };
    imagePromptPack?: { characterFocus?: string; backgroundFocus?: string; sceneFocus?: string };
  },
): VisualPromptCard[] {
  const cards: VisualPromptCard[] = [];
  const cs = analysis.characterState;
  const bs = analysis.backgroundState;
  const ss = analysis.sceneState;
  const ip = analysis.imagePromptPack;
  const moodStr = Array.isArray(bs?.mood) ? bs.mood.join(', ') : (bs?.mood || '');

  // Card 1: Key scene
  cards.push(createVisualCard(episode, {
    title: `EP${episode} 대표 장면`,
    shotType: 'key_scene',
    subjectPrompt: ip?.characterFocus || (cs?.[0] ? `${cs[0].name}, ${cs[0].emotion?.primary || ''} expression, ${cs[0].pose || 'standing'}` : ''),
    backgroundPrompt: ip?.backgroundFocus || (bs ? `${bs.location || ''}, ${bs.lighting || ''}, ${bs.time || ''}` : ''),
    scenePrompt: ip?.sceneFocus || ss?.summary || '',
    levels: {
      subjectFocus: 2, backgroundDensity: 2,
      sceneTension: ss?.tension === 'high' ? 3 : ss?.tension === 'medium' ? 2 : 1,
      emotionIntensity: 2, compositionDrama: 2, styleStrength: 1, symbolismWeight: 1,
    },
  }));

  // Card 2: Character focus
  if (cs && cs.length > 0) {
    cards.push(createVisualCard(episode, {
      title: `EP${episode} ${cs[0].name || '인물'}`,
      shotType: 'character_focus',
      subjectPrompt: ip?.characterFocus || `${cs[0].name || ''}, ${cs[0].emotion?.primary || ''}, ${cs[0].pose || ''}`,
      backgroundPrompt: 'simple background',
      levels: {
        subjectFocus: 3, backgroundDensity: 0,
        sceneTension: 1, emotionIntensity: 2,
        compositionDrama: 1, styleStrength: 1, symbolismWeight: 0,
      },
    }));
  }

  // Card 3: Background
  if (bs?.location) {
    cards.push(createVisualCard(episode, {
      title: `EP${episode} ${bs.location}`,
      shotType: 'background_focus',
      backgroundPrompt: ip?.backgroundFocus || `${bs.location}, ${moodStr}, ${bs.lighting || ''}`,
      levels: {
        subjectFocus: 0, backgroundDensity: 3,
        sceneTension: 1, emotionIntensity: 0,
        compositionDrama: 1, styleStrength: 1, symbolismWeight: 1,
      },
    }));
  }

  return cards;
}

// IDENTITY_SEAL: PART-2 | role=card factory | inputs=episode,analysis | outputs=VisualPromptCard[]
