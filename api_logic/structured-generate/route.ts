// ============================================================
// PART 0 — Provider-Agnostic Structured Generation Route
// ============================================================
// Supports: Gemini (native JSON), OpenAI/Groq/Mistral (JSON mode),
//           Ollama/LMStudio (JSON mode via OpenAI compat)
// Claude: not supported (no native JSON mode)
// Falls back to /api/gemini-structured for Gemini-specific tasks

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { hasServerProviderCredentials, resolveServerProviderKey, isServerProviderId } from '@/lib/server-ai';
import { executeGeminiHostedFirst, normalizeUserApiKey } from '@/lib/google-genai-server';
import type { AppLanguage } from '@/lib/studio-types';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';
import { dispatchStructuredGeneration } from '@/services/aiProvidersStructured';
import { validateConstrainedOutput, type ConstraintSchema } from '@/lib/noa/constrained-decoder';

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

// Implementations of generateJsonOpenAICompat, generateJsonClaude, and generateJsonGemini are in @/services/aiProvidersStructured.ts
const DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-4o-mini',
  groq: 'llama-3.3-70b-versatile',
  mistral: 'mistral-medium-3-latest',
  ollama: 'llama3.1',
  lmstudio: 'local-model',
};

// ============================================================
// PART 4 — Request validation helpers
// ============================================================

type ValidatedInput = {
  provider: string;
  apiKey: string;
  clientApiKey: string;
  prompt: string;
  model: string;
  language: AppLanguage;
  schema: object | undefined;
  fallback: Record<string, unknown>;
};

/** Validate and extract all required fields from the raw body */
function validateInput(body: Record<string, unknown>): { ok: true; input: ValidatedInput } | { ok: false; response: NextResponse } {
  const provider = typeof body.provider === 'string' ? body.provider : 'gemini';
  if (!isServerProviderId(provider)) {
    return { ok: false, response: NextResponse.json({ error: 'Invalid provider' }, { status: 400 }) };
  }

  const clientApiKey = normalizeUserApiKey(body.apiKey);
  const apiKey = provider === 'gemini'
    ? ''
    : (resolveServerProviderKey(provider, body.apiKey) || '');

  if (!(provider === 'gemini' ? clientApiKey : apiKey) && !hasServerProviderCredentials(provider)) {
    const error = provider === 'gemini'
      ? 'Gemini server credentials are not configured. Add your key in Settings or configure Vertex AI on the server.'
      : `API key not configured for ${provider}.`;
    return { ok: false, response: NextResponse.json({ error }, { status: 401 }) };
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt : '';
  if (!prompt) {
    return { ok: false, response: NextResponse.json({ error: 'Prompt is required.' }, { status: 400 }) };
  }

  const model = typeof body.model === 'string' && SAFE_MODEL_PATTERN.test(body.model)
    ? body.model
    : DEFAULT_MODELS[provider] ?? 'gemini-2.5-flash';

  return {
    ok: true,
    input: {
      provider,
      apiKey,
      clientApiKey,
      prompt,
      model,
      language: getLanguage(body.language),
      schema: typeof body.schema === 'object' && body.schema ? (body.schema as object) : undefined,
      fallback: (body.fallback as Record<string, unknown>) ?? {},
    },
  };
}

// dispatchStructuredGeneration is imported from @/services/aiProvidersStructured.ts

function errorToStatus(message: string): number {
  if (/Request too large/i.test(message)) return 413;
  if (/Invalid JSON/i.test(message)) return 400;
  if (/401|403|unauthorized/i.test(message)) return 401;
  return 500;
}

// ============================================================
// PART 5 — POST handler (thin orchestrator)
// ============================================================

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(ip, 'structured-generate', RATE_LIMITS.default);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }

    const body = await parseRequest(req);
    const forbidden = validateOrigin(req, !!body.apiKey);
    if (forbidden) return forbidden;

    const validated = validateInput(body);
    if (!validated.ok) return (validated as {ok: false; response: NextResponse}).response;

    const dispatched = validated.input.provider === 'gemini'
      ? (await executeGeminiHostedFirst(validated.input.clientApiKey, (effectiveApiKey) =>
          dispatchStructuredGeneration(
            validated.input.provider,
            effectiveApiKey,
            validated.input.model,
            validated.input.prompt,
            validated.input.schema,
            validated.input.fallback,
          ),
        )).result
      : await dispatchStructuredGeneration(
          validated.input.provider,
          validated.input.apiKey,
          validated.input.model,
          validated.input.prompt,
          validated.input.schema,
          validated.input.fallback,
        );
    if (!dispatched.ok) return NextResponse.json({ error: (dispatched as {ok: false; error: string}).error }, { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = dispatched.result as any;
    if (result && typeof result === 'object') {
      result._meta = { provider: validated.input.provider, model: validated.input.model, language: validated.input.language };
    }

    // L3.1 Constrained Decoder: 클라이언트가 스키마를 전달한 경우 Guillotine 검증
    if (validated.input.schema && result) {
      const constraintSchema: ConstraintSchema = {
        name: 'ClientSchema',
        schema: validated.input.schema as Record<string, unknown>,
        requiredFields: Object.keys((validated.input.schema as Record<string, unknown>).properties ?? {}),
      };
      const guillotine = validateConstrainedOutput(JSON.stringify(result), constraintSchema);
      if (guillotine.verdict === 'KILL') {
        logger.warn('Guillotine:KILL', { violations: guillotine.violations });
        return NextResponse.json(
          { error: 'Structured output schema violation', violations: guillotine.violations, _fallback: validated.input.fallback },
          { status: 422 },
        );
      }
      // HOLD → 자동 보정 제안 첨부
      if (guillotine.verdict === 'HOLD' && result && typeof result === 'object') {
        result._guillotine = {
          verdict: 'HOLD',
          missingVariables: guillotine.missingVariables,
          autoCorrectSuggestions: guillotine.autoCorrectSuggestions,
        };
      }
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('API:structured-generate', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: message.slice(0, 240) }, { status: errorToStatus(message) });
  }
}

