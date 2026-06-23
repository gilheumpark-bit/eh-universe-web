// ============================================================
// auth.ts — LSP API Token 발급 + 검증 + 레이트리밋.
//
// 토큰 형식: lg_lsp_{32 hex} (작가별, localStorage 저장)
// 검증: SHA-256 해시 매칭 (실제 토큰은 클라 저장, 서버는 hash 만)
//
// Phase 1: 단일 사용자 → localStorage / Phase 2: Firebase Custom Claims
//
// [C] 토큰 미존재 → 401 / [G] 레이트리밋 메모리 / [K] 단순 cap
// ============================================================

const TOKEN_PREFIX = 'lg_lsp_';
export const LSP_SESSION_COOKIE = 'lg_lsp_session';
export const LSP_SESSION_TTL_SEC = 60 * 60;

/** 32 hex (16 bytes) 랜덤 토큰 생성 */
export function generateLspToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return TOKEN_PREFIX + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // [C] crypto 미지원 fallback (테스트 환경) — Math.random
  let s = TOKEN_PREFIX;
  for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}

/** 토큰 형식 검증 — 형식만 체크 (실제 매칭은 store) */
export function isValidTokenFormat(token: string | null | undefined): boolean {
  if (!token) return false;
  if (!token.startsWith(TOKEN_PREFIX)) return false;
  if (token.length !== TOKEN_PREFIX.length + 32) return false;
  return /^[0-9a-f]+$/.test(token.slice(TOKEN_PREFIX.length));
}

/** 토큰 hash (SHA-256) — 서버 저장용 */
export async function hashToken(token: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const enc = new TextEncoder().encode(token);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // [C] 테스트 환경 fallback
  let h = 0;
  for (let i = 0; i < token.length; i++) h = ((h << 5) - h + token.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16);
}

// ============================================================
// 레이트리밋 (in-memory) — IP/토큰별 분당 60 req
// ============================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60_000;
const LIMIT = 60;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || entry.resetAt <= now) {
    const fresh: RateLimitEntry = { count: 1, resetAt: now + WINDOW_MS };
    rateLimitStore.set(key, fresh);
    return { allowed: true, remaining: LIMIT - 1, resetAt: fresh.resetAt };
  }
  if (entry.count >= LIMIT) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  entry.count += 1;
  return { allowed: true, remaining: LIMIT - entry.count, resetAt: entry.resetAt };
}

export function clearRateLimit(): void {
  rateLimitStore.clear();
}

export type LspAuthResult =
  | { ok: true; token: string; remaining: number; resetAt: number }
  | { ok: false; status: 401 | 429 | 503; error: string; retryAfterSec?: number; resetAt?: number };

function configuredLspToken(): string {
  return process.env.LOREGUARD_LSP_TOKEN?.trim() ?? '';
}

function configuredLspTokenHash(): string {
  return process.env.LOREGUARD_LSP_TOKEN_HASH?.trim().toLowerCase() ?? '';
}

export function hasConfiguredLspTokenStore(): boolean {
  return Boolean(configuredLspToken() || configuredLspTokenHash());
}

function readCookieValue(cookieHeader: string, name: string): string {
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [rawName, ...rest] = part.trim().split('=');
    if (rawName !== name) continue;
    return decodeURIComponent(rest.join('=')).trim();
  }
  return '';
}

function extractLspCookieToken(request: Request): string {
  const cookieHeader = request.headers.get('cookie') ?? '';
  if (!cookieHeader) return '';
  return readCookieValue(cookieHeader, LSP_SESSION_COOKIE);
}

function extractLspToken(request: Request, queryParam?: string): string {
  const auth = request.headers.get('authorization') ?? '';
  const bearer = auth.replace(/^Bearer\s+/i, '').trim();
  if (bearer) return bearer;
  const cookieToken = extractLspCookieToken(request);
  if (cookieToken) return cookieToken;
  if (!queryParam) return '';
  try {
    return new URL(request.url).searchParams.get(queryParam)?.trim() ?? '';
  } catch {
    return '';
  }
}

export async function verifyLspToken(token: string): Promise<LspAuthResult> {
  if (!isValidTokenFormat(token)) {
    return { ok: false, status: 401, error: 'unauthorized' };
  }

  const directToken = configuredLspToken();
  const tokenHash = configuredLspTokenHash();
  const hasServerTokenStore = hasConfiguredLspTokenStore();

  if (directToken && token !== directToken) {
    return { ok: false, status: 401, error: 'unauthorized' };
  }
  if (tokenHash) {
    const presentedHash = await hashToken(token);
    if (presentedHash !== tokenHash) {
      return { ok: false, status: 401, error: 'unauthorized' };
    }
  }
  if (process.env.NODE_ENV === 'production' && !hasServerTokenStore) {
    return { ok: false, status: 503, error: 'lsp_token_store_unconfigured' };
  }

  const rateKey = `lsp:${await hashToken(token)}`;
  const rl = checkRateLimit(rateKey);
  if (!rl.allowed) {
    return {
      ok: false,
      status: 429,
      error: 'rate_limited',
      retryAfterSec: Math.ceil((rl.resetAt - Date.now()) / 1000),
      resetAt: rl.resetAt,
    };
  }
  return { ok: true, token, remaining: rl.remaining, resetAt: rl.resetAt };
}

export function lspAuthHeaders(result: Extract<LspAuthResult, { ok: false }>): Record<string, string> | undefined {
  if (result.status !== 429 || !result.retryAfterSec) return undefined;
  return { 'Retry-After': String(result.retryAfterSec) };
}

export async function authorizeLspRequest(request: Request, options: { queryTokenParam?: string } = {}): Promise<LspAuthResult> {
  const token = extractLspToken(request, options.queryTokenParam);
  return verifyLspToken(token);
}
