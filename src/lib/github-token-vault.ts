// ============================================================
// github-token-vault.ts — GitHub PAT 평문 해소 (D1-pat-security)
// ============================================================
// WebCrypto AES-GCM 암호화 레이어.
// - 디바이스 키: non-extractable AES-GCM 256 CryptoKey, IndexedDB 보관
//   (extractable=false → 같은 origin JS여도 키 raw bytes 추출 불가).
// - 토큰 ciphertext: localStorage `noa-github-token-vault` (iv + ct, base64).
// - 평문 토큰은 localStorage / 백업 번들 / 어떤 직렬화 경로에도 남지 않는다.
//
// [정직 표기 — XSS 한계]
// 이 레이어는 at-rest 평문 노출만 차단한다:
//   localStorage 덤프·전체 백업 번들·DevTools storage 복사·디스크 포렌식.
// 동일 디바이스에서 코드 실행이 가능한 공격자(XSS·악성 브라우저 확장)에겐
// 무력하다 — 같은 JS 컨텍스트는 이 vault API(loadToken)를 그대로 호출해
// 복호화할 수 있기 때문이다. 상위안 = 토큰을 클라이언트에 아예 두지 않는
// httpOnly 쿠키 + 서버 사이드 GitHub 프록시.
// ============================================================

// ============================================================
// PART 1 — Constants & Environment Detection
// ============================================================

import { logger } from '@/lib/logger';

const VAULT_STORAGE_KEY = 'noa-github-token-vault';
const VAULT_VERSION = 1;

const IDB_NAME = 'noa_token_vault';
const IDB_VERSION = 1;
const IDB_STORE = 'keys';
const IDB_KEY_ID = 'github-device-key';

const AES_PARAMS: AesKeyGenParams = { name: 'AES-GCM', length: 256 };
const IV_BYTES = 12; // AES-GCM 권장 96-bit nonce

interface VaultRecord {
  v: number;
  iv: string; // base64
  ct: string; // base64
}

function getSubtle(): SubtleCrypto | null {
  try {
    return typeof globalThis !== 'undefined' && globalThis.crypto?.subtle
      ? globalThis.crypto.subtle
      : null;
  } catch {
    return null;
  }
}

function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

// ============================================================
// PART 2 — Base64 Helpers (토큰은 짧다 — spread 안전)
// ============================================================

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ============================================================
// PART 3 — Device Key (IndexedDB · non-extractable · 싱글톤)
// ============================================================

function openVaultDB(): Promise<IDBDatabase | null> {
  if (!isIndexedDBAvailable()) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        logger.warn('TokenVault', 'openVaultDB onerror', req.error);
        resolve(null);
      };
    } catch (err) {
      logger.warn('TokenVault', 'openVaultDB threw', err);
      resolve(null);
    }
  });
}

function idbGetKey(db: IDBDatabase): Promise<CryptoKey | null> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY_ID);
      req.onsuccess = () => {
        const v = req.result as unknown;
        // typeof 가드 — CryptoKey 글로벌 미존재 환경(jsdom 등)에서 ReferenceError 방지
        resolve(typeof CryptoKey !== 'undefined' && v instanceof CryptoKey ? v : null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function idbPutKey(db: IDBDatabase, key: CryptoKey): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(key, IDB_KEY_ID);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

function idbDeleteKey(db: IDBDatabase): Promise<void> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(IDB_KEY_ID);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/** 동시 호출 시 키 이중 생성(→ 복호 불가 ciphertext) 방지 싱글톤. */
let deviceKeyPromise: Promise<CryptoKey | null> | null = null;

async function resolveDeviceKey(): Promise<CryptoKey | null> {
  const subtle = getSubtle();
  if (!subtle) return null;

  const db = await openVaultDB();
  if (db) {
    const existing = await idbGetKey(db);
    if (existing) {
      db.close();
      return existing;
    }
  }

  let key: CryptoKey;
  try {
    // extractable=false — 키 raw 추출 구조적 차단 (위 XSS 한계 주석 참조)
    key = await subtle.generateKey(AES_PARAMS, false, ['encrypt', 'decrypt']);
  } catch (err) {
    logger.warn('TokenVault', 'generateKey failed', err);
    db?.close();
    return null;
  }

  if (db) {
    const persisted = await idbPutKey(db, key);
    db.close();
    if (!persisted) {
      // 키 영속 실패 — 이 세션 동안만 유효. 다음 세션 ciphertext는
      // loadToken()의 복호 실패 정리 경로로 제거되고 재연결을 유도한다.
      logger.warn('TokenVault', 'device key not persisted — session-only encryption');
    }
  } else {
    logger.warn('TokenVault', 'IndexedDB unavailable — session-only device key');
  }
  return key;
}

function getDeviceKey(): Promise<CryptoKey | null> {
  if (!deviceKeyPromise) {
    deviceKeyPromise = resolveDeviceKey().then((key) => {
      if (!key) deviceKeyPromise = null; // 실패는 캐시하지 않음 — 다음 호출 재시도
      return key;
    });
  }
  return deviceKeyPromise;
}

// ============================================================
// PART 4 — Public API: storeToken / loadToken / clearToken
// ============================================================

/**
 * 누출 가드용 in-memory 사본. 암호화 저장 성공 여부와 무관하게 세션 내
 * containsVaultToken() 검사를 가능하게 한다. 직렬화 대상 아님 (모듈 클로저).
 */
let lastKnownToken: string | null = null;

/**
 * 토큰을 AES-GCM으로 암호화해 저장한다.
 * @returns true = 암호화 영속 성공. false = 영속 실패 (평문 fallback 저장은
 *          절대 하지 않는다 — 토큰은 메모리에만 남고 다음 세션에 재연결 필요).
 */
export async function storeToken(token: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!token) {
    await clearToken();
    return true;
  }
  lastKnownToken = token;

  const subtle = getSubtle();
  const key = await getDeviceKey();
  if (!subtle || !key) {
    logger.warn('TokenVault', 'WebCrypto/device key unavailable — token NOT persisted (no plaintext fallback)');
    try { localStorage.removeItem(VAULT_STORAGE_KEY); } catch { /* noop */ }
    return false;
  }

  try {
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const ct = await subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(token));
    const record: VaultRecord = { v: VAULT_VERSION, iv: toBase64(iv), ct: toBase64(new Uint8Array(ct)) };
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(record));
    return true;
  } catch (err) {
    logger.warn('TokenVault', 'encrypt/store failed — token NOT persisted', err);
    return false;
  }
}

