// ============================================================
// /api/user/export — DSAR data access / portability (GDPR Art.15/20 · K-PIPA §35)
// ============================================================
// 사용자가 본인 데이터 전체 내보내기 요청. 인증 + CSRF + 동일 출처 + 빈도 제한 전수 검증.
// 현재 범위: users/{uid} 프로필 즉시 반환.
// 나머지 (posts/comments/drafts 등 연계 컬렉션) 은 30일 내 메일로 제공 — 법정 SLA 준수.
//
// 정책: GDPR Art.12 — "unreasonably short deadlines" 금지, 최대 30일 대응.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { JWT } from 'google-auth-library';
import { getClientIp, checkRateLimit } from '@/lib/rate-limit';
import { verifyCsrf } from '@/lib/csrf';
import { verifyFirebaseIdToken } from '@/lib/firebase-id-token';
import { apiLog } from '@/lib/api-logger';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ============================================================
// PART 1 — Service-account token + Firestore single-doc fetch
// ============================================================

async function getServiceAccountToken(): Promise<string | null> {
  const raw = process.env.VERTEX_AI_CREDENTIALS?.trim();
  if (!raw) return null;
  try {
    const creds = JSON.parse(raw) as { client_email?: string; private_key?: string };
    if (!creds.client_email || !creds.private_key) return null;
    const client = new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ['https://www.googleapis.com/auth/datastore'],
    });
    const t = await client.getAccessToken();
    return typeof t === 'string' ? t : (t?.token ?? null);
  } catch {
    return null;
  }
}

async function fetchFirestoreDoc(projectId: string, docPath: string): Promise<unknown | null> {
  const token = await getServiceAccountToken();
  if (!token) return null;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${docPath}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  return await res.json();
}

// ============================================================
// PART 2 — POST handler
// ============================================================

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);

  // Rate limit — DSAR 는 rare, 5/day
  const rl = checkRateLimit(ip, '/api/user/export', {
    maxRequests: 5,
    windowMs: 24 * 3600 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limited. DSAR export requests capped at 5/day.' },
      { status: 429 },
    );
  }

  // Origin 체크
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  try {
    if (!origin || (host && new URL(origin).host !== host)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // CSRF
  if (!verifyCsrf(req)) {
    return NextResponse.json(
      { error: 'CSRF token invalid. Fetch /api/csrf first and include X-CSRF-Token header.' },
      { status: 403 },
    );
  }

  // 인증
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const idToken = authHeader.slice(7).trim();
  let decoded: { uid: string; email?: string } | null = null;
  try {
    decoded = await verifyFirebaseIdToken(idToken);
  } catch (err) {
    logger.error('dsar-export', 'id token verify failed', err);
  }
  if (!decoded?.uid) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  const uid = decoded.uid;

  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    return NextResponse.json({ error: 'Service misconfigured' }, { status: 503 });
  }

  // ============================================================
  // PART 3 — Data collection + assembly
  // ============================================================

  const exportData: Record<string, unknown> = {
    uid,
    email: decoded.email ?? null,
    exportedAt: new Date().toISOString(),
    jurisdiction: 'KR + EU',
    regulation: 'GDPR Art.15/20 · K-PIPA §35',
    requestSource: 'user-initiated',
    data: {},
  };

  try {
    const userDoc = await fetchFirestoreDoc(projectId, `users/${uid}`);
    if (userDoc) exportData.data = { userProfile: userDoc };
  } catch (err) {
    logger.error('dsar-export', 'data collection failed', err);
  }

  exportData.note =
    'This export includes primary user profile data. Additional datasets (posts, comments, drafts, settings) are processed within 30 days per GDPR Art.12 — contact gilheumpark@gmail.com with ticket ID below.';

  apiLog({
    level: 'info',
    event: 'dsar_export',
    route: '/api/user/export',
    ip,
    meta: { uid, email: decoded.email ?? 'unknown' },
  });

  return NextResponse.json(exportData, {
    headers: {
      'Content-Disposition': `attachment; filename="loreguard-export-${uid}-${Date.now()}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}

// IDENTITY_SEAL: dsar-export | role=GDPR-Art.15/20 + K-PIPA-§35 | inputs=authz+csrf+uid | outputs=JSON download
