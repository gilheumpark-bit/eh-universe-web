/**
 * DGX Spark (GB10) — vLLM 직결 (2026-04-20 업데이트)
 *
 * ── 현 백엔드 구성 ──
 * vLLM 포트 8001: Qwen 3.6-35B-A3B-FP8 MoE (128GB 단일 장비 최적화)
 *   └ 모델 ID: qwen36 (served-model-name)
 *   └ max_model_len: 8192 tokens
 *   └ FlashInfer + N-Gram Speculative Decoding (40~50 tok/s)
 * RAG API (포트 8082): ChromaDB 99만 문서 + 25 장르 규칙
 * ComfyUI  (포트 8188): Flux-Schnell FP8 이미지 생성
 *
 * ── 엔드포인트 우선순위 ──
 * 1. NEXT_PUBLIC_SPARK_GATEWAY_URL (명시) — 프로덕션 게이트웨이
 * 2. NEXT_PUBLIC_SPARK_SERVER_URL (명시) — 로컬 네트워크 직결
 * 3. 기본값: http://192.168.219.100:8001 (내부망 기본)
 *
 * ── 이력 ──
 * - 이전: Engine A/B 쌍포(9B) + Nginx LB(8090) + https://api.ehuniverse.com 게이트웨이
 * - 변경 사유: 35B MoE 단일 모델이 쌍포 9B보다 품질 우위,
 *   FlashInfer + N-Gram Spec Decoding 으로 속도도 역전.
 *
 * ⚠️ Cloudflare Tunnel 통한 포트 직결은 차단. 게이트웨이 재구성 전까지는
 *    내부망(192.168.x.x) 직결로 운용.
 * ✅ stream:true 요청 — vLLM OpenAI 호환 엔드포인트가 직접 SSE 송출.
 */

// ============================================================
// PART 1 — 엔드포인트
// ============================================================

/** 단일 API 게이트웨이 — 모든 백엔드 서비스의 진입점 */
export const SPARK_GATEWAY_URL =
  process.env.NEXT_PUBLIC_SPARK_GATEWAY_URL
  || process.env.NEXT_PUBLIC_SPARK_SERVER_URL
  || 'http://192.168.219.100:8001';

/** RAG — 세계관 설정 검색 */
export const SPARK_RAG_URL =
  process.env.NEXT_PUBLIC_SPARK_RAG_URL || `${SPARK_GATEWAY_URL}/api/rag`;

/** Image — Flux-Schnell 이미지 생성 */
export const COMFYUI_URL =
  process.env.NEXT_PUBLIC_COMFYUI_URL || `${SPARK_GATEWAY_URL}/api/image`;

// ============================================================
// PART 2 — 모델 ID (Engine A/B 동일 모델이라 경로 문자열 사용)
// ============================================================

/**
 * vLLM 서빙 모델 ID — 서버의 `--served-model-name` 값과 일치해야 함.
 * - 신 구성 (35B MoE): 'qwen36'
 * - 구 구성 (9B 쌍포): '/model'
 * env 우선, 기본값은 현 프로덕션 구성 고정.
 */
export const VLLM_MODEL_ID =
  process.env.VLLM_MODEL_ID
  || process.env.NEXT_PUBLIC_VLLM_MODEL_ID
  || 'qwen36';

/**
 * 메타데이터용 역할 힌트 — 실제 라우팅에는 사용되지 않음(단일 모델 서빙).
 * 로깅/프롬프트 튜닝 힌트 용도로만 유지.
 */
export type AgentRole = 'general' | 'writer' | 'planner' | 'actor' | 'translator' | 'summarizer';

// ============================================================
// PART 3 — System Prompt 가드
// ============================================================

/**
 * [중요] 추론형 모델(Qwen 3.6-35B-A3B-FP8 MoE)의 영어 Thinking Process 출력 차단 가드.
 * Qwen3 지원 토큰 `/no_think` + 명시적 금지 문구 + <think> 태그 생성 차단.
 * 2026-04-20 프로브 결과: 새 35B 서버에서도 "Here's a thinking process:\n1. Analyze..."
 * 형태로 여전히 누출 확인됨. 가드 유지 필수.
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

// IDENTITY_SEAL: dgx-models | role=gateway-url+model-id+prompt-guard | inputs=- | outputs=URL+model-id+system-prompt
