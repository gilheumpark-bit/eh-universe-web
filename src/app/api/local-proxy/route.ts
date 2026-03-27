// ============================================================
// PART 1 — Local LLM Proxy Route
// Chrome PNA(Private Network Access) 우회용 서버 프록시
// localhost:3000 → Next.js 서버 → 사설 IP LLM 서버 (LM Studio / Ollama)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

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

// IDENTITY_SEAL: PART-1 | role=proxy validation | inputs=baseUrl | outputs=validated URL

// ============================================================
// PART 2 — GET handler (model list)
// ============================================================

export async function GET(req: NextRequest) {
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
    const msg = err instanceof Error ? err.message : 'proxy error';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

// IDENTITY_SEAL: PART-2 | role=GET /v1/models proxy | inputs=baseUrl | outputs=model list

// ============================================================
// PART 3 — POST handler (chat completions streaming)
// ============================================================

export async function POST(req: NextRequest) {
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
      const errText = await res.text().catch(() => 'Unknown error');
      return NextResponse.json({ error: errText }, { status: res.status });
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
    const msg = err instanceof Error ? err.message : 'proxy error';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

// IDENTITY_SEAL: PART-3 | role=POST chat/completions proxy | inputs=baseUrl+payload | outputs=stream or JSON
