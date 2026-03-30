// ============================================================
// Image Generation API Route — Server-side proxy
// ============================================================
// Accepts POST { provider, prompt, negativePrompt, apiKey, width, height, n }
// Supports: OpenAI DALL-E 3, Stability AI SDXL
// BYOK mode: user-provided API key. No server fallback for image gen.

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { checkRateLimit as sharedCheckRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';

const MAX_REQUEST_BYTES = 1_048_576;

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
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
    const { provider, prompt, negativePrompt, apiKey, width, height, n } = body;

    if (!provider || !prompt || !apiKey) {
      return NextResponse.json({ error: 'Missing required fields: provider, prompt, apiKey' }, { status: 400 });
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
        return NextResponse.json({ error: err.error?.message || `OpenAI error: ${res.status}` }, { status: res.status });
      }

      const data = await res.json();
      const images = (data.data || []).map((d: { url: string; revised_prompt?: string }) => ({
        url: d.url,
        revised_prompt: d.revised_prompt,
      }));

      return NextResponse.json({ images });
    }

    // ============================================================
    // Stability AI (SDXL)
    // ============================================================
    if (provider === 'stability') {
      const res = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          text_prompts: [
            { text: prompt, weight: 1 },
            ...(negativePrompt ? [{ text: negativePrompt, weight: -1 }] : []),
          ],
          cfg_scale: 7,
          width: clampSize(width || 1024, 512, 1536),
          height: clampSize(height || 1024, 512, 1536),
          steps: 30,
          samples: Math.min(n || 1, 4),
        }),
        signal: AbortSignal.timeout(55_000),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        return NextResponse.json({ error: err.message || `Stability error: ${res.status}` }, { status: res.status });
      }

      const data = await res.json();
      const images = (data.artifacts || []).map((a: { base64: string }) => ({
        url: `data:image/png;base64,${a.base64}`,
      }));

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
