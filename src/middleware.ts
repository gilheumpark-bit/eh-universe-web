// ============================================================
// CSP Nonce Middleware — generates per-request nonce for script-src
// ============================================================
// Next.js middleware runs on every request. We generate a crypto
// nonce and inject it into the Content-Security-Policy header,
// replacing 'unsafe-inline' for script-src.
//
// style-src retains 'unsafe-inline' because the project uses
// 243+ inline styles (Tailwind + dynamic style props). Removing
// it requires a CSS-in-JS nonce strategy or full refactor.
// [Future] Migrate inline styles to CSS variables/classes to allow
//          nonce-based style-src and remove 'unsafe-inline' for styles.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Generate a base64-encoded 128-bit nonce from crypto.getRandomValues */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // Convert to base64 — Edge Runtime supports btoa
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ============================================================
// CSP Directives
// ============================================================

function buildCSPHeader(nonce: string, isCodeStudio: boolean): string {
  const scriptSrc = isCodeStudio
    ? `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' https://apis.google.com https://cdn.jsdelivr.net https://va.vercel-scripts.com https://vercel.live`
    : `script-src 'self' 'nonce-${nonce}' https://apis.google.com https://cdn.jsdelivr.net https://va.vercel-scripts.com https://vercel.live`;

  // style-src: 'unsafe-inline' retained — see TODO above
  const styleSrc = "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net";

  const directives = [
    "default-src 'self'",
    scriptSrc,
    styleSrc,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net",
    "worker-src 'self' blob:",
    `connect-src 'self' https://generativelanguage.googleapis.com https://api.openai.com https://api.anthropic.com https://api.groq.com https://api.mistral.ai https://www.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://*.firebaseapp.com https://apis.google.com https://cdn.jsdelivr.net https://firestore.googleapis.com https://*.googleapis.com https://va.vercel-scripts.com https://vitals.vercel-insights.com https://*.ingest.us.sentry.io${isCodeStudio ? ' https://*.webcontainer.io wss://*.webcontainer.io' : ''}`,
    `frame-src 'self' https://accounts.google.com https://*.firebaseapp.com${isCodeStudio ? ' https://*.webcontainer.io' : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
  ];

  return directives.join('; ');
}

// ============================================================
// Middleware
// ============================================================

export function middleware(request: NextRequest) {
  const nonce = generateNonce();
  const { pathname } = request.nextUrl;
  const isCodeStudio = pathname.startsWith('/code-studio');

  const cspHeader = buildCSPHeader(nonce, isCodeStudio);

  // Clone request headers, inject nonce for Server Components to read
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Set CSP header on the response
  response.headers.set('Content-Security-Policy', cspHeader);

  // Security headers (previously in next.config.ts headers())
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

  // Cross-origin isolation for Code Studio (WebContainer)
  if (isCodeStudio) {
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  }

  return response;
}

export const config = {
  matcher: [
    // Match all request paths except:
    // - _next/static (static files)
    // - _next/image (image optimization)
    // - favicon.ico, icon, apple-icon (app icons)
    // - manifest.webmanifest
    // - images directory (static assets)
    // - API routes (they set their own headers)
    '/((?!_next/static|_next/image|favicon\\.ico|icon|apple-icon|manifest\\.webmanifest|images/|api/).*)',
  ],
};
