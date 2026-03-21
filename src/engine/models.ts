import { GENRE_TENSION_PARAMS, ActInfo, getActFromEpisode } from './types';

/**
 * 5-act structure tension curve with genre-specific parameters.
 * Ported from ANS 9.3 MathematicalModels.tension_curve
 */
export function tensionCurve(
  episode: number,
  totalEpisodes: number = 25,
  genre: string = 'SF'
): number {
  const x = episode / totalEpisodes;
  const params = GENRE_TENSION_PARAMS[genre.toUpperCase()] ?? GENRE_TENSION_PARAMS.SF;

  let tension = params.base + params.accel * (x ** 2);

  // Sinusoidal modulation (2.5 cycles across story)
  const omega = 2 * Math.PI * 2.5;
  tension += params.amp * Math.sin(omega * x - Math.PI / 2);

  // Climax acceleration after 80%
  if (x > 0.80) {
    tension += 0.30 * ((x - 0.80) / 0.20) ** 2;
  }

  // Midpoint boost at 40-60%
  if (x > 0.40 && x < 0.60) {
    tension += 0.10 * Math.sin(((x - 0.40) * Math.PI) / 0.20);
  }

  return Math.min(1.0, Math.max(0.0, tension));
}

/**
 * Sigmoid-based reader engagement prediction.
 * Ported from ANS 9.3 MathematicalModels.predict_engagement
 */
export function predictEngagement(features: Record<string, number>): number {
  const linearCoef: Record<string, number> = {
    dialogue: 0.15,
    action: 0.20,
    tension: 0.25,
    mystery: 0.15,
    emotion: 0.15,
    pacing: 0.10,
  };

  const interactionCoef: [string, string, number][] = [
    ['tension', 'action', 0.30],
    ['dialogue', 'emotion', 0.25],
    ['mystery', 'tension', 0.20],
  ];

  let score = 0;
  for (const [k, c] of Object.entries(linearCoef)) {
    score += (features[k] ?? 0) * c;
  }
  for (const [k1, k2, c] of interactionCoef) {
    score += c * (features[k1] ?? 0) * (features[k2] ?? 0);
  }

  return 1 / (1 + Math.exp(-5 * (score - 0.5)));
}

/**
 * Foreshadowing weight with decay and urgency.
 * Ported from ANS 9.3 MathematicalModels.calculate_foreshadow_weight
 */
export function calculateForeshadowWeight(
  plantedEp: number,
  currentEp: number,
  payoffEp: number,
  importance: number
): number {
  const distance = currentEp - plantedEp;
  const decay = Math.exp(-0.05 * distance);
  const remaining = payoffEp - currentEp;
  const urgency = remaining > 0 ? 1 / (1 + remaining) : 2.0;
  const weight = (importance / 10.0) * decay * (1 + urgency);
  return Math.min(2.0, Math.max(0.0, weight));
}

/**
 * Get act position with full context.
 */
export function getActPosition(episode: number, totalEpisodes: number): ActInfo {
  return getActFromEpisode(episode, totalEpisodes);
}

/**
 * Generate tension values for all episodes (for visualization).
 */
export function generateTensionCurveData(
  totalEpisodes: number,
  genre: string
): number[] {
  const data: number[] = [];
  for (let ep = 1; ep <= totalEpisodes; ep++) {
    data.push(tensionCurve(ep, totalEpisodes, genre));
  }
  return data;
}

