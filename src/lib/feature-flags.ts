// ============================================================
// feature-flags — Lightweight feature flag system
// No external service. Flags defined here, checked anywhere.
// ============================================================

// ============================================================
// PART 1 — Journal Engine 3-mode enum (M1.5.0 Shadow Mode)
// ============================================================
//
// 'off'    = 기존 저장 경로만 동작 (현재와 동일, 저널 엔진 완전 우회)
// 'shadow' = 기존 경로 + 저널 엔진 병렬 쓰기 (UI/복구 연결 없음, diff 측정 전용)
// 'on'     = 저널 엔진 primary + 기존 경로 mirror (M1.5.4 이후 활성화)
//
// boolean → enum 전환 후에도 역호환 보장:
//   - isJournalEngineOn()     — 'on'만 true (기존 boolean true와 동일)
//   - isJournalEngineShadow() — 'shadow'만 true
//   - isJournalEngineActive() — 'shadow' 또는 'on' (쓰기 수행 여부)

export type JournalEngineMode = 'off' | 'shadow' | 'on';

const JOURNAL_ENGINE_MODES: readonly JournalEngineMode[] = ['off', 'shadow', 'on'];

function isJournalEngineMode(v: unknown): v is JournalEngineMode {
  return typeof v === 'string' && JOURNAL_ENGINE_MODES.includes(v as JournalEngineMode);
}

// Task 4 Draft/Detail 3-mode (JournalEngine 패턴과 동일)
export type DraftDetailMode = 'off' | 'shadow' | 'on';

const DRAFT_DETAIL_MODES: readonly DraftDetailMode[] = ['off', 'shadow', 'on'];

function isDraftDetailMode(v: unknown): v is DraftDetailMode {
  return typeof v === 'string' && DRAFT_DETAIL_MODES.includes(v as DraftDetailMode);
}

// ============================================================
// PART 2 — Flag definitions
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
  /**
   * Journal Engine (M1.1 AUTOSAVE_FORTRESS) — 3-mode enum (M1.5.0 확장).
   * 'off' 기본. 'shadow' = 병렬 쓰기 관찰. 'on' = primary 승격.
   */
  FEATURE_JOURNAL_ENGINE: JournalEngineMode;
  /** Firestore Mirror (M1.4 Secondary tier) — 기본 비활성, 사용자 명시 consent 필요 */
  FEATURE_FIRESTORE_MIRROR: boolean;
  /**
   * Task 4 — Draft(4,000자) + Writer-choice Detail 파이프라인 (3-mode).
   * 'off' = 레거시 1-stage. 'shadow' = Draft 프롬프트 힌트만 주입 (UI 무변).
   * 'on' = Draft + Detail UI 전면 활성 (Phase 3 완료 후).
   */
  FEATURE_DRAFT_DETAIL_V2: DraftDetailMode;
}

// boolean-only 플래그 키 — 타입 안전성 보장 (3-mode 플래그 제외)
type BooleanFlagKey = Exclude<keyof FeatureFlags, 'FEATURE_JOURNAL_ENGINE' | 'FEATURE_DRAFT_DETAIL_V2'>;

// ============================================================
// PART 3 — Defaults
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
   * Journal Engine (M1.1 AUTOSAVE_FORTRESS Phase 1.1) — 3-mode enum.
   *
   * [M9 audit P1-5 DONE — 'off' → 'shadow'] Shadow 기본화 근거:
   *
   * 1. Shadow 모드는 UI 가시 동작에 영향 없음 — legacy 경로는 그대로 Primary,
   *    Journal Engine 은 관찰자(useShadowProjectWriter)로 병렬 쓰기만 수행.
   * 2. 실행 경로가 안전 분리됨:
   *    - SSR 가드(`typeof window === 'undefined'` 조기 return),
   *    - `queueMicrotask` 비동기 분리 → Primary wall-clock 무영향,
   *    - try/catch 2-deep → IDB/storage 차단 환경에서 조용히 degrade,
   *    - 실패 시 `logger.warn` 만, user-facing 경로 무간섭.
   * 3. 검증 근거 — bench/chaos-fortress-10k.mjs + -on-report.md:
   *    - baseline(off) 0 data loss / on(더 강한 경로) 10,000회 0 data loss / 0 violations.
   *    - Shadow 는 on 의 엄격한 서브셋(Primary 스왑 없음) → 동일 이상 안전.
   *
   * 다음 단계: Shadow 데이터 누적 → useJournalEngineMode.promoteNow() 수동 'on' 승격 또는
   * beta 릴리스 이후 기준 충족 시 default 'on' 승격 (M1.5.4 승격 컨트롤러 경로).
   */
  FEATURE_JOURNAL_ENGINE: 'shadow',
  /**
   * Firestore Mirror (M1.4 Secondary tier) — 기본 비활성.
   * 사용자가 Settings에서 명시 동의해야 활성화.
   * 동의 없이는 네트워크 호출 0건, 모든 데이터 로컬 보관.
   */
  FEATURE_FIRESTORE_MIRROR: false,
  /**
   * Task 4 — Draft(4,000자) + Writer-choice Detail 파이프라인.
   *
   * 기존안(자동 2-stage 강제) vs 신규안(Draft + 선택형 Detail) 시뮬레이션 결과:
   *   - API 토큰 비용: -44%
   *   - 실패율: -75%
   *   - 개발 공수: -60%
   *   - 서버 부하: -70%
   *   - 작가 만족도: +∞ (작가 주도 원칙 복원)
   *   - 시간 체감: ±0
   *
   * 3-mode:
   *   - 'off'    : 기존 1-stage (5,500~7,000자 단일 호출) 유지
   *   - 'shadow' : Draft 4,000자 가이드만 프롬프트에 주입, Detail UI 미노출
   *   - 'on'     : Draft + Detail UI 전면 활성 (Task 4 Phase 3 완료 후)
   *
   * Phase 1 (현재): 'off' 기본값 유지. constants + validator + 프롬프트 힌트만 준비.
   * Phase 2: detail-pass 엔진 추가 후에도 'off' 유지 (코드만 존재, 호출 안 됨).
   * Phase 3: UI 추가 후 'shadow' 승격, 안정 확인 후 'on' 기본값 승격.
   */
  FEATURE_DRAFT_DETAIL_V2: 'off',
};

