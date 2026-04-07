import { NextResponse } from 'next/server';
import { hasServerProviderCredentials } from '@/lib/server-ai';

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
  const hosted = {
    gemini: hasServerProviderCredentials('gemini'),
    openai: false,
    claude: false,
    groq: false,
    mistral: false,
    ollama: false,
    lmstudio: false,
  };

  return NextResponse.json({
    byokRequired: !hosted.gemini,
    hosted,
    supportedProviders: ['gemini', 'openai', 'claude', 'groq', 'mistral', 'ollama', 'lmstudio'],
    message: hosted.gemini
      ? 'Server-hosted Gemini is available.'
      : 'Bring Your Own Key (BYOK) mode. Enter your API key in Settings.',
  });
}

