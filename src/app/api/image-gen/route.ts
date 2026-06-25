// ============================================================
// Visual Generation API Route — disabled by default, internal/development opt-in only
// ============================================================
// Accepts POST { provider, prompt, negativePrompt, apiKey, width, height, n }
// Supports: OpenAI GPT Image, Stability AI SDXL when IMAGE_GENERATION is explicitly enabled.
// Connection-key mode: user-provided provider key. No server fallback.

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { checkRateLimitAsync as sharedCheckRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';
import '@/lib/server-ai-init';
import { isFeatureEnabledServer } from '@/lib/feature-flags';
// [N2 — 2026-06-11] 전 AI 경로 서버 단일 게이트: runNoa 입력 판정 + filterTrademarks 출력 IP 필터
import { applyNoaGate, filterOutputIp } from '@/lib/noa/server-gate';
import { checkSameOriginHeaders } from '@/lib/api-origin-guard';
import { enforceServerTierLimit } from '@/lib/server-tier-limit';

const MAX_REQUEST_BYTES = 1_048_576;

export const maxDuration = 180; // FLUX.1 이미지 생성 최대 180초

export async function POST(req: NextRequest) {
  try {
    if (!isFeatureEnabledServer('IMAGE_GENERATION')) {
      return NextResponse.json({ error: 'Visual endpoint is disabled.' }, { status: 403 });
    }

    // Origin 검증 — BYOK 포함 모든 요청에 적용
    const originCheck = checkSameOriginHeaders(req.headers);
    if (!originCheck.ok) {
      return NextResponse.json({ error: originCheck.error }, { status: 403 });
    }

    const ip = getClientIp(req.headers);
    const rl = await sharedCheckRateLimit(ip, 'image-gen', RATE_LIMITS.imageGen);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Max 10 visual requests per minute.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }

    const contentLength = parseInt(req.headers.get('content-length') || '0', 10);
    if (contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    const body = await req.json();
    // referenceImageUrl은 현재 서버에서 파싱만 하고 무시 — 프로바이더별 img2img 지원 여부에 따라
    // 향후 분기 구현 예정. 사용자에게 오해가 없도록 응답에 metadata로 명시.
    const { provider, prompt, negativePrompt, apiKey, width, height, n, seed, referenceImageUrl } = body;
    const providerApiKey = typeof apiKey === 'string' ? apiKey.trim() : '';
    const referenceImageRequested = typeof referenceImageUrl === 'string' && referenceImageUrl.length > 0;

    if (!provider || !prompt) {
      return NextResponse.json({ error: 'Missing required fields: provider, prompt' }, { status: 400 });
    }

    if ((provider === 'openai' || provider === 'stability') && !providerApiKey) {
      return NextResponse.json({ error: '이 시각 시안 방식에는 연결 키가 필요합니다.' }, { status: 400 });
    }

    if (provider === 'local-spark') {
      const tierGate = await enforceServerTierLimit({
        headers: req.headers,
        ip,
        route: '/api/image-gen',
        feature: 'image-generation',
        hasByok: false,
      });
      if (!tierGate.ok) return tierGate.response;
    }

    // [N2] NOA 서버 게이트 — 입력 판정 (이미지 prompt + negativePrompt 모두 사용자 입력. AI 호출 전 차단).
    // 차단 계약: 200 + { blocked, reason, gradeRequired } (N4 고지 UI 와 공유 — 사일런트 차단 금지).
    const prismGrade = typeof body.prismMode === 'string' ? body.prismMode : undefined;
    const gateText = [prompt, negativePrompt]
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      .join('\n');
    const gate = await applyNoaGate({
      prompt: gateText,
      grade: prismGrade, // PRISM 등급 연동 차등 (ALL=최엄격 → M18=완화)
      domain: prismGrade ? undefined : 'creative', // 등급 미전달 시 기본: 일러스트 생성 — creative 가중
      sourceTier: providerApiKey ? 1 : 2,
      route: '/api/image-gen',
      ip,
    });
    if (gate.blocked) {
      return NextResponse.json({ blocked: true, reason: gate.reason, gradeRequired: gate.gradeRequired }, { status: 200 });
    }

    // ============================================================
    // OpenAI GPT Image
    // ============================================================
    if (provider === 'openai') {
      const size = getOpenAIImageSize(width, height);
      // [P14 풀점검 루프 3] fetchWithRetry — 5xx/429/timeout 만 재시도 (4xx 즉시 반환).
      const res = await fetchWithRetry('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${providerApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-image-2',
          prompt: negativePrompt ? `${prompt}\n\nAvoid: ${negativePrompt}` : prompt,
          n: Math.min(n || 1, 4),
          size,
          quality: 'auto',
        }),
        signal: AbortSignal.timeout(55_000),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
        // [C] provider 에러 sanitize — 연결 키/quota 정보 유출 방어
        const safeMessage = sanitizeProviderError(err.error?.message, `OpenAI error: ${res.status}`);
        return NextResponse.json({ error: safeMessage }, { status: res.status });
      }

      // [fix] null-response: res.json()이 null/비객체 200 바디를 반환하면 data.data 접근이 throw → 일반 500으로 격하. 객체 가드.
      const data = asObject(await res.json());
      // [N2] 출력 IP 필터 — revised_prompt 는 사용자에게 노출되는 AI 텍스트 (fail-open).
      // 이미지 픽셀 자체는 텍스트 필터 적용 불가 — 정직 보고: 입력 게이트로만 방어.
      const images = (data.data || []).map((d: { url?: string; b64_json?: string; revised_prompt?: string }) => ({
        url: d.url || (d.b64_json ? `data:image/png;base64,${d.b64_json}` : ''),
        revised_prompt: d.revised_prompt
          ? filterOutputIp(d.revised_prompt, '/api/image-gen').output
          : d.revised_prompt,
      }));

      return NextResponse.json({
        images,
        metadata: {
          providerUsed: 'openai',
          referenceImageRequested,
          referenceImageApplied: false,
          referenceImageNote: referenceImageRequested
            ? 'referenceImageUrl ignored — this route uses OpenAI text-to-image generation only.'
            : undefined,
        },
      });
    }

    // ============================================================
    // Stability AI (SDXL) — Text to Image & Auto-seed
    // ============================================================
    if (provider === 'stability') {
      const payload: Record<string, unknown> = {
        text_prompts: [
          { text: prompt, weight: 1 },
          ...(negativePrompt ? [{ text: negativePrompt, weight: -1 }] : []),
        ],
        cfg_scale: 7,
        width: clampSize(width || 1024, 512, 1536),
        height: clampSize(height || 1024, 512, 1536),
        steps: 30,
        samples: Math.min(n || 1, 4),
      };

      if (seed !== undefined && seed !== null) {
        payload.seed = Number(seed);
      }

      // [P14 풀점검 루프 3] fetchWithRetry
      const res = await fetchWithRetry('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${providerApiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(55_000),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        // [C] provider 에러 sanitize — 연결 키/quota 정보 유출 방어
        const safeMessage = sanitizeProviderError(err.message, `Stability error: ${res.status}`);
        return NextResponse.json({ error: safeMessage }, { status: res.status });
      }

      // [fix] null-response: null/비객체 200 바디에서 data.artifacts 접근 throw 방어 (line 124 동형 결함).
      const data = asObject(await res.json());
      const images = (data.artifacts || []).map((a: { base64: string }) => ({
        url: `data:image/png;base64,${a.base64}`,
      }));

      return NextResponse.json({
        images,
        metadata: {
          providerUsed: 'stability',
          referenceImageRequested,
          referenceImageApplied: false,
          referenceImageNote: referenceImageRequested
            ? 'referenceImageUrl ignored — this route uses the text-to-image SDXL endpoint.'
            : undefined,
        },
      });
    }

    // ============================================================
    // DGX Spark Local (ComfyUI Proxy)
    // ============================================================
    if (provider === 'local-spark') {
      const sparkUrl = process.env.SPARK_SERVER_URL;
      if (!sparkUrl) {
        return NextResponse.json({ error: 'DGX Spark server not configured' }, { status: 503 });
      }

      // [P14 풀점검 루프 3] DGX 도 transient 실패 재시도. 단 timeout 이 180s 라
      // 재시도 횟수는 1로 제한 (총 2 시도) — 누적 시간 폭주 방지.
      const res = await fetchWithRetry(`${sparkUrl}/api/image/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: negativePrompt ? `${prompt}\n\nNegative: ${negativePrompt}` : prompt,
          width: clampSize(width || 1024, 512, 1536),
          height: clampSize(height || 1024, 512, 1536),
          seed: seed ?? Math.floor(Math.random() * 2147483647),
        }),
        signal: AbortSignal.timeout(180_000), // FLUX.1 8K — 최대 180초
      }, { maxRetries: 1, baseDelayMs: 2000 });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        // [C] provider 에러 sanitize — DGX 내부 경로/스택 유출 방어
        const safeMessage = sanitizeProviderError(err.error, `DGX Spark error: ${res.status}`);
        return NextResponse.json({ error: safeMessage }, { status: res.status });
      }

      // [fix] null-response: null/비객체 200 바디에서 data.images 접근 throw 방어 (line 124 동형 결함).
      const data = asObject(await res.json());
      // ComfyUI 프록시는 base64 이미지 반환
      const images = Array.isArray(data.images)
        ? data.images.map((img: string | { base64?: string; url?: string }) =>
            typeof img === 'string'
              ? { url: img.startsWith('data:') ? img : `data:image/png;base64,${img}` }
              : { url: img.url || (img.base64 ? `data:image/png;base64,${img.base64}` : '') }
          )
        : [];

      return NextResponse.json({
        images,
        metadata: {
          providerUsed: 'local-spark',
          referenceImageRequested,
          referenceImageApplied: false,
          referenceImageNote: referenceImageRequested
            ? 'referenceImageUrl ignored — ComfyUI proxy currently exposes text-to-image only.'
            : undefined,
        },
      });
    }

    return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
  } catch (e) {
    logger.error('API:image-gen', e instanceof Error ? e.message : e);
    const msg = e instanceof Error ? e.message : 'Internal server error';
    // [P14 풀점검 루프 3] AbortError (timeout) → 504 Gateway Timeout.
    // 그 외 (네트워크/예외) → 500. provider 정보 유출 방지를 위해 sanitize.
    const errName = (e as { name?: string } | null)?.name ?? '';
    if (errName === 'AbortError' || errName === 'TimeoutError') {
      return NextResponse.json(
        { error: 'Upstream provider timeout — please retry' },
        { status: 504 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ============================================================
// Helpers
// ============================================================

function getOpenAIImageSize(w?: number, h?: number): string {
  // GPT Image supports flexible sizes; keep this route on conservative presets.
  if (w && h && w > h * 1.3) return '1536x1024';
  if (h && w && h > w * 1.3) return '1024x1536';
  return '1024x1024';
}

/**
 * [P14 풀점검 루프 3] 외부 provider 호출 재시도 래퍼.
 * 5xx / 429 / timeout (AbortError) / 네트워크 에러만 재시도. 4xx 는 즉시 반환.
 * 지수 백오프 + 50% 지터. 기본 2회 재시도 (총 3회 시도).
 *
 * Next.js route.ts 는 GET/POST 등만 export 허용 — 헬퍼는 module-scope 함수로 유지.
 */
async function fetchWithRetry(
  input: string,
  init: RequestInit,
  options: { maxRetries?: number; baseDelayMs?: number } = {},
): Promise<Response> {
  const maxRetries = options.maxRetries ?? 2;
  const baseDelay = options.baseDelayMs ?? 500;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const res = await fetch(input, init);
      // 5xx / 429 만 재시도. 그 외 4xx 는 즉시 반환.
      if (res.status >= 500 || res.status === 429) {
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt) * (0.75 + Math.random() * 0.5);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      }
      return res;
    } catch (err) {
      lastError = err;
      // AbortError (timeout) 또는 네트워크 에러 → 재시도
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) * (0.75 + Math.random() * 0.5);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
    }
  }
  // 모든 재시도 실패 → 마지막 에러 throw (caller 가 504 변환)
  throw lastError ?? new Error('fetchWithRetry: all attempts failed');
}

/**
 * [fix] null-response: res.json()이 null·배열·문자열·숫자 등 비-객체 JSON 200 바디를 반환할 때
 * 후속 프로퍼티 접근(data.data / data.artifacts / data.images)이 throw 되어 catch → 일반 500 으로
 * 격하되는 것을 방어. 비-객체면 빈 객체로 대체 → 기존 `(... || [])` 분기가 정상 동작 (빈 결과 반환).
 * 정상 객체 응답은 그대로 통과 — 동작 동등성 유지.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
function asObject(value: unknown): Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function clampSize(val: number, min: number, max: number): number {
  // Stability requires multiples of 64
  const clamped = Math.max(min, Math.min(max, val));
  return Math.round(clamped / 64) * 64;
}

/**
 * Sanitize provider error messages — redact API keys, tokens, long hex/base64 strings,
 * and clamp length to prevent quota/identifier leakage.
 */
function sanitizeProviderError(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string' || !raw) return fallback;
  return raw
    .replace(/sk-[A-Za-z0-9_-]{10,}/g, 'sk-***')
    .replace(/(?:Bearer|Basic)\s+\S+/gi, '[REDACTED]')
    .replace(/(?:api[_-]?)?key[=:]\s*\S+/gi, 'key=[REDACTED]')
    .replace(/[A-Za-z0-9_-]{32,}/g, '[REDACTED]')
    .slice(0, 200);
}
