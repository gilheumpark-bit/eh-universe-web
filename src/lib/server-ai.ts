// ============================================================
// PART 1 — Server-side provider key helpers
// ============================================================

export type ServerProviderId = 'gemini' | 'openai' | 'claude' | 'groq' | 'mistral' | 'ollama' | 'lmstudio';

export const SERVER_ENV_KEYS: Record<ServerProviderId, string | undefined> = {
  gemini: process.env.GEMINI_API_KEY,
  openai: process.env.OPENAI_API_KEY,
  claude: process.env.CLAUDE_API_KEY,
  groq: process.env.GROQ_API_KEY,
  mistral: process.env.MISTRAL_API_KEY,
  ollama: process.env.OLLAMA_API_URL,     // e.g. http://localhost:11434
  lmstudio: process.env.LMSTUDIO_API_URL, // e.g. http://localhost:1234
};

const SERVER_PROVIDERS = Object.keys(SERVER_ENV_KEYS) as ServerProviderId[];
const LOCAL_PROVIDERS: ReadonlySet<ServerProviderId> = new Set(['ollama', 'lmstudio']);

export function isServerProviderId(value: unknown): value is ServerProviderId {
  return typeof value === 'string' && SERVER_PROVIDERS.includes(value as ServerProviderId);
}

export function resolveServerProviderKey(
  provider: ServerProviderId,
  clientKey?: unknown,
): string | undefined {
  // Local providers: only use server-configured URLs to prevent SSRF.
  // The frontend already routes local-provider traffic through /api/local-proxy,
  // so client-supplied base URLs should never reach these server routes.
  if (LOCAL_PROVIDERS.has(provider)) {
    return SERVER_ENV_KEYS[provider];
  }
  if (typeof clientKey === 'string' && clientKey.trim()) {
    return clientKey.trim();
  }
  return SERVER_ENV_KEYS[provider];
}

export function getHostedProviderAvailability(): Record<ServerProviderId, boolean> {
  const result: Record<string, boolean> = {};
  for (const key of SERVER_PROVIDERS) {
    result[key] = Boolean(SERVER_ENV_KEYS[key]);
  }
  return result as Record<ServerProviderId, boolean>;
}

export function getFirstHostedProvider(): ServerProviderId | null {
  for (const provider of SERVER_PROVIDERS) {
    if (SERVER_ENV_KEYS[provider]) {
      return provider;
    }
  }
  return null;
}
