import type { NextRequest } from 'next/server';

/**
 * Cross-origin calls to network-agent routes (e.g. EH Translator on another origin).
 * Set NETWORK_AGENT_CORS_ORIGINS=comma-separated list of allowed Origin values.
 */
export function getNetworkAgentCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin');
  const raw = process.env.NETWORK_AGENT_CORS_ORIGINS?.trim();
  const allowed = raw
    ? raw.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  if (origin && allowed.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };
  }
  return {};
}
