// ============================================================
// /api/user/delete — DSAR erasure / right-to-be-forgotten (GDPR Art.17 · K-PIPA §36)
// ============================================================
// 사용자가 본인 계정·데이터 삭제 요청. 인증 + CSRF + 동일 출처 + 빈도 제한 전수 검증.
//
// 현재 범위: deletion_requests 컬렉션에 티켓 기록 → 관리자 수동 처리 (30일 SLA).
// 후속 (firebase-admin SDK 통합 후): 즉시 soft-delete (users.deletedAt) + 30일 grace period 후 hard-delete.
//
// 정책: GDPR Art.17 — 정당한 근거 없는 처리 자료는 "without undue delay" 삭제. 통상 30일 SLA.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getClientIp, checkRateLimit } from '@/lib/rate-limit';
import { verifyCsrf } from '@/lib/csrf';
import { verifyFirebaseIdToken } from '@/lib/firebase-id-token';
import { firestoreCreateDocument } from '@/lib/firestore-service-rest';
import { apiLog } from '@/lib/api-logger';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);

  // Rate limit — 삭제는 매우 드문 행위, 3/day 충분
  const rl = checkRateLimit(ip, '/api/user/delete', {
    maxRequests: 3,
    windowMs: 24 * 3600 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limited. Deletion requests capped at 3/day.' },
      { status: 429 },
    );
  }

  // Origin
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
    logger.error('dsar-delete', 'id token verify failed', err);
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

  // Optional body — 삭제 사유 (선택)
  let reason = '';
  try {
    const body = await req.json();
    if (typeof body?.reason === 'string') {
      reason = body.reason.slice(0, 500).replace(/[\r\n\t]/g, ' ');
    }
  } catch {
    /* reason 선택, 없어도 진행 */
  }

  // 티켓 발급
  const ticketId = `del_${crypto.randomBytes(12).toString('base64url')}`;

  // Firestore 기록 — 관리자 수동 처리용 큐
  let recorded = false;
  try {
    const created = await firestoreCreateDocument(projectId, 'deletion_requests', {
      uid: { stringValue: uid },
      email: { stringValue: decoded.email ?? '' },
      reason: { stringValue: reason },
      ticketId: { stringValue: ticketId },
      ip: { stringValue: ip },
      requestedAt: { timestampValue: new Date().toISOString() },
      status: { stringValue: 'pending' },
    });
    recorded = created.ok;
  } catch (err) {
    logger.error('dsar-delete', 'firestore write failed', err);
  }

  apiLog({
    level: recorded ? 'info' : 'error',
    event: recorded ? 'dsar_delete_requested' : 'dsar_delete_firestore_failed',
    route: '/api/user/delete',
    ip,
    meta: { uid, ticketId, recorded },
  });

  return NextResponse.json({
    ticketId,
    uid,
    status: recorded ? 'received' : 'received_without_persistence',
    slaDescription: 'Processing within 30 days per GDPR Art.12 / K-PIPA §36',
    contact: 'gilheumpark@gmail.com',
    note: recorded
      ? 'Your request is queued for admin processing.'
      : 'Queue write failed — please email gilheumpark@gmail.com with the ticket ID for manual processing.',
  });
}

// IDENTITY_SEAL: dsar-delete | role=GDPR-Art.17 + K-PIPA-§36 | inputs=authz+csrf+uid | outputs=ticket
