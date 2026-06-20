// ============================================================
// /api/csrf — Issue double-submit CSRF token
// ============================================================
// GET → 신규 토큰 생성 + `eh-csrf-token` 쿠키 설정 + body 에도 echo
// 클라이언트 패턴:
//   1) 앱 초기 로드 시 GET /api/csrf 로 토큰 수령
//   2) localStorage / 메모리에 캐시 (또는 cookie 재파싱)
//   3) 모든 POST/PUT/PATCH/DELETE 요청에 X-CSRF-Token 헤더 포함
// ============================================================

import { NextResponse } from 'next/server';
import { CSRF_COOKIE_OPTIONS, generateCsrfToken } from '@/lib/csrf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const token = generateCsrfToken();
  const res = NextResponse.json({ token });
  res.cookies.set({ ...CSRF_COOKIE_OPTIONS, value: token });
  return res;
}

// IDENTITY_SEAL: csrf/route | role=token-issuer | inputs=GET | outputs=token+cookie
