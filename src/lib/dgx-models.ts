/**
 * DGX Spark (GB10) 4-Engine Integrated Backend Routing
 *
 * ── 쌍포 엔진 구성 (Qwen 3.5-9B FP8) ──
 * Engine A (포트 8080): 메인 소설 집필 / 메인 캐릭터 대사 생성
 * Engine B (포트 8081): 다국어 번역 / 줄거리 요약 / 설정 교정 등 보조
 * RAG API (포트 8082): 99만 개 세계관 설정 검색 + 프롬프트 조립
 * ComfyUI  (포트 8188): 소설 삽화 / 캐릭터 외형 (Flux-Schnell)
 *
 * 폴백: 두 엔진 모두 불가 시 통합 포트 8000 사용
 * TTFT 0.13초 — stream: true 필수 적용
 */

// ============================================================
// PART 1 — 엔드포인트 URL (환경변수 오버라이드 가능)
// ============================================================

/** Engine A — 메인 집필 */
export const SPARK_HEAVY_URL = process.env.NEXT_PUBLIC_SPARK_HEAVY_URL || 'http://localhost:8080';
/** Engine B — 번역/요약/보조 */
export const SPARK_FAST_URL = process.env.NEXT_PUBLIC_SPARK_FAST_URL || 'http://localhost:8081';
/** 통합 폴백 */
export const SPARK_UNIFIED_URL = process.env.SPARK_SERVER_URL || process.env.NEXT_PUBLIC_SPARK_SERVER_URL || 'http://localhost:8000';
/** RAG — 세계관 설정 검색 */
export const SPARK_RAG_URL = process.env.NEXT_PUBLIC_SPARK_RAG_URL || 'http://localhost:8082';
/** ComfyUI — 이미지 생성 */
export const COMFYUI_URL = process.env.NEXT_PUBLIC_COMFYUI_URL || 'http://localhost:8188';

// ============================================================
// PART 2 — 모델 ID 및 역할 매핑
// ============================================================

/**
 * vLLM 서빙 모델 ID — Engine A / B 동일 모델(Qwen 3.5-9B FP8)이라
 * 반드시 문자열 "/model"을 사용해야 한다.
 */
export const VLLM_MODEL_ID = '/model';

/** 역할 정의 — 메인 집필 vs 보조 작업 */
export type AgentRole = 'general' | 'writer' | 'planner' | 'actor' | 'translator' | 'summarizer';

/** 스펙: 메인 집필/메인 캐릭터 대사 → Engine A, 보조(번역·요약·교정) → Engine B */
const ROLE_ENGINE_MAP: Record<AgentRole, 'A' | 'B'> = {
  writer: 'A',        // 소설 본문 생성
  actor: 'A',         // 메인 캐릭터 대사
  planner: 'A',       // 세계관 기획 (본문 레벨)
  general: 'B',       // 일반 채팅/보조
  translator: 'B',    // 다국어 번역
  summarizer: 'B',    // 줄거리 요약 / 설정 교정
};

/**
 * getModelForRole — **라우팅 힌트 문자열** 반환.
 * 실제 vLLM payload의 model 필드는 반드시 VLLM_MODEL_ID("/model")로 보내야 하므로,
 * 여기서 반환하는 문자열은 resolveServerUrl()이 엔진 A/B를 고르는 데만 사용됨.
 *
 * writer/actor/planner → 'role:writer' 등 prefix 붙여 엔진 A 매칭
 * translator/summarizer/general → 'role:general' 등 prefix로 엔진 B 매칭
 */
export function getModelForRole(role: AgentRole): string {
  return `role:${role}`;
}

/** 역할 기반으로 A/B 엔진 URL 반환 */
export function getServerUrlForRole(role: AgentRole): string {
  return ROLE_ENGINE_MAP[role] === 'A' ? SPARK_HEAVY_URL : SPARK_FAST_URL;
}

/** 하위 호환 — 기존 코드가 MODEL_WRITER/MODEL_PLANNER 상수를 URL 라우팅 힌트로 쓰던 패턴 지원 */
export const MODEL_WRITER = 'role:writer';
export const MODEL_PLANNER = 'role:planner';
export const MODEL_ACTOR = 'role:actor';
export const MODEL_GENERAL = 'role:general';

/**
 * 모델 힌트 문자열 → 서버 URL 라우팅.
 * - "role:writer|actor|planner" → 엔진 A (8080)
 * - "role:general|translator|summarizer" → 엔진 B (8081)
 * - 기존 legacy 이름 (qwen-35b-heavy, novel, chapter…) → A
 * - 그 외 → 통합 폴백
 */
export function getServerUrlForModel(model: string, hintRole?: AgentRole): string {
  if (hintRole) return getServerUrlForRole(hintRole);
  const m = model.toLowerCase();
  if (m.startsWith('role:')) {
    const r = m.slice(5) as AgentRole;
    if (r in ROLE_ENGINE_MAP) return getServerUrlForRole(r);
  }
  if (/heavy|writer|actor|planner|novel|chapter/i.test(model)) return SPARK_HEAVY_URL;
  if (/fast|translate|summary|summarize|general|assist/i.test(model)) return SPARK_FAST_URL;
  return SPARK_UNIFIED_URL;
}

/** 폴백 URL — 지정 서버 실패 시 통합 포트 사용 */
export function getFallbackUrl(): string {
  return SPARK_UNIFIED_URL;
}

// ============================================================
// PART 3 — System Prompt 규격
// ============================================================

/**
 * [중요] 추론형 모델(Qwen 3.5-9B)의 영어 Thinking Process 출력 차단 가드.
 * Qwen3 지원 토큰 `/no_think` + 명시적 금지 문구 + <think> 태그 생성 차단.
 * 완전 차단은 불가능하므로 클라이언트측 stripEngineArtifacts가 최종 필터.
 */
export const NO_ENGLISH_THINKING_GUARD =
  '/no_think\n[절대 규칙]: <think> 태그, "Thinking Process:", "Reasoning:", "Let me analyze", 숫자 리스트 분석("1. Analyze...") 등 모든 형태의 사고 과정을 영어 또는 한국어로 출력하지 마십시오. <think></think> 블록도 생성 금지. 오직 완성된 한글 소설 본문만 즉시 출력하십시오. 첫 문자는 반드시 한글이어야 합니다.';

/**
 * 집필 시스템 프롬프트 빌더. 기존 systemInstruction이 있으면 뒤에 guard 문장을
 * 덧붙이고, 없으면 기본 작가 지시사항 + guard를 반환.
 */
export function buildSparkSystemPrompt(existing?: string): string {
  const base = existing?.trim() ?? "당신은 'EH Universe' 세계관을 집필하는 전문 웹소설 작가입니다.";
  if (base.includes('/no_think')) return base; // 이미 포함
  return `${base}\n\n${NO_ENGLISH_THINKING_GUARD}`;
}

// IDENTITY_SEAL: dgx-models | role=backend-routing+prompt-guard | inputs=role|model | outputs=URL+model-id+system-prompt
