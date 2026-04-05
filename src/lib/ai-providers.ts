// ============================================================
// PART 0: TYPES
// ============================================================

import { truncateMessages, getMaxOutputTokens } from './token-utils';
import { logger } from '@/lib/logger';
import { L4 } from '@/lib/i18n';
import { lazyFirebaseAuth } from '@/lib/firebase';

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

// ============================================================
// PART 1: PROVIDER DEFINITIONS
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

// Capability helpers
/** @returns Capability metadata for the given provider, falling back to Gemini defaults */
export function getCapabilities(providerId: ProviderId): ProviderCapabilities {
  return PROVIDERS[providerId]?.capabilities ?? PROVIDERS.gemini.capabilities;
}
/** @returns Whether the specified provider supports structured JSON output */
export function supportsStructuredOutput(providerId: ProviderId): boolean {
  return PROVIDERS[providerId]?.capabilities.structuredOutput ?? false;
}
/** 현재 활성 provider가 structured output을 지원하는지 */
export function activeSupportsStructured(): boolean {
  return supportsStructuredOutput(getActiveProvider());
}

export const PROVIDER_LIST: ProviderDef[] = Object.values(PROVIDERS);
/** UI용 — devOnly provider는 개발 환경에서만 포함 */
export const PROVIDER_LIST_UI: ProviderDef[] = PROVIDER_LIST.filter(
  (p) => !p.devOnly || process.env.NODE_ENV === 'development',
);
const LEGACY_PROVIDER_KEY = "eh-active-provider";
const LEGACY_MODEL_KEY = "eh-active-model";

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

// ============================================================
// PART 2: KEY MANAGEMENT (with obfuscation)
// ============================================================

// 4-layer key protection:
// Layer 1 (v1): Base64 only (legacy, read-only)
// Layer 2 (v2): XOR with origin+UA mask (legacy, read-only)
// Layer 3 (v3): Salt + XOR (legacy, read-only — synchronous fallback for write)
// Layer 4 (v4): AES-GCM via Web Crypto (async, preferred write path)
// XSS에서 메모리 접근은 방어 불가하나, localStorage 직접 읽기는 AES-GCM으로 실질적 방어.
const _ENCRYPTION_PREFIX_V4 = 'noa:4:';
const _OBFUSCATION_PREFIX_V3 = 'noa:3:';
const _OBFUSCATION_PREFIX = 'noa:2:';
const _LEGACY_PREFIX = 'noa:1:';
const _SALT_LENGTH = 16;
const _IV_LENGTH = 12; // AES-GCM recommended IV size

// ── Web Crypto AES-GCM helpers (v4) ──

// #20: Encapsulate CryptoKey cache in closure to prevent module-global exposure
const keyStore = (() => {
  let _key: CryptoKey | null = null;
  return {
    get: () => _key,
    set: (k: CryptoKey) => { _key = k; },
    clear: () => { _key = null; },
  };
})();

function _isSubtleCryptoAvailable(): boolean {
  return (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof crypto.subtle.deriveKey === 'function'
  );
}

async function _deriveAesKey(): Promise<CryptoKey> {
  const cached = keyStore.get();
  if (cached) return cached;
  const encoder = new TextEncoder();
  const salt = encoder.encode(
    (typeof window !== 'undefined' ? window.location.origin : 'noa-server') +
    (typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 50) : ''),
  );
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode('eh-universe-key-v2'),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  const derived = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
  keyStore.set(derived);
  return derived;
}

async function _encryptAesGcm(plain: string): Promise<string> {
  const key = await _deriveAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(_IV_LENGTH));
  const encoded = new TextEncoder().encode(plain);
  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  );
  // Format: IV (12 bytes) + ciphertext
  const combined = new Uint8Array(iv.length + cipherBuf.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuf), iv.length);
  return _ENCRYPTION_PREFIX_V4 + btoa(String.fromCharCode(...combined));
}

async function _decryptAesGcm(stored: string): Promise<string> {
  const key = await _deriveAesKey();
  const raw = atob(stored.slice(_ENCRYPTION_PREFIX_V4.length));
  const allBytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) allBytes[i] = raw.charCodeAt(i);
  const iv = allBytes.slice(0, _IV_LENGTH);
  const ciphertext = allBytes.slice(_IV_LENGTH);
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(plainBuf);
}

// ── Legacy XOR helpers (v2/v3 — read-only + sync fallback for write) ──

