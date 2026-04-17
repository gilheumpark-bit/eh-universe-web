/**
 * Image Generation Service — DGX Spark API Gateway
 *
 * 게이트웨이 (api.ehuniverse.com/api/image/generate)가 내부에서
 * ComfyUI(8188) 워크플로우로 변환해 호출해주므로 클라이언트는 단순 프롬프트만 전송.
 *
 * 엔드포인트: POST ${COMFYUI_URL}/generate
 */

import { COMFYUI_URL } from '@/lib/dgx-models';
import { logger } from '@/lib/logger';

// ============================================================
// PART 1 — 타입
// ============================================================

export interface ComfyGenerateRequest {
  /** 이미지 프롬프트 (영문 권장, Flux가 영어에 최적화) */
  prompt: string;
  /** 네거티브 프롬프트 */
  negativePrompt?: string;
  width?: number;
  height?: number;
  /** 시드 (미지정 시 랜덤) */
  seed?: number;
  /** 스텝 수 — Flux-Schnell은 4 고정 권장 */
  steps?: number;
  /** CFG — Flux-Schnell은 1.0 고정 */
  cfg?: number;
}

export interface ComfyGenerateResult {
  promptId?: string;
  imageUrls: string[];
  firstImageUrl: string | null;
}

export interface ComfyRequestOpts {
  signal?: AbortSignal;
  /** 총 타임아웃 ms (기본 60s) */
  timeoutMs?: number;
}

interface GatewayGenerateResponse {
  prompt_id?: string;
  promptId?: string;
  images?: string[];
  image_urls?: string[];
  url?: string;
  error?: string;
}

// ============================================================
// PART 2 — 공개 API
// ============================================================

/**
 * 이미지 생성 — 게이트웨이 단일 호출로 완료.
 * 서버가 내부에서 Flux-Schnell 워크플로우 변환·폴링·URL 반환까지 처리.
 */
export async function comfyGenerate(
  req: ComfyGenerateRequest,
  opts?: ComfyRequestOpts,
): Promise<ComfyGenerateResult> {
  if (!req.prompt?.trim()) throw new Error('Empty prompt');

  const body = {
    prompt: req.prompt,
    negativePrompt: req.negativePrompt ?? '',
    width: req.width ?? 1024,
    height: req.height ?? 1024,
    seed: req.seed ?? Math.floor(Math.random() * 2 ** 32),
    steps: req.steps ?? 4,
    cfg: req.cfg ?? 1.0,
  };

  const signal = opts?.signal ?? AbortSignal.timeout(opts?.timeoutMs ?? 60_000);

  const res = await fetch(`${COMFYUI_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Image /generate failed: ${res.status} ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as GatewayGenerateResponse;
  if (data.error) throw new Error(`Image gen error: ${data.error}`);

  const imageUrls = Array.isArray(data.image_urls) ? data.image_urls
    : Array.isArray(data.images) ? data.images
    : data.url ? [data.url]
    : [];

  return {
    promptId: data.prompt_id ?? data.promptId,
    imageUrls,
    firstImageUrl: imageUrls[0] ?? null,
  };
}

/** 헬스 체크 — 게이트웨이 기반 */
export async function comfyHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${COMFYUI_URL}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    logger.debug('ComfyUI', 'health check failed');
    return false;
  }
}

// IDENTITY_SEAL: comfyuiService | role=image-client-gateway | inputs=prompt | outputs=imageUrls
