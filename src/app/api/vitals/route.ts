import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/lib/logger";
import { checkRateLimitAsync, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";

const REQUEST_TIMEOUT = 10_000; // 10s timeout for vitals ingestion
void REQUEST_TIMEOUT;

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host") || "";
    if (!origin || !host) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ip = getClientIp(req.headers);
    // [chaos-fix 2026-06-11] default(60/min) → vitals 전용(240/min). web-vitals 는 페이지당
    // 다수 비콘을 보내므로 default 로는 정상 사용에서도 429. RATE_LIMITS.vitals 로 교체.
    const rl = await checkRateLimitAsync(ip, "vitals", RATE_LIMITS.vitals);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }

    // [M9 P1-9] body size cap — public beacon endpoint, 10KB cap prevents DOS via oversized payload.
    // Content-Length header is hint-only (spoofable) — enforce against actual body length.
    const raw = await req.text();
    if (raw.length > 10_000) {
      return NextResponse.json({ error: 'body_too_large' }, { status: 413 });
    }
    const body = JSON.parse(raw);
    // [chaos-fix 2026-06-11] 클라 배치 댐퍼 도입 — { metrics: [...] } 배열 발송이 기본.
    // 단일 객체(레거시 비콘·구버전 캐시 클라)도 그대로 수용(하위 호환).
    const samples: Array<Record<string, unknown>> = Array.isArray(body?.metrics)
      ? body.metrics
      : [body];

    for (const sample of samples) {
      if (!sample || typeof sample !== 'object') continue;
      // Structured log for Vercel / server-side observability
      logger.info("web-vitals", JSON.stringify({ event: "web-vitals", ...sample, timestamp: Date.now() }));

      // [O-02 fix — 2026-05-12] 'poor' rating 만 Sentry warning 발송 — 성능 회귀 알람 트리거.
      // 'good'/'needs-improvement' 은 stdout 통계로 충분. DSN 미설정/non-prod 는 enabled 가드로 no-op.
      try {
        const s = sample as { rating?: unknown; name?: unknown; value?: unknown; id?: unknown; navigationType?: unknown };
        if (s.rating === 'poor' && typeof s.name === 'string') {
          Sentry.captureMessage(`WebVitals poor: ${s.name}`, {
            level: 'warning',
            tags: { route: '/api/vitals', metric: String(s.name), rating: 'poor' },
            extra: { value: s.value, id: s.id, navigationType: s.navigationType, ip },
          });
        }
      } catch (sentryErr) {
        logger.warn('API:vitals', 'Sentry.captureMessage failed', sentryErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
