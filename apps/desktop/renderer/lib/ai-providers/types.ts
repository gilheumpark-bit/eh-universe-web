// ============================================================
// AI Providers — Types & Provider Definitions
// ============================================================
// Single source of truth for provider IDs, capabilities, and model lists.
// Extracted from the monolithic ai-providers.ts for maintainability.

import { L4 } from '@/lib/i18n';

// ============================================================
// PART 1 — Core Types
// ============================================================

/** Provider ID key tuple — single source of truth for all provider keys */
const _PROVIDER_KEYS = ["gemini", "openai", "claude", "groq", "mistral", "ollama", "lmstudio"] as const;
export type ProviderId = (typeof _PROVIDER_KEYS)[number];

export interface ProviderCapabilities {
  streaming: boolean;
  structuredOutput: boolean;
  systemInstruction: boolean;
  maxContextTokens: number;
  maxOutputTokens: number;
  isLocal: boolean;
  costTier: 'free' | 'cheap' | 'moderate' | 'expensive';
}

export interface ProviderDef {
  id: ProviderId;
  name: string;
  color: string;
  placeholder: string;
  defaultModel: string;
  models: string[];
  testPrompt: string;
  storageKey: string;
  capabilities: ProviderCapabilities;
  /** 로컬 provider는 API key 대신 base URL을 저장 */
  isUrlBased?: boolean;
  /** true = 개발 환경에서만 노출 (ollama, lmstudio 등) */
  devOnly?: boolean;
}

