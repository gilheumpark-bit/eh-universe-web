// ============================================================
// registry-roundtrip.test — register ↔ verify 왕복 통합 (critical #4 · high #15)
// ============================================================
//
// register/route.ts 가 Firestore 에 *기록하는 정확한 fields 모양*을 재현하고,
// verify/route.ts 가 그 문서를 *읽어서 검증하는 경로*(parseRegistryDocument →
// computeCertHash 대조 → computeRegistryHmac 재계산)를 그대로 통과시켜,
// 두 라우트가 같은 collection·같은 필드명·같은 HMAC payload 를 쓰는지 회귀로 박는다.
//
//   critical #4 — collection 불일치(register='certificates' / verify=CP_REGISTRY_COLLECTION)
//                 → 등록한 cert 가 항상 cert_not_registered. 통일 후 round-trip PASS.
//   high #15   — HMAC 필드/payload 이중 불일치(register=registrySignature+10필드 |
//                 verify=entry.hmac(미존재)+4필드) → 변조검출 항상 실패.
//                 통일(field='hmac', payload=v2 8필드) 후 PASS, 변조 시에만 FAIL.
// ============================================================

import {
  CP_REGISTRY_COLLECTION,
  buildRegistryHmacPayload,
  computeRegistryHmac,
  computeCertHash,
  parseRegistryDocument,
  timingSafeEqualHex,
} from '../registry-contract';
import type { ProcessCertificate } from '../types';

const SECRET = 'roundtrip-test-secret';

const cert: Partial<ProcessCertificate> = {
  id: '01HZXK3V9T2M4N5P6Q7R8S9T0A',
  projectId: 'project-roundtrip',
  manuscriptHash: 'a'.repeat(64),
  generatedAt: '2026-06-11T00:00:00.000Z',
  reportVersion: '2.0',
  visibility: 'public',
  timelineHash: 'b'.repeat(64),
  sourceSummaryHash: 'c'.repeat(64),
  limitationTextVersion: 'v1',
  chainTipHash: 'd'.repeat(64),
};

/**
 * register/route.ts 의 Firestore write 를 그대로 재현 (필드명·HMAC 입력 동일).
 * route 가 바뀌면 이 헬퍼도 같이 바뀌어야 round-trip 이 의미를 갖는다 — 그래서
 * 필드명을 명시적으로 박아 회귀를 강제한다.
 */
async function simulateRegisterDocument(opts: {
  certHash: string;
  registeredAt: string;
  uid: string;
  visibility: string;
  issuerType: string;
  chainTipHash?: string;
}) {
  const hmac = await computeRegistryHmac(SECRET, {
    certId: cert.id as string,
    certHash: opts.certHash,
    chainTipHash: opts.chainTipHash,
    registeredAt: opts.registeredAt,
    uid: opts.uid,
    visibility: opts.visibility,
    issuerType: opts.issuerType,
  });
  const fields: Record<string, { stringValue?: string; timestampValue?: string }> = {
    certId: { stringValue: cert.id as string },
    projectId: { stringValue: cert.projectId as string },
    certHash: { stringValue: opts.certHash },
    // route.ts L213 와 동일: stringValue 로 저장해야 HMAC 서명 bytes 가 보존된다
    // (timestampValue 는 Firestore RFC3339 정규화로 byte 변형 → false-positive HMAC fail).
    registeredAt: { stringValue: opts.registeredAt },
    visibility: { stringValue: opts.visibility },
    authorUid: { stringValue: opts.uid },
    issuerType: { stringValue: opts.issuerType },
    hmac: { stringValue: hmac },
    signatureAlgo: { stringValue: 'hmac-sha256-v2' },
  };
  if (opts.chainTipHash) fields.chainTipHash = { stringValue: opts.chainTipHash };
  // Firestore REST 문서 모양 (firestoreListDocuments 가 반환하는 형태)
  return {
    doc: { name: `.../${CP_REGISTRY_COLLECTION}/${cert.id}`, fields },
    hmac,
  };
}

/**
 * verify/route.ts 의 crossCheckRegistry 핵심 로직 재현:
 *   parseRegistryDocument → certHash 대조 → chainTipHash 대조 → HMAC 재계산.
 * issues 비어 있으면 valid.
 */
