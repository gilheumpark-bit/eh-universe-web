import {
  SERVER_PROVIDER_IDS,
  isServerProviderId,
  type ServerProviderId,
} from '@/lib/server-provider-shared';

export { isServerProviderId };
export type { ServerProviderId };

export const SERVER_ENV_KEYS: Record<ServerProviderId, string | undefined> = {
  gemini: undefined,
  openai: process.env.OPENAI_API_KEY,
  claude: process.env.CLAUDE_API_KEY,
  deepseek: process.env.DEEPSEEK_API_KEY,
  qwen: process.env.DASHSCOPE_API_KEY,
  minimax: process.env.MINIMAX_API_KEY,
  kimi: process.env.MOONSHOT_API_KEY,
  groq: process.env.GROQ_API_KEY,
  mistral: process.env.MISTRAL_API_KEY,
  ollama: process.env.OLLAMA_API_URL,     // e.g. http://localhost:11434
  lmstudio: process.env.LMSTUDIO_API_URL, // e.g. http://localhost:1234
};

const SERVER_PROVIDERS = SERVER_PROVIDER_IDS;
const LOCAL_PROVIDERS: ReadonlySet<ServerProviderId> = new Set(['ollama', 'lmstudio']);

function hasGeminiServerCredentials(): boolean {
  // [P1 hosted-gemini-off 2026-06-15] Gemini는 호스팅 제공에서 제외하고 사용자 연결 키로만 허용한다.
  return false;
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

export function hasServerProviderCredentials(provider: ServerProviderId): boolean {
  if (provider === 'gemini') {
    return hasGeminiServerCredentials();
  }
  return Boolean(SERVER_ENV_KEYS[provider]);
}

export function getHostedProviderAvailability(): Record<ServerProviderId, boolean> {
  const result: Record<string, boolean> = {};
  for (const key of SERVER_PROVIDERS) {
    result[key] = hasServerProviderCredentials(key);
  }
  return result as Record<ServerProviderId, boolean>;
}

export function getFirstHostedProvider(): ServerProviderId | null {
  for (const provider of SERVER_PROVIDERS) {
    if (hasServerProviderCredentials(provider)) {
      return provider;
    }
  }
  return null;
}
