import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { firestoreCreateDocument, firestoreListDocuments } from '@/lib/firestore-service-rest';

// In-memory fallback (Firestore 미설정 시)
const store = new Map<string, { payload: unknown; expiresAt: number }>();
const MAX_ENTRIES = 1_000;

function cleanupExpired(): void {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (entry.expiresAt < now) store.delete(id);
  }
}

// setInterval은 Vercel 서버리스에서 동작 보장 안 되므로 POST/GET마다 lazy cleanup
function lazyCleanup(): void {
  if (store.size > MAX_ENTRIES * 0.8) cleanupExpired();
}

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
const COLLECTION = 'shares';

async function persistToFirestore(id: string, payload: unknown, expiresAt: number): Promise<boolean> {
  if (!PROJECT_ID) return false;
  try {
    const res = await firestoreCreateDocument(PROJECT_ID, COLLECTION, {
      id: { stringValue: id },
      payload: { stringValue: JSON.stringify(payload) },
      expiresAt: { integerValue: String(expiresAt) },
      createdAt: { timestampValue: new Date().toISOString() },
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function fetchFromFirestore(id: string): Promise<{ payload: unknown; expiresAt: number } | null> {
  if (!PROJECT_ID) return null;
  try {
    const res = await firestoreListDocuments(PROJECT_ID, COLLECTION, { pageSize: 100 });
    if (!res.ok) return null;
    for (const doc of res.documents) {
      const d = doc as { fields?: { id?: { stringValue?: string }; payload?: { stringValue?: string }; expiresAt?: { integerValue?: string } } };
      if (d.fields?.id?.stringValue === id) {
        const payloadStr = d.fields.payload?.stringValue || '{}';
        const expiresAtStr = d.fields.expiresAt?.integerValue || '0';
        return { payload: JSON.parse(payloadStr), expiresAt: Number(expiresAtStr) };
      }
    }
  } catch { /* fallback */ }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    lazyCleanup();
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
    const payload = { type, title, content, meta };

    // Firestore 영속화 시도
    const persisted = await persistToFirestore(id, payload, expiresAt);

    // In-memory fallback — Firestore 실패 시에도 기능 유지
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
    store.set(id, { payload, expiresAt });

    return NextResponse.json({
      id,
      expiresAt,
      storage: persisted ? 'persistent' : 'ephemeral',
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  // In-memory 우선 조회 (hot path)
  let entry = store.get(id);

  // Firestore fallback (다른 람다 인스턴스에서 저장된 경우)
  if (!entry) {
    const fromFs = await fetchFromFirestore(id);
    if (fromFs) entry = fromFs;
  }

  if (!entry) return NextResponse.json({ error: 'Not found or expired' }, { status: 404 });
  if (entry.expiresAt < Date.now()) {
    store.delete(id);
    return NextResponse.json({ error: 'Expired' }, { status: 410 });
  }

  return NextResponse.json(entry.payload);
}
