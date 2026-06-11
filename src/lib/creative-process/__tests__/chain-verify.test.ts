// ============================================================
// chain-verify.test.ts — [s81-hash-chain] 이벤트 해시 체인 무결성
// ============================================================
//
// fake-indexeddb 로 jsdom 환경 IndexedDB 시뮬레이션 (event-recorder.test.ts 패턴).
// 검증 시나리오:
//   1. 50건 fixture → valid
//   2. payload 변조 → brokenAt (hash-mismatch)
//   3. 위조 이벤트 mid-chain 삽입 → 검출
//   4. legacy (무해시) 이벤트 → 첫 hashed 이벤트부터 체인 시작 (문서화 동작)
//   5. 동시 rapid append → fork 없음 (직렬화 큐)

// [C] structuredClone polyfill — fake-indexeddb 호환 (event-recorder.test.ts 동일)
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));
}

import 'fake-indexeddb/auto';
import { recordCreativeEvent, listCreativeEvents, computeEventHash } from '../event-recorder';
import { verifyCreativeChain, extractChainTipHash, sortEventsForChain } from '../chain-verify';
import { getStore, promisifyRequest, promisifyTransaction, STORE_EVENTS, _resetCachedDB } from '../idb-store';
import type { CreativeEvent } from '../types';

const PROJECT = 'prj-chain';

function baseInput(i: number) {
  return {
    projectId: PROJECT,
    targetType: 'manuscript' as const,
    targetId: `m${i}`,
    eventType: 'edit' as const,
    actorType: 'human' as const,
    actorId: 'author',
    originType: 'HUMAN_REVISION' as const,
    beforeHash: 'b'.repeat(64),
    afterHash: 'a'.repeat(64),
    stage: 'writing' as const,
  };
}

async function putRaw(event: CreativeEvent): Promise<void> {
  const store = await getStore(STORE_EVENTS, 'readwrite');
  await promisifyRequest(store.put(event));
  await promisifyTransaction(store.transaction);
}

async function getSorted(): Promise<CreativeEvent[]> {
  return sortEventsForChain(await listCreativeEvents({ projectId: PROJECT }));
}

describe('chain-verify — per-event hash chain', () => {
  beforeEach(() => {
    _resetCachedDB();
    (globalThis as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
  });

  it('50-event fixture → valid, parent 연결·tip 일치', async () => {
    for (let i = 0; i < 50; i++) {
      await recordCreativeEvent(baseInput(i));
    }
    const result = await verifyCreativeChain(PROJECT);
    expect(result.valid).toBe(true);
    expect(result.brokenAt).toBeUndefined();
    expect(result.verifiedCount).toBe(50);
    expect(result.legacyCount).toBe(0);

    const events = await getSorted();
    // genesis = null, 이후 각 parent = 직전 eventHash
    expect(events[0].parentEventHash).toBeNull();
    for (let i = 1; i < events.length; i++) {
      expect(events[i].parentEventHash).toBe(events[i - 1].eventHash);
    }
    expect(result.tipHash).toBe(events[events.length - 1].eventHash);
    expect(extractChainTipHash(events)).toBe(result.tipHash);
  });

  it('payload 변조 → brokenAt (hash-mismatch) 검출', async () => {
    for (let i = 0; i < 10; i++) {
      await recordCreativeEvent(baseInput(i));
    }
    const events = await getSorted();
    const victim = { ...events[4], afterHash: 'f'.repeat(64) }; // 변조 — eventHash 는 그대로
    await putRaw(victim);

    const result = await verifyCreativeChain(PROJECT);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toEqual({ eventId: victim.id, index: 4, reason: 'hash-mismatch' });
  });

  it('위조 이벤트 mid-chain 삽입 → 검출 (parent-mismatch)', async () => {
    for (let i = 0; i < 10; i++) {
      await recordCreativeEvent(baseInput(i));
    }
    const events = await getSorted();

    // events[3] 과 [4] 사이 ULID 를 갖는 위조 이벤트 — 자기 해시는 올바르게 계산해도
    // 다음 실 이벤트 [4] 의 parent 가 위조 해시를 가리키지 않아 깨짐.
    const forgedId = events[3].id + '0'; // [3] 직후·[4] 이전 정렬되는 id (suffix 부착)
    const forged: CreativeEvent = {
      ...events[3],
      id: forgedId,
      targetId: 'forged',
      parentEventHash: events[3].eventHash!,
      eventHash: '',
    };
    forged.eventHash = await computeEventHash(forged);
    await putRaw(forged);

    const result = await verifyCreativeChain(PROJECT);
    expect(result.valid).toBe(false);
    expect(result.brokenAt?.reason).toBe('parent-mismatch');
    // 위조 직후 실 이벤트 [4] (삽입으로 index 5) 에서 검출
    expect(result.brokenAt?.eventId).toBe(events[4].id);
  });

  it('legacy 이벤트 (무해시) → 첫 hashed 이벤트부터 체인 시작 (문서화 동작)', async () => {
    // chain 도입 前 이벤트 직접 삽입 (recorder 우회)
    const legacy: CreativeEvent = {
      ...baseInput(0),
      id: '0000000000AAAAAAAAAAAAAAAA',
      createdAt: '2026-01-01T00:00:00.000Z',
      appVersion: 'legacy',
    };
    delete (legacy as Partial<CreativeEvent>).stage;
    await putRaw(legacy);

    await recordCreativeEvent(baseInput(1));
    await recordCreativeEvent(baseInput(2));

    const events = await getSorted();
    expect(events[0].eventHash).toBeUndefined();
    // 첫 hashed 이벤트 — 직전이 legacy → parent null (genesis 재시작)
    expect(events[1].parentEventHash).toBeNull();
    expect(events[2].parentEventHash).toBe(events[1].eventHash);

    const result = await verifyCreativeChain(PROJECT);
    expect(result.valid).toBe(true);
    expect(result.legacyCount).toBe(1);
    expect(result.verifiedCount).toBe(2);
  });

  it('동시 rapid append → fork 없는 단일 체인 (직렬화 큐)', async () => {
    await Promise.all(Array.from({ length: 20 }, (_, i) => recordCreativeEvent(baseInput(i))));

    const result = await verifyCreativeChain(PROJECT);
    expect(result.valid).toBe(true);
    expect(result.verifiedCount).toBe(20);

    // 모든 parent 가 고유 — 같은 parent 를 가리키는 fork 없음
    const events = await getSorted();
    const parents = events.map((e) => e.parentEventHash);
    expect(new Set(parents).size).toBe(parents.length);
  });

  it('이벤트 0건 → valid (빈 체인), tip null', async () => {
    const result = await verifyCreativeChain(PROJECT);
    expect(result).toEqual({ valid: true, verifiedCount: 0, legacyCount: 0, tipHash: null });
  });
});
