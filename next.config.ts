import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

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
  poweredByHeader: false,
  compress: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  async redirects() {
    return [
      { source: '/tools', destination: '/', permanent: false },
      { source: '/games/:path*', destination: '/', permanent: false },
      { source: '/code', destination: '/code-studio', permanent: true },
    ];
  },
  // CSP + security headers moved to src/middleware.ts (nonce-based CSP).
  // Middleware generates a per-request crypto nonce, replacing 'unsafe-inline'
  // in script-src. style-src retains 'unsafe-inline' (243+ inline styles).
};

export default withSentryConfig(withBundleAnalyzer(nextConfig), {
  silent: true,
  org: "gilheumpark",
  project: "eh-universe-web",
  widenClientFileUpload: true,
  disableLogger: true,
});
