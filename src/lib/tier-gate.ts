// ============================================================
// Tier Gate — 스튜디오별 기능 제한 + 오픈베타 오버라이드
// ============================================================
// 오픈베타 기간에는 OPEN_BETA = true → 모든 기능 Pro급 해금
// 정식 출시 시 OPEN_BETA = false로 전환하면 티어별 제한 활성화
//
// 안전 장치: Stripe 결제가 실제 운영 중(STRIPE_SECRET_KEY 설정)이면
// OPEN_BETA가 true여도 자동으로 비활성화됨 — "플래그 깜빡 잊고 결제 오픈" 방지.

const BETA_FLAG = true;

/** 결제가 실제 연결되어 있는지 감지 (Stripe 키 존재 여부로 판별) */
function isPaymentLive(): boolean {
  if (typeof process === 'undefined') return false;
  const sk = process.env.STRIPE_SECRET_KEY;
  // sk_live_ 또는 sk_test_로 시작하는 유효 형식만 "운영 중"으로 간주
  return typeof sk === 'string' && /^sk_(live|test)_[A-Za-z0-9_-]{20,}$/.test(sk);
}

/** 오픈베타 플래그 — true면 모든 유저에게 Pro 기능 해금. 결제 활성 시 자동 false. */
export const OPEN_BETA: boolean = BETA_FLAG && !isPaymentLive();

// ── Types ──
export type UserTier = 'none' | 'free' | 'pro';

export interface TierLimits {
  // 소설 스튜디오
  novel: {
    /** 일일 AI 생성 횟수 (0 = 무제한) */
    dailyGenerations: number;
    /** 품질 게이트 리트라이 횟수 */
    maxRetries: number;
    /** 프로액티브 제안 활성화 */
    proactiveSuggestions: boolean;
    /** 고급 모델 선택 가능 */
    advancedModels: boolean;
  };
  // 코드 스튜디오
  code: {
    /** 일일 검증 횟수 (0 = 무제한) */
    dailyVerifications: number;
    /** 사용 가능한 검증 에이전트 수 */
    verifyAgentCount: number;
    /** 교차 검증 (멀티모델) 활성화 */
    crossValidation: boolean;
    /** 자동 수리 에이전트 활성화 */
    autoRepair: boolean;
  };
  // 번역 스튜디오
  translation: {
    /** 일일 번역 챕터 수 (0 = 무제한) */
    dailyChapters: number;
    /** 교차 검증 채점 활성화 */
    crossValidation: boolean;
    /** 번역 프로필 학습 활성화 */
    profileLearning: boolean;
    /** 배치 번역 활성화 */
    batchTranslation: boolean;
  };
}

// ── Tier Definitions ──

const TIER_NONE: TierLimits = {
  novel: { dailyGenerations: 0, maxRetries: 0, proactiveSuggestions: false, advancedModels: false },
  code: { dailyVerifications: 0, verifyAgentCount: 0, crossValidation: false, autoRepair: false },
  translation: { dailyChapters: 0, crossValidation: false, profileLearning: false, batchTranslation: false },
};

const TIER_FREE: TierLimits = {
  novel: { dailyGenerations: 5, maxRetries: 1, proactiveSuggestions: false, advancedModels: false },
  code: { dailyVerifications: 3, verifyAgentCount: 3, crossValidation: false, autoRepair: false },
  translation: { dailyChapters: 2, crossValidation: false, profileLearning: false, batchTranslation: false },
};

const TIER_PRO: TierLimits = {
  novel: { dailyGenerations: 0, maxRetries: 3, proactiveSuggestions: true, advancedModels: true },
  code: { dailyVerifications: 0, verifyAgentCount: 8, crossValidation: true, autoRepair: true },
  translation: { dailyChapters: 0, crossValidation: true, profileLearning: true, batchTranslation: true },
};

const TIERS: Record<UserTier, TierLimits> = {
  none: TIER_NONE,
  free: TIER_FREE,
  pro: TIER_PRO,
};

// ── Public API ──

/** 현재 유저 티어의 기능 제한을 반환. 오픈베타 시 Pro급 해금. */
export function getTierLimits(tier: UserTier): TierLimits {
  if (OPEN_BETA) return TIER_PRO;
  return TIERS[tier];
}

/** 특정 기능이 현재 티어에서 사용 가능한지 체크 */
export function canUse(tier: UserTier, check: (limits: TierLimits) => boolean): boolean {
  return check(getTierLimits(tier));
}

/** 일일 사용량 체크 (0 = 무제한) */
export function isWithinDailyLimit(limit: number, used: number): boolean {
  if (limit === 0) return true; // 무제한
  return used < limit;
}

// ── BYOK 기능 제한 (키 있어도 Pro 아니면 제한) ──

/** BYOK 유저의 기능 상한 — Pro가 아니면 일부 기능 잠금 */
export function getByokLimits(tier: UserTier): TierLimits {
  if (OPEN_BETA) return TIER_PRO;
  if (tier === 'pro') return TIER_PRO;
  // BYOK는 호출은 가능하지만 고급 기능은 Free 수준
  return {
    novel: { ...TIER_FREE.novel, dailyGenerations: 0 }, // 횟수 무제한 (자기 키)
    code: { ...TIER_FREE.code, dailyVerifications: 0 },
    translation: { ...TIER_FREE.translation, dailyChapters: 0 },
  };
}
