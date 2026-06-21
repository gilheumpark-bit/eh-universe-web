import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";
import { IgnorePlugin } from "webpack";

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });
const firebaseAuthDomain = (
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "eh-universe.firebaseapp.com"
)
  .trim()
  .replace(/^['"]|['"]$/g, "")
  .replace(/^https?:\/\//, "")
  .replace(/\/.*$/, "");

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
  // [2026-06-06] 데스크톱(Electron) standalone 패키징용. env gate라 Vercel/기본 빌드 무영향.
  // BUILD_STANDALONE=true 시에만 .next/standalone/server.js(self-contained) 생성 → electron-builder 동봉.
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
  // [M-04 — 2026-05-10] production 빌드 시 console.log/info/debug 자동 제거.
  // error / warn 은 유지 — 실제 사용자 환경의 의도된 진단 정보 (logger 와 별개로 fallback).
  // 의도된 사용자 노출 메시지는 logger.* 또는 setStatusMsg 로 통일.
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },
  // React Compiler disabled — requires babel-plugin-react-compiler package
  // reactCompiler: true,
  // [R-01 root fix — 2026-05-12] 8 hook return useMemo 안정화 완료 후 StrictMode 재활성.
  // 이전 issue: dev-only StrictMode 더블 호출 + inline-object hook return → Max update depth.
  // Fix: useCmdPalette / useCreativeEventLogger / useStorageQuota / useSessionTimer /
  //      useAutoVersionSnapshot / useGitHubAutoSync / useGitHubSync / useSparkHealth
  //      모두 return 객체를 useMemo 로 안정화.
  reactStrictMode: true,
  // [QA-chief 2026-06-14] Next.js dev indicator hides app-level QA signals and overlaps
  // floating studio controls during design review. Disable it; console/terminal keep dev errors.
  devIndicators: false,
  allowedDevOrigins: ['127.0.0.1'],
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
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/__/auth/:path*',
          destination: `https://${firebaseAuthDomain}/__/auth/:path*`,
        },
      ],
    };
  },
  // 보안 헤더: next.config.ts headers()로 적용 (middleware.ts는 Next.js 16 라우팅 충돌 위험)
  // proxy.ts는 참조용으로 유지. 실제 적용은 여기서.
  async headers() {
    // ─── [W4] connect-src — AI providers + Firebase + Vercel + Sentry (env 확장 허용) ───
    const connectSrcBase = [
      "'self'",
      // 로컬 AI (Ollama·vLLM·LM Studio·llama.cpp) — 데스크톱/자체호스팅 로컬 추론.
      // https 웹 배포에선 mixed-content로 http://localhost 가 브라우저 차단되므로 신규 표면 없음.
      // 데스크톱(http)에선 로컬-AI-우선 설계 동작. LAN/DGX IP 는 CSP_EXTRA_CONNECT_SRC env 로 추가.
      'http://localhost:*', 'https://localhost:*',
      'http://127.0.0.1:*', 'https://127.0.0.1:*',
      'ws://localhost:*', 'ws://127.0.0.1:*',
      // AI providers
      'https://generativelanguage.googleapis.com',
      'https://api.openai.com',
      'https://api.anthropic.com',
      'https://api.groq.com',
      'https://api.mistral.ai',
      'https://api.deepseek.com',
      'https://dashscope-intl.aliyuncs.com',
      'https://api.minimax.io',
      'https://api.moonshot.ai',
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

    // dev 편의: webpack/React dev 는 eval() 을 요구 (HMR·eval-source-map·React 디버그 콜스택).
    // 엄격 CSP 가 이를 막으면 dev 에서 /studio(dynamic ssr:false) 백지 + 홈 히어로 미렌더 + 전 페이지 콘솔 에러.
    // 프로덕션은 eval 불필요 → 그대로 제거 (XSS 표면 축소). img-src `https:` dev-relax 와 동일 패턴.
    const devEval = process.env.NODE_ENV !== 'production' ? " 'unsafe-eval'" : '';
    const cspBaseRaw = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${devEval} https://apis.google.com https://cdn.jsdelivr.net https://va.vercel-scripts.com https://vercel.live`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
      `img-src ${imgSrc}`,
      "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net",
      "worker-src 'self' blob:",
      `connect-src ${connectSrc}`,
      "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; ');
    // 결정적 로컬 AI 허용 — Turbopack 캐시/quirk 로 connectSrcBase 에서 localhost 가 누락되어도 강제 보장.
    // (Ollama/vLLM/LM Studio 데스크톱 직결. https 웹은 mixed-content 로 브라우저가 별도 차단.)
    const LOCAL_AI = "http://localhost:* https://localhost:* http://127.0.0.1:* https://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*";
    const cspBase = cspBaseRaw.includes('http://localhost:*')
      ? cspBaseRaw
      : cspBaseRaw.replace(/(connect-src 'self')/, `$1 ${LOCAL_AI}`);
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    ];
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: cspBase },
          { key: 'X-Frame-Options', value: 'DENY' },
          ...securityHeaders,
        ],
      },
      {
        source: '/__/auth/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self' https://*.firebaseapp.com",
              `script-src 'self' 'unsafe-inline'${devEval} https://apis.google.com https://www.gstatic.com https://*.firebaseapp.com`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://*.googleusercontent.com https://*.firebaseapp.com",
              "connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.firebaseapp.com https://www.googleapis.com",
              "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
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
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
