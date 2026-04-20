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
  /** Firestore 클라우드 동기화 */
  CLOUD_SYNC: boolean;
  /** GitHub 원고 동기화 */
  GITHUB_SYNC: boolean;
  /** AI 요청 보안 스캐너 (프롬프트 인젝션 / 코드 인젝션 / PII 탐지) */
  SECURITY_GATE: boolean;
  /** 멀티파일 에이전트 (스냅샷 + 의존성 그래프) */
  MULTI_FILE_AGENT: boolean;
  /** GitHub ETag 캐싱 + rate limit 추적 */
  GITHUB_ETAG_CACHE: boolean;
  /** ARI per-model 추적 + 상태 전환 이벤트 */
  ARI_ENHANCED: boolean;
  /** Journal Engine (M1.1 AUTOSAVE_FORTRESS) — 기본 비활성, Phase 1.5에서 연결 후 활성화 */
  FEATURE_JOURNAL_ENGINE: boolean;
  /** Firestore Mirror (M1.4 Secondary tier) — 기본 비활성, 사용자 명시 consent 필요 */
  FEATURE_FIRESTORE_MIRROR: boolean;
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
  /** Firestore 세션 클라우드 동기화 — 기본 비활성 (Firestore 과금 리스크, AGENTS.md와 일치). ff_CLOUD_SYNC=true로 opt-in */
  CLOUD_SYNC: false,
  /** GitHub 원고 동기화 — Phase 1 완성, 기본 활성 */
  GITHUB_SYNC: true,
  /** AI 요청 보안 스캐너 — 상업 운영 기본 활성 (프롬프트/코드 인젝션 + PII 차단) */
  SECURITY_GATE: true,
  /** 멀티파일 에이전트 — 스냅샷 롤백 + 의존성 그래프 + intent-parser + tier-registry */
  MULTI_FILE_AGENT: true,
  /** GitHub ETag 캐싱 — 304 캐시 + rate limit 80% 경고, 상업 기본 활성 (rate limit 절약) */
  GITHUB_ETAG_CACHE: true,
  /** ARI per-model 추적 — 모델별 건강도 + circuit 이벤트, 기본 활성 */
  ARI_ENHANCED: true,
  /**
   * Journal Engine (M1.1 AUTOSAVE_FORTRESS Phase 1.1) — 기본 비활성.
   * Phase 1.5에서 useProjectManager/StudioShell과 연결 후 활성화.
   * flag off 상태에서는 저널 엔진이 완전히 우회되고 기존 경로만 동작.
   */
  FEATURE_JOURNAL_ENGINE: false,
  /**
   * Firestore Mirror (M1.4 Secondary tier) — 기본 비활성.
   * 사용자가 Settings에서 명시 동의해야 활성화.
   * 동의 없이는 네트워크 호출 0건, 모든 데이터 로컬 보관.
   */
  FEATURE_FIRESTORE_MIRROR: false,
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
