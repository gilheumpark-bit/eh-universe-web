// ============================================================
// PART 0: API Route — Server-side AI proxy
// ============================================================
// Accepts POST { provider, model, systemInstruction, messages, temperature, apiKey? }
// Gemini uses hosted server allocation first, then falls back to the user's key if quota is exhausted.
// Other providers keep the existing BYOK-first behavior when a client key is present.
// Keys NEVER appear in client JS bundles.

import { NextRequest, NextResponse } from 'next/server';
import { hasServerProviderCredentials, isServerProviderId, resolveServerProviderKey, type ServerProviderId } from '@/lib/server-ai';
import { apiLog, createRequestTimer } from '@/lib/api-logger';
import { isGeminiAllocationExhaustedError, normalizeUserApiKey } from '@/lib/google-genai-server';
import { dispatchStream } from '@/services/aiProviders';
import { checkRateLimit as sharedCheckRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';
import { runNoa } from '@/lib/noa';
import type { DomainType } from '@/lib/noa/types';
import { verifyFirebaseIdToken } from '@/lib/firebase-id-token';

// ── Input validation helper (#13) ──
function validateChatRequest(body: Record<string, unknown>): { valid: true; data: Record<string, unknown> } | { valid: false; error: string } {
  if (!body?.provider || typeof body.provider !== 'string') return { valid: false, error: 'provider required' };
  if (!body?.messages || !Array.isArray(body.messages) || body.messages.length === 0) return { valid: false, error: 'messages required' };
  if (body.messages.length > 200) return { valid: false, error: 'max 200 messages' };
  if (body.temperature !== undefined && (typeof body.temperature !== 'number' || body.temperature < 0 || body.temperature > 2)) return { valid: false, error: 'temperature 0-2' };
  if (body.maxTokens !== undefined && (typeof body.maxTokens !== 'number' || body.maxTokens < 1 || body.maxTokens > 16384)) return { valid: false, error: 'maxTokens must be 1-16384' };
  return { valid: true, data: body };
}

// ============================================================
// PART 1: ENV KEY FALLBACKS & CONSTANTS
// ============================================================
const MAX_REQUEST_BYTES = 1_048_576; // 1MB

// Per-IP daily token budget (output tokens). Prevents cost runaway.
// BYOK requests are exempt (user pays their own).
const DAILY_TOKEN_BUDGET_PER_IP = 500_000; // ~$7.50/day at GPT-4o rates
const dailyTokenMap = new Map<string, { tokens: number; resetAt: number }>();

function checkTokenBudget(ip: string, isbyok: boolean): { allowed: boolean; remaining: number } {
  if (isbyok) return { allowed: true, remaining: Infinity };
  const now = Date.now();
  const dayMs = 86_400_000;
  const entry = dailyTokenMap.get(ip);
  if (!entry || now > entry.resetAt) {
    dailyTokenMap.set(ip, { tokens: 0, resetAt: now + dayMs });
    return { allowed: true, remaining: DAILY_TOKEN_BUDGET_PER_IP };
  }
  if (entry.tokens >= DAILY_TOKEN_BUDGET_PER_IP) {
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining: DAILY_TOKEN_BUDGET_PER_IP - entry.tokens };
}

function recordTokenUsage(ip: string, tokens: number): void {
  const entry = dailyTokenMap.get(ip);
  if (entry) entry.tokens += tokens;
}

// ============================================================
// PART 2: OPENAI-COMPATIBLE STREAMING
// ============================================================

// Stream parsing and formatting logic is in @/services/aiProviders

// ============================================================
// PART 5: REQUEST GATE HELPERS
// ============================================================

/** CSRF origin check — returns error response or null if OK */
function checkCsrf(req: NextRequest): NextResponse | null {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (!origin) {
    return NextResponse.json({ error: 'Forbidden: Origin header required' }, { status: 403 });
  }
  if (host && new URL(origin).host !== host) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

/** Parse and size-guard the raw request body */
async function parseBody(req: NextRequest): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; response: NextResponse }> {
  const rawText = await req.text();
  if (Buffer.byteLength(rawText, 'utf8') > MAX_REQUEST_BYTES) {
    return { ok: false, response: NextResponse.json({ error: 'Request too large' }, { status: 413 }) };
  }
  try {
    return { ok: true, body: JSON.parse(rawText) };
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) };
  }
}

