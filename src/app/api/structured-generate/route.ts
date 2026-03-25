// ============================================================
// PART 0 — Provider-Agnostic Structured Generation Route
// ============================================================
// Supports: Gemini (native JSON), OpenAI/Groq/Mistral (JSON mode),
//           Ollama/LMStudio (JSON mode via OpenAI compat)
// Claude: not supported (no native JSON mode)
// Falls back to /api/gemini-structured for Gemini-specific tasks

import { NextRequest, NextResponse } from 'next/server';
import { resolveServerProviderKey, isServerProviderId } from '@/lib/server-ai';
import type { AppLanguage } from '@/lib/studio-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_REQUEST_BYTES = 524_288;
const SAFE_MODEL_PATTERN = /^[a-zA-Z0-9._-]+$/;

// ============================================================
// PART 1 — Request helpers
// ============================================================

function validateOrigin(req: NextRequest, hasClientKey: boolean): NextResponse | null {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (!origin) {
    if (!hasClientKey) return NextResponse.json({ error: 'Forbidden: Origin header required' }, { status: 403 });
    return null;
  }
  if (host && new URL(origin).host !== host) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

async function parseRequest(req: NextRequest): Promise<Record<string, unknown>> {
  const rawText = await req.text();
  if (Buffer.byteLength(rawText, 'utf8') > MAX_REQUEST_BYTES) throw new Error('Request too large');
  try { return JSON.parse(rawText) as Record<string, unknown>; }
  catch { throw new Error('Invalid JSON'); }
}

function getLanguage(value: unknown): AppLanguage {
  return value === 'EN' || value === 'JP' || value === 'CN' ? value : 'KO';
}

// ============================================================
// PART 2 — OpenAI-compatible JSON generation (OpenAI/Groq/Mistral/Ollama/LMStudio)
// ============================================================

const OPENAI_COMPAT_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  mistral: 'https://api.mistral.ai/v1/chat/completions',
};

const DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-4o-mini',
  groq: 'llama-3.3-70b-versatile',
  mistral: 'mistral-medium-3-latest',
  ollama: 'llama3.1',
  lmstudio: 'local-model',
};

async function generateJsonOpenAICompat(
  provider: string,
  apiKey: string,
  model: string,
  prompt: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fallback: any,
  baseUrl?: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const isLocal = provider === 'ollama' || provider === 'lmstudio';
  const url = baseUrl
    ? `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`
    : OPENAI_COMPAT_URLS[provider];
  if (!url) throw new Error(`Unknown provider: ${provider}`);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!isLocal && apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'You are a structured data generator. Always respond with valid JSON only. No markdown, no explanation.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          response_format: isLocal ? undefined : { type: 'json_object' },
        }),
      });

      if (!res.ok) {
        const err = await res.text().catch(() => '');
        throw new Error(`${provider} API ${res.status}: ${err}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content ?? '';
      try {
        return JSON.parse(content);
      } catch {
        // JSON 파싱 실패 → fallback
        return fallback;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      const isRetryable = /500|502|503|504|INTERNAL|resource.*exhausted/i.test(msg);
      if (!isRetryable || attempt === MAX_RETRIES) throw err;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return fallback;
}

// ============================================================
// PART 3 — Gemini JSON generation (delegated to existing route logic)
// ============================================================

async function generateJsonGemini(
  apiKey: string,
  model: string,
  prompt: string,
  responseSchema: object,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fallback: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey });
  const MAX_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema },
      });
      try {
        return JSON.parse(response.text || JSON.stringify(fallback));
      } catch { return fallback; }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      const isRetryable = /500|502|503|504|INTERNAL|resource.*exhausted/i.test(msg);
      if (!isRetryable || attempt === MAX_RETRIES) throw err;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return fallback;
}

// ============================================================
// PART 4 — POST handler
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const body = await parseRequest(req);
    const forbidden = validateOrigin(req, !!body.apiKey);
    if (forbidden) return forbidden;

    const provider = typeof body.provider === 'string' ? body.provider : 'gemini';
    if (!isServerProviderId(provider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    // Claude는 structured output 미지원
    if (provider === 'claude') {
      return NextResponse.json({ error: 'Claude does not support structured output. Use Gemini or OpenAI.' }, { status: 400 });
    }

    const apiKey = resolveServerProviderKey(provider, body.apiKey);
    if (!apiKey) {
      return NextResponse.json({ error: `API key not configured for ${provider}.` }, { status: 401 });
    }

    const prompt = typeof body.prompt === 'string' ? body.prompt : '';
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

    const model = typeof body.model === 'string' && SAFE_MODEL_PATTERN.test(body.model)
      ? body.model
      : DEFAULT_MODELS[provider] ?? 'gemini-2.5-flash';
    const language = getLanguage(body.language);
    const schema = typeof body.schema === 'object' && body.schema ? body.schema : undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fallback = (body.fallback as any) ?? {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any;

    if (provider === 'gemini' && schema) {
      result = await generateJsonGemini(apiKey, model, prompt, schema, fallback);
    } else {
      // OpenAI-compatible (openai/groq/mistral/ollama/lmstudio)
      const isLocal = provider === 'ollama' || provider === 'lmstudio';
      const baseUrl = isLocal ? apiKey : undefined;
      const schemaHint = schema ? `\n\nRespond with JSON matching this schema:\n${JSON.stringify(schema, null, 2)}` : '';
      result = await generateJsonOpenAICompat(
        provider,
        isLocal ? '' : apiKey,
        model,
        prompt + schemaHint,
        fallback,
        baseUrl,
      );
    }

    // 언어 태그 (클라이언트에서 활용 가능)
    if (result && typeof result === 'object') {
      result._meta = { provider, model, language };
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = /Request too large/i.test(message) ? 413
      : /Invalid JSON/i.test(message) ? 400
      : /401|403|unauthorized/i.test(message) ? 401
      : 500;
    return NextResponse.json({ error: message.slice(0, 240) }, { status });
  }
}
