// ============================================================
// shadow-db-schema.test.ts — N-01 회귀 가드
// ============================================================
// 배경: noa_shadow_v1 을 여는 4개 모듈의 onupgradeneeded store 집합이 drift 해,
//   불완전 모듈이 v4 업그레이드를 먼저 점유하면 나머지 store 가 영영 생성되지 않던
//   레이스(N-01). 이를 shadow-db-schema (SSOT)로 일원화했다.
//
// 이 테스트는 SSOT 자체를 직접 검증한다 — save-engine 의 fake-idb 는 트랜잭션에서
// 요청 store 를 즉석 생성하므로 NotFoundError 를 재현하지 못해 본 버그를 가렸다.
// 따라서 "전체 store 가 생성되는가 / idempotent 한가"를 store 목록 레벨에서 직접 단언한다.

import {
  SHADOW_DB_NAME,
  SHADOW_DB_VERSION,
  SHADOW_STORES,
  ensureShadowStores,
} from '../shadow-db-schema';

// 최소 IDBDatabase 더블 — objectStoreNames.contains + createObjectStore 추적만.
function makeFakeDb(preexisting: string[] = []) {
  const created: { name: string; keyPath: string }[] = [];
  const names = new Set<string>(preexisting);
  const db = {
    createCalls: created,
    objectStoreNames: {
      contains: (n: string) => names.has(n),
    },
    createObjectStore(name: string, opts: { keyPath: string }) {
      if (names.has(name)) {
        // 실제 IDB 는 중복 생성 시 throw — 가드 누락을 잡기 위해 동일 동작 모사.
        throw new Error(`ConstraintError: store ${name} already exists`);
      }
      names.add(name);
      created.push({ name, keyPath: opts.keyPath });
      return {} as unknown;
    },
  };
  return db as unknown as IDBDatabase & { createCalls: { name: string; keyPath: string }[] };
}

describe('shadow-db-schema (N-01 SSOT)', () => {
  it('DB 이름·버전 상수가 고정값', () => {
    expect(SHADOW_DB_NAME).toBe('noa_shadow_v1');
    expect(SHADOW_DB_VERSION).toBe(4);
  });

  it('canonical store 목록 = 4개 (shadow_log/promotion_audit/primary_write_log/local_event_log)', () => {
    expect([...SHADOW_STORES]).toEqual([
      'shadow_log',
      'promotion_audit',
      'primary_write_log',
      'local_event_log',
    ]);
  });

  it('빈 DB → 4개 store 전부 생성, keyPath 모두 id', () => {
    const db = makeFakeDb();
    ensureShadowStores(db);
    expect(db.createCalls.map((c) => c.name)).toEqual([
      'shadow_log',
      'promotion_audit',
      'primary_write_log',
      'local_event_log',
    ]);
    expect(db.createCalls.every((c) => c.keyPath === 'id')).toBe(true);
  });

  it('일부 store 만 있을 때 → 누락분만 생성 (어느 모듈이 먼저 열어도 전체 확보)', () => {
    // shadow-logger 가 먼저 shadow_log 만 만든 상태를 모사 (N-01 시작 조건).
    const db = makeFakeDb(['shadow_log']);
    ensureShadowStores(db);
    expect(db.createCalls.map((c) => c.name)).toEqual([
      'promotion_audit',
      'primary_write_log',
      'local_event_log',
    ]);
  });

  it('idempotent — 두 번 호출해도 throw 없음, 추가 생성 없음', () => {
    const db = makeFakeDb();
    ensureShadowStores(db);
    const afterFirst = db.createCalls.length;
    expect(() => ensureShadowStores(db)).not.toThrow();
    expect(db.createCalls.length).toBe(afterFirst); // 추가 생성 0
  });

  it('이미 4개 전부 있으면 아무 것도 안 만듦', () => {
    const db = makeFakeDb([...SHADOW_STORES]);
    ensureShadowStores(db);
    expect(db.createCalls.length).toBe(0);
  });
});
