/**
 * DGX Spark (GB10) — 단일 게이트웨이 라우팅
 *
 * ── 백엔드 구성 ──
 * Engine A (포트 8080) + Engine B (포트 8081): Qwen 3.5-9B FP8 쌍포
 *   └ Nginx LB (포트 8090)가 least_conn 자동 분산
 * RAG API (포트 8082): ChromaDB 99만 문서 + 25 장르 규칙
 * ComfyUI  (포트 8188): Flux-Schnell FP8 이미지 생성
 *
 * 모든 외부 트래픽은 https://api.ehuniverse.com 게이트웨이 단일 진입.
 *   └ /v1/chat/completions → Nginx LB → Engine A/B
 *   └ /api/rag/*           → RAG API
 *   └ /api/image/generate  → ComfyUI
 *
 * ⚠️ 포트 직결(8080/8081/8082/8188)은 Cloudflare Tunnel에서 차단됨 — 반드시 게이트웨이 경유.
 * ✅ stream:true 요청은 게이트웨이가 `: heartbeat` 선행 + aiohttp 스트리밍으로
 *    Cloudflare Tunnel을 직접 관통. 별도 Edge 프록시 불필요. TTFT 0.13초.
 */

// ============================================================
// PART 1 — 엔드포인트
// ============================================================

/** 단일 API 게이트웨이 — 모든 백엔드 서비스의 진입점 */
export const SPARK_GATEWAY_URL =
  process.env.NEXT_PUBLIC_SPARK_GATEWAY_URL
  || process.env.NEXT_PUBLIC_SPARK_SERVER_URL
  || 'https://api.ehuniverse.com';

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
 * vLLM 서빙 모델 ID — 서버가 `--served-model-name`을 지정하지 않아 로드 경로 "/model"
 * 문자열이 그대로 모델 ID로 사용됨.
 */
export const VLLM_MODEL_ID = '/model';

/**
 * 메타데이터용 역할 힌트 — 실제 라우팅에는 사용되지 않음(Nginx LB가 처리).
 * 로깅/프롬프트 튜닝 힌트 용도로만 유지.
 */
export type AgentRole = 'general' | 'writer' | 'planner' | 'actor' | 'translator' | 'summarizer';

// ============================================================
// PART 3 — System Prompt 가드
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

// IDENTITY_SEAL: dgx-models | role=gateway-url+model-id+prompt-guard | inputs=- | outputs=URL+model-id+system-prompt
