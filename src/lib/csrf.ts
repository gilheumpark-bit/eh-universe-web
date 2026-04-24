// ============================================================
// csrf — Double-submit cookie CSRF defense
// ============================================================
// [W7 2026-04-24] Origin 체크 단독 방어 보강. defense-in-depth.
//
// 전제:
//   1) 서버가 랜덤 토큰 발급 → 쿠키 `eh-csrf-token` (SameSite: Strict, httpOnly: false)
//   2) 클라이언트가 쿠키 읽어 `X-CSRF-Token` 헤더로 echo
//   3) 서버가 쿠키 값과 헤더 값 동치 비교 (constant-time)
//
// 공격자가 다른 사이트에서 cross-site POST 를 시도해도:
//   - SameSite: Strict 으로 쿠키 전송 X → cookieToken 비움 → 401
//   - 또는 쿠키는 있지만 헤더 위조 불가 (cross-origin fetch 헤더 제한)
//
// 적용 지침:
//   - GET / HEAD / OPTIONS — 검증 불필요 (side-effect free)
//   - POST / PUT / PATCH / DELETE — verifyCsrf() 필수
//   - `/api/csrf` 엔드포인트에서 토큰 발급
// ============================================================

import crypto from 'crypto';
import type { NextRequest } from 'next/server';

// ============================================================
// PART 1 — Constants
// ============================================================

export const CSRF_COOKIE_NAME = 'eh-csrf-token';
export const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_LENGTH_BYTES = 32;
export const CSRF_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24; // 24h

// ============================================================
// PART 2 — Token generator
// ============================================================

/**
 * 128bit+ 엔트로피 토큰 — base64url 인코딩 (32 bytes → 43 chars).
 * crypto.randomBytes 기반 CSPRNG.
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH_BYTES).toString('base64url');
}

// ============================================================
// PART 3 — Verifier (constant-time)
// ============================================================

/**
 * Request 의 쿠키 값과 헤더 값을 constant-time 비교.
 * 둘 중 하나라도 없거나 길이 다르면 false.
 *
 * [C] timingSafeEqual — 길이 다를 경우 Buffer.from 이 다른 길이로 생성되므로 조기 리턴.
 * [C] 예외 발생 시 false 반환 (fail-close).
 */
export function verifyCsrf(req: NextRequest): boolean {
  const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = req.headers.get(CSRF_HEADER_NAME);
  if (!cookieToken || !headerToken) return false;
  if (cookieToken.length !== headerToken.length) return false;
  try {
    const a = Buffer.from(cookieToken);
    const b = Buffer.from(headerToken);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ============================================================
// PART 4 — Cookie options (shared with /api/csrf)
// ============================================================

export const CSRF_COOKIE_OPTIONS = {
  name: CSRF_COOKIE_NAME,
  httpOnly: false, // 클라이언트 JS 가 읽어서 헤더에 넣어야 함 (double-submit 핵심)
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: CSRF_COOKIE_MAX_AGE_SECONDS,
};

// IDENTITY_SEAL: csrf | role=double-submit-cookie | inputs=NextRequest | outputs=boolean + token