function _xorMask(): number[] {
  const seed = typeof window !== 'undefined'
    ? `${window.location.origin}:${navigator.userAgent.slice(0, 32)}`
    : 'noa-server-fallback';
  const mask: number[] = [];
  for (let i = 0; i < seed.length; i++) mask.push(seed.charCodeAt(i) & 0xff);
  return mask;
}

function _generateSalt(): Uint8Array {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint8Array(_SALT_LENGTH));
  }
  const salt = new Uint8Array(_SALT_LENGTH);
  for (let i = 0; i < _SALT_LENGTH; i++) salt[i] = Math.floor(Math.random() * 256);
  return salt;
}

/** Synchronous v3 fallback (Salt + XOR) — used when SubtleCrypto unavailable */
function _obfuscateKeySync(plain: string): string {
  if (!plain) return '';
  try {
    const baseMask = _xorMask();
    const salt = _generateSalt();
    const combinedMask = baseMask.map((b, i) => b ^ salt[i % salt.length]);
    const bytes = new TextEncoder().encode(plain);
    const xored = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) xored[i] = bytes[i] ^ combinedMask[i % combinedMask.length];
    const combined = new Uint8Array(salt.length + xored.length);
    combined.set(salt, 0);
    combined.set(xored, salt.length);
    return _OBFUSCATION_PREFIX_V3 + btoa(String.fromCharCode(...combined));
  } catch {
    return plain;
  }
}

// ── Unified encrypt/decrypt (async, with sync fallback) ──

/** Encrypt: AES-GCM preferred, v3 XOR fallback */
export async function encryptApiKey(plain: string): Promise<string> {
  if (!plain) return '';
  if (_isSubtleCryptoAvailable()) {
    try {
      return await _encryptAesGcm(plain);
    } catch {
      // SubtleCrypto failed (e.g. insecure context) — fall back to v3
    }
  }
  return _obfuscateKeySync(plain);
}

/** Synchronous encrypt fallback — for callers that cannot await */
function obfuscateKey(plain: string): string {
  return _obfuscateKeySync(plain);
}

/** Decrypt: detects version prefix and dispatches accordingly */
export async function decryptApiKey(stored: string): Promise<string> {
  if (!stored) return '';
  // v4: AES-GCM
  if (stored.startsWith(_ENCRYPTION_PREFIX_V4)) {
    try {
      return await _decryptAesGcm(stored);
    } catch {
      return '';
    }
  }
  // Delegate to synchronous path for v1/v2/v3/plaintext
  return deobfuscateKeySync(stored);
}

/** Synchronous decrypt for legacy formats (v1/v2/v3/plaintext) */
function deobfuscateKeySync(stored: string): string {
  if (!stored) return '';
  // v3: Salt + XOR + Base64
  if (stored.startsWith(_OBFUSCATION_PREFIX_V3)) {
    try {
      const baseMask = _xorMask();
      const raw = atob(stored.slice(_OBFUSCATION_PREFIX_V3.length));
      const allBytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) allBytes[i] = raw.charCodeAt(i);
      const salt = allBytes.slice(0, _SALT_LENGTH);
      const xored = allBytes.slice(_SALT_LENGTH);
      const combinedMask = baseMask.map((b, i) => b ^ salt[i % salt.length]);
      const bytes = new Uint8Array(xored.length);
      for (let i = 0; i < xored.length; i++) bytes[i] = xored[i] ^ combinedMask[i % combinedMask.length];
      return new TextDecoder().decode(bytes);
    } catch {
      return '';
    }
  }
  // v2: XOR + Base64
  if (stored.startsWith(_OBFUSCATION_PREFIX)) {
    try {
      const mask = _xorMask();
      const raw = atob(stored.slice(_OBFUSCATION_PREFIX.length));
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i) ^ mask[i % mask.length];
      return new TextDecoder().decode(bytes);
    } catch {
      return '';
    }
  }
  // v1: Base64 only
  if (stored.startsWith(_LEGACY_PREFIX)) {
    try {
      return decodeURIComponent(escape(atob(stored.slice(_LEGACY_PREFIX.length))));
    } catch {
      return '';
    }
  }
  // Plaintext
  return stored;
}

/** Legacy sync alias — kept for backward compat with any external callers */
function deobfuscateKey(stored: string): string {
  return deobfuscateKeySync(stored);
}

/**
 * Migrate legacy provider storage keys to the current format.
 * Call once at app init — NOT inside getters.
 */
