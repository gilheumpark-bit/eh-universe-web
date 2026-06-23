// ============================================================
// PART 1 — Next.js Proxy (CSRF systematic enforcement)
// ============================================================
// [2026-06-08] Next 16 migration: middleware.ts → proxy.ts 이름 변경 강제.
//   - 기존 middleware.ts 의 CSRF 로직 그대로 이관 (P5 루프2/Senior architect)
//   - 기존 proxy.ts 의 CSP 헤더는 next.config.ts headers() 로 이미 적용 중 (중복 제거)
//   - Next 16 은 src/proxy.ts (또는 root proxy.ts) 단일 파일만 인식
//
// 화이트리스트 (CSRF 면제 — 대체 보안 메커니즘 보유):
//   - /api/csrf — 토큰 발급 (chicken-and-egg)
//   - /api/stripe/webhook — Stripe signature 검증
//   - /api/cron/* — Vercel Cron secret 검증
//   - /api/error-report — 클라이언트 fetch (sentry 패턴, low-risk)
//   - /api/vitals — Beacon API (Web Vitals reporting, low-risk)
//   - /api/health, /api/readiness — health probe (GET only, defense-in-depth)
//   - /api/lsp/* — 외부 도구용 Bearer 토큰 인증. 브라우저 쿠키 CSRF와 분리.
//
// 제거된 공개 표면:
//   - /code, /code-studio, /codex, /reference, /reports, /rulebook, /tools, /world
//   - /api/code/*, /api/network-agent/*, /api/npm-search
//
// 적용 외 경로:
//   - GET / HEAD / OPTIONS — side-effect free, CSRF 불요
//   - non-/api routes — page rendering, CSRF 무관
//
// [C] fail-close: verifyCsrf 가 false → 403 + JSON 오류
// [C] preflight (OPTIONS) — 통과 (브라우저 CORS preflight)
// [G] matcher 로 /api/* 만 실행 — page rendering / static asset 부담 0
// [K] 화이트리스트는 Set 으로 O(1)
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/lib/csrf';
import { isAllowedOriginValue } from '@/lib/api-origin-guard';

// ============================================================
// PART 2 — Whitelist & method filter
// ============================================================

const CSRF_EXEMPT_PATHS: ReadonlySet<string> = new Set([
  '/api/csrf',
  '/api/stripe/webhook',
  '/api/error-report',
  '/api/vitals',
  '/api/health',
  '/api/readiness',
]);

const CSRF_EXEMPT_PREFIXES: readonly string[] = [
  '/api/cron/',
  '/api/lsp/',
];

const WRITE_METHODS: ReadonlySet<string> = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const REMOVED_PAGE_EXACT_PATHS: ReadonlySet<string> = new Set([
  '/code',
  '/code-studio',
  '/codex',
  '/reference',
  '/reports',
  '/rulebook',
  '/tools',
  '/world',
]);

const REMOVED_PAGE_PREFIXES: readonly string[] = [
  '/code-studio/',
  '/codex/',
  '/reference/',
  '/reports/',
  '/rulebook/',
  '/tools/',
  '/world/',
];

const REMOVED_API_PREFIXES: readonly string[] = [
  '/api/code/',
  '/api/network-agent/',
];

const REMOVED_API_EXACT_PATHS: ReadonlySet<string> = new Set([
  '/api/npm-search',
]);

function isCsrfExempt(pathname: string): boolean {
  if (CSRF_EXEMPT_PATHS.has(pathname)) return true;
  for (const prefix of CSRF_EXEMPT_PREFIXES) {
    if (pathname.startsWith(prefix)) return true;
  }
  return false;
}

function isRemovedPagePath(pathname: string): boolean {
  if (REMOVED_PAGE_EXACT_PATHS.has(pathname)) return true;
  for (const prefix of REMOVED_PAGE_PREFIXES) {
    if (pathname.startsWith(prefix)) return true;
  }
  return false;
}

function isRemovedApiPath(pathname: string): boolean {
  if (REMOVED_API_EXACT_PATHS.has(pathname)) return true;
  for (const prefix of REMOVED_API_PREFIXES) {
    if (pathname.startsWith(prefix)) return true;
  }
  return false;
}

// ============================================================
// PART 3 — Inline CSRF verifier (Edge runtime-safe)
// ============================================================

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function verifyCsrfEdge(req: NextRequest): boolean {
  const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = req.headers.get(CSRF_HEADER_NAME);
  if (!cookieToken || !headerToken) return false;
  return timingSafeEqualString(cookieToken, headerToken);
}

function hasSameOriginHeader(req: NextRequest): boolean {
  return isAllowedOriginValue(req.headers, req.headers.get('origin'));
}

// ============================================================
// PART 4 — Proxy entry point (Next 16 default export "proxy")
// ============================================================

export function proxy(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const method = req.method.toUpperCase();

  if (isRemovedApiPath(pathname)) {
    return NextResponse.json(
      {
        ok: false,
        error: 'surface_removed',
        message: 'This legacy API surface is no longer active in Loreguard.',
      },
      { status: 410 },
    );
  }

  if (isRemovedPagePath(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  if (!pathname.startsWith('/api/')) return NextResponse.next();
  if (!WRITE_METHODS.has(method)) return NextResponse.next();
  if (isCsrfExempt(pathname)) return NextResponse.next();

  if (!verifyCsrfEdge(req) && !hasSameOriginHeader(req)) {
    return NextResponse.json(
      {
        ok: false,
        error: 'csrf_failed',
        message: 'CSRF token missing or mismatch. Refresh and retry.',
        hint: 'Call /api/csrf to obtain a fresh token, then echo it via X-CSRF-Token header.',
      },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

// ============================================================
// PART 5 — Matcher config
// ============================================================

export const config = {
  matcher: [
    '/api/:path*',
    '/code',
    '/code-studio',
    '/code-studio/:path*',
    '/codex',
    '/codex/:path*',
    '/reference',
    '/reference/:path*',
    '/reports',
    '/reports/:path*',
    '/rulebook',
    '/rulebook/:path*',
    '/tools',
    '/tools/:path*',
    '/world',
    '/world/:path*',
  ],
};

// IDENTITY_SEAL: proxy PART-1 | role=CSRF systematic enforcement | scope=/api/* writes
// IDENTITY_SEAL: proxy PART-4 | role=proxy entry | inputs=NextRequest | outputs=NextResponse
// IDENTITY_SEAL: proxy PART-5 | role=Next.js matcher | scope=/api/:path*
