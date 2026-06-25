import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { checkRateLimitAsync, getClientIp } from '@/lib/rate-limit';
import { firestoreCreateDocument, firestoreGetDocument } from '@/lib/firestore-service-rest';
import { checkSameOriginHeaders } from '@/lib/api-origin-guard';
import { verifyFirebaseIdToken } from '@/lib/firebase-id-token';
import { apiLog } from '@/lib/api-logger';

// In-memory fallback (Firestore 미설정 시)
const store = new Map<string, { payload: unknown; expiresAt: number; ownerUid: string }>();
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

async function persistToFirestore(id: string, payload: unknown, expiresAt: number, ownerUid: string): Promise<boolean> {
  if (!PROJECT_ID) return false;
  try {
    // documentId=id 고정 — 단건 path get 과 대칭(write-once). #18: list 선형스캔 폐기.
    const res = await firestoreCreateDocument(PROJECT_ID, COLLECTION, {
      id: { stringValue: id },
      payload: { stringValue: JSON.stringify(payload) },
      expiresAt: { integerValue: String(expiresAt) },
      ownerUid: { stringValue: ownerUid },
      createdAt: { timestampValue: new Date().toISOString() },
    }, { documentId: id });
    return res.ok;
  } catch {
    return false;
  }
}

async function fetchFromFirestore(id: string): Promise<{ payload: unknown; expiresAt: number; ownerUid: string } | null> {
  if (!PROJECT_ID) return null;
  try {
    // #18: shares/{id} 단건 조회 — 앞쪽 100개만 스캔하던 비결정 404 제거.
    const res = await firestoreGetDocument(PROJECT_ID, `${COLLECTION}/${id}`);
    if (!res.ok) return null;
    const fields = res.fields as { payload?: { stringValue?: string }; expiresAt?: { integerValue?: string }; ownerUid?: { stringValue?: string } };
    const payloadStr = fields.payload?.stringValue || '{}';
    const expiresAtStr = fields.expiresAt?.integerValue || '0';
    const ownerUid = fields.ownerUid?.stringValue || '';
    return { payload: JSON.parse(payloadStr), expiresAt: Number(expiresAtStr), ownerUid };
  } catch (err) {
    // 빈 catch였음 — "토큰 없음(null)"과 "Firestore 오류"를 구별 가능하게 로깅만 추가. 반환 동작 불변.
    apiLog({
      level: 'warn',
      event: 'share_firestore_fetch_error',
      route: '/api/share',
      error: err instanceof Error ? err.message : String(err),
    });
  }
  return null;
}

// [S1-share 방어, 2026-04-24] 상한 — Firestore 스토리지 폭주·과금 폭탄 차단
const MAX_CONTENT_LENGTH_BYTES = 500_000; // 500KB body (여유분 포함)
const MAX_CONTENT_CHARS = 200_000;        // content 필드 200K chars
const MAX_TITLE_CHARS = 500;
const MAX_EXPIRES_HOURS = 720;            // 30 일 캡 (기본 72h)

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const startedAt = Date.now();
  try {
    const originCheck = checkSameOriginHeaders(req.headers);
    if (!originCheck.ok) {
      apiLog({
        level: 'warn',
        event: 'share_origin_blocked',
        route: '/api/share',
        ip,
        status: 403,
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json({ error: originCheck.error }, { status: 403 });
    }

    lazyCleanup();
    const rl = await checkRateLimitAsync(ip, '/api/share', { maxRequests: 30, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'authentication_required' }, { status: 401 });
    }
    const auth = await verifyFirebaseIdToken(authHeader.slice(7).trim());
    if (!auth) {
      return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
    }

    // [S1-share] body 크기 게이트 — parse 전 차단
    const contentLengthHeader = parseInt(req.headers.get('content-length') || '0', 10);
    if (contentLengthHeader > MAX_CONTENT_LENGTH_BYTES) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    const body = await req.json();
    const { type, title, content, meta, expiresInHours = 72 } = body;

    if (!type || !content) {
      return NextResponse.json({ error: 'type and content required' }, { status: 400 });
    }

    // [S1-share] content / title 길이 검증
    if (typeof content === 'string' && content.length > MAX_CONTENT_CHARS) {
      return NextResponse.json({ error: 'content too long (max 200K chars)' }, { status: 413 });
    }
    if (typeof title === 'string' && title.length > MAX_TITLE_CHARS) {
      return NextResponse.json({ error: 'title too long (max 500 chars)' }, { status: 413 });
    }

    // [S1-share] expiresInHours 상한 30일 + 유효 숫자 강제
    const hoursNum = Number(expiresInHours);
    const cappedHours = Math.min(
      Math.max(1, Number.isFinite(hoursNum) && hoursNum > 0 ? hoursNum : 72),
      MAX_EXPIRES_HOURS,
    );

    // [C] crypto.randomBytes(16) — Math.random 약한 ID 대신 128bit 엔트로피
    const id = `sh_${crypto.randomBytes(16).toString('base64url')}`;
    const expiresAt = Date.now() + cappedHours * 3600000;
    const payload = { type, title, content, meta };

    // Firestore 영속화 시도
    const persisted = await persistToFirestore(id, payload, expiresAt, auth.uid);

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
    store.set(id, { payload, expiresAt, ownerUid: auth.uid });

    apiLog({
      level: 'info',
      event: 'share_created',
      route: '/api/share',
      ip,
      status: 200,
      durationMs: Date.now() - startedAt,
      meta: {
        uid: auth.uid,
        shareType: type,
        storage: persisted ? 'persistent' : 'ephemeral',
        contentChars: typeof content === 'string' ? content.length : null,
      },
    });

    return NextResponse.json({
      id,
      expiresAt,
      storage: persisted ? 'persistent' : 'ephemeral',
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// 발급 ID 형식: sh_ + base64url. 단건 조회로 전환되면서 id 가 Firestore 문서 path
// 세그먼트로 직접 들어가므로 '/'·'..' 등 path 주입(IDOR/traversal)을 형식 검증으로 차단.
const SHARE_ID_RE = /^sh_[A-Za-z0-9_-]{1,64}$/;

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  if (!SHARE_ID_RE.test(id)) {
    return NextResponse.json({ error: 'Not found or expired' }, { status: 404 });
  }

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
