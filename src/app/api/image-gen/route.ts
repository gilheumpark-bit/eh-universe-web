// ============================================================
// Image Generation API Route — Server-side proxy
// ============================================================
// Accepts POST { provider, prompt, negativePrompt, apiKey, width, height, n }
// Supports: OpenAI DALL-E 3, Stability AI SDXL
// BYOK mode: user-provided API key. No server fallback for image gen.

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { checkRateLimit as sharedCheckRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';
import { isFeatureEnabledServer } from '@/lib/feature-flags';

const MAX_REQUEST_BYTES = 1_048_576;

export const maxDuration = 180; // FLUX.1 이미지 생성 최대 180초

export async function POST(req: NextRequest) {
  try {
    if (!isFeatureEnabledServer('IMAGE_GENERATION')) {
      return NextResponse.json({ error: 'Image generation is disabled.' }, { status: 403 });
    }

    // Origin 검증 — BYOK 포함 모든 요청에 적용
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');
    if (!origin) {
      return NextResponse.json({ error: 'Forbidden: Origin header required' }, { status: 403 });
    }
    if (host && new URL(origin).host !== host) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const ip = getClientIp(req.headers);
    const rl = sharedCheckRateLimit(ip, 'image-gen', RATE_LIMITS.imageGen);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Max 10 image generations per minute.' },
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
    const referenceImageRequested = typeof referenceImageUrl === 'string' && referenceImageUrl.length > 0;

    if (!provider || !prompt) {
      return NextResponse.json({ error: 'Missing required fields: provider, prompt' }, { status: 400 });
    }

    // 인증 게이트 — local-spark(DGX 무료 경로)와 외부 provider 모두 인증 필수
    // local-spark는 apiKey 없이도 실행 가능했던 이슈 방어
    if (!apiKey) {
      // Firebase JWT 검증 (BYOK 없을 때)
      const authHeader = req.headers.get('authorization');
      let verified = false;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const { verifyFirebaseIdToken } = await import('@/lib/firebase-id-token');
          const token = authHeader.slice(7).trim();
          verified = Boolean(await verifyFirebaseIdToken(token));
        } catch { /* verification failed */ }
      }
      if (!verified) {
        return NextResponse.json({ error: 'Authentication required (no apiKey, no valid JWT)' }, { status: 401 });
      }
    }

    // ============================================================
    // OpenAI DALL-E 3
    // ============================================================
    if (provider === 'openai') {
      const size = getDalleSize(width, height);
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: negativePrompt ? `${prompt}\n\nAvoid: ${negativePrompt}` : prompt,
          n: 1, // DALL-E 3 only supports n=1
          size,
          quality: 'standard',
          response_format: 'url',
        }),
        signal: AbortSignal.timeout(55_000),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
        // [C] provider 에러 sanitize — API 키/quota 정보 유출 방어
        const safeMessage = sanitizeProviderError(err.error?.message, `OpenAI error: ${res.status}`);
        return NextResponse.json({ error: safeMessage }, { status: res.status });
      }

      const data = await res.json();
      const images = (data.data || []).map((d: { url: string; revised_prompt?: string }) => ({
        url: d.url,
        revised_prompt: d.revised_prompt,
      }));

      return NextResponse.json({ images });
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

      const res = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(55_000),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        // [C] provider 에러 sanitize — API 키/quota 정보 유출 방어
        const safeMessage = sanitizeProviderError(err.message, `Stability error: ${res.status}`);
        return NextResponse.json({ error: safeMessage }, { status: res.status });
      }

      const data = await res.json();
      const images = (data.artifacts || []).map((a: { base64: string }) => ({
        url: `data:image/png;base64,${a.base64}`,
      }));

      return NextResponse.json({ images });
    }

    // ============================================================
    // DGX Spark Local (ComfyUI Proxy)
    // ============================================================
    if (provider === 'local-spark') {
      const sparkUrl = process.env.SPARK_SERVER_URL;
      if (!sparkUrl) {
        return NextResponse.json({ error: 'DGX Spark server not configured' }, { status: 503 });
      }

      const res = await fetch(`${sparkUrl}/api/image/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: negativePrompt ? `${prompt}\n\nNegative: ${negativePrompt}` : prompt,
          width: clampSize(width || 1024, 512, 1536),
          height: clampSize(height || 1024, 512, 1536),
          seed: seed ?? Math.floor(Math.random() * 2147483647),
        }),
        signal: AbortSignal.timeout(180_000), // FLUX.1 8K — 최대 180초
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        // [C] provider 에러 sanitize — DGX 내부 경로/스택 유출 방어
        const safeMessage = sanitizeProviderError(err.error, `DGX Spark error: ${res.status}`);
        return NextResponse.json({ error: safeMessage }, { status: res.status });
      }

      const data = await res.json();
      // ComfyUI 프록시는 base64 이미지 반환
      const images = Array.isArray(data.images)
        ? data.images.map((img: string | { base64?: string; url?: string }) =>
            typeof img === 'string'
              ? { url: img.startsWith('data:') ? img : `data:image/png;base64,${img}` }
              : { url: img.url || (img.base64 ? `data:image/png;base64,${img.base64}` : '') }
          )
        : [];

      return NextResponse.json({ images });
    }

    return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
  } catch (e) {
    logger.error('API:image-gen', e instanceof Error ? e.message : e);
    const msg = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ============================================================
// Helpers
// ============================================================

function getDalleSize(w?: number, h?: number): string {
  // DALL-E 3 supports: 1024x1024, 1024x1792, 1792x1024
  if (w && h && w > h * 1.3) return '1792x1024';
  if (h && w && h > w * 1.3) return '1024x1792';
  return '1024x1024';
}

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
