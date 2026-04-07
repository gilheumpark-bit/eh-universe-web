export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "../_stubs/logger";
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

    // body size check: Web Vitals payloads are small JSON (<2KB typical)
    const contentLength = parseInt(req.headers.get('Content-Length') || '0', 10);
    if (contentLength > 10_000) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }
    const body = await req.json();
    // Structured log for Vercel / server-side observability
    logger.info("web-vitals", JSON.stringify({ event: "web-vitals", ...body, timestamp: Date.now() }));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

