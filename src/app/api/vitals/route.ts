import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { checkRateLimit, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";

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
    const rl = checkRateLimit(ip, "vitals", RATE_LIMITS.default);
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
    // Structured log for Vercel / server-side observability
    logger.info("web-vitals", JSON.stringify({ event: "web-vitals", ...body, timestamp: Date.now() }));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
