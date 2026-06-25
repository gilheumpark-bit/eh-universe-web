// ============================================================
// PART 1 — Local LLM Proxy Route
// Chrome PNA(Private Network Access) 우회용 서버 프록시
// localhost:3000 → Next.js 서버 → 사설 IP LLM 서버 (LM Studio / Ollama)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { checkRateLimitAsync, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';
import { checkSameOriginHeaders } from '@/lib/api-origin-guard';

const MAX_REQUEST_SIZE = 5_242_880; // 5MB body size limit for LLM proxy
const LOCAL_PROXY_UPSTREAM_ERROR = {
  error: 'local_model_unavailable',
  message: '로컬 모델 서버 응답을 처리하지 못했습니다. 주소와 모델 서버 상태를 확인해 주세요.',
};

/**
 * Validate that a hostname is a private/local network address.
 * Uses numeric range checks instead of regex to prevent invalid IPs (e.g., 192.168.999.999).
 */
function isValidPrivateHost(host: string): boolean {
  if (host === 'localhost' || host === '127.0.0.1') return true;
  const parts = host.split('.');
  if (parts.length !== 4) return false;
  const nums = parts.map(Number);
  if (nums.some(n => isNaN(n) || n < 0 || n > 255 || !Number.isInteger(n))) return false;
  // 192.168.x.x
  if (nums[0] === 192 && nums[1] === 168) return true;
  // 10.x.x.x
  if (nums[0] === 10) return true;
  // 172.16.0.0 – 172.31.255.255
  if (nums[0] === 172 && nums[1] >= 16 && nums[1] <= 31) return true;
  return false;
}

function validateBaseUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!isValidPrivateHost(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

/**
 * Block requests in production and validate same-origin.
 * Returns an error response if blocked, or null if allowed.
 */
function guardProxy(req: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Local proxy is disabled in production' }, { status: 403 });
  }
  const originCheck = checkSameOriginHeaders(req.headers);
  if (!originCheck.ok) {
    return NextResponse.json({ error: originCheck.error }, { status: 403 });
  }
  return null;
}

// IDENTITY_SEAL: PART-1 | role=proxy validation + guard | inputs=baseUrl,req | outputs=validated URL or error

// ============================================================
// PART 2 — GET handler (model list)
// ============================================================

export async function GET(req: NextRequest) {
  const guardResult = guardProxy(req);
  if (guardResult) return guardResult;

  const ip = getClientIp(req.headers);
  const rl = await checkRateLimitAsync(ip, 'local-proxy', RATE_LIMITS.default);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }

  const baseUrl = req.nextUrl.searchParams.get('baseUrl');
  if (!baseUrl) {
    return NextResponse.json({ error: 'baseUrl required' }, { status: 400 });
  }

  const validated = validateBaseUrl(baseUrl);
  if (!validated) {
    return NextResponse.json({ error: 'Invalid or disallowed baseUrl' }, { status: 403 });
  }

  try {
    const targetUrl = `${validated.origin}/v1/models`;
    const res = await fetch(targetUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    logger.error('API:local-proxy:GET', err instanceof Error ? err.message : err);
    return NextResponse.json(LOCAL_PROXY_UPSTREAM_ERROR, { status: 502 });
  }
}

// IDENTITY_SEAL: PART-2 | role=GET /v1/models proxy | inputs=baseUrl | outputs=model list

// ============================================================
// PART 3 — POST handler (chat completions streaming)
// ============================================================

export async function POST(req: NextRequest) {
  const postGuard = guardProxy(req);
  if (postGuard) return postGuard;

  const postIp = getClientIp(req.headers);
  const postRl = await checkRateLimitAsync(postIp, 'local-proxy', RATE_LIMITS.default);
  if (!postRl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(postRl.retryAfterMs / 1000)) } },
    );
  }

  // [보안] Content-Length 선행 체크 — 프롬프트 + history 가 비정상적으로 크면 401 대신 413.
  // JSON parser 가 거대한 payload 를 풀기 전에 거절해서 메모리 고갈 경로를 차단.
  const contentLength = parseInt(req.headers.get('content-length') || '0', 10);
  if (contentLength > MAX_REQUEST_SIZE) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { baseUrl, ...payload } = body;
  if (!baseUrl || typeof baseUrl !== 'string') {
    return NextResponse.json({ error: 'baseUrl required' }, { status: 400 });
  }

  const validated = validateBaseUrl(baseUrl);
  if (!validated) {
    return NextResponse.json({ error: 'Invalid or disallowed baseUrl' }, { status: 403 });
  }

  const targetUrl = `${validated.origin}/v1/chat/completions`;

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      await res.text().catch(() => '');
      return NextResponse.json(LOCAL_PROXY_UPSTREAM_ERROR, { status: 502 });
    }

    // 스트리밍이면 그대로 전달
    if (payload.stream && res.body) {
      return new Response(res.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 비스트리밍이면 JSON 그대로 반환
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    logger.error('API:local-proxy:POST', err instanceof Error ? err.message : err);
    return NextResponse.json(LOCAL_PROXY_UPSTREAM_ERROR, { status: 502 });
  }
}

// IDENTITY_SEAL: PART-3 | role=POST chat/completions proxy | inputs=baseUrl+payload | outputs=stream or JSON
