// ============================================================
// PART 0: TYPES
// ============================================================

import { truncateMessages, getMaxOutputTokens } from './token-utils';
import { logger } from '@/lib/logger';
import { lazyFirebaseAuth } from '@/lib/firebase';
import { ariManager } from '@/lib/ai/ari-engine';
import { isFeatureEnabled } from '@/lib/feature-flags';
// [N4 — 2026-06-11] NOA 차단 고지 의무 — 차단 응답 {blocked, reason, gradeRequired} 수신 시
// noa:toast + noa:block-notice 발화 (사일런트 차단 금지). NoaBlockedError 로 호출 측 인라인 표시.
import { isBlockedPayload, notifyNoaBlock, NoaBlockedError } from '@/lib/noa/block-notice';
import { checkPaywallJson } from '@/lib/noa/paywall-notice';
import {
  PROVIDERS,
  PROVIDER_LIST,
  supportsStructuredOutput,
} from './ai-providers.catalog';
import { getStoredReasoningLevel, resolveReasoningLevel } from './ai-reasoning';
import {
  allowsProviderAutoFallback,
  estimateProviderRequestChars,
  resolveProviderRequestSensitivity,
} from './provider-routing-policy';
import {
  decryptKey,
  deobfuscateKey,
  encryptKey,
  ENCRYPTION_PREFIX_V4,
  obfuscateKey,
} from './ai-providers.keys';
import type { ProviderId, StreamOptions } from './ai-providers.catalog';

export {
  getCapabilities,
  getModelWarning,
  isPreviewModel,
  PROVIDERS,
  PROVIDER_LIST,
  PROVIDER_LIST_UI,
  supportsStructuredOutput,
} from './ai-providers.catalog';
export { decryptKey, encryptKey } from './ai-providers.keys';
export type {
  ChatMsg,
  ProviderCapabilities,
  ProviderDef,
  ProviderId,
  ReasoningStage,
  StreamOptions,
} from './ai-providers.catalog';
export type { ProviderRequestSensitivity } from './provider-routing-policy';

/** 현재 활성 provider가 structured output을 지원하는지 */
export function activeSupportsStructured(): boolean {
  // DGX 서비스 모드면 항상 구조화 생성 지원 (서버에서 DGX 폴백)
  if (hasDgxService()) return true;
  return supportsStructuredOutput(getActiveProvider());
}
const LEGACY_PROVIDER_KEY = "eh-active-provider";
const LEGACY_MODEL_KEY = "eh-active-model";

// ============================================================
// PART 2: KEY MANAGEMENT (with obfuscation)
// ============================================================

/**
 * Migrate legacy provider storage keys to the current format.
 * Call once at app init — NOT inside getters.
 */
export function migrateProviderStorage(): void {
  if (typeof window === "undefined") return;
  const legacy = localStorage.getItem(LEGACY_PROVIDER_KEY);
  if (legacy) {
    const resolved = legacy in PROVIDERS ? legacy : "upstage";
    localStorage.setItem("noa_active_provider", resolved);
    localStorage.removeItem(LEGACY_PROVIDER_KEY);
  }
}

/** @returns Currently active AI provider ID from localStorage, defaults to app Hosted provider */
export function getActiveProvider(): ProviderId {
  if (typeof window === "undefined") return "upstage";
  const stored = localStorage.getItem("noa_active_provider") || localStorage.getItem(LEGACY_PROVIDER_KEY);
  let provider = stored && stored in PROVIDERS ? (stored as ProviderId) : "upstage";
  // 로컬 provider가 활성인데 URL(키)이 비어 있으면 앱 Hosted provider로 폴백
  if ((provider === 'ollama' || provider === 'lmstudio') && !localStorage.getItem(PROVIDERS[provider].storageKey)) {
    provider = 'upstage';
  }
  return provider;
}

/** 서버 측 DGX 개발 API 가용 여부 캐시 (런타임 체크 결과) */
let _serverDgxAvailable: boolean | null = null;

/**
 * 앱 초기화 시 서버의 DGX 개발 API 가용 여부를 비동기로 확인 → 캐시.
 * DGX는 Hosted 기본값이 아니라 로컬/개발 보조 경로다.
 */
