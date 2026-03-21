// Genre and AppLanguage available via '../lib/studio-types' if needed

// ============================================================
// ENUMS
// ============================================================

export enum FixType {
  TYPO = 'TYPO',
  GRAMMAR = 'GRAMMAR',
  AI_TONE = 'AI_TONE',
  REPETITION = 'REPETITION',
  SHOW_TELL = 'SHOW_TELL',
  RHYTHM = 'RHYTHM',
  WHITESPACE = 'WHITESPACE',
  DIALOGUE = 'DIALOGUE',
  POV = 'POV',
  WORLD = 'WORLD',
  EMOTION = 'EMOTION',
  PACING = 'PACING',
  THEME = 'THEME',
}

export enum Severity {
  INFO = 0,
  WARNING = 1,
  ERROR = 2,
  CRITICAL = 3,
}

export enum PlatformType {
  MOBILE = 'MOBILE',
  WEB = 'WEB',
}

export enum EpisodeState {
  OPEN = 'OPEN',
  TRANSITION_ONLY = 'TRANSITION_ONLY',
  STOP = 'STOP',
}

export enum Tone {
  TENSE = 'TENSE',
  EMOTIONAL = 'EMOTIONAL',
  ACTION = 'ACTION',
  MYSTERY = 'MYSTERY',
  ROMANTIC = 'ROMANTIC',
  COMEDIC = 'COMEDIC',
  DARK = 'DARK',
  HOPEFUL = 'HOPEFUL',
}

export enum POVType {
  FIRST_PERSON = 'FIRST_PERSON',
  THIRD_LIMITED = 'THIRD_LIMITED',
  THIRD_OMNISCIENT = 'THIRD_OMNISCIENT',
  MULTIPLE = 'MULTIPLE',
}

// ============================================================
// ACT STRUCTURE
// ============================================================

export interface ActInfo {
  act: number;
  name: string;
  nameEN: string;
  progress: number;
}

export function getActFromEpisode(episode: number, totalEpisodes: number): ActInfo {
  const x = episode / totalEpisodes;
  if (x <= 0.20) return { act: 1, name: '도입/설정', nameEN: 'Setup', progress: x / 0.20 };
  if (x <= 0.40) return { act: 2, name: '상승/갈등', nameEN: 'Rising', progress: (x - 0.20) / 0.20 };
  if (x <= 0.60) return { act: 3, name: '중반/전환', nameEN: 'Midpoint', progress: (x - 0.40) / 0.20 };
  if (x <= 0.80) return { act: 4, name: '하강/위기', nameEN: 'Falling', progress: (x - 0.60) / 0.20 };
  return { act: 5, name: '절정/해결', nameEN: 'Climax', progress: (x - 0.80) / 0.20 };
}

// ============================================================
// DATA INTERFACES
// ============================================================

export interface FixRecord {
  fixType: FixType;
  original: string;
  fixed: string;
  position: number;
  reason: string;
  severity: Severity;
}

export interface ValidationIssue {
  category: string;
  message: string;
  episode?: number;
  severity: Severity;
  suggestion?: string;
}

export interface GenreParams {
  base: number;
  amp: number;
  accel: number;
}

export const GENRE_TENSION_PARAMS: Record<string, GenreParams> = {
  SF:              { base: 0.40, amp: 0.15, accel: 0.30 },
  FANTASY:         { base: 0.35, amp: 0.18, accel: 0.28 },
  ROMANCE:         { base: 0.30, amp: 0.12, accel: 0.20 },
  THRILLER:        { base: 0.50, amp: 0.20, accel: 0.40 },
  HORROR:          { base: 0.45, amp: 0.22, accel: 0.35 },
  SYSTEM_HUNTER:   { base: 0.42, amp: 0.16, accel: 0.32 },
  FANTASY_ROMANCE: { base: 0.32, amp: 0.14, accel: 0.22 },
};

export interface EngineReport {
  version: string;
  grade: string;
  eosScore: number;
  tensionTarget: number;
  actPosition: ActInfo;
  metrics: {
    tension: number;
    pacing: number;
    immersion: number;
  };
  aiTonePercent: number;
  serialization: {
    platform: PlatformType;
    byteSize: number;
    targetRange: { min: number; max: number };
    withinRange: boolean;
  };
  fixes: FixRecord[];
  issues: ValidationIssue[];
  processingTimeMs: number;
}

