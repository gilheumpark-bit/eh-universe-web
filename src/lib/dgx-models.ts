/**
 * DGX Dual-Engine Model Routing
 *
 * ── 투트랙 엔진 구성 ──
 * Heavy Core (포트 8080): Qwen 35B — 세계관 기획, 번역, 복잡 분석
 * Fast Core  (포트 8081): Qwen 0.8B — 초고속 집필, Tab 자동완성, 대사 생성
 * Image Core (포트 8188): FLUX.1 (ComfyUI) — 삽화/표지 렌더링
 *
 * 폴백: 두 포트 모두 불가 시 통합 포트 8000 (32B+1.5B Speculative) 사용
 */

// ── 엔진 URL ──
export const SPARK_HEAVY_URL = process.env.NEXT_PUBLIC_SPARK_HEAVY_URL || 'http://localhost:8080';
export const SPARK_FAST_URL = process.env.NEXT_PUBLIC_SPARK_FAST_URL || 'http://localhost:8081';
export const SPARK_UNIFIED_URL = process.env.SPARK_SERVER_URL || process.env.NEXT_PUBLIC_SPARK_SERVER_URL || 'http://localhost:8000';
export const COMFYUI_URL = process.env.NEXT_PUBLIC_COMFYUI_URL || 'http://localhost:8188';

// ── 모델 이름 ──
const MODEL_HEAVY = 'qwen-35b-heavy';
const MODEL_FAST = 'qwen-0.8b-fast';
const MODEL_UNIFIED = 'eh-universe-30b-fast';

/** 범용 보조 — 요약, 메뉴 헬퍼, 일반 채팅 → Heavy */
export const MODEL_GENERAL = MODEL_HEAVY;

/** 소설 본문 생성 — 전투씬, 감정 묘사, 빠른 타이핑 → Fast */
export const MODEL_WRITER = MODEL_FAST;

/** 세계관 기획 — 구조화 생성, 논리 채점, 모순 감지 → Heavy */
export const MODEL_PLANNER = MODEL_HEAVY;

/** 캐릭터 빙의 — 대사 생성, 호감도 반응, 감정 연기 → Fast */
export const MODEL_ACTOR = MODEL_FAST;

/** 기능별 모델 자동 선택 */
export type AgentRole = 'general' | 'writer' | 'planner' | 'actor';

const ROLE_MODEL_MAP: Record<AgentRole, string> = {
  general: MODEL_GENERAL,
  writer: MODEL_WRITER,
  planner: MODEL_PLANNER,
  actor: MODEL_ACTOR,
};

export function getModelForRole(role: AgentRole): string {
  return ROLE_MODEL_MAP[role];
}

/**
 * 모델/역할 기반으로 적절한 vLLM 서버 URL 반환.
 * Fast 모델 → 8081, Heavy 모델 → 8080, 폴백 → 8000 (통합)
 */
export function getServerUrlForModel(model: string): string {
  if (model === MODEL_FAST) return SPARK_FAST_URL;
  if (model === MODEL_HEAVY) return SPARK_HEAVY_URL;
  return SPARK_UNIFIED_URL;
}

export function getServerUrlForRole(role: AgentRole): string {
  return getServerUrlForModel(getModelForRole(role));
}

/** 폴백 URL — 지정 서버 실패 시 통합 포트 사용 */
export function getFallbackUrl(): string {
  return SPARK_UNIFIED_URL;
}
