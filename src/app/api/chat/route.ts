// ============================================================
// PART 0: API Route — Server-side AI proxy
// ============================================================
// Accepts POST { provider, model, systemInstruction, messages, temperature, apiKey? }
// Gemini uses hosted server allocation first, then falls back to the user's key if quota is exhausted.
// Other providers keep the existing BYOK-first behavior when a client key is present.
// Keys NEVER appear in client JS bundles.

import { NextRequest, NextResponse } from 'next/server';
export const maxDuration = 60; // Vercel API 대기 시간 60초 (DGX non-stream 대응)

import { hasServerProviderCredentials, isServerProviderId, resolveServerProviderKey, type ServerProviderId } from '@/lib/server-ai';
import { apiLog, createRequestTimer } from '@/lib/api-logger';
import { getTierLimits } from '@/lib/tier-gate';
import { isGeminiAllocationExhaustedError, normalizeUserApiKey } from '@/lib/google-genai-server';
import { dispatchStream } from '@/services/aiProviders';
import { SPARK_SERVER_URL } from '@/services/sparkService';
import { VLLM_MODEL_ID } from '@/lib/dgx-models';
import { checkRateLimit as sharedCheckRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';
// [QA-robustness (2)] RETRYABLE/TERMINAL 분류 + bounded backoff-with-jitter (단일 소스).
import { retryWithBackoff } from '@/lib/retry-classify';
// [P1 루프3 — 2026-06-08] server-ai-init module-eval 1회: UPSTASH_REDIS_REST_URL/_TOKEN 있으면
//   rate-limit backend 를 Upstash 로 자동 교체. ADR-0011 정식 boot path.
import '@/lib/server-ai-init';
import { isFeatureEnabledServer } from '@/lib/feature-flags';
import { runNoa } from '@/lib/noa';
// [N2 — 2026-06-11] 출력 IP 필터: 스트리밍은 소급 수정 불가 → 청크 누적 후 완료 시점 검사+고지 방식
import { wrapStreamWithIpAudit } from '@/lib/noa/server-gate';
import type { DomainType } from '@/lib/noa/types';
import { getSwapController, type AdapterMode } from '@/lib/noa/lora-swap';
import { verifyFirebaseIdToken } from '@/lib/firebase-id-token';
// [I-07 — 2026-05-10] PRISM 가드를 safety-registry 단일 소스로 통합.
import { buildSafetyEnhancedPrompt, type PrismLevel } from '@/lib/ai/safety-registry';

// [I-07 — 2026-05-10] chat 의 PRISM mode key ('ALL'/'T15'/'M18') → safety-registry PrismLevel.
const PRISM_MODE_MAP: Record<string, PrismLevel> = {
  ALL: 'all-ages',
  T15: 'teen-15',
  M18: 'mature-18',
};

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
  /** true: 설정 화면「연결 테스트」— 호스팅 우회하고 전달된 BYOK만 사용 */
  keyVerification?: boolean;
};

