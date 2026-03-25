// ============================================================
// PART 0: API Route — Server-side AI proxy
// ============================================================
// Accepts POST { provider, model, systemInstruction, messages, temperature, apiKey? }
// If apiKey is provided (BYOK mode), uses it.
// Otherwise falls back to server environment variables.
// Keys NEVER appear in client JS bundles.

import { NextRequest, NextResponse } from 'next/server';
import { isServerProviderId, resolveServerProviderKey } from '@/lib/server-ai';

// ============================================================
// PART 1: ENV KEY FALLBACKS & CONSTANTS
// ============================================================
const MAX_REQUEST_BYTES = 1_048_576; // 1MB
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;

// In-memory rate limiter (per IP, sliding window) with size cap
const RATE_LIMIT_MAX_ENTRIES = 10_000;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

let lastCleanup = Date.now();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();

  // Lazy cleanup — runs inline every RATE_LIMIT_WINDOW_MS instead of setInterval
  // (setInterval is unreliable in serverless/edge environments)
  if (now - lastCleanup > RATE_LIMIT_WINDOW_MS) {
    for (const [k, v] of rateLimitMap) {
      if (now > v.resetAt) rateLimitMap.delete(k);
    }
    lastCleanup = now;
  }

  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    if (rateLimitMap.size >= RATE_LIMIT_MAX_ENTRIES) {
      const firstKey = rateLimitMap.keys().next().value;
      if (firstKey !== undefined) rateLimitMap.delete(firstKey);
    }
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) return false;
  entry.count++;
  return true;
}

// ============================================================
// PART 2: OPENAI-COMPATIBLE STREAMING
// ============================================================

const OPENAI_COMPAT_URLS: Record<string, string> = {
  openai:  'https://api.openai.com/v1/chat/completions',
  groq:    'https://api.groq.com/openai/v1/chat/completions',
  mistral: 'https://api.mistral.ai/v1/chat/completions',
};

async function streamOpenAICompat(
  provider: string, apiKey: string, model: string,
  system: string, messages: { role: string; content: string }[], temperature: number
): Promise<ReadableStream> {
  const url = OPENAI_COMPAT_URLS[provider];
  if (!url) throw new Error(`Unknown provider: ${provider}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, ...messages],
      temperature,
      stream: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`${provider} API ${res.status}: ${err}`);
  }

  if (!res.body) throw new Error('Empty response body');
  return res.body;
}

// ============================================================
// PART 3: CLAUDE STREAMING
// ============================================================

async function streamClaude(
  apiKey: string, model: string,
  system: string, messages: { role: string; content: string }[], temperature: number,
  maxTokens?: number
): Promise<ReadableStream> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model, max_tokens: maxTokens ?? 8192, system, messages, temperature, stream: true }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Claude API ${res.status}: ${err}`);
  }

  if (!res.body) throw new Error('Empty response body');
  return res.body;
}

// ============================================================
// PART 4: GEMINI STREAMING
// ============================================================

async function streamGemini(
  apiKey: string, model: string,
  system: string, messages: { role: string; content: string }[], temperature: number
): Promise<ReadableStream> {
  const contents = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  // Use header auth to avoid key leaking in URL/server logs
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: system }] },
      generationConfig: { temperature, topP: 0.95 },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Gemini API ${res.status}: ${err}`);
  }

  if (!res.body) throw new Error('Empty response body');
  return res.body;
}

// ============================================================
// PART 5: POST HANDLER
// ============================================================

export async function POST(req: NextRequest) {
  try {
    // CSRF: Origin 헤더가 없는 요청(curl, 스크립트, 서버간 호출)은 차단
    // 클라이언트 키 없이 서버 키를 소모하는 경우만 차단 (BYOK는 허용)
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');
    if (!origin) {
      // Origin 없는 요청 → BYOK(클라이언트 키)가 있으면 허용, 없으면 차단
      const rawText = await req.text();
      const peek = (() => { try { return JSON.parse(rawText); } catch { return null; } })();
      if (!peek?.apiKey) {
        return NextResponse.json({ error: 'Forbidden: Origin header required' }, { status: 403 });
      }
      // BYOK 요청은 Origin 없이도 허용 — 아래에서 rawText를 재사용
      (req as NextRequest & { _parsedBody?: string })._parsedBody = rawText;
    } else if (host) {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
    }

    // Request size guard — parse body directly (not trusting Content-Length header)
    // CSRF 체크에서 이미 파싱한 경우 재사용
    const rawText = (req as NextRequest & { _parsedBody?: string })._parsedBody ?? await req.text();
    if (Buffer.byteLength(rawText, 'utf8') > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawText);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { provider, model, systemInstruction, messages, temperature = 0.9, apiKey: clientKey, maxTokens } = body as {
      provider?: string; model?: string; systemInstruction?: string;
      messages?: { role: string; content: string }[];
      temperature?: number; apiKey?: string; maxTokens?: number;
    };

    // Input validation
    if (!isServerProviderId(provider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }
    if (!model || typeof model !== 'string' || !/^[a-zA-Z0-9._-]+$/.test(model)) {
      return NextResponse.json({ error: 'Invalid model' }, { status: 400 });
    }
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Invalid messages' }, { status: 400 });
    }
    if (typeof temperature !== 'number' || temperature < 0 || temperature > 2) {
      return NextResponse.json({ error: 'Invalid temperature' }, { status: 400 });
    }

    // Resolve API key: client BYOK > server env
    const apiKey = resolveServerProviderKey(provider, clientKey);
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured. Set via BYOK or server environment variable.' },
        { status: 401 }
      );
    }

    let stream: ReadableStream;

    switch (provider) {
      case 'gemini':
        stream = await streamGemini(apiKey, model, systemInstruction || '', messages, temperature);
        break;
      case 'openai':
      case 'groq':
      case 'mistral':
        stream = await streamOpenAICompat(provider, apiKey, model, systemInstruction || '', messages, temperature);
        break;
      case 'claude':
        stream = await streamClaude(apiKey, model, systemInstruction || '', messages, temperature, typeof maxTokens === 'number' ? maxTokens : undefined);
        break;
      default:
        return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: unknown) {
    const raw = error instanceof Error ? error.message : 'Unknown error';
    // Sanitize: strip API keys and sensitive data (covers key=, apikey=, api_key:, etc.)
    const safeMsg = raw
      .replace(/(?:api[_-]?)?key[=:]\s*\S+/gi, 'key=[REDACTED]')
      .replace(/(?:Bearer|Basic)\s+\S+/gi, '[REDACTED]')
      .replace(/[A-Za-z0-9_-]{32,}/g, '[REDACTED]')
      .slice(0, 200);
    const status = /429|rate.?limit/i.test(raw) ? 429 : /401|403|unauthorized/i.test(raw) ? 401 : 500;
    return NextResponse.json({ error: safeMsg }, { status });
  }
}
