// ============================================================
// feature-flags — Lightweight feature flag system
// No external service. Flags defined here, checked anywhere.
// ============================================================

export interface FeatureFlags {
  /** 이미지 생성 기능 (DALL-E / Stability AI) */
  IMAGE_GENERATION: boolean;
  /** Google Drive 백업 */
  GOOGLE_DRIVE_BACKUP: boolean;
  /** EH Network 커뮤니티 */
  NETWORK_COMMUNITY: boolean;
  /** 오프라인 원고 캐싱 */
  OFFLINE_CACHE: boolean;
  /** 코드 스튜디오 (CSL IDE 통합) */
  CODE_STUDIO: boolean;
  /** 에피소드 간 비교 분석 */
  EPISODE_COMPARE: boolean;
}

// ============================================================
// Default flags — change here to toggle features globally
// ============================================================
const FLAGS: FeatureFlags = {
  IMAGE_GENERATION: true,
  GOOGLE_DRIVE_BACKUP: true,
  NETWORK_COMMUNITY: true,
  /** IndexedDB 백업/복원·버전 백업 — useProjectManager에서 분기 */
  OFFLINE_CACHE: true,
  CODE_STUDIO: true,
  EPISODE_COMPARE: true,
};

/**
 * Check if a feature is enabled.
 * Checks env override first (NEXT_PUBLIC_FF_{FLAG_NAME}=true/false),
 * then falls back to the default defined above.
 */
export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  if (typeof window !== 'undefined') {
    // Client-side: check localStorage override for dev/testing
    const override = localStorage.getItem(`ff_${flag}`);
    if (override === 'true') return true;
    if (override === 'false') return false;
  }

  // Environment variable override (build-time)
  const envKey = `NEXT_PUBLIC_FF_${flag}`;
  const envVal = typeof process !== 'undefined' ? process.env[envKey] : undefined;
  if (envVal === 'true') return true;
  if (envVal === 'false') return false;

  return FLAGS[flag];
}

/** 서버 컴포넌트·Route Handler용 (localStorage 없음, env + 기본값만) */
export function isFeatureEnabledServer(flag: keyof FeatureFlags): boolean {
  const envKey = `NEXT_PUBLIC_FF_${flag}`;
  const envVal = typeof process !== "undefined" ? process.env[envKey] : undefined;
  if (envVal === "true") return true;
  if (envVal === "false") return false;
  return FLAGS[flag];
}

/** Get all flags with their current values */
export function getAllFlags(): FeatureFlags {
  const result = { ...FLAGS };
  for (const key of Object.keys(result) as (keyof FeatureFlags)[]) {
    result[key] = isFeatureEnabled(key);
  }
  return result;
}

// IDENTITY_SEAL: PART-1 | role=feature-flags | inputs=flag name | outputs=boolean
