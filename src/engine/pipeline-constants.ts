// ============================================================
// Pipeline Constants — Task 4 Draft/Detail Pass 타겟 범위
// ============================================================
// 2026-04-20 — 서버 max_model_len 16,384 + Qwen3.6-35B 사고 누출 특성을
// 반영한 현실적 타겟 재설정. "자동 2-stage" 기존안에서
// "Draft → Writer-choice Detail" 신규안으로 전환.
//
// 근거 (실측 2026-04-20):
//   - max_tokens 5,000 긴 창작 요청 시 100% 사고 소비 (T3 실패)
//   - max_tokens 1,000~2,000 범위는 본문 생성 안정 (T1/T2 성공)
//   - 3,500~4,000자 타겟 = 5,500~6,000 토큰 ← 안전 영역
//   - 작가 주도 원칙: Detail은 강제 아닌 선택

/**
 * Draft pass — AI 1회 호출로 생성하는 초안 목표 범위.
 * 이 범위에 들어오면 quality gate 통과.
 */
export const DRAFT_TARGET_CHARS = {
  min: 3500,
  ideal: 4000,
  max: 5500,
} as const;

/**
 * Detail pass — AI 선택형 확장 후 최종 목표 범위.
 * 기존 5,500~7,000자 전통 기준. Detail 경로 선택 시에만 유효.
 */
export const DETAIL_TARGET_CHARS = {
  min: 5000,
  ideal: 6000,
  max: 7000,
} as const;

/**
 * Detail pass — 확장 증분 권장치 (초안 대비).
 * 초안 4,000자 → Detail 2,000자 추가 → 최종 6,000자
 */
export const DETAIL_EXPANSION_INCREMENT = {
  minIncrement: 1500,
  idealIncrement: 2000,
  maxIncrement: 2500,
} as const;

/**
 * max_tokens 배당 — 서버 게이트웨이의 최소 2,048 강제 상향과 별개로
 * 클라이언트가 의도적으로 다른 값을 지정할 때 참조.
 *
 * 서버 override 동작:
 * - 클라이언트 max_tokens < 2,048 → 서버가 2,048로 상향
 * - 클라이언트 max_tokens ≥ 2,048 → 서버는 그대로 통과
 *
 * 따라서 아래 값은 "의도된 최대" 를 명시. 인라인 완성 같은 짧은 요청은
 * 클라이언트 측 조기 abort (abortController.abort()) 와 조합.
 */
export const MAX_TOKENS_BY_ROUTE = {
  /** Tab 인라인 완성 — 클라이언트 조기 abort로 실제 80 토큰에서 컷 */
  INLINE_COMPLETION: 80,
  /** Noah Assist 짧은 제안 */
  NOAH_ASSIST: 500,
  /** Background Speculation — 3옵션 캐싱용 */
  BACKGROUND_SPECULATION: 150,
  /** 메타 생성 (태그·제목) */
  META_GENERATION: 60,
  /** Draft pass — 4,000자 목표에 여유 포함 */
  DRAFT_PASS: 3000,
  /** Detail pass — 초안에 2,000자 증분 추가 */
  DETAIL_PASS: 3000,
  /** 전체 1화 1회 생성 (레거시 경로) */
  LEGACY_FULL: 4500,
} as const;

/**
 * 플랫폼별 Draft 목표 오버라이드.
 * PLATFORM_PRESETS 와 독립 — Draft 전용 가이드.
 */
export const PLATFORM_DRAFT_OVERRIDE = {
  NOVELPIA:   { min: 3500, ideal: 4000, max: 5000 },  // 가장 짧은 플랫폼
  KAKAOPAGE:  { min: 4000, ideal: 4500, max: 5500 },
  MUNPIA:     { min: 4500, ideal: 5000, max: 5500 },  // 가장 긴 플랫폼
  JOARA:      { min: 4000, ideal: 4500, max: 5500 },
  SYOSETU:    { min: 3500, ideal: 4000, max: 5000 },  // 일본
  WEBNOVEL:   { min: 4000, ideal: 4500, max: 5500 },  // 영미
  ROYALROAD:  { min: 4000, ideal: 4500, max: 5500 },  // 영미
  CUSTOM:     { min: 3500, ideal: 4000, max: 5500 },
  NONE:       { min: 3500, ideal: 4000, max: 5500 },
} as const;

export type PlatformDraftKey = keyof typeof PLATFORM_DRAFT_OVERRIDE;

/**
 * 플랫폼별 Draft 목표 조회 헬퍼.
 * 미지원 플랫폼은 CUSTOM fallback.
 */
export function getDraftTargetForPlatform(
  platform: string | null | undefined,
): { min: number; ideal: number; max: number } {
  if (!platform) return PLATFORM_DRAFT_OVERRIDE.NONE;
  const upper = platform.toUpperCase() as PlatformDraftKey;
  return PLATFORM_DRAFT_OVERRIDE[upper] ?? PLATFORM_DRAFT_OVERRIDE.CUSTOM;
}

// IDENTITY_SEAL: pipeline-constants | role=Draft/Detail 타겟+토큰 배당 | inputs=platform | outputs=char/token ranges