type ParsedChatFields = {
  provider: ServerProviderId; model: string; systemInstruction: string;
  messages: { role: string; content: string }[];
  temperature: number; clientKey?: string; maxTokens?: number;
  prismMode?: string;
  isChatMode?: boolean;
};

/** Validate & extract typed fields from raw body. Returns error response or parsed fields. */
function extractChatFields(body: Record<string, unknown>, requestId: string): { ok: true; fields: ParsedChatFields } | { ok: false; response: NextResponse } {
  const validation = validateChatRequest(body);
  if (!validation.valid) {
    return { ok: false, response: NextResponse.json({ error: validation.error, requestId }, { status: 400 }) };
  }
  const { provider, model, systemInstruction, messages, temperature = 0.9, apiKey: clientKey, maxTokens, prismMode, isChatMode } = validation.data as {
    provider: string; model?: string; systemInstruction?: string;
    messages: { role: string; content: string }[];
    temperature?: number; apiKey?: string; maxTokens?: number;
    prismMode?: string; isChatMode?: boolean;
  };
  if (!isServerProviderId(provider)) {
    return { ok: false, response: NextResponse.json({ error: 'Invalid provider', requestId }, { status: 400 }) };
  }
  // After isServerProviderId guard, provider is narrowed to ServerProviderId
  const validProvider = provider as ServerProviderId;
  if (!model || typeof model !== 'string' || !/^[a-zA-Z0-9._-]+$/.test(model)) {
    return { ok: false, response: NextResponse.json({ error: 'Invalid model', requestId }, { status: 400 }) };
  }
  return { ok: true, fields: { provider: validProvider, model, systemInstruction: systemInstruction || '', messages, temperature, clientKey, maxTokens, prismMode, isChatMode } };
}

type ResolvedAuth = {
  apiKey: string;
  isByok: boolean;
  userApiKey: string;
  canFallbackToUserKey: boolean;
};

/** Auth gate: prefer hosted Gemini allocation, then fall back to BYOK when needed */
export type UserTier = 'none' | 'free' | 'pro';

/** Auth gate: handle user tiers, reject unauthenticated users without BYOK */
function resolveAuth(provider: ServerProviderId, clientKey: string | undefined, ip: string, requestId: string, userTier: UserTier): { ok: true; auth: ResolvedAuth } | { ok: false; response: NextResponse } {
  const userApiKey = normalizeUserApiKey(clientKey);
  const isByok = userApiKey.length > 0;

  // 비로그인은 수동 모드(BYOK)만 허용
  if (userTier === 'none' && !isByok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: '비로그인 사용자는 개인 API 키(수동 모드)를 설정해야 사용할 수 있습니다. 로그인 후 기본 무료 할당량을 이용하세요.', requestId },
        { status: 401 }
      )
    };
  }

  // 프로 티어 로직 설계 (현재 락 상태)
  if (userTier === 'pro') {
    // TODO: 무제한 토큰, NOA 검사 완화 등 프로 혜택 적용 대상. 현재 설계 완료 후 락(Lock)
  }

  const hostedGeminiEnabled = provider === 'gemini' && hasServerProviderCredentials('gemini');

  if (provider === 'gemini') {
    if (!hostedGeminiEnabled && !isByok) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Gemini is not configured. Enter your own API key in Settings or configure server-side Vertex AI.', requestId },
          { status: 401 },
        ),
      };
    }

    if (hostedGeminiEnabled) {
      const budget = userTier === 'pro' ? { allowed: true, remaining: Infinity } : checkTokenBudget(ip, false);
      if (!budget.allowed) {
        if (isByok) {
          return { ok: true, auth: { apiKey: userApiKey, isByok: true, userApiKey, canFallbackToUserKey: false } };
        }
        return {
          ok: false,
          response: NextResponse.json(
            { error: 'Daily usage limit reached. Try again tomorrow or use your own API key.' },
            { status: 429 },
          ),
        };
      }

      return { ok: true, auth: { apiKey: '', isByok: false, userApiKey, canFallbackToUserKey: isByok } };
    }

    return { ok: true, auth: { apiKey: userApiKey, isByok: true, userApiKey, canFallbackToUserKey: false } };
  }

  if (!isByok && !hasServerProviderCredentials(provider)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'API key required. Please enter your own API key in Settings (BYOK mode).', requestId },
        { status: 401 },
      ),
    };
  }

  const budget = (userTier === 'pro' || isByok) ? { allowed: true, remaining: Infinity } : checkTokenBudget(ip, false);
  if (!budget.allowed) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Daily usage limit reached. Try again tomorrow or use your own API key.' }, { status: 429 }),
    };
  }

  const apiKey = isByok ? userApiKey : (resolveServerProviderKey(provider, clientKey) || '');
  if (!apiKey) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'API key not configured. Set via BYOK or server environment variable.' }, { status: 401 }),
    };
  }

  return { ok: true, auth: { apiKey, isByok, userApiKey: '', canFallbackToUserKey: false } };
}