export function migrateProviderStorage(): void {
  if (typeof window === "undefined") return;
  const legacy = localStorage.getItem(LEGACY_PROVIDER_KEY);
  if (legacy) {
    const resolved = legacy in PROVIDERS ? legacy : "gemini";
    localStorage.setItem("noa_active_provider", resolved);
    localStorage.removeItem(LEGACY_PROVIDER_KEY);
  }
}

/** @returns Currently active AI provider ID from localStorage, defaults to "gemini" */
export function getActiveProvider(): ProviderId {
  if (typeof window === "undefined") return "gemini";
  const stored = localStorage.getItem("noa_active_provider") || localStorage.getItem(LEGACY_PROVIDER_KEY);
  let provider = stored && stored in PROVIDERS ? (stored as ProviderId) : "gemini";
  // 로컬 provider가 활성인데 URL(키)이 비어 있으면 gemini로 폴백
  if ((provider === 'ollama' || provider === 'lmstudio') && !localStorage.getItem(PROVIDERS[provider].storageKey)) {
    provider = 'gemini';
  }
  return provider;
}

/** Persist the active AI provider selection to localStorage */
export function setActiveProvider(id: ProviderId): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("noa_active_provider", id);
  localStorage.removeItem(LEGACY_PROVIDER_KEY);
}

/**
 * Synchronous key retrieval — reads all formats (v1/v2/v3/v4/plaintext).
 * v4 AES-GCM keys are decoded via cached CryptoKey when available;
 * if the key hasn't been cached yet, falls back to '' (use getApiKeyAsync).
 */
/** localStorage에 값이 있는지(암호문 포함) — v4는 getApiKey 동기 호출이 빈 문자열일 수 있음 */
export function hasStoredApiKey(providerId: ProviderId): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(PROVIDERS[providerId].storageKey);
  return typeof raw === "string" && raw.trim().length > 0;
}

export function getApiKey(providerId: ProviderId): string {
  if (typeof window === "undefined") return "";
  const def = PROVIDERS[providerId];
  const stored = localStorage.getItem(def.storageKey) || "";
  // v4 cannot be decoded synchronously — return cached plaintext or ''
  if (stored.startsWith(_ENCRYPTION_PREFIX_V4)) {
    return _v4PlainCache.get(def.storageKey) ?? '';
  }
  return deobfuscateKey(stored);
}

/**
 * Async key retrieval — supports all versions including v4 AES-GCM.
 * Populates the sync cache so subsequent getApiKey() calls succeed.
 */
export async function getApiKeyAsync(providerId: ProviderId): Promise<string> {
  if (typeof window === "undefined") return "";
  const def = PROVIDERS[providerId];
  const stored = localStorage.getItem(def.storageKey) || "";
  const plain = await decryptApiKey(stored);
  // Cache plaintext for sync getApiKey() access
  if (plain && stored.startsWith(_ENCRYPTION_PREFIX_V4)) {
    _v4PlainCache.set(def.storageKey, plain);
  }
  return plain;
}

/** In-memory plaintext cache for v4 keys (populated by async operations) */
const _v4PlainCache = new Map<string, string>();

export function setApiKey(providerId: ProviderId, key: string): void {
  if (typeof window === "undefined") return;
  const def = PROVIDERS[providerId];
  if (!key) {
    localStorage.removeItem(def.storageKey);
    localStorage.removeItem(`${def.storageKey}_ts`);
  } else {
    localStorage.setItem(def.storageKey, obfuscateKey(key));
    localStorage.setItem(`${def.storageKey}_ts`, String(Date.now()));
  }
  // Clear v4 cache since we wrote v3 or removed
  _v4PlainCache.delete(def.storageKey);
  window.dispatchEvent(new Event('noa-keys-changed'));
}

/**
 * Async setApiKey — writes v4 AES-GCM (preferred for new code paths).
 * Falls back to v3 if SubtleCrypto is unavailable.
 */
export async function setApiKeyAsync(providerId: ProviderId, key: string): Promise<void> {
  if (typeof window === "undefined") return;
  const def = PROVIDERS[providerId];
  if (!key) {
    localStorage.removeItem(def.storageKey);
    localStorage.removeItem(`${def.storageKey}_ts`);
    _v4PlainCache.delete(def.storageKey);
    window.dispatchEvent(new Event('noa-keys-changed'));
    return;
  }
  const encrypted = await encryptApiKey(key);
  localStorage.setItem(def.storageKey, encrypted);
  localStorage.setItem(`${def.storageKey}_ts`, String(Date.now()));
  // Populate sync cache if v4 was used
  if (encrypted.startsWith(_ENCRYPTION_PREFIX_V4)) {
    _v4PlainCache.set(def.storageKey, key);
  }
  window.dispatchEvent(new Event('noa-keys-changed'));
}

