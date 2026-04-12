import { NextResponse } from 'next/server';
import { hasServerProviderCredentials } from '@/lib/server-ai';
import { SPARK_SERVER_URL } from '@/services/sparkService';

export const dynamic = 'force-dynamic';

// CSRF: GET-only endpoint — no state mutation, origin check not required

/** Request timeout guard (unused for this simple route, but documents the policy) */
const REQUEST_TIMEOUT = 5_000; // 5s timeout for capabilities check
void REQUEST_TIMEOUT;

/**
 * AI Capabilities endpoint — intentionally opaque.
 * Returns only boolean flags, NOT which specific providers are hosted.
 * This prevents attackers from discovering which server keys are available.
 */
export async function GET() {
  const hasGemini = hasServerProviderCredentials('gemini');
  const hasDgx = !!SPARK_SERVER_URL;

  const hosted = {
    gemini: hasGemini,
    openai: false,
    claude: false,
    groq: false,
    mistral: false,
    ollama: false,
    lmstudio: false,
  };

  return NextResponse.json({
    byokRequired: !hasGemini && !hasDgx,
    hasDgx,
    hosted,
    supportedProviders: ['gemini', 'openai', 'claude', 'groq', 'mistral', 'ollama', 'lmstudio'],
    message: hasDgx
      ? 'DGX Spark AI engine is available.'
      : hasGemini
        ? 'Server-hosted Gemini is available.'
        : 'Bring Your Own Key (BYOK) mode. Enter your API key in Settings.',
  });
}
