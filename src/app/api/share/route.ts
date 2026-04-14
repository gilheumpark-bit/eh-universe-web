import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// In-memory store (production에서는 Redis/KV로 교체)
const store = new Map<string, { payload: unknown; expiresAt: number }>();
const MAX_ENTRIES = 1_000;

// 만료 정리 — 1시간마다
function cleanupExpired(): void {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (entry.expiresAt < now) store.delete(id);
  }
}
setInterval(cleanupExpired, 3600000);

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 30 requests/min per IP
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(ip, '/api/share', { maxRequests: 30, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }

    const body = await req.json();
    const { type, title, content, meta, expiresInHours = 72 } = body;

    if (!type || !content) {
      return NextResponse.json({ error: 'type and content required' }, { status: 400 });
    }

    const id = `sh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = Date.now() + expiresInHours * 3600000;

    // Evict oldest entry if store is at capacity
    if (store.size >= MAX_ENTRIES) {
      let oldestKey = '';
      let oldestTime = Infinity;
      store.forEach((entry, key) => {
        if (entry.expiresAt < oldestTime) {
          oldestTime = entry.expiresAt;
          oldestKey = key;
        }
      });
      if (oldestKey) store.delete(oldestKey);
    }

    store.set(id, {
      payload: { type, title, content, meta },
      expiresAt,
    });

    return NextResponse.json({ id, expiresAt });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const entry = store.get(id);
  if (!entry) return NextResponse.json({ error: 'Not found or expired' }, { status: 404 });
  if (entry.expiresAt < Date.now()) {
    store.delete(id);
    return NextResponse.json({ error: 'Expired' }, { status: 410 });
  }

  return NextResponse.json(entry.payload);
}
