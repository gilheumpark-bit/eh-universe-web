import {
  getRawTierLimits,
  type TierLimits as GateTierLimits,
  type UserTier as GateUserTier,
} from './tier-gate';

// ============================================================
// PART 1 — Tier compatibility facade
// ============================================================

export type UserTier = Exclude<GateUserTier, 'none'>;

export interface TierLimits {
  aiGenerationsPerDay: number;        // -1 = unlimited
  /** @deprecated 서버 정본은 일일 제한이다. 기존 UI 호환을 위해 같은 값을 노출한다. */
  aiGenerationsPerMonth: number;
  providers: string[];                // allowed provider IDs
  driveSync: boolean;
  exportWatermark: boolean;           // true = watermark on free
  maxProjects: number;                // -1 = unlimited
  worldSimFull: boolean;
  engineReportDetail: boolean;        // false = summary only
}

const FREE_PROVIDER_IDS = ['upstage'];
const PRO_PROVIDER_IDS = ['upstage', 'gemini', 'openai', 'claude', 'deepseek', 'qwen', 'minimax', 'kimi', 'groq', 'mistral'];

function toClientLimits(tier: UserTier, gateLimits: GateTierLimits): TierLimits {
  const generationLimit = gateLimits.novel.dailyGenerations === 0 ? -1 : gateLimits.novel.dailyGenerations;
  const pro = tier === 'pro';

  return {
    aiGenerationsPerDay: generationLimit,
    aiGenerationsPerMonth: generationLimit,
    providers: pro ? PRO_PROVIDER_IDS : FREE_PROVIDER_IDS,
    driveSync: pro,
    exportWatermark: !pro,
    maxProjects: pro ? -1 : 1,
    worldSimFull: pro,
    engineReportDetail: pro,
  };
}

// ============================================================
// PART 2 — Tier state management
// ============================================================

const TIER_KEY = 'noa_user_tier';
const GEN_COUNT_KEY = 'noa_gen_count';
const GEN_MONTH_KEY = 'noa_gen_month';

function normalizeTier(value: string | null): UserTier {
  return value === 'pro' || value === 'free' ? value : 'free';
}

/** @returns Current user tier from localStorage, defaults to 'free' */
export function getUserTier(): UserTier {
  if (typeof window === 'undefined') return 'free';
  return normalizeTier(localStorage.getItem(TIER_KEY));
}

/** Persist user tier selection to localStorage */
export function setUserTier(tier: UserTier): void {
  if (tier !== 'free' && tier !== 'pro') return;
  localStorage.setItem(TIER_KEY, tier);
}

/** @returns Configuration limits for the specified tier (or current user's tier if omitted) */
export function getTierLimits(tier?: UserTier): TierLimits {
  const resolvedTier = tier ?? getUserTier();
  return toClientLimits(resolvedTier, getRawTierLimits(resolvedTier));
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
  const parsed = parseInt(localStorage.getItem(GEN_COUNT_KEY) || '0', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

/** Increment and return the current month's AI generation count */
export function incrementGenerationCount(): number {
  if (typeof window === 'undefined') return 0;
  const month = getCurrentMonth();
  if (localStorage.getItem(GEN_MONTH_KEY) !== month) {
    localStorage.setItem(GEN_MONTH_KEY, month);
    localStorage.setItem(GEN_COUNT_KEY, '0');
  }
  const next = getGenerationCount() + 1;
  localStorage.setItem(GEN_COUNT_KEY, String(next));
  return next;
}

/** @deprecated 서버 `/api/chat`가 최종 제한을 집행한다. 이 값은 UI 힌트용이다. */
export function canGenerate(): boolean {
  const limits = getTierLimits();
  if (limits.aiGenerationsPerDay === -1) return true;
  return getGenerationCount() < limits.aiGenerationsPerDay;
}

/** @returns True if the given provider ID is permitted under the user's current tier */
export function isProviderAllowed(providerId: string): boolean {
  return getTierLimits().providers.includes(providerId);
}
