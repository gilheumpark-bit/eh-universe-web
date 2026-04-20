// ============================================================
// PART 1 — canonicalJson
// ============================================================

import { sha256, canonicalJson, hashPayload, verifyChain, bytesToHex, utf8Encode } from '@/lib/save-engine/hash';
import type { JournalEntry, DeltaPayload } from '@/lib/save-engine/types';
import { CURRENT_JOURNAL_VERSION, GENESIS } from '@/lib/save-engine/types';

describe('canonicalJson', () => {
  test('오브젝트 키 오름차순 정렬', () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  test('중첩 오브젝트 키도 정렬', () => {
    expect(canonicalJson({ x: { b: 1, a: 2 } })).toBe('{"x":{"a":2,"b":1}}');
  });

  test('배열 순서는 그대로 유지', () => {
    expect(canonicalJson([3, 1, 2])).toBe('[3,1,2]');
  });

  test('null/undefined 처리', () => {
    expect(canonicalJson(null)).toBe('null');
    expect(canonicalJson(undefined)).toBe('null');
  });

  test('undefined 키는 제거', () => {
    expect(canonicalJson({ a: 1, b: undefined, c: 2 })).toBe('{"a":1,"c":2}');
  });

  test('Uint8Array 안정 직렬화', () => {
    const a = canonicalJson(new Uint8Array([1, 2, 3]));
    const b = canonicalJson(new Uint8Array([1, 2, 3]));
    expect(a).toBe(b);
    expect(a).toContain('u8:010203');
  });
});

// ============================================================
// PART 2 — sha256 & helpers
// ============================================================

describe('sha256', () => {
  test('empty input — known vector', async () => {
    const h = await sha256('');
    expect(h).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  test('"abc" — known vector', async () => {
    const h = await sha256('abc');
    expect(h).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  test('입력 동일 시 결정적', async () => {
    const a = await sha256('hello world');
    const b = await sha256('hello world');
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  test('1바이트 변화에도 hash 전혀 다름', async () => {
    const a = await sha256('hello');
    const b = await sha256('hellp'); // 1글자 diff
    expect(a).not.toBe(b);
  });
});

describe('bytesToHex / utf8Encode', () => {
  test('bytesToHex — round trip', () => {
    const bytes = new Uint8Array([0, 1, 15, 16, 255]);
    expect(bytesToHex(bytes)).toBe('00010f10ff');
  });

  test('utf8Encode — ASCII + 한글', () => {
    expect(utf8Encode('A').length).toBe(1);
    expect(utf8Encode('한').length).toBe(3);
  });
});

// ============================================================
// PART 3 — hashPayload + verifyChain
// ============================================================

function makeDelta(projectId: string, opPath: string, value: unknown): DeltaPayload {
  return {
    projectId,
    ops: [{ op: 'replace', path: opPath, value }],
    target: 'manuscript',
    targetId: `${projectId}:t`,
    baseContentHash: GENESIS,
  };
}

async function buildEntry(
  payload: DeltaPayload,
  parentHash: string,
  id: string,
): Promise<JournalEntry> {
  const contentHash = await hashPayload(payload);
  return {
    id,
    clock: { physical: 100, logical: 0, nodeId: 'test' },
    sessionId: 'sess',
    tabId: 'tab',
    projectId: payload.projectId,
    entryType: 'delta',
    parentHash,
    contentHash,
    payload,
    createdBy: 'user',
    journalVersion: CURRENT_JOURNAL_VERSION,
  };
}

describe('verifyChain', () => {
  test('정상 체인 — GENESIS부터 연속 검증', async () => {
    const e1 = await buildEntry(makeDelta('p', '/a', 1), GENESIS, 'id-1');
    const e2 = await buildEntry(makeDelta('p', '/a', 2), e1.contentHash, 'id-2');
    const e3 = await buildEntry(makeDelta('p', '/a', 3), e2.contentHash, 'id-3');
    const r = await verifyChain([e1, e2, e3]);
    expect(r.ok).toBe(true);
    expect(r.scanned).toBe(3);
  });

  test('parent 링크 끊김 → parent-mismatch', async () => {
    const e1 = await buildEntry(makeDelta('p', '/a', 1), GENESIS, 'id-1');
    const e2 = await buildEntry(makeDelta('p', '/a', 2), 'WRONG', 'id-2');
    const r = await verifyChain([e1, e2]);
    expect(r.ok).toBe(false);
    expect(r.breakAt).toBe('id-2');
    expect(r.reason).toBe('parent-mismatch');
  });

  test('payload 변조 감지 → content-hash-mismatch', async () => {
    const e1 = await buildEntry(makeDelta('p', '/a', 1), GENESIS, 'id-1');
    // payload를 몰래 바꿔서 hash 불일치 유도
    const tampered: JournalEntry = { ...e1, payload: makeDelta('p', '/a', 999) };
    const r = await verifyChain([tampered]);
    expect(r.ok).toBe(false);
    expect(r.breakAt).toBe('id-1');
    expect(r.reason).toBe('content-hash-mismatch');
  });

  test('빈 배열 → ok', async () => {
    const r = await verifyChain([]);
    expect(r.ok).toBe(true);
    expect(r.scanned).toBe(0);
  });

  test('fromParentHash 옵션 — 중간 시작 지원', async () => {
    const e1 = await buildEntry(makeDelta('p', '/a', 1), GENESIS, 'id-1');
    const e2 = await buildEntry(makeDelta('p', '/a', 2), e1.contentHash, 'id-2');
    const r = await verifyChain([e2], { fromParentHash: e1.contentHash });
    expect(r.ok).toBe(true);
  });

  test('첫 엔트리의 parentHash가 GENESIS가 아니면 missing-genesis', async () => {
    const e = await buildEntry(makeDelta('p', '/a', 1), 'NOT_GENESIS', 'id-1');
    const r = await verifyChain([e]);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('missing-genesis');
  });
});
