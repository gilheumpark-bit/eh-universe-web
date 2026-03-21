// ============================================================
// PART 0: TYPES — Narrative Sentinel™ Shadow State System
// ============================================================

// --- Character Shadow ---
export interface CharacterShadow {
  name: string;
  warmth: number;      // 0~1
  tension: number;     // 0~1
  trust: number;       // 0~1
  emotion: string;
  goal: string;
  baselineDrift: number; // 0~1
  unresolvedObservations: string[];
  pendingJudgments: string[];
}

// --- World Shadow ---
export interface WorldShadow {
  location: string;
  timeMarker: string;
  activeThreats: string[];
  environmentalMood: string;
}

// --- Narrative Thread ---
export interface NarrativeThread {
  id: string;
  description: string;
  introducedEpisode: number;
  priority: number;    // 1~10
  resolved: boolean;
}

// --- Arc State ---
export type ArcPhase = 'INTRO' | 'PROGRESS' | 'CLIMAX' | 'RESOLUTION';

export interface ArcShadow {
  phase: ArcPhase;
  progress: number;    // 0~1
}

// --- Full Shadow State ---
export interface ShadowState {
  characters: CharacterShadow[];
  world: WorldShadow;
  threads: NarrativeThread[];
  arc: ArcShadow;
  episodeHistory: number[];
}

// ============================================================
// PART 1: DEFAULTS
// ============================================================

export function createDefaultShadow(): ShadowState {
  return {
    characters: [],
    world: { location: '', timeMarker: '', activeThreats: [], environmentalMood: '' },
    threads: [],
    arc: { phase: 'INTRO', progress: 0 },
    episodeHistory: [],
  };
}

// ============================================================
// PART 2: ARC PHASE CALCULATOR
// ============================================================

export function calculateArcPhase(episode: number, totalEpisodes: number): ArcShadow {
  const x = episode / totalEpisodes;
  if (x <= 0.20) return { phase: 'INTRO', progress: x / 0.20 };
  if (x <= 0.60) return { phase: 'PROGRESS', progress: (x - 0.20) / 0.40 };
  if (x <= 0.85) return { phase: 'CLIMAX', progress: (x - 0.60) / 0.25 };
  return { phase: 'RESOLUTION', progress: (x - 0.85) / 0.15 };
}

// ============================================================
// PART 3: CHARACTER DRIFT DETECTION
// ============================================================

export type DriftLevel = 'STABLE' | 'MINOR_DRIFT' | 'DRIFT' | 'CRITICAL';

export function detectDrift(shadow: CharacterShadow): DriftLevel {
  if (shadow.baselineDrift < 0.15) return 'STABLE';
  if (shadow.baselineDrift < 0.30) return 'MINOR_DRIFT';
  if (shadow.baselineDrift < 0.50) return 'DRIFT';
  return 'CRITICAL';
}

// ============================================================
// PART 4: THREAD URGENCY
// ============================================================

export function getOverdueThreads(threads: NarrativeThread[], currentEpisode: number): NarrativeThread[] {
  return threads.filter(t =>
    !t.resolved && (currentEpisode - t.introducedEpisode) >= 7
  );
}

export function getHighPriorityUnresolved(threads: NarrativeThread[]): NarrativeThread[] {
  return threads.filter(t => !t.resolved && t.priority >= 8);
}

// ============================================================
// PART 5: HALLUCINATION DETECTION
// ============================================================

export function detectHallucination(promptLength: number, responseLength: number): {
  ratio: number;
  score: number;
  suspect: boolean;
} {
  const ratio = responseLength / Math.max(promptLength, 1);
  const score = Math.min(1.0, ratio / 3.0);
  return { ratio, score, suspect: score > 0.6 };
}

// ============================================================
// PART 6: SHADOW → PROMPT BUILDER
// ============================================================

export function buildShadowPrompt(shadow: ShadowState, episode: number, totalEpisodes: number, isKO: boolean): string {
  const parts: string[] = [];

  // Arc state
  const arc = calculateArcPhase(episode, totalEpisodes);
  parts.push(isKO
    ? `[아크 상태] ${arc.phase} (진행도: ${Math.round(arc.progress * 100)}%)`
    : `[Arc State] ${arc.phase} (progress: ${Math.round(arc.progress * 100)}%)`);

  // Character shadows
  if (shadow.characters.length > 0) {
    parts.push(isKO ? '[캐릭터 그림자]' : '[Character Shadows]');
    shadow.characters.forEach(c => {
      const drift = detectDrift(c);
      parts.push(`  ${c.name}: ${isKO ? '감정' : 'emotion'}=${c.emotion}, ${isKO ? '목표' : 'goal'}=${c.goal}, drift=${drift}`);
      if (c.unresolvedObservations.length > 0) {
        parts.push(`    ${isKO ? '미해결 관찰' : 'Unresolved'}: ${c.unresolvedObservations.join(', ')}`);
      }
    });
  }

  // World shadow
  if (shadow.world.location) {
    parts.push(isKO
      ? `[세계 상태] ${shadow.world.location} | ${shadow.world.timeMarker} | ${shadow.world.environmentalMood}`
      : `[World State] ${shadow.world.location} | ${shadow.world.timeMarker} | ${shadow.world.environmentalMood}`);
    if (shadow.world.activeThreats.length > 0) {
      parts.push(`  ${isKO ? '활성 위협' : 'Active threats'}: ${shadow.world.activeThreats.join(', ')}`);
    }
  }

  // Narrative threads
  const overdue = getOverdueThreads(shadow.threads, episode);
  const highPri = getHighPriorityUnresolved(shadow.threads);
  if (overdue.length > 0) {
    parts.push(isKO
      ? `[긴급 복선] 7화 이상 미회수: ${overdue.map(t => t.description).join(', ')}`
      : `[Urgent Threads] 7+ episodes overdue: ${overdue.map(t => t.description).join(', ')}`);
  }
  if (highPri.length > 0 && arc.phase === 'CLIMAX') {
    parts.push(isKO
      ? `[필수 회수] 클라이맥스 아크 — 고우선 복선 반드시 회수: ${highPri.map(t => t.description).join(', ')}`
      : `[Must Resolve] Climax arc — high priority: ${highPri.map(t => t.description).join(', ')}`);
  }

  return parts.length > 0 ? '\n' + parts.join('\n') : '';
}
