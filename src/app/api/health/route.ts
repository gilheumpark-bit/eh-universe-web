// ============================================================
// /api/health — Production health check endpoint
// ============================================================

import { NextResponse } from 'next/server';
import { apiLog } from '@/lib/api-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// CSRF: GET-only endpoint — no state mutation, origin check not required

const startedAt = Date.now();
type HealthCheckState = 'ok' | 'warn' | 'fail';
type PublicHealthStatus = 'healthy' | 'degraded' | 'unhealthy';
type PublicHealthMode = 'operational' | 'attention' | 'incident';

export async function GET() {
  const checks: Record<string, HealthCheckState> = {};

  // 1. Server-side AI provider keys availability
  // [P1 hosted-gemini-off 2026-06-15] Gemini 서버 환경 키는 운영 헬스에서 제외한다.
  const providers = ['UPSTAGE_API_KEY', 'OPENAI_API_KEY', 'CLAUDE_API_KEY', 'GROQ_API_KEY', 'MISTRAL_API_KEY'];
  let keyCount = 0;
  for (const key of providers) {
    if (process.env[key]) keyCount++;
  }
  checks.ai_providers = keyCount > 0 ? 'ok' : 'warn';

  // 2. Firebase config — check server-accessible env var
  const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || process.env['NEXT_PUBLIC_FIREBASE_PROJECT_ID'];
  checks.firebase = firebaseProjectId ? 'ok' : 'warn';

  // 3. Uptime
  const uptimeMs = Date.now() - startedAt;

  // Overall status: warn is setup attention, not a public outage.
  const hasFail = Object.values(checks).includes('fail');
  const hasWarn = Object.values(checks).includes('warn');
  const status: PublicHealthStatus = hasFail ? 'unhealthy' : 'healthy';
  const mode: PublicHealthMode = hasFail ? 'incident' : hasWarn ? 'attention' : 'operational';
  const summaryKo = hasFail
    ? '서비스 장애를 확인하고 있습니다.'
    : hasWarn
      ? '핵심 서비스는 운영 중이며, 선택 연결 설정만 확인이 필요합니다.'
      : '모든 공개 서비스가 정상 운영 중입니다.';

  // Log detailed checks server-side only (do not expose infrastructure details)
  if (hasWarn || hasFail) {
    apiLog({
      level: hasFail ? 'error' : 'warn',
      event: hasFail ? 'health.unhealthy' : 'health.attention',
      route: '/api/health',
      status: hasFail ? 503 : 200,
      meta: { checks, providers: { configured: keyCount, total: providers.length + 1 }, uptimeMs },
    });
  }

  // Return minimal health status — no provider/infrastructure details
  return NextResponse.json({
    status,
    mode,
    summaryKo,
    version: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
    timestamp: Date.now(),
  }, {
    status: hasFail ? 503 : 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}

// IDENTITY_SEAL: PART-1 | role=health-check | inputs=env vars | outputs=JSON status