/** Validate & extract typed fields from raw body. Returns error response or parsed fields. */
function extractChatFields(body: Record<string, unknown>, requestId: string): { ok: true; fields: ParsedChatFields } | { ok: false; response: NextResponse } {
  const validation = validateChatRequest(body);
  if (!validation.valid) {
    return { ok: false, response: NextResponse.json({ error: validation.error, requestId }, { status: 400 }) };
  }
  const { provider, model, systemInstruction, messages, temperature = 0.9, apiKey: clientKey, maxTokens, prismMode, isChatMode, keyVerification } = validation.data as {
    provider: string; model?: string; systemInstruction?: string;
    messages: { role: string; content: string }[];
    temperature?: number; apiKey?: string; maxTokens?: number;
    prismMode?: string; isChatMode?: boolean;
    keyVerification?: boolean;
  };
  if (!isServerProviderId(provider)) {
    return { ok: false, response: NextResponse.json({ error: 'Invalid provider', requestId }, { status: 400 }) };
  }
  // After isServerProviderId guard, provider is narrowed to ServerProviderId
  const validProvider = provider as ServerProviderId;
  if (!model || typeof model !== 'string' || !/^[a-zA-Z0-9._\/-]+$/.test(model)) {
    return { ok: false, response: NextResponse.json({ error: 'Invalid model', requestId }, { status: 400 }) };
  }
  return {
    ok: true,
    fields: {
      provider: validProvider,
      model,
      systemInstruction: systemInstruction || '',
      messages,
      temperature,
      clientKey,
      maxTokens,
      prismMode,
      isChatMode,
      keyVerification: keyVerification === true,
    },
  };
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
function resolveAuth(
  provider: ServerProviderId,
  clientKey: string | undefined,
  ip: string,
  requestId: string,
  userTier: UserTier,
  keyVerification: boolean,
): { ok: true; auth: ResolvedAuth } | { ok: false; response: NextResponse } {
  const userApiKey = normalizeUserApiKey(clientKey);
  const isByok = userApiKey.length > 0;

  // DGX Spark 서버가 설정되어 있으면 키 없어도 허용 (서비스 제공 모드)
  const hasDgxServer = !!SPARK_SERVER_URL;

  // 비로그인 + 키 없음 + DGX 없음 → 차단
  if (userTier === 'none' && !isByok && !hasDgxServer) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: '비로그인 사용자는 개인 API 키(수동 모드)를 설정해야 사용할 수 있습니다. 로그인 후 기본 무료 할당량을 이용하세요.', requestId },
        { status: 401 }
      )
    };
  }

  /** 설정 창「연결 테스트」: 전달된 BYOK만 사용 (호스팅/일일 할당 경로 우회) */
  if (keyVerification && isByok) {
    return {
      ok: true,
      auth: {
        apiKey: userApiKey,
        isByok: true,
        userApiKey,
        canFallbackToUserKey: false,
      },
    };
  }

  // 티어별 기능 제한 적용 (OPEN_BETA=true면 모두 Pro급)
  const _tierLimits = getTierLimits(userTier as 'none' | 'free' | 'pro');

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
      // BYOK 우선 정책: 유저가 자기 키를 입력했으면 유저 키를 먼저 사용
      if (isByok) {
        return { ok: true, auth: { apiKey: userApiKey, isByok: true, userApiKey, canFallbackToUserKey: false } };
      }

      // 유저 키 없는 경우에만 호스팅 키 사용
      const budget = userTier === 'pro' ? { allowed: true, remaining: Infinity } : checkTokenBudget(ip, false);
      if (!budget.allowed) {
        return {
          ok: false,
          response: NextResponse.json(
            { error: 'Daily usage limit reached. Try again tomorrow or use your own API key.' },
            { status: 429 },
          ),
        };
      }

      return { ok: true, auth: { apiKey: '', isByok: false, userApiKey: '', canFallbackToUserKey: false } };
    }

    return { ok: true, auth: { apiKey: userApiKey, isByok: true, userApiKey, canFallbackToUserKey: false } };
  }

  if (!isByok && !hasServerProviderCredentials(provider)) {
    // DGX Spark 서버가 있으면 폴백 가능 → 허용 (dispatchStream에서 spark로 전환)
    if (hasDgxServer) {
      return { ok: true, auth: { apiKey: '', isByok: false, userApiKey: '', canFallbackToUserKey: false } };
    }
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

/**
 * Build final system instruction with optional PRISM guard.
 *
 * [I-07 — 2026-05-10] PRISM 가드를 safety-registry 단일 소스로 통합.
 * 기존 inline 가드 (SERVER PRISM ENFORCEMENT — ALL-AGES 등) 는 의미 동일.
 * 출력 패턴이 약간 변경되나 (헤더 [PRISM ALL-AGES] / 줄바꿈 \n\n) LLM 거동 동등.
 */
function buildSystemInstruction(base: string, prismMode?: string, adapterMode?: AdapterMode): string {
  // PRISM mode 매핑 — 미지 mode 는 가드 미적용 (safe fallback).
  const level = prismMode ? PRISM_MODE_MAP[prismMode] : undefined;
  const baseWithGuard = level ? buildSafetyEnhancedPrompt(base, level) : base;

  // L2 LoRA Hot-Swap: 어댑터 시스템 프롬프트 주입
  let loraPrefix = '';
  if (adapterMode) {
    const swap = getSwapController();
    const result = swap.requestSwap(adapterMode, `chat-${Date.now()}`);
    const manifest = swap.getActiveManifest();
    if (manifest && (result.status === 'SUCCESS' || result.status === 'CACHE_HIT')) {
      loraPrefix = `\n[ADAPTER MODE: ${manifest.mode}]\n${manifest.systemPrompt}\n`;
    }
  }

  return loraPrefix + baseWithGuard;
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

type DispatchResult = Awaited<ReturnType<typeof dispatchStream>>;

/**
 * [QA-robustness (2)] dispatchStream 을 bounded backoff-with-jitter 로 감싼다.
 * RETRYABLE(429/5xx/network) 만 재시도, TERMINAL(4xx)·성공은 즉시 반환 — 기존 흐름 무파괴.
 * 상한·분류·백오프 로직은 @/lib/retry-classify 단일 소스 (테스트 가능).
 */
async function dispatchStreamWithRetry(
  ...args: Parameters<typeof dispatchStream>
): Promise<DispatchResult> {
  return retryWithBackoff(
    () => dispatchStream(...args),
    (r) => !r.ok,
    (r) => (r.ok ? '' : r.error),
  );
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
    const { provider, model, systemInstruction, messages, temperature, clientKey, maxTokens, prismMode, isChatMode, keyVerification } = extracted.fields;

    let userTier: UserTier = 'none';
    const authHeader = req.headers.get('Authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]?.trim() ?? '';
      // Firebase 토큰 검증 — custom claims에서 tier 판별 (hardcoded bypass 금지)
      if (token) {
        const verified = await verifyFirebaseIdToken(token);
        if (verified) {
          userTier = verified.tier === 'pro' ? 'pro' : 'free';
        }
      }
    }

    const authResult = resolveAuth(provider, clientKey, ip, requestId, userTier, Boolean(keyVerification));
    if (!authResult.ok) return authResult.response;
    let auth = authResult.auth;

    // L2 LoRA: 도메인 기반 어댑터 선택 — isChatMode(코드/분석)=LEFT_BRAIN, 소설=RIGHT_BRAIN
    const adapterMode: AdapterMode | undefined = isChatMode ? 'LEFT_BRAIN' : 'RIGHT_BRAIN';
    // [M-07 검증 — 2026-06-10] 이 route 는 buildAgentSystemPrompt 를 직접 호출하지 않는다.
    // systemInstruction 은 클라이언트에서 이미 빌드되어 도착한다 — studio-draft 경로는
    // engine/pipeline.ts buildAgentBaseStudioPrompt 가 { autoTrim: true } (M-07 활성) 로 호출하고,
    // 절삭 발생 시 noa:context-trimmed 토스트는 클라이언트 ContextTrimmedToast 가 표시한다.
    // 서버에서 재절삭 금지 (이중 절삭 — window 부재로 사용자 알림도 불가).
    const finalSystem = buildSystemInstruction(systemInstruction, prismMode, adapterMode);

    // ── Layer 1: Pre-inference NOA Security Gate ──
    let targetDomain: DomainType = isChatMode ? 'general' : 'creative';
    if (prismMode === 'ALL') targetDomain = 'education';
    else if (prismMode === 'T15' && !isChatMode) targetDomain = 'general';

    // [P0-wire (2) — 특허 청구 1·8·효과 29: 멀티턴 누적 맥락]
    // 클라 messages 에서 직전 user 발화들 추출 (마지막 user 메시지 = 현재 입력 → 제외).
    // text 는 기존대로 전체 대화 합산 유지 (회귀 0) — history 는 감쇠 가중 보조 신호로
    // runNoa 내부에서 가산 전용 반영 (max(single, contextual) — 위험 하향 불가).
    const priorUserMessages = messages
      .filter((m: { role: string; content: string }) => m.role === 'user')
      .map((m: { content: string }) => m.content ?? '')
      .slice(0, -1);

    const noaResult = await runNoa({
      text: (systemInstruction || '') + '\n' + messages.map(m => m.content).join('\n'),
      domain: targetDomain,
      sourceTier: auth.isByok ? 1 : ((userTier as UserTier) === 'pro' ? 1 : 2), // BYOK=자기 키이므로 1등급 완화, 호스팅=2등급 표준
      conversationHistory: priorUserMessages, // 0개·1개(user 단건)면 [] → 기존 동작과 동일
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

    // [N2] 게이트 지연 측정 — 서버 로그 1줄(ms)
    apiLog({ level: 'info', event: 'noa_gate', route: '/api/chat', ip, requestId, durationMs: noaResult.totalDurationMs, meta: { blocked: false } });

    // Security Gate: server-side pre-flight scan (strict mode)
    if (isFeatureEnabledServer('SECURITY_GATE')) {
      const { scanContent } = await import('@/lib/security-gate');
      const combined = messages.map((m: { content: string }) => m.content ?? '').join('\n');
      const scan = scanContent(combined, { sensitivity: 'strict' });
      if (!scan.safe) {
        apiLog({ level: 'warn', event: 'security_gate_blocked', route: '/api/chat', ip, requestId, meta: { score: scan.score, findings: scan.findings.length } });
        return NextResponse.json({ error: 'Security Gate: content blocked', findings: scan.findings.map(f => f.pattern) }, { status: 403 });
      }
    }

    // [QA-robustness (2)] RETRYABLE(429/5xx/network) 만 bounded backoff-with-jitter (≤3회).
    // TERMINAL(4xx) 는 즉시 반환 — 과도 재시도로 인한 비용 폭증 차단 (상한 엄수).
    let dispatched = await dispatchStreamWithRetry(provider, auth.apiKey, model, finalSystem, messages, temperature, typeof maxTokens === 'number' ? maxTokens : undefined);
    if (
      !dispatched.ok
      && provider === 'gemini'
      && !auth.isByok
      && auth.canFallbackToUserKey
      && isGeminiAllocationExhaustedError(dispatched.error)
    ) {
      auth = { apiKey: auth.userApiKey, isByok: true, userApiKey: auth.userApiKey, canFallbackToUserKey: false };
      dispatched = await dispatchStreamWithRetry(provider, auth.apiKey, model, finalSystem, messages, temperature, typeof maxTokens === 'number' ? maxTokens : undefined);
    }
    // DGX Spark 폴백: 모든 프로바이더 실패 시 DGX 서버로 재시도
    if (!dispatched.ok && SPARK_SERVER_URL) {
      apiLog({ level: 'info', event: 'dgx_fallback', route: '/api/chat', ip, requestId, meta: { originalError: dispatched.error } });
      dispatched = await dispatchStreamWithRetry('spark', '', VLLM_MODEL_ID, finalSystem, messages, temperature, typeof maxTokens === 'number' ? maxTokens : undefined);
    }
    if (!dispatched.ok) {
      // [QA-robustness (2)] rate/budget hit 은 Retry-After 헤더로 클라이언트 백오프 유도.
      const status = errorToStatus(dispatched.error);
      const headers: Record<string, string> = { 'X-Request-Id': requestId };
      if (status === 429) headers['Retry-After'] = '60';
      return NextResponse.json({ error: dispatched.error, requestId }, { status, headers });
    }

    const inputEstimate = Math.ceil(messages.reduce((a: number, m: { content: string }) => a + (m.content?.length ?? 0), 0) / 4);
    if (!auth.isByok) recordTokenUsage(ip, inputEstimate);

    apiLog({ level: 'info', event: 'chat_stream_start', route: '/api/chat', ip, provider, model, requestId, durationMs: timer.elapsed() });

    const trackingStream = wrapStreamWithTracking(dispatched.stream, ip, !auth.isByok);
    // [N2] 출력 IP 검사 — 이미 흘러간 청크는 소급 수정 불가하므로 누적 후 완료 시점 검사.
    // 검출 시 스트림 말미에 noa.ipNotice SSE 이벤트 1개 + warn 로그 (사일런트 차단 금지·N4 고지).
    const ipAuditedStream = wrapStreamWithIpAudit(trackingStream, { route: '/api/chat', ip, requestId });

    return new NextResponse(ipAuditedStream, {
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
