// ============================================================
// PART 1 — Level-to-Text Mapping
// ============================================================

import { VisualLevelPack, VisualPromptCard } from './studio-types';

const LEVEL_LABELS = ['off', 'low', 'mid', 'high'] as const;

const SUBJECT_FOCUS = [
  '', // 0
  'subject present in scene',
  'subject clearly visible, moderate emphasis',
  'subject dominates frame, strong facial emphasis, hero lighting',
];

const BG_DENSITY = [
  'minimal background, clean negative space',
  'simple background with spatial cues',
  'detailed atmospheric background',
  'rich environmental storytelling, background as narrative element',
];

const SCENE_TENSION = [
  'calm, peaceful atmosphere',
  'subtle tension, uneasy stillness',
  'rising conflict, charged atmosphere',
  'climactic intensity, explosive energy, peak drama',
];

const EMOTION_INTENSITY = [
  'restrained, neutral expression',
  'visible but controlled emotion',
  'strong emotional display',
  'extreme emotion, raw and overwhelming',
];

const COMPOSITION_DRAMA = [
  'standard eye-level framing',
  'slight compositional interest',
  'clear cinematic framing, rule of thirds',
  'bold dramatic angle, dynamic composition, cinematic sweep',
];

const STYLE_STRENGTH = [
  'photorealistic, grounded',
  'light stylistic touch',
  'distinct artistic style',
  'strong concept art aesthetic, painterly or illustrative',
];

const SYMBOLISM_WEIGHT = [
  '',
  'subtle symbolic elements',
  'noticeable symbolic objects or motifs',
  'central symbolic imagery, metaphorical composition',
];

// IDENTITY_SEAL: PART-1 | role=level text mapping | inputs=level number | outputs=prompt fragment

// ============================================================
// PART 2 — Prompt Builder
// ============================================================

export function buildLevelPromptFragment(levels: VisualLevelPack): string {
  const parts: string[] = [];
  if (levels.subjectFocus > 0) parts.push(SUBJECT_FOCUS[levels.subjectFocus]);
  parts.push(BG_DENSITY[levels.backgroundDensity]);
  if (levels.sceneTension > 0) parts.push(SCENE_TENSION[levels.sceneTension]);
  if (levels.emotionIntensity > 0) parts.push(EMOTION_INTENSITY[levels.emotionIntensity]);
  if (levels.compositionDrama > 0) parts.push(COMPOSITION_DRAMA[levels.compositionDrama]);
  if (levels.styleStrength > 0) parts.push(STYLE_STRENGTH[levels.styleStrength]);
  if (levels.symbolismWeight > 0) parts.push(SYMBOLISM_WEIGHT[levels.symbolismWeight]);
  return parts.filter(Boolean).join('. ');
}

export function buildFinalVisualPrompt(card: VisualPromptCard): string {
  const levelFragment = buildLevelPromptFragment(card.levels);
  const sections = [
    card.subjectPrompt,
    card.backgroundPrompt,
    card.scenePrompt,
    levelFragment,
    card.compositionPrompt,
    card.lightingPrompt,
    card.stylePrompt,
  ].filter(Boolean);
  return sections.join('. ');
}

export function buildNegativePrompt(card: VisualPromptCard): string {
  return card.negativePrompt || 'blurry, low quality, watermark, text, logo, cropped, deformed';
}

export function getLevelLabel(level: number): string {
  return LEVEL_LABELS[level] ?? 'off';
}

// IDENTITY_SEAL: PART-2 | role=prompt builder | inputs=VisualPromptCard | outputs=final prompt string
