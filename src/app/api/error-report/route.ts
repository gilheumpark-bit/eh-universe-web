// ============================================================
// /api/error-report — Client error ingestion endpoint
// Receives error reports and logs them as structured JSON.
// Vercel captures stdout → queryable in Vercel Logs dashboard.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { apiLog } from '@/lib/api-logger';

const MAX_BODY_SIZE = 4096;

// Rate limit: 60 reports/min per IP
const reportMap = new Map<string, { count: number; resetAt: number }>();

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  // Rate check
  const now = Date.now();
  const entry = reportMap.get(ip);
  if (entry && now < entry.resetAt) {
    if (entry.count >= 60) return new NextResponse(null, { status: 429 });
    entry.count++;
  } else {
    reportMap.set(ip, { count: 1, resetAt: now + 60_000 });
  }

  // Lazy cleanup
  if (reportMap.size > 5000) {
    for (const [k, v] of reportMap) {
      if (now > v.resetAt) reportMap.delete(k);
    }
  }

  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_SIZE) {
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
  } catch {
    return new NextResponse(null, { status: 400 });
  }
}

// IDENTITY_SEAL: PART-1 | role=error-ingestion | inputs=client error JSON | outputs=structured log
