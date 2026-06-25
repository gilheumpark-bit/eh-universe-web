import { logger } from '@/lib/logger';

// 4-layer key protection:
// Layer 1 (v1): Base64 only (legacy, read-only)
// Layer 2 (v2): XOR with origin+UA mask (legacy, read-only)
// Layer 3 (v3): Salt + XOR (legacy, read-only - synchronous fallback for write)
// Layer 4 (v4): AES-GCM via Web Crypto (async, preferred write path)
// XSS에서 메모리 접근은 방어 불가하나, localStorage 직접 읽기는 AES-GCM으로 실질적 방어.
export const ENCRYPTION_PREFIX_V4 = 'noa:4:';
const OBFUSCATION_PREFIX_V3 = 'noa:3:';
const OBFUSCATION_PREFIX = 'noa:2:';
const LEGACY_PREFIX = 'noa:1:';
const SALT_LENGTH = 16;
const IV_LENGTH = 12; // AES-GCM recommended IV size

// #20: Encapsulate CryptoKey cache in closure to prevent module-global exposure
const keyStore = (() => {
  let key: CryptoKey | null = null;
  return {
    get: () => key,
    set: (nextKey: CryptoKey) => { key = nextKey; },
    clear: () => { key = null; },
  };
})();

function isSubtleCryptoAvailable(): boolean {
  return (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle !== 'undefined' &&
    typeof crypto.subtle.deriveKey === 'function'
  );
}

async function deriveAesKey(): Promise<CryptoKey> {
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

async function encryptAesGcm(plain: string): Promise<string> {
  const key = await deriveAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plain);
  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  );
  const combined = new Uint8Array(iv.length + cipherBuf.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuf), iv.length);
  return ENCRYPTION_PREFIX_V4 + btoa(String.fromCharCode(...combined));
}

async function decryptAesGcm(stored: string): Promise<string> {
  const key = await deriveAesKey();
  const raw = atob(stored.slice(ENCRYPTION_PREFIX_V4.length));
  const allBytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) allBytes[i] = raw.charCodeAt(i);
  const iv = allBytes.slice(0, IV_LENGTH);
  const ciphertext = allBytes.slice(IV_LENGTH);
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(plainBuf);
}

function xorMask(): number[] {
  const seed = typeof window !== 'undefined'
    ? `${window.location.origin}:${navigator.userAgent.slice(0, 32)}`
    : 'noa-server-fallback';
  const mask: number[] = [];
  for (let i = 0; i < seed.length; i++) mask.push(seed.charCodeAt(i) & 0xff);
  return mask;
}

function generateSalt(): Uint8Array {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  }
  throw new Error(
    '[ai-providers] CSPRNG unavailable (crypto.getRandomValues missing). ' +
    'Math.random() fallback is insecure and has been removed. ' +
    'Ensure runtime exposes Web Crypto or upgrade Node >= 19.',
  );
}

/** Synchronous v3 fallback (Salt + XOR) - used when SubtleCrypto unavailable */
function obfuscateKeySync(plain: string): string {
  if (!plain) return '';
  try {
    const baseMask = xorMask();
    const salt = generateSalt();
    const combinedMask = baseMask.map((byte, index) => byte ^ salt[index % salt.length]);
    const bytes = new TextEncoder().encode(plain);
    const xored = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) xored[i] = bytes[i] ^ combinedMask[i % combinedMask.length];
    const combined = new Uint8Array(salt.length + xored.length);
    combined.set(salt, 0);
    combined.set(xored, salt.length);
    return OBFUSCATION_PREFIX_V3 + btoa(String.fromCharCode(...combined));
  } catch (err) {
    logger.warn('AIProviders', 'v3 obfuscateKey failed - returning plaintext as last resort', err);
    return plain;
  }
}

/** Encrypt: AES-GCM preferred, v3 XOR fallback */
export async function encryptKey(plain: string): Promise<string> {
  if (!plain) return '';
  if (isSubtleCryptoAvailable()) {
    try {
      return await encryptAesGcm(plain);
    } catch (err) {
      logger.warn('AIProviders', 'AES-GCM encrypt failed (insecure context?) - falling back to v3 XOR', err);
    }
  }
  return obfuscateKeySync(plain);
}

/** Synchronous encrypt fallback - for callers that cannot await */
export function obfuscateKey(plain: string): string {
  return obfuscateKeySync(plain);
}

/** Decrypt: detects version prefix and dispatches accordingly */
export async function decryptKey(stored: string): Promise<string> {
  if (!stored) return '';
  if (stored.startsWith(ENCRYPTION_PREFIX_V4)) {
    try {
      return await decryptAesGcm(stored);
    } catch (err) {
      logger.warn('AIProviders', 'v4 AES-GCM decrypt failed - returning empty key', err);
      return '';
    }
  }
  return deobfuscateKey(stored);
}

/** Synchronous decrypt for legacy formats (v1/v2/v3/plaintext) */
export function deobfuscateKey(stored: string): string {
  if (!stored) return '';
  if (stored.startsWith(OBFUSCATION_PREFIX_V3)) {
    try {
      const baseMask = xorMask();
      const raw = atob(stored.slice(OBFUSCATION_PREFIX_V3.length));
      const allBytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) allBytes[i] = raw.charCodeAt(i);
      const salt = allBytes.slice(0, SALT_LENGTH);
      const xored = allBytes.slice(SALT_LENGTH);
      const combinedMask = baseMask.map((byte, index) => byte ^ salt[index % salt.length]);
      const bytes = new Uint8Array(xored.length);
      for (let i = 0; i < xored.length; i++) bytes[i] = xored[i] ^ combinedMask[i % combinedMask.length];
      return new TextDecoder().decode(bytes);
    } catch (err) {
      logger.warn('AIProviders', 'v3 salt+XOR decode failed - returning empty key', err);
      return '';
    }
  }
  if (stored.startsWith(OBFUSCATION_PREFIX)) {
    try {
      const mask = xorMask();
      const raw = atob(stored.slice(OBFUSCATION_PREFIX.length));
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i) ^ mask[i % mask.length];
      return new TextDecoder().decode(bytes);
    } catch (err) {
      logger.warn('AIProviders', 'v2 XOR+base64 decode failed - returning empty key', err);
      return '';
    }
  }
  if (stored.startsWith(LEGACY_PREFIX)) {
    try {
      return decodeURIComponent(escape(atob(stored.slice(LEGACY_PREFIX.length))));
    } catch (err) {
      logger.warn('AIProviders', 'v1 base64 decode failed - returning empty key', err);
      return '';
    }
  }
  return stored;
}