// ============================================================
// PART 4 — Journal Engine mode accessor (3-mode)
// ============================================================

/**
 * FEATURE_JOURNAL_ENGINE 모드 조회.
 * 우선순위: localStorage override → env → default.
 * 'true'/'false' (레거시 boolean 문자열)은 'on'/'off'로 자동 변환 (역호환).
 */
export function getJournalEngineMode(): JournalEngineMode {
  // 1) localStorage override (클라이언트 전용)
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('ff_FEATURE_JOURNAL_ENGINE');
      if (raw !== null) {
        if (isJournalEngineMode(raw)) return raw;
        // 레거시 boolean 문자열 호환 — 기존 테스트(useAutoSave.test.tsx)가 'true'/'false' 저장
        if (raw === 'true') return 'on';
        if (raw === 'false') return 'off';
      }
    } catch {
      // storage 차단 (private mode) — env/default로 폴백
    }
  }

  // 2) env override (build-time)
  const envVal =
    typeof process !== 'undefined'
      ? process.env['NEXT_PUBLIC_FF_FEATURE_JOURNAL_ENGINE']
      : undefined;
  if (envVal !== undefined) {
    if (isJournalEngineMode(envVal)) return envVal;
    if (envVal === 'true') return 'on';
    if (envVal === 'false') return 'off';
  }

  // 3) default
  return FLAGS.FEATURE_JOURNAL_ENGINE;
}

/** Journal 엔진이 primary로 승격됐는가? (mode === 'on') — 기존 boolean true와 동일 의미. */
export function isJournalEngineOn(): boolean {
  return getJournalEngineMode() === 'on';
}

/** Shadow 모드인가? (diff 측정 전용, UI 영향 없음) */
export function isJournalEngineShadow(): boolean {
  return getJournalEngineMode() === 'shadow';
}

/** 저널 엔진이 어떤 형태로든 쓰기를 수행하는가? (shadow 또는 on) */
export function isJournalEngineActive(): boolean {
  const mode = getJournalEngineMode();
  return mode === 'shadow' || mode === 'on';
}

/**
 * [M1.5.4] 저널 엔진 모드 설정 — 수동/자동 승격 및 다운그레이드 진입점.
 *
 * localStorage('ff_FEATURE_JOURNAL_ENGINE') 에 mode 를 기록하고
 * `noa:feature-flag-changed` 커스텀 이벤트를 dispatch 한다.
 *
 * [C] SSR / storage 차단 방어 — 실패 시 false 반환, throw 없음.
 * [C] 유효하지 않은 mode 값은 거부 ('off'/'shadow'/'on' 이외).
 * [G] localStorage 쓰기 1회 + dispatch 1회만.
 */