async function simulateVerify(
  doc: unknown,
  submittedCert: Partial<ProcessCertificate>,
): Promise<{ status: string; hmac: string; issues: string[] }> {
  const issues: string[] = [];
  const entry = parseRegistryDocument(doc);
  if (!entry) {
    // 파싱 실패 = register 와 필드명 불일치 → 사실상 cert_not_registered
    return { status: 'cert_not_registered', hmac: 'skipped', issues: ['parse_failed'] };
  }

  let mismatch = false;
  const submittedHash = await computeCertHash(submittedCert);
  if (!timingSafeEqualHex(submittedHash, entry.certHash)) {
    issues.push('certHash mismatch');
    mismatch = true;
  }
  if ((submittedCert.chainTipHash ?? '') !== (entry.chainTipHash ?? '')) {
    issues.push('chainTipHash mismatch');
    mismatch = true;
  }

  let hmacStatus: string;
  if (!entry.hmac) {
    hmacStatus = 'missing';
    issues.push('registry entry missing HMAC');
    mismatch = true;
  } else {
    const expected = await computeRegistryHmac(SECRET, {
      certId: entry.certId,
      certHash: entry.certHash,
      chainTipHash: entry.chainTipHash,
      registeredAt: entry.registeredAt,
      uid: entry.authorUid,
      visibility: entry.visibility,
      issuerType: entry.issuerType,
    });
    if (timingSafeEqualHex(expected, entry.hmac)) {
      hmacStatus = 'pass';
    } else {
      hmacStatus = 'fail';
      issues.push('registry entry HMAC mismatch');
      mismatch = true;
    }
  }

  return { status: mismatch ? 'mismatch' : 'match', hmac: hmacStatus, issues };
}

