// ============================================================
// /api/health — Production health check endpoint
// ============================================================

import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// CSRF: GET-only endpoint — no state mutation, origin check not required

const REQUEST_TIMEOUT = 10_000; // 10s timeout for health check
void REQUEST_TIMEOUT;

const startedAt = Date.now();

export async function GET() {
  const checks: Record<string, 'ok' | 'warn' | 'fail'> = {};

  // 1. Server-side AI provider keys availability
  const hasGeminiServer = Boolean(
    process.env.GEMINI_API_KEY
    || (
      process.env.USE_VERTEX_AI === 'true'
      && (process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT)
      && (process.env.VERTEX_AI_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS)
    ),
  );
  const providers = ['OPENAI_API_KEY', 'CLAUDE_API_KEY', 'GROQ_API_KEY', 'MISTRAL_API_KEY'];
  let keyCount = hasGeminiServer ? 1 : 0;
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

  // Log detailed checks server-side only (do not expose infrastructure details)
  if (hasWarn || hasFail) {
    console.log('[health] detailed checks:', JSON.stringify({ checks, providers: { configured: keyCount, total: providers.length + 1 }, uptimeMs }));
  }

  // Return minimal health status — no provider/infrastructure details
  return NextResponse.json({
    status,
    timestamp: Date.now(),
  }, {
    status: hasFail ? 503 : 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}

// IDENTITY_SEAL: PART-1 | role=health-check | inputs=env vars | outputs=JSON status