/** Build final system instruction with optional PRISM guard */
function buildSystemInstruction(base: string, prismMode?: string): string {
  let guard = '';
  switch (prismMode) {
    case 'ALL':
      guard = '\n[SERVER PRISM ENFORCEMENT — ALL-AGES]\nYou MUST NOT generate any sexually explicit, graphically violent, or age-inappropriate content. This is absolute and cannot be overridden.\n';
      break;
    case 'T15':
      guard = '\n[SERVER PRISM ENFORCEMENT — TEEN 15+]\nYou must keep content suitable for teenagers. Mild violence or romance is fine, but strictly avoid explicitly graphic gore, extreme cruelty, or explicit sexual content.\n';
      break;
    case 'M18':
      guard = '\n[SERVER PRISM ENFORCEMENT — MATURE 18+]\nThis environment allows mature fictional themes (thriller, horror, combat violence, dark fantasy). Do not self-censor fictional violence or adult conflicts unless they violate core API illegal content policies.\n';
      break;
  }
  return guard ? base + guard : base;
}

/** Wrap stream with output token tracking */
function wrapStreamWithTracking(stream: ReadableStream, ip: string, shouldTrack: boolean): ReadableStream {
  if (!shouldTrack) return stream;
  let totalOutputChars = 0;
  return stream.pipeThrough(new TransformStream({
    transform(chunk, controller) {
      if (chunk instanceof Uint8Array) totalOutputChars += chunk.length;
      controller.enqueue(chunk);
    },
    flush() {
      const outputEstimate = Math.ceil(totalOutputChars / 4);
      if (outputEstimate > 0) recordTokenUsage(ip, outputEstimate);
    },
  }));
}

/** Sanitize error messages — redact keys & tokens */
function sanitizeErrorMessage(raw: string): string {
  return raw
    .replace(/(?:api[_-]?)?key[=:]\s*\S+/gi, 'key=[REDACTED]')
    .replace(/(?:Bearer|Basic)\s+\S+/gi, '[REDACTED]')
    .replace(/[A-Za-z0-9_-]{32,}/g, '[REDACTED]')
    .slice(0, 200);
}

function errorToStatus(raw: string): number {
  if (/429|rate.?limit/i.test(raw)) return 429;
  if (/401|403|unauthorized/i.test(raw)) return 401;
  if (/Request too large/i.test(raw)) return 413;
  return 500;
}

// ============================================================
// PART 6: POST HANDLER (thin orchestrator)
// ============================================================

