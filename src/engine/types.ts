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
  CAUSALITY = 'CAUSALITY',
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

// 연재 플랫폼 (publishing platform)
export enum PublishPlatform {
  NONE = 'NONE',
  // KO
  MUNPIA = 'MUNPIA',
  NOVELPIA = 'NOVELPIA',
  KAKAOPAGE = 'KAKAOPAGE',
  SERIES = 'SERIES',
  // EN
  ROYAL_ROAD = 'ROYAL_ROAD',
  WEBNOVEL = 'WEBNOVEL',
  KINDLE_VELLA = 'KINDLE_VELLA',
  WATTPAD = 'WATTPAD',
  // JP
  KAKUYOMU = 'KAKUYOMU',
  NAROU = 'NAROU',
  ALPHAPOLIS = 'ALPHAPOLIS',
  // CN
  QIDIAN = 'QIDIAN',
  JJWXC = 'JJWXC',
  FANQIE = 'FANQIE',
}

// Language → Platform mapping
export const PLATFORM_BY_LANG: Record<string, PublishPlatform[]> = {
  KO: [PublishPlatform.MUNPIA, PublishPlatform.NOVELPIA, PublishPlatform.KAKAOPAGE, PublishPlatform.SERIES],
  EN: [PublishPlatform.ROYAL_ROAD, PublishPlatform.WEBNOVEL, PublishPlatform.KINDLE_VELLA, PublishPlatform.WATTPAD],
  JP: [PublishPlatform.KAKUYOMU, PublishPlatform.NAROU, PublishPlatform.ALPHAPOLIS],
  CN: [PublishPlatform.QIDIAN, PublishPlatform.JJWXC, PublishPlatform.FANQIE],
};

export interface PlatformPreset {
  targetReader: string;
  episodeLength: { min: number; max: number };
  billingModel: string;
  worldComplexity: 'low' | 'medium' | 'high';
  pace: string;
  endingHook: 'low' | 'medium' | 'high';
  allowedMature: boolean;
  nodChecks: string[];
}

