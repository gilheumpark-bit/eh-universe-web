import { NextRequest, NextResponse } from 'next/server';

/**
 * EH-Universe Security Middleware (Hardened v2.0)
 * - 10-cycle Super-precision Audit Findings Applied
 * - Generates CSP nonce for each request
 * - Implements strict environment-aware security policies
 */
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const { pathname } = request.nextUrl;
  const isCodeStudio = pathname.startsWith('/code-studio');
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Dynamic Whitelist based on environment
  const allowedConnectSrc = [
    '\'self\'',
    'https://*.googleapis.com',
    'https://*.firebaseio.com',
    'https://*.google-analytics.com',
    'https://*.sentry.io',
    'https://api.openai.com',
    'https://api.anthropic.com',
    'https://api.groq.com',
    'https://api.mistral.ai',
    isDevelopment ? 'http://localhost:* ws://localhost:*' : '',
    isCodeStudio ? 'https://*.webcontainer.io wss://*.webcontainer.io' : '',
  ].filter(Boolean).join(' ');

  // CSP Policy: Hardened and Refined
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: http: 'unsafe-eval';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net;
    font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net;
    img-src 'self' blob: data: https:;
    connect-src ${allowedConnectSrc};
    frame-src 'self' https://*.firebaseapp.com https://accounts.google.com${isCodeStudio ? ' https://*.webcontainer.io' : ''};
    worker-src 'self' blob:${isCodeStudio ? ' https://*.webcontainer.io' : ''};
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Security Headers Enforcement
  const securityHeaders = {
    'Content-Security-Policy': cspHeader,
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-XSS-Protection': '1; mode=block',
  };

  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Cross-origin isolation for Code Studio (WebContainer requirement)
  if (isCodeStudio) {
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }

  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};

