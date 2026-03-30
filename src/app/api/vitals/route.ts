import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const REQUEST_TIMEOUT = 10_000; // 10s timeout for vitals ingestion
void REQUEST_TIMEOUT;

export async function POST(req: Request) {
  try {
    // CSRF: Origin header validation
    const origin = req.headers.get('origin');
    if (!origin || !origin.includes(req.headers.get('host') || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
