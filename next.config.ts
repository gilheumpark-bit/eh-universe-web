import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";
import { IgnorePlugin } from "webpack";

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

/**
 * Environment Variables:
 *
 * NEXT_PUBLIC_FIREBASE_ENV
 *   Controls which Firebase project is used.
 *   - "production" (default): production Firebase project
 *   - "test" | "development": test Firebase project (shows TEST badge in UI)
 *
 * NEXT_PUBLIC_FIREBASE_TEST_API_KEY
 * NEXT_PUBLIC_FIREBASE_TEST_AUTH_DOMAIN
 * NEXT_PUBLIC_FIREBASE_TEST_PROJECT_ID
 * NEXT_PUBLIC_FIREBASE_TEST_STORAGE_BUCKET
 * NEXT_PUBLIC_FIREBASE_TEST_MESSAGING_SENDER_ID
 * NEXT_PUBLIC_FIREBASE_TEST_APP_ID
 *   Optional overrides for the test Firebase project config.
 *   If not set, falls back to the production config values.
 */

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  poweredByHeader: false,
  compress: true,
  // React Compiler disabled — requires babel-plugin-react-compiler package
  // reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  // Optimize page transitions
  experimental: {
    /** Tree-shake barrel imports (smaller client chunks for icon / UI libs). */
    optimizePackageImports: [
      "lucide-react",
      "@xterm/xterm",
      "@xterm/addon-fit",
      "@monaco-editor/react",
      "react-markdown",
      "rehype-sanitize",
    ],
  },
  async redirects() {
    return [
      { source: '/games/:path*', destination: '/', permanent: false },
      { source: '/code', destination: '/code-studio', permanent: true },
    ];
  },
  // 보안 헤더: next.config.ts headers()로 적용 (middleware.ts는 Next.js 16 라우팅 충돌 위험)
  // proxy.ts는 참조용으로 유지. 실제 적용은 여기서.
  async headers() {
    // ─── [W4] connect-src — AI providers + Firebase + Vercel + Sentry (env 확장 허용) ───
    const connectSrcBase = [
      "'self'",
      // AI providers
      'https://generativelanguage.googleapis.com',
      'https://api.openai.com',
      'https://api.anthropic.com',
      'https://api.groq.com',
      'https://api.mistral.ai',
      // Firebase + Google APIs
      'https://www.googleapis.com',
      'https://securetoken.googleapis.com',
      'https://identitytoolkit.googleapis.com',
      'https://*.firebaseapp.com',
      'https://firestore.googleapis.com',
      'https://*.googleapis.com',
      'https://apis.google.com',
      // CDN + Vercel monitoring
      'https://cdn.jsdelivr.net',
      'https://va.vercel-scripts.com',
      'https://vitals.vercel-insights.com',
      // Sentry
      'https://*.ingest.us.sentry.io',
    ];
    const extraConnect = (process.env.CSP_EXTRA_CONNECT_SRC ?? '')
      .split(/[\s,]+/)
      .filter(Boolean);
    const connectSrc = [...connectSrcBase, ...extraConnect].join(' ');

    // ─── [W3] img-src — 명시 화이트리스트, 프로덕션에선 `https:` 범용 허용 제거 ───
    const imgSrcBase = [
      "'self'",
      'data:',
      'blob:',
      // Google OAuth 아바타 (lh3~lh6.googleusercontent.com 전체 포괄)
      'https://*.googleusercontent.com',
      // Firebase Storage + 호스팅
      'https://firebasestorage.googleapis.com',
      'https://storage.googleapis.com',
      'https://*.firebaseapp.com',
      // GitHub / Gravatar (프로필 이미지)
      'https://avatars.githubusercontent.com',
      'https://*.gravatar.com',
    ];
    // dev 편의: 프로덕션 외 환경에선 모든 HTTPS 허용 (BYOK · 플러그인 이미지 디버깅)
    if (process.env.NODE_ENV !== 'production') imgSrcBase.push('https:');
    const extraImg = (process.env.CSP_EXTRA_IMG_SRC ?? '').split(/[\s,]+/).filter(Boolean);
    const imgSrc = [...imgSrcBase, ...extraImg].join(' ');

    const cspBase = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://apis.google.com https://cdn.jsdelivr.net https://va.vercel-scripts.com https://vercel.live",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
      `img-src ${imgSrc}`,
      "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net",
      "worker-src 'self' blob:",
      `connect-src ${connectSrc}`,
      "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; ');
    // code-studio 전용 CSP — webcontainer 지원 위해 unsafe-eval 허용.
    // localhost:* frame-src 는 개발 환경에서만 허용 (프로덕션은 제거 — XSS/클릭재킹 표면 축소).
    const allowLocalhostFrame = process.env.NODE_ENV !== 'production';
    const cspCodeStudio = cspBase
      .replace("script-src 'self' 'unsafe-inline'", "script-src 'self' 'unsafe-inline' 'unsafe-eval'")
      .replace("connect-src 'self'", "connect-src 'self' https://*.webcontainer.io wss://*.webcontainer.io")
      .replace(
        "frame-src 'self'",
        `frame-src 'self' https://*.webcontainer.io https://*.webcontainer.app${allowLocalhostFrame ? ' http://localhost:*' : ''}`
      );
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    ];
    return [
      {
        source: '/((?!code-studio).*)',
        headers: [
          { key: 'Content-Security-Policy', value: cspBase },
          { key: 'X-Frame-Options', value: 'DENY' },
          ...securityHeaders,
        ],
      },
      {
        // Match /code-studio and /code-studio/* (both need COOP/COEP + unsafe-eval CSP)
        source: '/code-studio/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: cspCodeStudio },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          ...securityHeaders,
        ],
      },
    ];
  },
  webpack(config, { isServer }) {
    if (!isServer) {
      // Monaco tree-shaking: drop unused language workers (keep ts/js/json only)
      // Reduces bundle by ~1-2 MB. Workers are loaded on demand via @monaco-editor/react.
      config.plugins.push(
        new IgnorePlugin({
          // Matches monaco-editor's esm/vs/language/<lang>/monaco.contribution
          // while preserving typescript, javascript, json contributions
          resourceRegExp: /^\.\/((?!typescript|javascript|json)[^/]+)\/monaco\.contribution/,
          contextRegExp: /monaco-editor[/\\]esm[/\\]vs[/\\]language/,
        })
      );
    }
    return config;
  },
};

export default withSentryConfig(withBundleAnalyzer(nextConfig), {
  silent: true,
  org: "gilheumpark",
  project: "eh-universe-web",
  widenClientFileUpload: true,
  disableLogger: true,
});