export const PLATFORM_PRESETS: Record<string, PlatformPreset> = {
  [PublishPlatform.MUNPIA]: {
    targetReader: '30~40대 헤비유저, 장르 마니아',
    episodeLength: { min: 5000, max: 8000 },
    billingModel: 'episode_paid',
    worldComplexity: 'high',
    pace: 'long_breath',
    endingHook: 'medium',
    allowedMature: true,
    nodChecks: ['length_min_warning', 'density_check'],
  },
  [PublishPlatform.NOVELPIA]: {
    targetReader: '10~20대, 라이트 유저',
    episodeLength: { min: 2000, max: 4000 },
    billingModel: 'free_serial_coin',
    worldComplexity: 'low',
    pace: 'fast',
    endingHook: 'medium',
    allowedMature: true,
    nodChecks: ['heavy_world_warning', 'pace_check'],
  },
  [PublishPlatform.KAKAOPAGE]: {
    targetReader: '20~30대, 캐주얼',
    episodeLength: { min: 3000, max: 5000 },
    billingModel: 'wait_or_free',
    worldComplexity: 'medium',
    pace: 'fast',
    endingHook: 'high',
    allowedMature: false,
    nodChecks: ['hook_missing_warning', 'ending_intensity_check'],
  },
  [PublishPlatform.SERIES]: {
    targetReader: '전 연령, 메인스트림',
    episodeLength: { min: 4000, max: 6000 },
    billingModel: 'paid_plus_complete',
    worldComplexity: 'medium',
    pace: 'stable',
    endingHook: 'medium',
    allowedMature: false,
    nodChecks: ['completion_structure_check', 'emotion_consistency_check'],
  },
  // EN platforms
  [PublishPlatform.ROYAL_ROAD]: {
    targetReader: 'LitRPG/Progression Fantasy readers, 18-35',
    episodeLength: { min: 4000, max: 8000 },
    billingModel: 'free_patron',
    worldComplexity: 'high',
    pace: 'long_breath',
    endingHook: 'medium',
    allowedMature: true,
    nodChecks: ['length_min_warning', 'worldbuilding_density_check'],
  },
  [PublishPlatform.WEBNOVEL]: {
    targetReader: 'Global readers, translated web novel fans',
    episodeLength: { min: 3000, max: 5000 },
    billingModel: 'spirit_stone_unlock',
    worldComplexity: 'medium',
    pace: 'fast',
    endingHook: 'high',
    allowedMature: false,
    nodChecks: ['hook_missing_warning', 'cliffhanger_check'],
  },
  [PublishPlatform.KINDLE_VELLA]: {
    targetReader: 'Amazon Kindle readers, romance/thriller heavy',
    episodeLength: { min: 1200, max: 5000 },
    billingModel: 'token_per_episode',
    worldComplexity: 'low',
    pace: 'fast',
    endingHook: 'high',
    allowedMature: true,
    nodChecks: ['hook_missing_warning', 'episode_length_check'],
  },
  [PublishPlatform.WATTPAD]: {
    targetReader: 'Young adults 13-25, romance/fanfic dominant',
    episodeLength: { min: 1500, max: 3000 },
    billingModel: 'free_paid_stories',
    worldComplexity: 'low',
    pace: 'fast',
    endingHook: 'medium',
    allowedMature: false,
    nodChecks: ['pace_check', 'dialogue_ratio_check'],
  },
  // JP platforms
  [PublishPlatform.KAKUYOMU]: {
    targetReader: 'ラノベ・文芸読者、20~40代',
    episodeLength: { min: 3000, max: 6000 },
    billingModel: 'free_reward_ad',
    worldComplexity: 'medium',
    pace: 'stable',
    endingHook: 'medium',
    allowedMature: true,
    nodChecks: ['pacing_check', 'emotion_consistency_check'],
  },
  [PublishPlatform.NAROU]: {
    targetReader: '異世界・転生読者、全年齢',
    episodeLength: { min: 2000, max: 5000 },
    billingModel: 'free_bookwalker',
    worldComplexity: 'medium',
    pace: 'fast',
    endingHook: 'medium',
    allowedMature: false,
    nodChecks: ['isekai_trope_check', 'pace_check'],
  },
  [PublishPlatform.ALPHAPOLIS]: {
    targetReader: 'ファンタジー・恋愛読者、書籍化志望',
    episodeLength: { min: 3000, max: 6000 },
    billingModel: 'free_publishing_scout',
    worldComplexity: 'medium',
    pace: 'stable',
    endingHook: 'medium',
    allowedMature: true,
    nodChecks: ['completion_structure_check', 'density_check'],
  },
  // CN platforms
  [PublishPlatform.QIDIAN]: {
    targetReader: '男频玄幻/都市读者，18-35岁',
    episodeLength: { min: 3000, max: 5000 },
    billingModel: 'vip_chapter_unlock',
    worldComplexity: 'high',
    pace: 'fast',
    endingHook: 'high',
    allowedMature: false,
    nodChecks: ['hook_missing_warning', 'cliffhanger_check', 'density_check'],
  },
  [PublishPlatform.JJWXC]: {
    targetReader: '女频言情/古言读者，18-30岁',
    episodeLength: { min: 3000, max: 6000 },
    billingModel: 'vip_chapter_unlock',
    worldComplexity: 'medium',
    pace: 'stable',
    endingHook: 'medium',
    allowedMature: false,
    nodChecks: ['emotion_consistency_check', 'romance_pacing_check'],
  },
  [PublishPlatform.FANQIE]: {
    targetReader: '免费小说读者，全年龄',
    episodeLength: { min: 2000, max: 4000 },
    billingModel: 'free_ad_supported',
    worldComplexity: 'low',
    pace: 'fast',
    endingHook: 'high',
    allowedMature: false,
    nodChecks: ['hook_missing_warning', 'pace_check'],
  },
};

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
  worldUpdates?: any;
}

// ============================================================
// PRISM-MODE Presets — Content Rating System
// ============================================================

export interface PrismModeLevel {
  sexual: number;    // 0-5
  violence: number;  // 0-5
  profanity: number; // 0-5
}

export const PRISM_MODE_PRESETS: Record<string, PrismModeLevel | null> = {
  OFF: null, // no filtering
  FREE: { sexual: 3, violence: 3, profanity: 3 }, // AI provider default only
  ALL: { sexual: 0, violence: 1, profanity: 0 },
  T15: { sexual: 2, violence: 3, profanity: 2 },
  M18: { sexual: 4, violence: 5, profanity: 4 },
};