describe('registry round-trip — register write → verify read (#4 · #15)', () => {
  test('정상 발급 cert → verify match + HMAC pass (#4 collection · #15 field/payload 정렬)', async () => {
    const certHash = await computeCertHash(cert);
    const { doc } = await simulateRegisterDocument({
      certHash,
      registeredAt: '2026-06-11T00:00:01.000Z',
      uid: 'user-abc',
      visibility: cert.visibility as string,
      issuerType: 'self',
      chainTipHash: cert.chainTipHash,
    });

    // parser 가 register 가 쓴 필드를 읽어내야 한다 (registeredAt·authorUid·hmac 필드명 정렬)
    const entry = parseRegistryDocument(doc);
    expect(entry).not.toBeNull();
    expect(entry?.registeredAt).toBe('2026-06-11T00:00:01.000Z');
    expect(entry?.authorUid).toBe('user-abc');
    expect(entry?.hmac).toMatch(/^[a-f0-9]{64}$/);

    const result = await simulateVerify(doc, cert);
    expect(result.status).toBe('match');
    expect(result.hmac).toBe('pass');
    expect(result.issues).toEqual([]);
  });

  test('레지스트리 엔트리 HMAC 1바이트 변조 → verify HMAC fail (변조검출 작동)', async () => {
    const certHash = await computeCertHash(cert);
    const { doc } = await simulateRegisterDocument({
      certHash,
      registeredAt: '2026-06-11T00:00:02.000Z',
      uid: 'user-abc',
      visibility: cert.visibility as string,
      issuerType: 'self',
      chainTipHash: cert.chainTipHash,
    });
    // 레지스트리 자체 변조 시뮬: hmac 끝 글자 뒤집기
    const tamperedHmac = (doc.fields.hmac.stringValue as string).replace(/.$/, (c) =>
      c === '0' ? '1' : '0',
    );
    doc.fields.hmac.stringValue = tamperedHmac;

    const result = await simulateVerify(doc, cert);
    expect(result.hmac).toBe('fail');
    expect(result.status).toBe('mismatch');
  });

  test('서명 범위 필드(visibility) 변조 → HMAC fail (v2 확장 필드 보호 확인)', async () => {
    const certHash = await computeCertHash(cert);
    const { doc } = await simulateRegisterDocument({
      certHash,
      registeredAt: '2026-06-11T00:00:03.000Z',
      uid: 'user-abc',
      visibility: 'public',
      issuerType: 'self',
    });
    // 누군가 레지스트리 문서의 visibility 를 private→public 으로 위조해도 HMAC 이 깨져야 한다
    doc.fields.visibility.stringValue = 'private';

    const result = await simulateVerify(doc, cert);
    expect(result.hmac).toBe('fail');
  });

  test('제출 cert 변조(manuscriptHash) → certHash mismatch (앵커와 다른 cert 거부)', async () => {
    const certHash = await computeCertHash(cert);
    const { doc } = await simulateRegisterDocument({
      certHash,
      registeredAt: '2026-06-11T00:00:04.000Z',
      uid: 'user-abc',
      visibility: cert.visibility as string,
      issuerType: 'self',
      chainTipHash: cert.chainTipHash,
    });

    const tamperedCert = { ...cert, manuscriptHash: 'f'.repeat(64) };
    const result = await simulateVerify(doc, tamperedCert);
    expect(result.issues).toContain('certHash mismatch');
    expect(result.status).toBe('mismatch');
    // HMAC 자체는 여전히 pass (레지스트리 무변조) — 변조된 건 제출 cert 쪽
    expect(result.hmac).toBe('pass');
  });

  // --- Firestore RFC3339 정규화 회귀 (high #15 잔존 — timestampValue 저장 시 false-positive) ---
  //
  // register 가 raw new Date().toISOString() ('...000Z', '...120Z') 로 HMAC 서명한 뒤
  // Firestore 에 timestampValue 로 저장하면, Firestore 가 RFC3339 로 정규화해 byte 를 바꾼다
  // (.000Z→Z, .120Z→.12Z). 검증기는 그 정규화된 값을 read-back 해 HMAC 을 재계산하므로,
  // 정당한 무변조 cert 가 데이터 의존적으로 HMAC mismatch (false-positive 변조 판정·fail-closed).
  // 기존 round-trip 테스트는 실제 Firestore 정규화를 미경유(in-memory byte 동일)해 미검출.
  // 아래 테스트는 정규화를 명시적으로 시뮬레이션해 이 클래스를 박는다.

  /** Firestore timestampValue RFC3339 정규화 모사: trailing-zero 소수부 절삭. */
  function firestoreNormalizeTimestamp(iso: string): string {
    // '2026-06-11T00:00:05.000Z' → '2026-06-11T00:00:05Z'
    // '2026-06-11T00:00:05.120Z' → '2026-06-11T00:00:05.12Z'
    return iso.replace(/\.(\d+?)0*Z$/, (_m, frac: string) => (frac === '' ? 'Z' : `.${frac}Z`));
  }

  test('stringValue 저장 → Firestore 정규화 무관, 무변조 cert HMAC pass (false-positive 차단)', async () => {
    const certHash = await computeCertHash(cert);
    // register 가 서명한 raw ISO (trailing zeros 포함 — 가장 흔한 케이스)
    const rawIso = '2026-06-11T00:00:05.000Z';
    const { doc } = await simulateRegisterDocument({
      certHash,
      registeredAt: rawIso,
      uid: 'user-abc',
      visibility: cert.visibility as string,
      issuerType: 'self',
      chainTipHash: cert.chainTipHash,
    });

    // stringValue 저장이므로 Firestore 가 손대지 않는다 — read-back = 서명된 그 bytes.
    const entry = parseRegistryDocument(doc);
    expect(entry?.registeredAt).toBe(rawIso);

    const result = await simulateVerify(doc, cert);
    expect(result.status).toBe('match');
    expect(result.hmac).toBe('pass');
  });

  test('timestampValue 였다면 정규화로 HMAC fail 했을 것 (회귀 가드 — 버그 클래스 재현)', async () => {
    const certHash = await computeCertHash(cert);
    const rawIso = '2026-06-11T00:00:06.000Z';
    // register 는 raw ISO 로 HMAC 서명
    const hmac = await computeRegistryHmac(SECRET, {
      certId: cert.id as string,
      certHash,
      chainTipHash: cert.chainTipHash,
      registeredAt: rawIso,
      uid: 'user-abc',
      visibility: cert.visibility as string,
      issuerType: 'self',
    });
    // 구 버그: timestampValue 저장 → Firestore 가 정규화한 값을 검증기가 read-back
    const normalized = firestoreNormalizeTimestamp(rawIso);
    expect(normalized).not.toBe(rawIso); // 정규화가 실제로 byte 를 바꿈을 증명
    const buggyDoc = {
      name: `.../${CP_REGISTRY_COLLECTION}/${cert.id}`,
      fields: {
        certId: { stringValue: cert.id as string },
        certHash: { stringValue: certHash },
        // ← 정규화된 timestampValue (구 버그 경로): parseRegistryDocument L207 가 우선 채택
        registeredAt: { timestampValue: normalized },
        visibility: { stringValue: cert.visibility as string },
        authorUid: { stringValue: 'user-abc' },
        issuerType: { stringValue: 'self' },
        chainTipHash: { stringValue: cert.chainTipHash as string },
        hmac: { stringValue: hmac },
      },
    };
    const buggyResult = await simulateVerify(buggyDoc, cert);
    // 구 버그 재현: 무변조인데도 HMAC fail (false-positive). 이 경로를 stringValue 로 막았다.
    expect(buggyResult.hmac).toBe('fail');

    // 동일 조건에서 stringValue 저장(현 route)은 pass — 정규화가 발생하지 않으므로.
    const fixedDoc = {
      name: `.../${CP_REGISTRY_COLLECTION}/${cert.id}`,
      fields: { ...buggyDoc.fields, registeredAt: { stringValue: rawIso } },
    };
    const fixedResult = await simulateVerify(fixedDoc, cert);
    expect(fixedResult.hmac).toBe('pass');
    expect(fixedResult.status).toBe('match');
  });

  test('register·verify 가 같은 collection 상수를 쓴다 (#4 단일화)', () => {
    expect(CP_REGISTRY_COLLECTION).toBe('cp_cert_registry');
  });

  test('HMAC payload v2 = 8 슬롯 (uid·visibility·issuerType 포함, #15 확장)', () => {
    const lines = buildRegistryHmacPayload({
      certId: 'x',
      certHash: 'y',
      registeredAt: 'z',
      uid: 'u',
      visibility: 'public',
      issuerType: 'self',
    }).split('\n');
    expect(lines[0]).toBe('cp-registry-v2');
    expect(lines).toHaveLength(8);
    expect(lines).toContain('u');
    expect(lines).toContain('public');
    expect(lines).toContain('self');
  });
});
