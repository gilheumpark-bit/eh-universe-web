// ============================================================
// PART 1 — Tier definitions
// ============================================================

export type UserTier = 'free' | 'pro';

export interface TierLimits {
  aiGenerationsPerMonth: number;      // -1 = unlimited
  providers: string[];                // allowed provider IDs
  driveSync: boolean;
  exportWatermark: boolean;           // true = watermark on free
  maxProjects: number;                // -1 = unlimited
  worldSimFull: boolean;
  engineReportDetail: boolean;        // false = summary only
}

const TIER_CONFIG: Record<UserTier, TierLimits> = {
  free: {
    aiGenerationsPerMonth: 20,
    providers: ['gemini'],
    driveSync: false,
    exportWatermark: true,
    maxProjects: 1,
    worldSimFull: false,
    engineReportDetail: false,
  },
  pro: {
    aiGenerationsPerMonth: -1,
    providers: ['gemini', 'openai', 'claude', 'groq', 'mistral'],
    driveSync: true,
    exportWatermark: false,
    maxProjects: -1,
    worldSimFull: true,
    engineReportDetail: true,
  },
};

// ============================================================
// PART 2 — Tier state management
// ============================================================

const TIER_KEY = 'noa_user_tier';
const GEN_COUNT_KEY = 'noa_gen_count';
const GEN_MONTH_KEY = 'noa_gen_month';

/** @returns Current user tier from localStorage, defaults to 'free' */
export function getUserTier(): UserTier {
  if (typeof window === 'undefined') return 'free';
  return (localStorage.getItem(TIER_KEY) as UserTier) || 'free';
}

/** Persist user tier selection to localStorage */
export function setUserTier(tier: UserTier): void {
  localStorage.setItem(TIER_KEY, tier);
}

/** @returns Configuration limits for the specified tier (or current user's tier if omitted) */
export function getTierLimits(tier?: UserTier): TierLimits {
  return TIER_CONFIG[tier ?? getUserTier()];
}

// ============================================================
// PART 3 — Generation count tracking
// ============================================================

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** @returns Current month's AI generation count, auto-resetting on month change */
export function getGenerationCount(): number {
  if (typeof window === 'undefined') return 0;
  const month = localStorage.getItem(GEN_MONTH_KEY);
  if (month !== getCurrentMonth()) {
    // Reset counter on new month
    localStorage.setItem(GEN_MONTH_KEY, getCurrentMonth());
    localStorage.setItem(GEN_COUNT_KEY, '0');
    return 0;
  }
  return parseInt(localStorage.getItem(GEN_COUNT_KEY) || '0', 10);
}

/** Increment and return the current month's AI generation count */
export function incrementGenerationCount(): number {
  const month = getCurrentMonth();
  if (localStorage.getItem(GEN_MONTH_KEY) !== month) {
    localStorage.setItem(GEN_MONTH_KEY, month);
    localStorage.setItem(GEN_COUNT_KEY, '0');
  }
  const next = getGenerationCount() + 1;
  localStorage.setItem(GEN_COUNT_KEY, String(next));
  return next;
}

/** @returns True if the user has remaining AI generations this month (or is on unlimited tier) */
export function canGenerate(): boolean {
  const limits = getTierLimits();
  if (limits.aiGenerationsPerMonth === -1) return true;
  return getGenerationCount() < limits.aiGenerationsPerMonth;
}

/** @returns True if the given provider ID is permitted under the user's current tier */
export function isProviderAllowed(providerId: string): boolean {
  return getTierLimits().providers.includes(providerId);
}