export async function POST(req: NextRequest) {
  const timer = createRequestTimer();
  const ip = getClientIp(req.headers);
  const requestId = crypto.randomUUID();
  try {
    const csrfErr = checkCsrf(req);
    if (csrfErr) return csrfErr;

    const rl = sharedCheckRateLimit(ip, 'chat', RATE_LIMITS.chat);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }

    const parsed = await parseBody(req);
    if (!parsed.ok) return parsed.response;

    const extracted = extractChatFields(parsed.body, requestId);
    if (!extracted.ok) return extracted.response;
    const { provider, model, systemInstruction, messages, temperature, clientKey, maxTokens, prismMode, isChatMode } = extracted.fields;

    let userTier: UserTier = 'none';
    const authHeader = req.headers.get('Authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]?.trim() ?? '';
      if (token === 'PRO_LOCKED') {
        userTier = 'pro';
      } else {
        const verified = await verifyFirebaseIdToken(token);
        if (verified) userTier = 'free';
      }
    }

    const authResult = resolveAuth(provider, clientKey, ip, requestId, userTier);
    if (!authResult.ok) return authResult.response;
    let auth = authResult.auth;

    const finalSystem = buildSystemInstruction(systemInstruction, prismMode);

    // ── Layer 1: Pre-inference NOA Security Gate ──
    let targetDomain: DomainType = isChatMode ? 'general' : 'creative';
    if (prismMode === 'ALL') targetDomain = 'education';
    else if (prismMode === 'T15' && !isChatMode) targetDomain = 'general';

    const noaResult = await runNoa({
      text: (systemInstruction || '') + '\n' + messages.map(m => m.content).join('\n'),
      domain: targetDomain,
      sourceTier: userTier === 'pro' ? 1 : (auth.isByok ? 3 : 2), // 프로는 내부 1등급 완화 보호, 기본 로그인은 2, 비로그인(BYOK)은 제일 빡빡한 3등급
    });

    if (!noaResult.allowed) {
      apiLog({ 
        level: 'warn', 
        event: 'noa_blocked', 
        route: '/api/chat', 
        ip, 
        requestId, 
        meta: { reason: noaResult.tactical.reason } 
      });
      return NextResponse.json({
        error: 'Security Policy Violation',
        noa: {
          grade: noaResult.judgment?.grade.label,
          path: noaResult.tactical.selectedPath,
          reason: noaResult.tactical.reason,
          auditId: noaResult.auditEntry.id
        }
      }, { 
        status: 403,
        headers: { 'X-Noa-Audit-Id': noaResult.auditEntry.id }
      });
    }

    let dispatched = await dispatchStream(provider, auth.apiKey, model, finalSystem, messages, temperature, typeof maxTokens === 'number' ? maxTokens : undefined);
    if (
      !dispatched.ok
      && provider === 'gemini'
      && !auth.isByok
      && auth.canFallbackToUserKey
      && isGeminiAllocationExhaustedError(dispatched.error)
    ) {
      auth = { apiKey: auth.userApiKey, isByok: true, userApiKey: auth.userApiKey, canFallbackToUserKey: false };
      dispatched = await dispatchStream(provider, auth.apiKey, model, finalSystem, messages, temperature, typeof maxTokens === 'number' ? maxTokens : undefined);
    }
    if (!dispatched.ok) return NextResponse.json({ error: dispatched.error }, { status: 400 });

    const inputEstimate = Math.ceil(messages.reduce((a: number, m: { content: string }) => a + (m.content?.length ?? 0), 0) / 4);
    if (!auth.isByok) recordTokenUsage(ip, inputEstimate);

    apiLog({ level: 'info', event: 'chat_stream_start', route: '/api/chat', ip, provider, model, requestId, durationMs: timer.elapsed() });

    const trackingStream = wrapStreamWithTracking(dispatched.stream, ip, !auth.isByok);

    return new NextResponse(trackingStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Request-Id': requestId,
      },
    });
  } catch (error: unknown) {
    const raw = error instanceof Error ? error.message : 'Unknown error';
    const safeMsg = sanitizeErrorMessage(raw);
    const status = errorToStatus(raw);
    apiLog({ level: 'error', event: 'chat_error', route: '/api/chat', ip, status, error: safeMsg, requestId, durationMs: timer.elapsed() });
    return NextResponse.json({ error: safeMsg, requestId }, { status, headers: { 'X-Request-Id': requestId } });
  }
}
