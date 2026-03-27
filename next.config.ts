import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

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
      { source: '/rulebook', destination: '/codex', permanent: true },
      { source: '/reference', destination: '/codex', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''} https://apis.google.com`,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https://generativelanguage.googleapis.com https://api.openai.com https://api.anthropic.com https://api.groq.com https://api.mistral.ai https://www.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://*.firebaseapp.com https://apis.google.com",
              "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