/**
 * Returns the number of days since the API key for a given provider was stored.
 * Returns null if no timestamp is recorded (legacy key).
 */
export function getKeyAge(providerId: ProviderId): number | null {
  if (typeof window === 'undefined') return null;
  const def = PROVIDERS[providerId];
  const ts = localStorage.getItem(`${def.storageKey}_ts`);
  if (!ts) return null;
  const storedAt = parseInt(ts, 10);
  if (isNaN(storedAt)) return null;
  return Math.floor((Date.now() - storedAt) / (1000 * 60 * 60 * 24));
}

/**
 * Returns true if the API key for the given provider is older than the specified days.
 */
export function isKeyExpiringSoon(providerId: ProviderId, thresholdDays = 90): boolean {
  const age = getKeyAge(providerId);
  return age !== null && age > thresholdDays;
}

/**
 * #19: Pre-load v4 AES-GCM keys into memory cache on app start.
 * Call once from a client component on mount to ensure getApiKey() (sync) works for v4 keys.
 */
export async function hydrateAllApiKeys(): Promise<void> {
  const providers = Object.keys(PROVIDERS) as ProviderId[];
  await Promise.allSettled(providers.map(id => getApiKeyAsync(id)));
}

function getStoredModelForProvider(providerId: ProviderId): string {
  if (typeof window === "undefined") return PROVIDERS[providerId].defaultModel;

  // 1) provider별 키 우선
  const perProviderKey = `noa_model_${providerId}`;
  const perProvider = localStorage.getItem(perProviderKey);
  if (perProvider && perProvider.length > 0) return perProvider;

  // 2) 전역 키 fallback (하위호환 + 마이그레이션)
  const stored = localStorage.getItem("noa_active_model") || localStorage.getItem(LEGACY_MODEL_KEY);
  const provider = PROVIDERS[providerId];
  const model = stored && (provider.models.includes(stored) || stored.length > 0) ? stored : provider.defaultModel;

  // 마이그레이션: 전역 값을 현재 provider별 키로 이전
  if (providerId === getActiveProvider()) {
    localStorage.setItem(perProviderKey, model);
  }
  localStorage.removeItem(LEGACY_MODEL_KEY);
  return model;
}

/** @returns Stored model name for the currently active provider */
export function getActiveModel(): string {
  return getStoredModelForProvider(getActiveProvider());
}

/** @returns Stored model for a specific provider (not necessarily the active one) */
export function getPreferredModel(providerId: ProviderId): string {
  return getStoredModelForProvider(providerId);
}

/** Persist model selection to both per-provider and global localStorage keys */
export function setActiveModel(model: string): void {
  if (typeof window === "undefined") return;
  // 커스텀 모델명도 그대로 저장 — BYOK/로컬 LLM에서 사용자 입력 모델 지원
  const provider = getActiveProvider();
  const trimmed = model.trim();
  const value = trimmed || PROVIDERS[provider].defaultModel;
  // provider별 키에 저장 + 전역 키에도 동시 저장 (하위호환)
  localStorage.setItem(`noa_model_${provider}`, value);
  localStorage.setItem("noa_active_model", value);
  localStorage.removeItem(LEGACY_MODEL_KEY);
}

// ============================================================
// PART 3: SERVER PROXY STREAM
// ============================================================