export interface ChatMsg {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface StreamOptions {
  systemInstruction: string;
  messages: ChatMsg[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  onChunk: (text: string) => void;
  prismMode?: string;
  isChatMode?: boolean;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=ProviderId,ProviderDef,ChatMsg,StreamOptions

// ============================================================
// PART 2 — Provider Definitions
// ============================================================

export const PROVIDERS: Record<ProviderId, ProviderDef> = {
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    color: "#4285f4",
    placeholder: "AIza...",
    defaultModel: "gemini-2.5-pro",
    models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3.1-pro-preview", "gemini-3-flash-preview", "gemini-3.1-flash-lite-preview"],
    testPrompt: 'Say "OK" in one word.',
    storageKey: "noa_api_key",
    capabilities: { streaming: true, structuredOutput: true, systemInstruction: true, maxContextTokens: 1_000_000, maxOutputTokens: 8192, isLocal: false, costTier: 'cheap' },
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    color: "#10a37f",
    placeholder: "sk-...",
    defaultModel: "gpt-5.4",
    models: ["gpt-5.4", "gpt-5.4-mini", "gpt-5.4-nano", "gpt-5.3-instant", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano"],
    testPrompt: 'Say "OK" in one word.',
    storageKey: "noa_openai_key",
    capabilities: { streaming: true, structuredOutput: true, systemInstruction: true, maxContextTokens: 1_050_000, maxOutputTokens: 32_768, isLocal: false, costTier: 'expensive' },
  },
  claude: {
    id: "claude",
    name: "Anthropic Claude",
    color: "#d97706",
    placeholder: "sk-ant-...",
    defaultModel: "claude-sonnet-4-6",
    models: ["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5", "claude-opus-4-5-20251101", "claude-sonnet-4-5-20250929"],
    testPrompt: 'Say "OK" in one word.',
    storageKey: "noa_claude_key",
    capabilities: { streaming: true, structuredOutput: true, systemInstruction: true, maxContextTokens: 1_000_000, maxOutputTokens: 128_000, isLocal: false, costTier: 'expensive' },
  },
  groq: {
    id: "groq",
    name: "Groq",
    color: "#f55036",
    placeholder: "gsk_...",
    defaultModel: "llama-3.3-70b-versatile",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "qwen-qwq-32b"],
    testPrompt: 'Say "OK" in one word.',
    storageKey: "noa_groq_key",
    capabilities: { streaming: true, structuredOutput: true, systemInstruction: true, maxContextTokens: 128_000, maxOutputTokens: 8192, isLocal: false, costTier: 'free' },
  },
  mistral: {
    id: "mistral",
    name: "Mistral AI",
    color: "#ff7000",
    placeholder: "...",
    defaultModel: "mistral-medium-3-latest",
    models: ["mistral-medium-3-latest", "mistral-small-latest", "mistral-large-latest"],
    testPrompt: 'Say "OK" in one word.',
    storageKey: "noa_mistral_key",
    capabilities: { streaming: true, structuredOutput: true, systemInstruction: true, maxContextTokens: 128_000, maxOutputTokens: 8192, isLocal: false, costTier: 'moderate' },
  },
  ollama: {
    id: "ollama",
    name: "Ollama (Local)",
    color: "#6c4c3e",
    placeholder: "http://localhost:11434",
    defaultModel: "llama3.1",
    models: ["llama3.1", "llama3.2", "mistral", "gemma2", "qwen2.5", "deepseek-r1"],
    testPrompt: 'Say "OK" in one word.',
    storageKey: "noa_ollama_url",
    isUrlBased: true,
    devOnly: true,
    capabilities: { streaming: true, structuredOutput: false, systemInstruction: true, maxContextTokens: 32_000, maxOutputTokens: 4096, isLocal: true, costTier: 'free' },
  },
  lmstudio: {
    id: "lmstudio",
    name: "LM Studio (Local)",
    color: "#2d5d8d",
    placeholder: "http://192.168.219.102:1234",
    defaultModel: "openai/gpt-oss-20b",
    models: ["openai/gpt-oss-20b", "qwen/qwen3-30b-a3b-2507", "qwen/qwen3-14b", "local-model"],
    testPrompt: 'Say "OK" in one word.',
    storageKey: "noa_lmstudio_url",
    isUrlBased: true,
    devOnly: false,
    capabilities: { streaming: true, structuredOutput: false, systemInstruction: true, maxContextTokens: 32_000, maxOutputTokens: 4096, isLocal: true, costTier: 'free' },
  },
};

// ============================================================
// PART 3 — Capability & Model Helpers
// ============================================================

/** @returns Capability metadata for the given provider, falling back to Gemini defaults */
export function getCapabilities(providerId: ProviderId): ProviderCapabilities {
  return PROVIDERS[providerId]?.capabilities ?? PROVIDERS.gemini.capabilities;
}

/** @returns Whether the specified provider supports structured JSON output */
export function supportsStructuredOutput(providerId: ProviderId): boolean {
  return PROVIDERS[providerId]?.capabilities.structuredOutput ?? false;
}

export const PROVIDER_LIST: ProviderDef[] = Object.values(PROVIDERS);

/** UI용 — devOnly provider는 개발 환경에서만 포함 */
export const PROVIDER_LIST_UI: ProviderDef[] = PROVIDER_LIST.filter(
  (p) => !p.devOnly || process.env.NODE_ENV === 'development',
);

// Preview/experimental model detection
const PREVIEW_PATTERNS = ["preview", "nano", "experimental", "beta"];

/** @returns True if the model name matches preview/experimental/beta patterns */
export function isPreviewModel(model: string): boolean {
  const lower = model.toLowerCase();
  return PREVIEW_PATTERNS.some(p => lower.includes(p));
}

/** @returns Localized warning string if model is preview/experimental, null otherwise */
export function getModelWarning(model: string, lang: "ko" | "en" = "ko"): string | null {
  if (!isPreviewModel(model)) return null;
  return L4(lang, {
    ko: `"${model}"은(는) 프리뷰/실험 모델입니다. 안정성이 보장되지 않으며 예고 없이 변경·중단될 수 있습니다. 프로덕션 용도에는 정식 모델을 권장합니다.`,
    en: `"${model}" is a preview/experimental model. Stability is not guaranteed and it may change or be discontinued without notice. Stable models are recommended for production use.`,
  });
}

/**
 * 레거시·CLI 별칭을 공식 `ProviderId`로 맵핑. 미인식 값은 `gemini`.
 * (예: anthropic→claude, google→gemini, lm-studio→lmstudio)
 */
export function normalizeProviderId(raw: string | null | undefined): ProviderId {
  if (raw == null || raw === "") return "gemini";
  const trimmed = raw.trim();
  if (trimmed in PROVIDERS) return trimmed as ProviderId;
  const aliases: Record<string, ProviderId> = {
    anthropic: "claude",
    google: "gemini",
    "lm-studio": "lmstudio",
  };
  const mapped = aliases[trimmed];
  if (mapped && mapped in PROVIDERS) return mapped;
  return "gemini";
}

// IDENTITY_SEAL: PART-2,3 | role=provider-defs+helpers | inputs=ProviderId | outputs=ProviderDef,ProviderCapabilities
