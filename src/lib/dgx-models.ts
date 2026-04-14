/**
 * DGX Unified Model Routing
 *
 * 32B + 1.5B Speculative Decoding 단일 엔진 (vLLM)
 * 서빙 이름: eh-universe-30b-fast
 * 포트: 8000 (통합)
 *
 * 레거시 다중 모델(1234~1237) 폐기 → 단일 32B가 모든 역할 수행.
 * 역할별 상수는 프롬프트 라우팅용으로 유지 (모델은 동일).
 */

const UNIFIED_MODEL = 'eh-universe-30b-fast';

/** 범용 보조 — 요약, 메뉴 헬퍼, 일반 채팅 */
export const MODEL_GENERAL = UNIFIED_MODEL;

/** 소설 본문 생성 — 전투씬, 감정 묘사, 다크 판타지 */
export const MODEL_WRITER = UNIFIED_MODEL;

/** 세계관 기획 — 구조화 생성, 논리 채점, 모순 감지 */
export const MODEL_PLANNER = UNIFIED_MODEL;

/** 캐릭터 빙의 — 대사 생성, 호감도 반응, 감정 연기 */
export const MODEL_ACTOR = UNIFIED_MODEL;

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
