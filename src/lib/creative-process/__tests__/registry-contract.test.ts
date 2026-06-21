// ============================================================
// registry-contract.test — 레지스트리 계약 (canonical certHash·HMAC·파서)
// ============================================================
// 등록기(S8-4)와 검증기(/api/cp/verify)가 같은 함수를 쓰므로,
// 여기서 회귀가 나면 외부 검증 PASS/FAIL 판정이 통째로 뒤집힌다.
// ============================================================

import {
  buildCertHashPayload,
  computeCertHash,
  buildRegistryHmacPayload,
  computeRegistryHmac,
  timingSafeEqualHex,
  parseRegistryDocument,
  CP_REGISTRY_COLLECTION,
  HONESTY_LIMITATION,
} from '../registry-contract';
import type { ProcessCertificate } from '../types';

const baseCert: Partial<ProcessCertificate> = {
  id: '01HZXK3V9T2M4N5P6Q7R8S9T0A',
  projectId: 'proj_alpha',
  manuscriptHash: 'a'.repeat(64),
  generatedAt: '2026-06-01T00:00:00.000Z',
  reportVersion: '2.0',
  visibility: 'public',
  timelineHash: 'b'.repeat(64),
  sourceSummaryHash: 'c'.repeat(64),
  limitationTextVersion: 'v1',
  chainTipHash: 'd'.repeat(64),
  sealNumber: 'LG-2606-0001-AAAA',
};

describe('registry-contract — canonical certHash', () => {
  test('payload 는 버전 prefix + 핵심 필드 순서 고정 (v1)', () => {
    const payload = buildCertHashPayload(baseCert);
    const lines = payload.split('\n');
    expect(lines[0]).toBe('cp-cert-v1');
    expect(lines[1]).toBe(baseCert.id);
    expect(lines).toHaveLength(12);
  });

  test('동일 cert → 동일 해시 (결정론)', async () => {
    const h1 = await computeCertHash(baseCert);
    const h2 = await computeCertHash({ ...baseCert });
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });

  test('핵심 필드 1자 변조 → 해시 불일치 (위변조 검출)', async () => {
    const h1 = await computeCertHash(baseCert);
    const h2 = await computeCertHash({ ...baseCert, manuscriptHash: 'f'.repeat(64) });
    expect(h1).not.toBe(h2);
  });

  test('optional 필드 누락 → 빈 슬롯으로 안정 처리 (throw X)', async () => {
    const h = await computeCertHash({ id: 'min-cert-1234' });
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('registry-contract — HMAC', () => {
  const entry = {
    certId: baseCert.id as string,
    certHash: 'e'.repeat(64),
    chainTipHash: 'd'.repeat(64),
    registeredAt: '2026-06-02T12:00:00.000Z',
  };

  test('같은 secret·entry → 재계산 일치 (pass 경로)', async () => {
    const mac1 = await computeRegistryHmac('test-secret', entry);
    const mac2 = await computeRegistryHmac('test-secret', entry);
    expect(mac1).toBe(mac2);
    expect(mac1).toMatch(/^[a-f0-9]{64}$/);
  });

  test('secret 또는 필드 변조 → HMAC 불일치 (fail 경로)', async () => {
    const ok = await computeRegistryHmac('test-secret', entry);
    const wrongSecret = await computeRegistryHmac('other-secret', entry);
    const tampered = await computeRegistryHmac('test-secret', { ...entry, certHash: '0'.repeat(64) });
    expect(wrongSecret).not.toBe(ok);
    expect(tampered).not.toBe(ok);
  });

  test('chainTipHash 없음(undefined) = 빈 슬롯 정규화', () => {
    const p1 = buildRegistryHmacPayload({ ...entry, chainTipHash: undefined });
    const p2 = buildRegistryHmacPayload({ ...entry, chainTipHash: '' });
    expect(p1).toBe(p2);
  });
});

describe('registry-contract — timingSafeEqualHex', () => {
  test('일치/불일치/길이 차이', () => {
    expect(timingSafeEqualHex('abcd', 'abcd')).toBe(true);
    expect(timingSafeEqualHex('abcd', 'abce')).toBe(false);
    expect(timingSafeEqualHex('abcd', 'abc')).toBe(false);
    expect(timingSafeEqualHex('', '')).toBe(true);
  });
});

describe('registry-contract — parseRegistryDocument', () => {
  const validDoc = {
    name: 'projects/p/databases/(default)/documents/cp_cert_registry/x1',
    fields: {
      certId: { stringValue: 'cert-0001-abcd' },
      sealNumber: { stringValue: 'LG-2606-0001-AAAA' },
      certHash: { stringValue: 'e'.repeat(64) },
      chainTipHash: { stringValue: 'd'.repeat(64) },
      registeredAt: { timestampValue: '2026-06-02T12:00:00Z' },
      visibility: { stringValue: 'public' },
      issuerType: { stringValue: 'self' },
      githubRepo: { stringValue: 'gilheumpark-bit/anchor-repo' },
      githubCommitSha: { stringValue: 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678' },
      hmac: { stringValue: 'f'.repeat(64) },
    },
  };

  test('정상 문서 → 전체 필드 파싱', () => {
    const entry = parseRegistryDocument(validDoc);
    expect(entry).not.toBeNull();
    expect(entry?.certId).toBe('cert-0001-abcd');
    expect(entry?.sealNumber).toBe('LG-2606-0001-AAAA');
    expect(entry?.registeredAt).toBe('2026-06-02T12:00:00Z');
    expect(entry?.githubCommitSha).toBe('a1b2c3d4e5f60718293a4b5c6d7e8f9012345678');
    expect(entry?.hmac).toBe('f'.repeat(64));
  });

  test('필수 필드 누락·비정상 입력 → null (손상 문서 skip)', () => {
    expect(parseRegistryDocument(null)).toBeNull();
    expect(parseRegistryDocument('str')).toBeNull();
    expect(parseRegistryDocument({})).toBeNull();
    expect(
      parseRegistryDocument({ fields: { certId: { stringValue: 'only-id-1234' } } }),
    ).toBeNull();
  });

  test('registeredAt 은 timestampValue/stringValue 양쪽 수용', () => {
    const doc = {
      fields: {
        certId: { stringValue: 'cert-0002-efgh' },
        certHash: { stringValue: 'e'.repeat(64) },
        registeredAt: { stringValue: '2026-06-03T00:00:00Z' },
      },
    };
    expect(parseRegistryDocument(doc)?.registeredAt).toBe('2026-06-03T00:00:00Z');
  });
});

describe('registry-contract — 계약 상수', () => {
  test('collection 이름·정직 한계 4언어 고정', () => {
    expect(CP_REGISTRY_COLLECTION).toBe('cp_cert_registry');
    expect(HONESTY_LIMITATION.ko).toContain('작성자가 직접 썼는지 자체를 증명하지 않습니다');
    expect(HONESTY_LIMITATION.en).toContain('does NOT prove direct authorship');
    expect(HONESTY_LIMITATION.ja.length).toBeGreaterThan(0);
    expect(HONESTY_LIMITATION.zh.length).toBeGreaterThan(0);
  });
});
