// ============================================================
// /api/error-report — Client error ingestion endpoint
// Receives error reports and logs them as structured JSON.
// Vercel captures stdout → queryable in Vercel Logs dashboard.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { apiLog } from '@/lib/api-logger';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';

// [M9 P1-10] body size cap — public error reporter, 10KB cap prevents DOS via oversized payload.
// Tightened from 16KB → 10KB to match vitals route (both are unauthenticated public beacons).
// Real stack traces after source-map resolution fit under 10KB; overflow is likely abuse.
const MAX_REQUEST_SIZE = 10_000;

export async function POST(req: NextRequest) {
  // Same-origin validation
  const origin = req.headers.get('origin') || req.headers.get('referer') || '';
  const host = req.headers.get('host') || '';
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return new NextResponse(null, { status: 403 });
      }
    } catch {
      return new NextResponse(null, { status: 403 });
    }
  }

  const ip = getClientIp(req.headers);

  // Rate check using shared limiter
  const rl = checkRateLimit(ip, 'error-report', RATE_LIMITS.default);
  if (!rl.allowed) {
    return new NextResponse(null, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) },
    });
  }

  try {
    const raw = await req.text();
    if (raw.length > MAX_REQUEST_SIZE) {
      return NextResponse.json({ error: 'body_too_large' }, { status: 413 });
    }

    const body = JSON.parse(raw);
    // [S2-error-report, 2026-04-24] 로그 주입 defense-in-depth.
    // apiLog 는 JSON.stringify 기반이라 \n 자동 이스케이프, 실제 주입은 불가.
    // 단 입력단에서 control char 제거해 두면 다운스트림 텍스트 로거 사용 시에도 안전.
    const clean = (s: unknown): string =>
      String(s ?? '').replace(/[\r\n\t\v\f]+/g, ' ').replace(/[\x00-\x1F\x7F]/g, '');
    apiLog({
      level: 'error',
      event: 'client_error',
      route: '/api/error-report',
      ip,
      error: clean(body.message).slice(0, 200),
      meta: {
        stack: clean(body.stack).slice(0, 300),
        source: clean(body.source).slice(0, 200),
        page: clean(body.url).slice(0, 500),
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error('API:error-report', error instanceof Error ? error.message : error);
    return new NextResponse(null, { status: 400 });
  }
}

// IDENTITY_SEAL: PART-1 | role=error-ingestion | inputs=client error JSON | outputs=structured log
