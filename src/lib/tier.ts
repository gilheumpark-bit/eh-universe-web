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

export function getUserTier(): UserTier {
  if (typeof window === 'undefined') return 'free';
  return (localStorage.getItem(TIER_KEY) as UserTier) || 'free';
}

export function setUserTier(tier: UserTier): void {
  localStorage.setItem(TIER_KEY, tier);
}

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

export function canGenerate(): boolean {
  const limits = getTierLimits();
  if (limits.aiGenerationsPerMonth === -1) return true;
  return getGenerationCount() < limits.aiGenerationsPerMonth;
}

export function isProviderAllowed(providerId: string): boolean {
  return getTierLimits().providers.includes(providerId);
}
