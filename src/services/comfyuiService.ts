/**
 * ComfyUI Service Client — DGX Spark 포트 8188
 *
 * 소설 삽화 / 캐릭터 외형 이미지 생성 (Flux-Schnell).
 *
 * 프로토콜:
 *   POST /prompt       — 워크플로우 JSON 전송 (prompt_id 반환)
 *   GET  /history/{id} — 결과 폴링
 *   GET  /view?...     — 생성된 이미지 다운로드
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
  /** 체크포인트 모델명 — 서버 워크플로우 템플릿에 맞춰 */
  model?: string;
}

export interface ComfyPromptResponse {
  prompt_id: string;
  number?: number;
  node_errors?: Record<string, unknown>;
}

export interface ComfyHistoryEntry {
  outputs?: Record<string, { images?: Array<{ filename: string; subfolder?: string; type?: string }> }>;
  status?: { completed?: boolean; status_str?: string };
}

export interface ComfyGenerateResult {
  promptId: string;
  imageUrls: string[];
  /** 최초 이미지 URL (편의) */
  firstImageUrl: string | null;
}

export interface ComfyRequestOpts {
  signal?: AbortSignal;
  /** 총 타임아웃 ms (기본 60s — Flux-Schnell 4step는 보통 2-4초) */
  timeoutMs?: number;
  /** 폴링 간격 ms (기본 500) */
  pollIntervalMs?: number;
}

// ============================================================
// PART 2 — Flux-Schnell 기본 워크플로우 템플릿
// ============================================================

/**
 * Flux-Schnell 표준 워크플로우.
 * 서버 측 체크포인트/샘플러 이름이 다르면 `model` 인자로 오버라이드 가능.
 */
function buildFluxSchnellWorkflow(req: ComfyGenerateRequest): Record<string, unknown> {
  const {
    prompt,
    negativePrompt = '',
    width = 1024,
    height = 1024,
    seed = Math.floor(Math.random() * 2 ** 32),
    steps = 4,
    cfg = 1.0,
    model = 'flux1-schnell.safetensors',
  } = req;

  return {
    '6': {
      class_type: 'CLIPTextEncode',
      inputs: { text: prompt, clip: ['11', 0] },
    },
    '7': {
      class_type: 'CLIPTextEncode',
      inputs: { text: negativePrompt, clip: ['11', 0] },
    },
    '8': {
      class_type: 'VAEDecode',
      inputs: { samples: ['13', 0], vae: ['10', 0] },
    },
    '9': {
      class_type: 'SaveImage',
      inputs: { filename_prefix: 'eh-universe', images: ['8', 0] },
    },
    '10': {
      class_type: 'VAELoader',
      inputs: { vae_name: 'ae.safetensors' },
    },
    '11': {
      class_type: 'DualCLIPLoader',
      inputs: { clip_name1: 't5xxl_fp8_e4m3fn.safetensors', clip_name2: 'clip_l.safetensors', type: 'flux' },
    },
    '12': {
      class_type: 'UNETLoader',
      inputs: { unet_name: model, weight_dtype: 'fp8_e4m3fn' },
    },
    '13': {
      class_type: 'KSampler',
      inputs: {
        seed,
        steps,
        cfg,
        sampler_name: 'euler',
        scheduler: 'simple',
        denoise: 1.0,
        model: ['12', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['14', 0],
      },
    },
    '14': {
      class_type: 'EmptyLatentImage',
      inputs: { width, height, batch_size: 1 },
    },
  };
}

// ============================================================
// PART 3 — 공개 API
// ============================================================

/**
 * 이미지 생성 — 요청 → 폴링 → URL 반환까지 통합.
 */
export async function comfyGenerate(
  req: ComfyGenerateRequest,
  opts?: ComfyRequestOpts,
): Promise<ComfyGenerateResult> {
  if (!req.prompt?.trim()) throw new Error('Empty prompt');

  const workflow = buildFluxSchnellWorkflow(req);
  const clientId = `eh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  // 1) 프롬프트 제출
  const submitRes = await fetch(`${COMFYUI_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow, client_id: clientId }),
    signal: opts?.signal ?? AbortSignal.timeout(10_000),
  });
  if (!submitRes.ok) {
    const text = await submitRes.text().catch(() => '');
    throw new Error(`ComfyUI /prompt failed: ${submitRes.status} ${text.slice(0, 200)}`);
  }
  const submit = (await submitRes.json()) as ComfyPromptResponse;
  const promptId = submit.prompt_id;
  if (!promptId) throw new Error('ComfyUI: no prompt_id returned');

  // 2) 결과 폴링 (history)
  const pollInterval = opts?.pollIntervalMs ?? 500;
  const totalTimeout = opts?.timeoutMs ?? 60_000;
  const deadline = Date.now() + totalTimeout;

  while (Date.now() < deadline) {
    if (opts?.signal?.aborted) throw new Error('Aborted by caller');
    await new Promise(r => setTimeout(r, pollInterval));

    try {
      const histRes = await fetch(`${COMFYUI_URL}/history/${promptId}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!histRes.ok) continue;
      const hist = (await histRes.json()) as Record<string, ComfyHistoryEntry>;
      const entry = hist[promptId];
      if (!entry) continue;

      const completed = entry.status?.completed === true || entry.status?.status_str === 'success';
      if (!completed) continue;

      const outputs = entry.outputs ?? {};
      const imageUrls: string[] = [];
      for (const nodeId of Object.keys(outputs)) {
        const images = outputs[nodeId]?.images ?? [];
        for (const img of images) {
          const params = new URLSearchParams({
            filename: img.filename,
            type: img.type ?? 'output',
          });
          if (img.subfolder) params.set('subfolder', img.subfolder);
          imageUrls.push(`${COMFYUI_URL}/view?${params.toString()}`);
        }
      }
      return { promptId, imageUrls, firstImageUrl: imageUrls[0] ?? null };
    } catch (err) {
      logger.warn('ComfyUI', 'poll error (will retry)', err);
    }
  }

  throw new Error('ComfyUI generation timeout');
}

/** 헬스 체크 */
export async function comfyHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${COMFYUI_URL}/system_stats`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

// IDENTITY_SEAL: comfyuiService | role=comfyui-client-8188 | inputs=prompt | outputs=imageUrls
