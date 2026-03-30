import { NextResponse } from 'next/server';

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
  // Only expose whether BYOK mode is required (always true now)
  return NextResponse.json({
    byokRequired: true,
    supportedProviders: ['gemini', 'openai', 'claude', 'groq', 'mistral', 'ollama', 'lmstudio'],
    message: 'Bring Your Own Key (BYOK) mode. Enter your API key in Settings.',
  });
}