export async function initDgxCheck(): Promise<boolean> {
  if (_serverDgxAvailable !== null) return _serverDgxAvailable;
  try {
    const res = await fetch('/api/ai-capabilities', { cache: 'no-store' });
    if (!res.ok) { _serverDgxAvailable = false; return false; }
    const data = await res.json();
    _serverDgxAvailable = data.hasDgx ?? false;
    return _serverDgxAvailable as boolean;
  } catch (err) {
    logger.warn('AIProviders', 'initDgxCheck fetch /api/ai-capabilities failed — treating DGX as unavailable', err);
    _serverDgxAvailable = false;
    return false;
  }
}

/** 이미 fetch된 결과로 DGX 개발 API 캐시를 직접 세팅 (중복 fetch 방지) */
export function setServerDgxCache(hasDgx: boolean): void {
  _serverDgxAvailable = hasDgx;
}

function isPublicDgxDevFlagEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_FEATURE_DGX_DEV_API === 'on' ||
    process.env.NEXT_PUBLIC_ENABLE_DGX_DEV_API === 'on'
  );
}

/** DGX Spark 개발 API 모드 여부. 정식 Hosted 제공 판정에는 사용하지 않는다. */
export function hasDgxService(): boolean {
  if (typeof window === 'undefined') return false;
  if (!!process.env.NEXT_PUBLIC_SPARK_SERVER_URL && isPublicDgxDevFlagEnabled()) return true;
  return _serverDgxAvailable === true;
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
  if (stored.startsWith(ENCRYPTION_PREFIX_V4)) {
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
  const plain = await decryptKey(stored);
  // Cache plaintext for sync getApiKey() access
  if (plain && stored.startsWith(ENCRYPTION_PREFIX_V4)) {
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
  const encrypted = await encryptKey(key);
  localStorage.setItem(def.storageKey, encrypted);
  localStorage.setItem(`${def.storageKey}_ts`, String(Date.now()));
  // Populate sync cache if v4 was used
  if (encrypted.startsWith(ENCRYPTION_PREFIX_V4)) {
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
          const delta = json.choices?.[0]?.delta;
          const text = delta?.content;
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
  // 로컬 프로바이더: 운영은 /api/chat, 개발용 로컬 엔진은 명시 플래그가 켜진 경우에만 서버에서 허용
  if (PROVIDERS[provider]?.capabilities.isLocal) {
    const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
    if (isProduction) {
      // 운영 경로: /api/chat. DGX는 Hosted 기본값이 아니라 명시 플래그 기반 개발 경로다.
      // [K] provider 자기할당 no-op 제거 — 아래 /api/chat 호출에서 그대로 사용
    } else {
      if (!apiKey.trim()) throw new Error('Local LLM URL is not configured. Set the server URL in connection settings.');
      return streamLocalDirect(apiKey, model, opts);
    }
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
      reasoning: opts.reasoning ? { level: opts.reasoning } : undefined,
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
          errMsg = '입력에 제한된 표현이 포함되어 있습니다. 내용을 수정한 뒤 다시 시도해 주세요.';
        } else {
          errMsg = `요청을 처리할 수 없습니다: ${reason === 'TRINITY_BLOCK' ? '요청 기준을 통과하지 못했습니다' : reason === 'BUDGET_EXCEEDED' ? '오늘 사용할 수 있는 제공량을 모두 사용했습니다' : reason}`;
        }
        // [N4] 403 레거시 NOA 차단도 고지 의무 적용 — toast + 카드 (사일런트 차단 금지)
        notifyNoaBlock({ blocked: true, reason: errMsg, gradeRequired: null }, 'chat');
      } else if (res.status === 429) {
        const retryAfter = res.headers.get('retry-after');
        errMsg = retryAfter
          ? `요청 한도를 초과했습니다. ${retryAfter}초 뒤 다시 시도해 주세요.`
          : '요청 한도를 초과했습니다. 잠시 뒤 다시 시도해 주세요.';
        // Attach server-provided delay for retry logic
        const rateLimitErr = new Error(errMsg);
        (rateLimitErr as Error & { _retryAfterMs?: number })._retryAfterMs =
          retryAfter ? Math.min(parseInt(retryAfter, 10) * 1000, 30_000) : 0;
        throw rateLimitErr;
      } else {
        const paywallMsg = checkPaywallJson(errData);
        if (paywallMsg) {
          errMsg = paywallMsg;
        } else if (errData.error) {
          errMsg = errData.error;
        }
      }
    } catch { /* [의도적 무시] errData JSON 파싱 실패 시 원래 errMsg 유지 */ }
    throw new Error(errMsg);
  }

  // [N4 — 2026-06-11] 서버 게이트 차단 계약 (HTTP 200 + JSON {blocked, reason, gradeRequired}).
  // 정상 응답은 text/event-stream — JSON 본문이면 차단 payload 검사 후 고지 + 중단.
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const blockedJson: unknown = await res.json().catch(() => null);
    if (isBlockedPayload(blockedJson)) {
      const noticeMsg = notifyNoaBlock(blockedJson, 'chat');
      throw new NoaBlockedError(noticeMsg, blockedJson, 'chat');
    }
    throw new Error('Unexpected non-stream response from /api/chat');
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
          const delta = json.choices?.[0]?.delta;
          const text = delta?.content
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

/**
 * DGX Spark 다운/게이트웨이 연결 불능 에러 판별.
 * Cloudflare Tunnel 오류(520-524), DGX 연결 문구, 타임아웃, 네트워크 실패를 포괄.
 */
function isDgxDownError(msg: string): boolean {
  return /DGX\s*(서버)?\s*(연결|응답|미설정|unresponsive|down|unavailable)|SPARK\s+gateway|Cloudflare|520|521|522|523|524|502|503|504|timeout|ECONNREFUSED|network|fetch\s+failed/i.test(msg);
}

/**
 * 연결 키 자동 전환 허용 여부 (Settings 토글로 제어).
 * 원고 보호 기준: 사용자가 켜기 전에는 선택한 provider 밖으로 우회하지 않는다.
 * localStorage 직접 접근으로 순환 참조 회피.
 */
function isByokFallbackEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const v = localStorage.getItem('noa_byok_fallback_enabled');
    return v === '1';
  } catch (err) {
    logger.warn('AIProviders', 'localStorage read for BYOK fallback flag failed — defaulting to disabled', err);
    return false;
  }
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
  // Security Gate: pre-flight scan before any AI call
  if (isFeatureEnabled('SECURITY_GATE')) {
    const { scanContent, SecurityGateError } = await import('@/lib/security-gate');
    const combined = opts.messages.map(m => m.content).join('\n');
    const scan = scanContent(combined, { sensitivity: 'normal' });
    if (!scan.safe) {
      throw new SecurityGateError(scan.findings.map(f => `[${f.layer}] ${f.pattern}`).join('; '));
    }
  }

  const provider = getActiveProvider();
  const resolvedReasoning = resolveReasoningLevel(opts.reasoning ?? getStoredReasoningLevel(), opts.reasoningStage);
  const reasoningForRequest = resolvedReasoning === 'auto' ? undefined : resolvedReasoning;
  const requestSensitivity = resolveProviderRequestSensitivity({
    explicit: opts.dataSensitivity,
    reasoningStage: opts.reasoningStage,
    isChatMode: opts.isChatMode,
    approxChars: estimateProviderRequestChars(opts.systemInstruction, opts.messages),
  });

  const providerAutoFallbackEnabled = allowsProviderAutoFallback({
    sensitivity: requestSensitivity,
    userPreference: isByokFallbackEnabled(),
  });

  // ARI gate: try another saved connection only for low/standard requests after explicit user opt-in.
  if (providerAutoFallbackEnabled && !ariManager.isAvailable(provider)) {
    const fallbacks = getFallbackProviders(provider);
    const candidateIds = fallbacks.map((f) => f.id);
    if (candidateIds.length > 0) {
      const bestId = ariManager.getBestProvider(candidateIds);
      const best = fallbacks.find((f) => f.id === bestId);
      if (best) {
        logger.warn('ari-route', `Provider ${provider} circuit open (ARI=${ariManager.getScore(provider).toFixed(1)}). Routing to ${bestId}`);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('noa:provider-fallback', {
            detail: { from: provider, to: bestId, reason: 'ari-circuit-open' },
          }));
        }
        const { messages: trimmed, systemTokens: st, messageTokens: mt } =
          truncateMessages(opts.systemInstruction, opts.messages, best.model);
        const maxTok = getMaxOutputTokens(best.model, st, mt);
        const t0 = Date.now();
        try {
          const result = await streamViaProxy(best.id, best.model, best.key, {
            ...opts,
            messages: trimmed,
            maxTokens: maxTok,
            reasoning: reasoningForRequest,
          });
          ariManager.updateAfterCall(bestId, true, Date.now() - t0);
          return result;
        } catch (err) {
          ariManager.updateAfterCall(bestId, false, Date.now() - t0);
          if (err instanceof DOMException && err.name === 'AbortError') throw err;
          // Fall through to normal flow with primary provider as last resort
          logger.warn('AIProviders', `ARI-routed fallback to ${bestId} failed — falling through to primary provider`, err);
        }
      }
    }
  }

  // v4 AES-GCM 키 비동기 복호화 대기 — 동기 getApiKey 빈 문자열이면 async 폴백
  const apiKey = getApiKey(provider) || await getApiKeyAsync(provider);
  const model = opts.model || getActiveModel();

  // Truncate messages to fit context window
  const { messages: trimmedMessages, truncated, systemTokens, messageTokens } =
    truncateMessages(opts.systemInstruction, opts.messages, model);

  if (truncated && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('noa:token-truncated'));
  }

  const maxTokens = getMaxOutputTokens(model, systemTokens, messageTokens);
  const safeOpts = { ...opts, messages: trimmedMessages, maxTokens, reasoning: reasoningForRequest };

  // Retry wrapper: up to 3 retries with jittered exponential backoff
  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      // Honor server Retry-After header if available, else jittered exponential backoff
      const serverDelay = (lastError as Error & { _retryAfterMs?: number })?._retryAfterMs;
      const baseDelay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
      const jitter = Math.random() * 0.3 * baseDelay;
      const backoff = (serverDelay && serverDelay > 0)
        ? serverDelay
        : Math.round(baseDelay + jitter);
      await new Promise(r => setTimeout(r, backoff));
    }

    const t0 = Date.now();
    try {
      const result = await streamViaProxy(provider, model, apiKey, safeOpts);
      ariManager.updateAfterCall(provider, true, Date.now() - t0, model);
      return result;
    } catch (proxyErr) {
      if (proxyErr instanceof DOMException && proxyErr.name === 'AbortError') throw proxyErr;

      const errMsg = proxyErr instanceof Error ? proxyErr.message : '';
      ariManager.updateAfterCall(provider, false, Date.now() - t0, model);

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

  // Primary provider exhausted — attempt ARI-ranked fallback providers.
  // Triggers: (1) quota/rate-limit errors, (2) DGX-down errors when BYOK fallback enabled.
  // Falls back in ARI score order, skipping providers without a stored API key.
  // Does NOT persist the switch to localStorage; active provider is unchanged.
  const shouldFallback = providerAutoFallbackEnabled && lastError && (
    isQuotaError(lastError.message) ||
    isDgxDownError(lastError.message)
  );
  if (shouldFallback && lastError) {
    const dgxDown = isDgxDownError(lastError.message);
    const fallbackReason = dgxDown ? 'dgx-down-byok-fallback' : 'quota-ari-fallback';
    const fallbacks = getFallbackProviders(provider);
    // Sort fallbacks by ARI score (healthiest first)
    const ranked = [...fallbacks].sort(
      (a, b) => ariManager.getScore(b.id) - ariManager.getScore(a.id),
    );
    // DGX-down인데 BYOK 키가 하나도 없으면 명시적 안내 에러로 교체
    if (dgxDown && ranked.length === 0) {
      logger.warn('fallback', 'DGX down and no BYOK keys configured — cannot fall back');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('noa:dgx-down-no-byok', {
          detail: { originalError: lastError.message },
        }));
      }
      throw new Error('DGX engine down. Please configure a connection key in Settings to continue.');
    }
    for (const fallback of ranked) {
      if (!ariManager.isAvailable(fallback.id)) continue;
      const t0 = Date.now();
      try {
        logger.warn('fallback', `${provider} ${dgxDown ? 'DGX-down' : 'quota/rate-limit hit'}. ARI-routing to ${fallback.id} (ARI=${ariManager.getScore(fallback.id).toFixed(1)})...`);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('noa:provider-fallback', {
            detail: { from: provider, to: fallback.id, reason: fallbackReason },
          }));
        }
        const fallbackMaxTokens = getMaxOutputTokens(fallback.model, systemTokens, messageTokens);
        const result = await streamViaProxy(
          fallback.id,
          fallback.model,
          fallback.key,
          { ...safeOpts, maxTokens: fallbackMaxTokens },
        );
        ariManager.updateAfterCall(fallback.id, true, Date.now() - t0);
        return result;
      } catch (fallbackErr) {
        ariManager.updateAfterCall(fallback.id, false, Date.now() - t0);
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
  } catch (err) {
    logger.warn('AIProviders', `testApiKey for provider '${providerId}' failed — treating as invalid`, err);
    return false;
  }
}