// 로컬 LLM(ollama/lmstudio): Vercel 서버는 로컬 IP 접근 불가 → 브라우저 직접 스트림
// localhost 개발 환경: Chrome PNA 우회를 위해 /api/local-proxy 경유
async function streamLocalDirect(
  baseUrl: string, model: string, opts: StreamOptions
): Promise<string> {
  const msgs = [
    ...(opts.systemInstruction ? [{ role: 'system', content: opts.systemInstruction }] : []),
    ...opts.messages,
  ];
  const payload = {
    model,
    messages: msgs,
    temperature: opts.temperature ?? 0.9,
    max_tokens: opts.maxTokens,
    stream: true,
  };

  // 항상 /api/local-proxy 경유 — Chrome PNA + Mixed Content 동시 해결
  // Vercel 배포 시: 서버가 사설 IP 접근 불가 → 502 반환 → 에러 메시지로 안내
  const res = await fetch('/api/local-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ baseUrl, ...payload }),
    signal: opts.signal,
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Local LLM ${res.status}: ${err.slice(0, 200)}`);
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');
  const decoder = new TextDecoder();
  const MAX_BUFFER_BYTES = 65_536; // 64KB buffer cap (same as streamViaProxy)
  let full = '';
  let buffer = '';
  let bufferSize = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      bufferSize += chunk.length;
      if (bufferSize > MAX_BUFFER_BYTES) {
        reader.cancel().catch(() => {});
        throw new Error('Response too large — possible runaway generation');
      }
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;
        try {
          const json = JSON.parse(data);
          const text = json.choices?.[0]?.delta?.content;
          if (text) { full += text; opts.onChunk(text); }
        } catch { /* skip non-JSON */ }
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  return full;
}

async function streamViaProxy(
  provider: ProviderId, model: string, apiKey: string, opts: StreamOptions
): Promise<string> {
  // 로컬 프로바이더는 브라우저 직접 호출 (서버 프록시 우회)
  if (PROVIDERS[provider]?.capabilities.isLocal) {
    if (!apiKey.trim()) throw new Error('Local LLM URL is not configured. Set the server URL in BYOK settings.');
    return streamLocalDirect(apiKey, model, opts);
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    try {
      const auth = await lazyFirebaseAuth();
      const u = auth?.currentUser;
      if (u) {
        const idToken = await u.getIdToken();
        headers.Authorization = `Bearer ${idToken}`;
      }
    } catch {
      /* ignore — BYOK-only flow still works */
    }
  }

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      provider,
      model,
      systemInstruction: opts.systemInstruction,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.9,
      maxTokens: opts.maxTokens,
      apiKey: apiKey || undefined,
      prismMode: opts.prismMode, // 서버 측 PRISM 강제 적용
      isChatMode: opts.isChatMode,
    }),
    signal: opts.signal,
  });

  if (!res.ok) {
    let errMsg = `Proxy error ${res.status}`;
    try {
      const errData = await res.json();
      if (errData.noa?.reason) {
        const reason = errData.noa.reason;
        if (reason === 'FAST_TRACK_BLOCK') {
          errMsg = '🛑 입력에 제한된 표현이 포함되어 있습니다. 내용을 수정 후 다시 시도해주세요.';
        } else {
          errMsg = `🛑 NOA 보안 필터: ${reason === 'TRINITY_BLOCK' ? '안전 검사에서 차단되었습니다' : reason === 'BUDGET_EXCEEDED' ? '일일 사용 한도에 도달했습니다' : reason}`;
        }
      } else if (res.status === 429) {
        const retryAfter = res.headers.get('retry-after');
        errMsg = retryAfter
          ? `⏳ 요청 한도 초과 — ${retryAfter}초 후 다시 시도해주세요 (Rate Limited)`
          : '⏳ 요청 한도 초과 — 잠시 후 다시 시도해주세요 (Rate Limited)';
      } else if (errData.error) {
        errMsg = errData.error;
      }
    } catch {}
    throw new Error(errMsg);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  const MAX_BUFFER_BYTES = 65_536; // 64KB SSE buffer cap to prevent OOM
  let full = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Guard against unbounded buffer growth
      if (buffer.length > MAX_BUFFER_BYTES) {
        buffer = buffer.slice(-MAX_BUFFER_BYTES);
      }

      // Parse SSE events from proxy
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;
        try {
          const json = JSON.parse(data);
          // Handle different provider formats
          const text = json.choices?.[0]?.delta?.content // OpenAI/Groq/Mistral
            || json.candidates?.[0]?.content?.parts?.[0]?.text // Gemini
            || (json.type === 'content_block_delta' ? json.delta?.text : null); // Claude
          if (text) {
            full += text;
            opts.onChunk(text);
          }
        } catch {
          // Non-JSON SSE data, skip
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  return full;
}

// ============================================================
// PART 4: UNIFIED STREAM API
// ============================================================

function isQuotaError(msg: string): boolean {
  return /429|quota|rate.?limit|resource.?exhausted|billing|limit.?exceeded/i.test(msg);
}

function getFallbackProviders(
  activeProvider: ProviderId,
): Array<{ id: ProviderId; model: string; key: string }> {
  return PROVIDER_LIST
    .filter((p) => p.id !== activeProvider)
    .map((p) => ({ id: p.id, model: p.defaultModel, key: getApiKey(p.id) }))
    .filter((p) => p.key.trim().length > 0);
}

/**
 * Unified streaming chat API. Routes through server proxy with retry + quota fallback.
 * @param opts - System instruction, messages, temperature, abort signal, and chunk callback
 * @returns Concatenated full response text
 */
export async function streamChat(opts: StreamOptions): Promise<string> {
  const provider = getActiveProvider();
  // v4 AES-GCM 키 비동기 복호화 대기 — 동기 getApiKey 빈 문자열이면 async 폴백
  const apiKey = getApiKey(provider) || await getApiKeyAsync(provider);
  const model = getActiveModel();

  // Truncate messages to fit context window
  const { messages: trimmedMessages, truncated, systemTokens, messageTokens } =
    truncateMessages(opts.systemInstruction, opts.messages, model);

  if (truncated) {
    // token-guard 로그는 프로덕션에서 노출하지 않음
  }

  const maxTokens = getMaxOutputTokens(model, systemTokens, messageTokens);
  const safeOpts = { ...opts, messages: trimmedMessages, maxTokens };

  // Retry wrapper: up to 2 retries on transient errors (429, 500, 503, network)
  const MAX_RETRIES = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
      await new Promise(r => setTimeout(r, delay));
    }

    try {
      return await streamViaProxy(provider, model, apiKey, safeOpts);
    } catch (proxyErr) {
      if (proxyErr instanceof DOMException && proxyErr.name === 'AbortError') throw proxyErr;

      const errMsg = proxyErr instanceof Error ? proxyErr.message : '';
      const isRetryable = /429|500|502|503|504|fetch|network/i.test(errMsg);

      if (isRetryable && attempt < MAX_RETRIES) {
        lastError = proxyErr instanceof Error ? proxyErr : new Error(errMsg);
        logger.warn('retry', `Attempt ${attempt + 1} failed: ${errMsg}. Retrying...`);
        continue;
      }

      lastError = proxyErr instanceof Error ? proxyErr : new Error(errMsg);
      break;
    }
  }

  // Primary provider exhausted — attempt fallback providers on quota/rate-limit errors only.
  // Falls back in PROVIDER_LIST order, skipping providers without a stored API key.
  // Does NOT persist the switch to localStorage; active provider is unchanged.
  if (lastError && isQuotaError(lastError.message)) {
    const fallbacks = getFallbackProviders(provider);
    for (const fallback of fallbacks) {
      try {
        logger.warn('fallback', `${provider} quota/rate-limit hit. Switching to ${fallback.id}...`);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('noa:provider-fallback', {
            detail: { from: provider, to: fallback.id },
          }));
        }
        const fallbackMaxTokens = getMaxOutputTokens(fallback.model, systemTokens, messageTokens);
        return await streamViaProxy(
          fallback.id,
          fallback.model,
          fallback.key,
          { ...safeOpts, maxTokens: fallbackMaxTokens },
        );
      } catch (fallbackErr) {
        if (fallbackErr instanceof DOMException && fallbackErr.name === 'AbortError') throw fallbackErr;
        logger.warn('fallback', `${fallback.id} also failed:`, fallbackErr instanceof Error ? fallbackErr.message : fallbackErr);
      }
    }
  }

  throw lastError ?? new Error('Stream failed after retries');
}

// ============================================================
// PART 5: TEST KEY (all requests via server proxy)
// ============================================================

/**
 * Validate an API key by making a minimal test request through the server proxy.
 * @returns True if the key produces a successful response
 */
export async function testApiKey(providerId: ProviderId, key: string): Promise<boolean> {
  if (!key.trim()) return false;
  try {
    const def = PROVIDERS[providerId];

    // 로컬 프로바이더: /v1/models 엔드포인트로 연결 확인
    // localhost/Vercel 모두 프록시 경유 시도 → Vercel은 사설 IP 접근 불가로 실패
    if (def.capabilities.isLocal) {
      const baseUrl = key.replace(/\/$/, '');
      const testUrl = `/api/local-proxy?baseUrl=${encodeURIComponent(baseUrl)}`;

      const res = await fetch(testUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    }

    // 클라우드 프로바이더: 서버 프록시 경유 (키 노출 방지)
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: providerId,
        model: def.defaultModel,
        messages: [{ role: "user", content: def.testPrompt }],
        maxTokens: 16,
        temperature: 0.2,
        apiKey: key,
        /** 서버가 호스팅 할당 대신 반드시 이 키로만 검증 */
        keyVerification: true,
        isChatMode: true,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
