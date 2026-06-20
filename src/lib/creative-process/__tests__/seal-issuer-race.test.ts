// ============================================================
// seal-issuer-race.test — 동시 발급 시 serial 유일성 (#16 race fix)
// ============================================================
//
// getNextMonthlySerial 가 read(getAll)→max→+1 의 비원자 연산이라,
// 직렬화 큐 없이 동시 발급하면 두 호출이 같은 max 를 읽어 동일 LG-{YY}{MM}-{serial}
// 을 낸다. 직렬화 큐 + 세션 예약(reservedSerials) 도입 후 동시 호출이 와도
// serial 이 전부 유일해야 한다.
// ============================================================

// fake-indexeddb 가 structuredClone 사용 — jsdom(Node<17)에서 polyfill
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));
}

import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { issueWitnessSeal, _resetSerialReservations } from '../seal-issuer';
import { _resetCachedDB } from '../idb-store';

function serialOf(seal: string): string {
  // LG-YYMM-SERIAL-HASH4
  return seal.split('-')[2];
}

describe('seal-issuer — 동시 발급 race (#16)', () => {
  beforeEach(() => {
    _resetCachedDB();
    _resetSerialReservations();
    (globalThis as { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
  });

  it('동일 월 50건 동시 발급 → serial 전부 유일 (중복 0)', async () => {
    const N = 50;
    const calls = Array.from({ length: N }, () =>
      issueWitnessSeal({
        generatedAt: '2026-06-11T00:00:00.000Z',
        manuscriptHash: 'abcdef1234567890',
      }),
    );
    const seals = await Promise.all(calls);

    const serials = seals.map(serialOf);
    const unique = new Set(serials);
    expect(unique.size).toBe(N); // 중복 0
    // 모두 같은 월 prefix
    for (const seal of seals) {
      expect(seal.startsWith('LG-2606-')).toBe(true);
      expect(seal).toMatch(/^LG-2606-\d{4}-[A-Z0-9]{4}$/);
    }
  });

  it('순차 발급 → serial 단조 증가 (1,2,3,...)', async () => {
    const a = await issueWitnessSeal({
      generatedAt: '2026-07-01T00:00:00.000Z',
      manuscriptHash: 'aaaa',
    });
    const b = await issueWitnessSeal({
      generatedAt: '2026-07-01T00:00:00.000Z',
      manuscriptHash: 'bbbb',
    });
    expect(serialOf(a)).toBe('0001');
    expect(serialOf(b)).toBe('0002');
  });

  it('서로 다른 월은 독립 카운터 (cross-month 격리)', async () => {
    const jun = await issueWitnessSeal({
      generatedAt: '2026-06-15T00:00:00.000Z',
      manuscriptHash: 'cccc',
    });
    const aug = await issueWitnessSeal({
      generatedAt: '2026-08-15T00:00:00.000Z',
      manuscriptHash: 'dddd',
    });
    expect(serialOf(jun)).toBe('0001');
    expect(serialOf(aug)).toBe('0001');
  });
});
