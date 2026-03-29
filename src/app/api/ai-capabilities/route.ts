import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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
