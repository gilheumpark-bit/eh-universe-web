// ============================================================
// /api/lsp/auth — POST: 토큰 발급 (Phase 1: 인증 없이 발급, Phase 2: Firebase 인증)
// GET: 현재 토큰 hash 조회 (검증용)
// ============================================================

import { NextResponse } from 'next/server';
import { generateLspToken, hashToken, isValidTokenFormat, checkRateLimit } from '@/lib/lsp/auth';

export const runtime = 'nodejs';

/** POST — 새 토큰 발급. [보안 누락 수리 — 2026-05-09] IP 기반 rate-limit 추가. */
export async function POST(request: Request): Promise<NextResponse> {
  // 보안 누락 수리 — 토큰 발급 자체는 인증이 없으므로 IP 기반 rate-limit 으로 무한 발급 방지.
  // 이전 버전: rate-limit 0 → 누구나 무한 토큰 발급 가능 (DoS·storage 공격 위험).
  // 식별자: x-forwarded-for (Vercel) 또는 x-real-ip — 둘 다 없으면 anonymous (가장 엄격 throttle).
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const clientId = forwarded?.split(',')[0]?.trim() || realIp || 'anonymous';
  const rl = checkRateLimit(`auth:${clientId}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limit_exceeded', message: 'Too many token requests. Try later.', reset_at: rl.resetAt },
      { status: 429 },
    );
  }

  const token = generateLspToken();
  const tokenHash = await hashToken(token);
  // 클라이언트가 토큰 본체 저장, 서버는 hash 만 알게 한다
  // (Phase 2 에서 Firestore 에 hash 저장)
  return NextResponse.json({
    token, // 클라가 1회만 받음, 분실시 재발급 필요
    tokenHash,
    issuedAt: new Date().toISOString(),
  });
}

/** GET — 헤더의 토큰 검증 */
export async function GET(request: Request): Promise<NextResponse> {
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!isValidTokenFormat(token)) {
    return NextResponse.json({ valid: false, error: 'invalid_format' }, { status: 401 });
  }
  const hash = await hashToken(token);
  return NextResponse.json({ valid: true, tokenHash: hash });
}
