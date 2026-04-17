// ============================================================
// /api/github/token — GitHub 인증 상태 조회 (토큰 직접 노출 금지)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * GET /api/github/token
 *
 * 보안 강화: 토큰 원본을 더 이상 반환하지 않음.
 * - Same-origin 요청만 허용 (CSRF 방어)
 * - { authenticated: boolean } 만 응답
 * - 실제 GitHub 호출은 /api/github/proxy/* 서버사이드 프록시 경유
 *
 * 기존 httpOnly 쿠키 → JSON 반환은 XSS 1회 발생 시 OAuth 토큰 전체 탈취 경로였음.
 * 레거시 호환이 필요하면 명시적 query param `?legacy=1`로만 허용 (dev 전용).
 */
export async function GET(req: NextRequest) {
  // Origin 검증 (CSRF 방어) — substring이 아닌 엄격한 URL host 비교
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return NextResponse.json({ authenticated: false, error: 'cross-origin blocked' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ authenticated: false, error: 'invalid origin' }, { status: 403 });
    }
  }

  const token = req.cookies.get('gh_access_token')?.value;
  const authenticated = Boolean(token);

  // 레거시 호환 모드 — 개발 환경 + 명시적 opt-in일 때만 토큰 반환
  const legacy = req.nextUrl.searchParams.get('legacy') === '1';
  const isDev = process.env.NODE_ENV !== 'production';
  if (legacy && isDev && token) {
    return NextResponse.json({ authenticated, token });
  }

  return NextResponse.json({ authenticated });
}

// IDENTITY_SEAL: PART-1 | role=github-auth-status | inputs=cookie+origin | outputs=authenticated-bool
