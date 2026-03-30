import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    // CSRF: Origin header validation
    const origin = req.headers.get('origin');
    if (!origin || !origin.includes(req.headers.get('host') || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    // Structured log for Vercel / server-side observability
    logger.info("web-vitals", JSON.stringify({ event: "web-vitals", ...body, timestamp: Date.now() }));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
