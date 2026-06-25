// ============================================================
// /api/lsp/auth — POST: 토큰 발급 (Phase 1: 인증 없이 발급, Phase 2: Firebase 인증)
// GET: 현재 토큰 hash 조회 (검증용)
// ============================================================

import { NextResponse } from 'next/server';
import {
  checkRateLimit,
  generateLspToken,
  hashToken,
  LSP_SESSION_COOKIE,
  LSP_SESSION_TTL_SEC,
  lspAuthHeaders,
  verifyLspToken,
} from '@/lib/lsp/auth';
// [fix] spoofable XFF 대신 codebase 표준 getClientIp 사용 (x-vercel-forwarded-for 우선 → 위조 내성)
import { getClientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';

function setLspSessionCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set({
    name: LSP_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/lsp',
    maxAge: LSP_SESSION_TTL_SEC,
  });
  return response;
}

/** POST — 새 토큰 발급. [보안 누락 수리 — 2026-05-09] IP 기반 rate-limit 추가. */
export async function POST(request: Request): Promise<NextResponse> {
  const auth = request.headers.get('authorization') ?? '';
  const bearer = auth.replace(/^Bearer\s+/i, '').trim();
  if (bearer) {
    const result = await verifyLspToken(bearer);
    if (!result.ok) {
      return NextResponse.json(
        { valid: false, error: result.error },
        { status: result.status, headers: lspAuthHeaders(result) },
      );
    }
    const tokenHash = await hashToken(bearer);
    return setLspSessionCookie(
      NextResponse.json({
        valid: true,
        tokenHash,
        sessionCookie: LSP_SESSION_COOKIE,
        sessionTtlSec: LSP_SESSION_TTL_SEC,
      }),
      bearer,
    );
  }

  // 보안 누락 수리 — 토큰 발급 자체는 인증이 없으므로 IP 기반 rate-limit 으로 무한 발급 방지.
  // 이전 버전: rate-limit 0 → 누구나 무한 토큰 발급 가능 (DoS·storage 공격 위험).
  // [fix] 식별자를 직접 추출하던 spoofable 로직(x-forwarded-for 우선)을 제거하고
  //   공용 getClientIp 사용. Vercel 환경에선 x-vercel-forwarded-for(위조 불가) → x-real-ip 우선,
  //   self-host 에선 x-forwarded-for 폴백, 모두 없으면 'unknown'(가장 엄격 throttle).
  const clientId = getClientIp(request.headers);
  const rl = checkRateLimit(`auth:${clientId}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limit_exceeded', message: 'Too many token requests. Try later.', reset_at: rl.resetAt },
      { status: 429 },
    );
  }

  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      {
        error: 'lsp_token_issuance_unavailable',
        message: '운영 환경의 외부 도구 토큰은 서버 설정으로 발급해야 합니다.',
      },
      { status: 503 },
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
  const result = await verifyLspToken(token);
  if (!result.ok) {
    return NextResponse.json(
      { valid: false, error: result.error },
      { status: result.status, headers: lspAuthHeaders(result) },
    );
  }
  const hash = await hashToken(token);
  return NextResponse.json({ valid: true, tokenHash: hash });
}

/** DELETE — 브라우저용 LSP 세션 쿠키 제거 */
export async function DELETE(): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: LSP_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/lsp',
    maxAge: 0,
  });
  return response;
}
