// ============================================================
// Style Benchmark Archetypes — predefined profiles for comparison
// ============================================================

export interface StyleArchetype {
  id: string;
  ko: string;
  en: string;
  /** Slider values: s1~s5, each 1-5 */
  sliders: Record<string, number>;
  color: string;
  descKO: string;
  descEN: string;
}

export const STYLE_ARCHETYPES: StyleArchetype[] = [
  {
    id: 'hard-sf',
    ko: 'Hard SF',
    en: 'Hard SF',
    sliders: { s1: 2, s2: 1, s3: 1, s4: 1, s5: 2 },
    color: '#3b82f6',
    descKO: '짧은 문장, 건조한 감정, 직설적 서술, 거리감 있는 시점',
    descEN: 'Short sentences, dry emotion, factual narration, distant POV',
  },
  {
    id: 'web-novel',
    ko: '웹소설',
    en: 'Web Novel',
    sliders: { s1: 3, s2: 4, s3: 3, s4: 4, s5: 4 },
    color: '#f59e0b',
    descKO: '균형 잡힌 문장, 감정 밀도 높음, 밀착 시점, 빠른 리듬',
    descEN: 'Balanced sentences, high emotion, intimate POV, fast rhythm',
  },
  {
    id: 'literary',
    ko: '순문학',
    en: 'Literary Fiction',
    sliders: { s1: 5, s2: 3, s3: 5, s4: 3, s5: 3 },
    color: '#8b5cf6',
    descKO: '긴 문장, 감각 몰입 묘사, 사유적 여백, 중간 시점',
    descEN: 'Long sentences, sensory immersion, reflective space, moderate POV',
  },
  {
    id: 'thriller',
    ko: '스릴러',
    en: 'Thriller',
    sliders: { s1: 1, s2: 2, s3: 2, s4: 2, s5: 5 },
    color: '#ef4444',
    descKO: '극단적으로 짧은 문장, 절제된 감정, 압축된 속도감',
    descEN: 'Extremely short sentences, restrained emotion, compressed tempo',
  },
];

/**
 * Radar chart points for a slider set (s1-s5).
 * Returns array of [x, y] normalized to a pentagon of given radius.
 */
export function sliderToRadarPoints(
  sliders: Record<string, number>,
  cx: number,
  cy: number,
  radius: number
): [number, number][] {
  const keys = ['s1', 's2', 's3', 's4', 's5'];
  return keys.map((key, i) => {
    const angle = (i / keys.length) * Math.PI * 2 - Math.PI / 2;
    const val = (sliders[key] ?? 3) / 5; // normalize 1-5 to 0-1
    return [
      cx + radius * val * Math.cos(angle),
      cy + radius * val * Math.sin(angle),
    ];
  });
}

// IDENTITY_SEAL: PART-1 | role=benchmark-data | inputs=none | outputs=StyleArchetype[],sliderToRadarPoints
