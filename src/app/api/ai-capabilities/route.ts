import { NextResponse } from 'next/server';
import { getHostedProviderAvailability } from '@/lib/server-ai';
import { getDgxDeveloperApiBaseUrl, isDgxDeveloperApiEnabled } from '@/lib/server-dgx-dev';

export const dynamic = 'force-dynamic';

// CSRF: GET-only endpoint — no state mutation, origin check not required

/** Request timeout guard (unused for this simple route, but documents the policy) */
const REQUEST_TIMEOUT = 5_000; // 5s timeout for capabilities check
void REQUEST_TIMEOUT;

/**
 * AI Capabilities endpoint — intentionally opaque.
 * Hosted means server-side developer API credentials, not DGX/local fallback.
 */
export async function GET() {
  const dgxConfigured = Boolean(getDgxDeveloperApiBaseUrl());
  const hasDgx = isDgxDeveloperApiEnabled();

  const hosted = {
    ...getHostedProviderAvailability(),
    gemini: false,
    ollama: false,
    lmstudio: false,
  };
  const hasHostedDeveloperApi = Object.values(hosted).some(Boolean);

  return NextResponse.json({
    byokRequired: !hasHostedDeveloperApi,
    hasDgx,
    dgxConfigured,
    localDevAvailable: hasDgx,
    hosted,
    supportedProviders: ['upstage', 'gemini', 'openai', 'claude', 'deepseek', 'qwen', 'minimax', 'kimi', 'groq', 'mistral', 'ollama', 'lmstudio'],
    message: hasHostedDeveloperApi
      ? 'Hosted developer API is available.'
      : 'Connection key required. Add a connection key in Settings.',
  });
}
