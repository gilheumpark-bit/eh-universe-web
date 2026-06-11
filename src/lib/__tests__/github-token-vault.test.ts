/**
 * github-token-vault.test.ts — D1-pat-security 회귀 방지
 *
 * 검증:
 *  - AES-GCM 암호화 roundtrip (store → load)
 *  - localStorage 레코드에 평문 토큰 절대 미포함
 *  - clearToken 위생 (ciphertext + in-memory 사본 제거)
 *  - 손상 레코드 복호 실패 시 자가 정리 (null + 레코드 삭제)
 *  - 누출 가드 (containsVaultToken / redactVaultToken / serializedContainsToken)
 *
 * jsdom 에는 WebCrypto subtle 이 없어 node:crypto webcrypto 를 주입.
 * fake-indexeddb 로 디바이스 키 보관 경로 시뮬레이션.
 */

// [C] structuredClone polyfill — fake-indexeddb 호환 (event-recorder.test.ts 패턴)
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));
}

import 'fake-indexeddb/auto';
import { webcrypto } from 'node:crypto';

// jsdom crypto 는 getRandomValues 만 — subtle 없으면 node webcrypto 주입
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}
if (typeof (globalThis as { CryptoKey?: unknown }).CryptoKey === 'undefined') {
  (globalThis as { CryptoKey?: unknown }).CryptoKey =
    (webcrypto as unknown as { CryptoKey: unknown }).CryptoKey;
}

import {
  storeToken,
  loadToken,
  clearToken,
  containsVaultToken,
  redactVaultToken,
  serializedContainsToken,
} from '../github-token-vault';

const VAULT_KEY = 'noa-github-token-vault';
const TOKEN = 'ghp_TESTTOKEN_abc123XYZ';

describe('github-token-vault — AES-GCM PAT vault', () => {
  beforeEach(async () => {
    localStorage.clear();
    await clearToken();
  });

  it('storeToken → loadToken roundtrip 복호 성공', async () => {
    const ok = await storeToken(TOKEN);
    expect(ok).toBe(true);
    const loaded = await loadToken();
    expect(loaded).toBe(TOKEN);
  });

  it('localStorage 레코드는 암호화 형태 — 평문 토큰 미포함', async () => {
    await storeToken(TOKEN);
    const raw = localStorage.getItem(VAULT_KEY);
    expect(raw).toBeTruthy();
    expect(raw).not.toContain(TOKEN);
    const rec = JSON.parse(raw as string) as { v: number; iv: string; ct: string };
    expect(rec.v).toBe(1);
    expect(typeof rec.iv).toBe('string');
    expect(typeof rec.ct).toBe('string');
  });

  it('clearToken — ciphertext + in-memory 사본 제거', async () => {
    await storeToken(TOKEN);
    await clearToken();
    expect(localStorage.getItem(VAULT_KEY)).toBeNull();
    expect(await loadToken()).toBeNull();
    expect(containsVaultToken(`x ${TOKEN} y`)).toBe(false);
  });

  it('손상 레코드 — 복호 실패 시 null + 레코드 자가 정리', async () => {
    localStorage.setItem(VAULT_KEY, JSON.stringify({ v: 1, iv: 'AAAAAAAAAAAAAAAA', ct: 'Zm9vYmFy' }));
    const loaded = await loadToken();
    expect(loaded).toBeNull();
    expect(localStorage.getItem(VAULT_KEY)).toBeNull();
  });

  it('빈 토큰 storeToken — clearToken 과 동일 동작', async () => {
    await storeToken(TOKEN);
    const ok = await storeToken('');
    expect(ok).toBe(true);
    expect(localStorage.getItem(VAULT_KEY)).toBeNull();
  });

  it('누출 가드 — containsVaultToken / redactVaultToken', async () => {
    await storeToken(TOKEN);
    expect(containsVaultToken(`prefix ${TOKEN} suffix`)).toBe(true);
    expect(containsVaultToken('clean content')).toBe(false);
    const redacted = redactVaultToken(`a ${TOKEN} b ${TOKEN}`);
    expect(redacted).not.toContain(TOKEN);
    expect(redacted).toContain('[REDACTED:GITHUB_TOKEN]');
  });

  it('누출 가드 — serializedContainsToken (Firestore/cert/이벤트 payload)', async () => {
    await storeToken(TOKEN);
    expect(serializedContainsToken({ nested: { auth: TOKEN } })).toBe(true);
    expect(serializedContainsToken({ nested: { safe: 'value' } })).toBe(false);
    // circular — 판정 불능은 안전 방향 (누출 가능성 있음 = true)
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(serializedContainsToken(circular)).toBe(true);
  });
});
