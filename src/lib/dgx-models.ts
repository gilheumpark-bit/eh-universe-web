/**
 * DGX Multi-Agent Model Routing
 *
 * 포트 매핑:
 * 1234 (qwen)        — 범용 보조 (기본 14B)
 * 1235 (abliterated)  — 소설 본문 생성 / 다크 묘사 (검열 삭제 14B)
 * 1236 (r1)           — 세계관 기획 / 논리 채점 (DeepSeek-R1 14B)
 * 1237 (eva)          — 캐릭터 빙의 / 대사 생성 (EVA 대화형 14B)
 *
 * 프론트엔드에서 model 키워드만 보내면 백엔드(main.py)가 포트를 라우팅함.
 */

/** 범용 보조 — 요약, 메뉴 헬퍼, 일반 채팅 */
export const MODEL_GENERAL = 'qwen';

/** 소설 본문 생성 — 전투씬, 감정 묘사, 다크 판타지 */
export const MODEL_WRITER = 'abliterated';

/** 세계관 기획 — 구조화 생성, 논리 채점, 모순 감지 */
export const MODEL_PLANNER = 'r1';

/** 캐릭터 빙의 — 대사 생성, 호감도 반응, 감정 연기 */
export const MODEL_ACTOR = 'eva';

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