/**
 * 저장된 ciphertext를 복호화해 토큰을 반환한다.
 * 복호 실패(디바이스 키 유실·레코드 손상) 시 죽은 ciphertext를 정리하고
 * null 반환 — 호출자는 연결 해제 상태로 처리해 재연결을 유도한다.
 */
export async function loadToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(VAULT_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  const subtle = getSubtle();
  const key = await getDeviceKey();
  if (!subtle || !key) return null;

  try {
    const rec = JSON.parse(raw) as Partial<VaultRecord>;
    if (rec.v !== VAULT_VERSION || typeof rec.iv !== 'string' || typeof rec.ct !== 'string') {
      throw new Error('vault record malformed');
    }
    const iv = fromBase64(rec.iv);
    const ct = fromBase64(rec.ct);
    const pt = await subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ct as BufferSource,
    );
    const token = new TextDecoder().decode(pt);
    if (!token) return null;
    lastKnownToken = token;
    return token;
  } catch (err) {
    logger.warn('TokenVault', 'decrypt failed — clearing stale vault record', err);
    try { localStorage.removeItem(VAULT_STORAGE_KEY); } catch { /* noop */ }
    return null;
  }
}

/** ciphertext + 디바이스 키 + in-memory 사본 전부 제거 (disconnect 위생). */
export async function clearToken(): Promise<void> {
  lastKnownToken = null;
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(VAULT_STORAGE_KEY); } catch { /* noop */ }
  const db = await openVaultDB();
  if (db) {
    await idbDeleteKey(db);
    db.close();
  }
  deviceKeyPromise = null; // 다음 storeToken에서 새 키 생성
}

// ============================================================
// PART 5 — Leak Guard (cert / 이벤트 / GitHub 파일 / Firestore 직렬화 경로)
// ============================================================
// 토큰이 사용자 산출물·외부 전송 payload에 섞이는 것을 차단하기 위한
// 검사 함수. useGitHubSync.saveFile이 GitHub 파일 경로에서 사용하고,
// cert/이벤트/Firestore 직렬화 작성자는 전송 직전 serializedContainsToken
// 으로 검사할 수 있다. (토큰은 모듈 클로저에만 존재 — 가드 자체가 토큰을
// 노출하지 않는다.)

/** 텍스트에 현재 세션의 GitHub 토큰이 포함되어 있으면 true. */
export function containsVaultToken(text: string): boolean {
  return Boolean(lastKnownToken) && typeof text === 'string' && text.includes(lastKnownToken as string);
}

/** 토큰 출현부를 마스킹한 사본 반환 (로그·이벤트 payload 정화용). */
export function redactVaultToken(text: string): string {
  if (!lastKnownToken || typeof text !== 'string') return text;
  return text.split(lastKnownToken).join('[REDACTED:GITHUB_TOKEN]');
}

/** 임의 값을 JSON 직렬화했을 때 토큰이 포함되는지 검사 (Firestore/cert/이벤트용). */
export function serializedContainsToken(value: unknown): boolean {
  if (!lastKnownToken) return false;
  try {
    return containsVaultToken(JSON.stringify(value) ?? '');
  } catch {
    // 직렬화 불가(circular 등) — 판정 불능은 안전 방향: 누출 가능성 있음으로 본다
    return true;
  }
}

// IDENTITY_SEAL: github-token-vault | role=PAT at-rest 암호화+누출가드 | inputs=token | outputs=encrypted record+guards