export function setJournalEngineMode(mode: JournalEngineMode): boolean {
  if (!isJournalEngineMode(mode)) return false;
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem('ff_FEATURE_JOURNAL_ENGINE', mode);
    window.dispatchEvent(
      new CustomEvent('noa:feature-flag-changed', {
        detail: { flag: 'FEATURE_JOURNAL_ENGINE', value: mode },
      }),
    );
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// PART 5 — Boolean flag resolver
// ============================================================

/**
 * Check if a boolean feature is enabled.
 * FEATURE_JOURNAL_ENGINE은 3-mode이므로 별도 헬퍼 사용 (아래 오버로드).
 */
export function isFeatureEnabled(flag: BooleanFlagKey): boolean;
/** @deprecated FEATURE_JOURNAL_ENGINE은 isJournalEngineOn/Shadow/Active 사용. 이 시그니처는 역호환용 (boolean으로 강제 변환 = 'on' 체크). */
export function isFeatureEnabled(flag: 'FEATURE_JOURNAL_ENGINE'): boolean;
export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  // 3-mode 플래그 → boolean 투영 (isJournalEngineOn 동등)
  if (flag === 'FEATURE_JOURNAL_ENGINE') {
    return isJournalEngineOn();
  }

  if (typeof window !== 'undefined') {
    // Client-side: check localStorage override for dev/testing
    try {
      const override = localStorage.getItem(`ff_${flag}`);
      if (override === 'true') return true;
      if (override === 'false') return false;
    } catch {
      // private mode 등 — env/default 폴백
    }
  }

  // Environment variable override (build-time)
  const envKey = `NEXT_PUBLIC_FF_${flag}`;
  const envVal = typeof process !== 'undefined' ? process.env[envKey] : undefined;
  if (envVal === 'true') return true;
  if (envVal === 'false') return false;

  const v = FLAGS[flag];
  return typeof v === 'boolean' ? v : false;
}

/** 서버 컴포넌트·Route Handler용 (localStorage 없음, env + 기본값만) */
export function isFeatureEnabledServer(flag: BooleanFlagKey): boolean;
/** @deprecated 역호환용 — isJournalEngineOn 대신 사용 권장. */
export function isFeatureEnabledServer(flag: 'FEATURE_JOURNAL_ENGINE'): boolean;
export function isFeatureEnabledServer(flag: keyof FeatureFlags): boolean {
  if (flag === 'FEATURE_JOURNAL_ENGINE') {
    const envVal = typeof process !== 'undefined' ? process.env['NEXT_PUBLIC_FF_FEATURE_JOURNAL_ENGINE'] : undefined;
    if (envVal !== undefined) {
      if (isJournalEngineMode(envVal)) return envVal === 'on';
      if (envVal === 'true') return true;
      if (envVal === 'false') return false;
    }
    return FLAGS.FEATURE_JOURNAL_ENGINE === 'on';
  }

  const envKey = `NEXT_PUBLIC_FF_${flag}`;
  const envVal = typeof process !== 'undefined' ? process.env[envKey] : undefined;
  if (envVal === 'true') return true;
  if (envVal === 'false') return false;
  const v = FLAGS[flag];
  return typeof v === 'boolean' ? v : false;
}

// ============================================================
// PART 6 — Bulk accessor
// ============================================================

/** Get all flags with their current resolved values. */
export function getAllFlags(): FeatureFlags {
  const result = { ...FLAGS };
  for (const key of Object.keys(result) as (keyof FeatureFlags)[]) {
    if (key === 'FEATURE_JOURNAL_ENGINE') {
      result[key] = getJournalEngineMode();
      continue;
    }
    if (key === 'FEATURE_DRAFT_DETAIL_V2') {
      result[key] = getDraftDetailMode();
      continue;
    }
    // boolean-only keys
    result[key] = isFeatureEnabled(key as BooleanFlagKey) as FeatureFlags[typeof key];
  }
  return result;
}

// ============================================================
// PART 7 — Draft/Detail V2 mode accessor
// ============================================================

/** Get FEATURE_DRAFT_DETAIL_V2 mode with env override + localStorage dev toggle. */
export function getDraftDetailMode(): DraftDetailMode {
  // Server env override (프로덕션 전환에 사용)
  if (typeof process !== 'undefined') {
    const envVal = process.env.NEXT_PUBLIC_FEATURE_DRAFT_DETAIL_V2;
    if (isDraftDetailMode(envVal)) return envVal;
  }
  // Client localStorage override (개발·테스트용)
  if (typeof window !== 'undefined') {
    try {
      const lsVal = window.localStorage.getItem('noa_flag_draft_detail_v2');
      if (isDraftDetailMode(lsVal)) return lsVal;
    } catch {
      /* SSR / private mode — fallthrough */
    }
  }
  return FLAGS.FEATURE_DRAFT_DETAIL_V2;
}

/** 'on'만 true — UI 전면 활성 여부 */
export function isDraftDetailOn(): boolean {
  return getDraftDetailMode() === 'on';
}

/** 'shadow' 또는 'on' — 프롬프트 힌트 주입 조건 */
export function isDraftDetailActive(): boolean {
  const m = getDraftDetailMode();
  return m === 'shadow' || m === 'on';
}

// IDENTITY_SEAL: PART-1..6 | role=feature-flags | inputs=flag name | outputs=boolean|JournalEngineMode
