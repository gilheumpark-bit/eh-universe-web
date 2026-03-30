// ============================================================
// /api/health — Production health check endpoint
// ============================================================

import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const startedAt = Date.now();

export async function GET() {
  const checks: Record<string, 'ok' | 'warn' | 'fail'> = {};

  // 1. Server-side AI provider keys availability
  const providers = ['GEMINI_API_KEY', 'OPENAI_API_KEY', 'CLAUDE_API_KEY', 'GROQ_API_KEY', 'MISTRAL_API_KEY'];
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

  // Overall status
  const hasFail = Object.values(checks).includes('fail');
  const hasWarn = Object.values(checks).includes('warn');
  const status = hasFail ? 'unhealthy' : hasWarn ? 'degraded' : 'healthy';

  return NextResponse.json({
    status,
    version: process.env.APP_VERSION || '1.0.0',
    uptimeMs,
    checks,
    providers: { configured: keyCount, total: providers.length },
    timestamp: new Date().toISOString(),
  }, {
    status: hasFail ? 503 : 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}

// IDENTITY_SEAL: PART-1 | role=health-check | inputs=env vars | outputs=JSON status
