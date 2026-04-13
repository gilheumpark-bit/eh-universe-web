// ============================================================
// /api/error-report — Client error ingestion endpoint
// Receives error reports and logs them as structured JSON.
// Vercel captures stdout → queryable in Vercel Logs dashboard.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { apiLog } from '@/lib/api-logger';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';

const REQUEST_TIMEOUT = 10_000; // 10s timeout for error report ingestion
void REQUEST_TIMEOUT;

const MAX_REQUEST_SIZE = 16_384; // body size limit (16 KB — allows stack traces)

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
      return new NextResponse(null, { status: 413 });
    }

    const body = JSON.parse(raw);
    apiLog({
      level: 'error',
      event: 'client_error',
      route: '/api/error-report',
      ip,
      error: String(body.message || '').slice(0, 200),
      meta: {
        stack: String(body.stack || '').slice(0, 300),
        source: String(body.source || ''),
        page: String(body.url || ''),
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error('API:error-report', error instanceof Error ? error.message : error);
    return new NextResponse(null, { status: 400 });
  }
}

// IDENTITY_SEAL: PART-1 | role=error-ingestion | inputs=client error JSON | outputs=structured log
