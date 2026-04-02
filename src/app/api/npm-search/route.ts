import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { checkRateLimit, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";

const NPM = "https://registry.npmjs.org/-/v1/search";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = checkRateLimit(ip, "npm-search", RATE_LIMITS.default);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } },
    );
  }
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length > 200) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }
  try {
    const url = `${NPM}?text=${encodeURIComponent(q)}&size=20`;
    const res = await fetch(url, { next: { revalidate: 120 } });
    if (!res.ok) {
      return NextResponse.json({ error: "npm registry error" }, { status: 502 });
    }
    const data = (await res.json()) as {
      objects?: Array<{ package: { name: string; version: string; description?: string } }>;
    };
    return NextResponse.json(data);
  } catch (e) {
    logger.error("API:npm-search", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "search failed" }, { status: 500 });
  }
}
